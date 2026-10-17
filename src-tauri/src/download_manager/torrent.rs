use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};
use librqbit::{
    api::TorrentIdOrHash, AddTorrent, AddTorrentOptions, AddTorrentResponse, Session, SessionOptions,
};
use tokio::sync::{broadcast, mpsc, OnceCell};
use uuid::Uuid;

use super::types::DownloadError;
use crate::events::{DownlinkEvent, DownloadStatus, ErrorCode, Phase, Progress};

static TORRENT_SESSION: OnceCell<Arc<Session>> = OnceCell::const_new();

/// Get or initialize the global shared BitTorrent session.
pub async fn get_torrent_session(default_output_dir: &Path) -> Result<Arc<Session>, DownloadError> {
    TORRENT_SESSION
        .get_or_try_init(|| async {
            let opts = SessionOptions::default();
            Session::new_with_opts(default_output_dir.to_path_buf(), opts)
                .await
                .map_err(|e| {
                    DownloadError::Failed {
                        code: ErrorCode::Unknown,
                        message: format!("Failed to initialize BitTorrent engine: {}", e),
                        actions: Vec::new(),
                    }
                })
        })
        .await
        .cloned()
}

const FAST_PUBLIC_TRACKERS: &[&str] = &[
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.tracker.cl:1337/announce",
    "udp://9.rarbg.to:2710/announce",
    "udp://tracker.torrent.eu.org:451/announce",
    "udp://open.stealth.si:80/announce",
    "udp://exodus.desync.com:6969/announce",
    "udp://tracker.moeking.me:6969/announce",
    "http://tracker.openbittorrent.com:80/announce",
    "udp://explodie.org:6969/announce",
    "udp://tracker.dler.org:6969/announce",
];

/// Extracts the display name (`dn` parameter) from a magnet URI or file path.
pub fn extract_magnet_name(raw_url: &str) -> Option<String> {
    if raw_url.starts_with("magnet:?") {
        if let Ok(parsed) = url::Url::parse(raw_url) {
            for (key, val) in parsed.query_pairs() {
                if key == "dn" && !val.trim().is_empty() {
                    return Some(val.to_string());
                }
            }
        }
        // Fallback for non-standard magnet formatting
        if let Some(idx) = raw_url.find("dn=") {
            let rest = &raw_url[idx + 3..];
            let end = rest.find('&').unwrap_or(rest.len());
            let name_encoded = &rest[..end];
            if let Ok(decoded) = urlencoding::decode(name_encoded) {
                if !decoded.trim().is_empty() {
                    return Some(decoded.to_string());
                }
            }
        }
    } else if raw_url.ends_with(".torrent") || Path::new(raw_url).exists() {
        let path = Path::new(raw_url);
        if let Some(stem) = path.file_stem() {
            let s = stem.to_string_lossy().to_string();
            if !s.trim().is_empty() {
                return Some(s);
            }
        }
    }
    None
}

/// Enriches a magnet URI with tier-1 high-availability public trackers to maximize peer discovery speed.
pub fn enrich_magnet_uri(raw_url: &str) -> String {
    if !raw_url.starts_with("magnet:?") {
        return raw_url.to_string();
    }

    let mut enriched = raw_url.to_string();
    for tracker in FAST_PUBLIC_TRACKERS {
        let encoded_tr = urlencoding::encode(tracker);
        let param = format!("&tr={}", encoded_tr);
        if !enriched.contains(&param) && !enriched.contains(tracker) {
            enriched.push_str(&param);
        }
    }
    enriched
}

/// Execute a BitTorrent download (Magnet link, .torrent file, or HTTP torrent).
pub async fn execute_torrent_download(
    id: Uuid,
    url: &str,
    _custom_title: Option<&str>,
    output_dir: &str,
    cancel_rx: &mut broadcast::Receiver<()>,
    event_tx: mpsc::Sender<DownlinkEvent>,
) -> Result<Option<String>, DownloadError> {
    let out_path = PathBuf::from(output_dir);
    if !out_path.exists() {
        let _ = tokio::fs::create_dir_all(&out_path).await;
    }

    let session = get_torrent_session(&out_path).await?;

    let effective_url = if url.starts_with("magnet:") {
        enrich_magnet_uri(url)
    } else {
        url.to_string()
    };

    let add_torrent = if effective_url.starts_with("magnet:") {
        AddTorrent::from_url(&effective_url)
    } else if let Ok(parsed_url) = url::Url::parse(&effective_url) {
        if parsed_url.scheme() == "http" || parsed_url.scheme() == "https" {
            AddTorrent::from_url(&effective_url)
        } else if parsed_url.scheme() == "file" {
            if let Ok(file_path) = parsed_url.to_file_path() {
                let bytes = tokio::fs::read(&file_path).await.map_err(|e| {
                    DownloadError::Failed {
                        code: ErrorCode::Unknown,
                        message: format!("Failed to read .torrent file: {}", e),
                        actions: Vec::new(),
                    }
                })?;
                AddTorrent::from_bytes(bytes)
            } else {
                AddTorrent::from_url(&effective_url)
            }
        } else {
            AddTorrent::from_url(&effective_url)
        }
    } else if Path::new(&effective_url).exists() {
        let bytes = tokio::fs::read(&effective_url).await.map_err(|e| {
            DownloadError::Failed {
                code: ErrorCode::Unknown,
                message: format!("Failed to read .torrent file: {}", e),
                actions: Vec::new(),
            }
        })?;
        AddTorrent::from_bytes(bytes)
    } else {
        AddTorrent::from_url(&effective_url)
    };

    let add_opts = AddTorrentOptions {
        output_folder: Some(output_dir.to_string()),
        overwrite: true,
        ..Default::default()
    };

    log::info!("Adding torrent to session for task {}: {}", id, url);
    let handle = match session.add_torrent(add_torrent, Some(add_opts)).await {
        Ok(AddTorrentResponse::Added(_, handle)) => handle,
        Ok(AddTorrentResponse::AlreadyManaged(_, handle)) => handle,
        Ok(AddTorrentResponse::ListOnly(_)) => {
            return Err(DownloadError::Failed {
                code: ErrorCode::Unknown,
                message: "Torrent returned list only".to_string(),
                actions: Vec::new(),
            });
        }
        Err(e) => {
            return Err(DownloadError::Failed {
                code: ErrorCode::Network,
                message: format!("Failed to parse or add magnet link: {}", e),
                actions: Vec::new(),
            });
        }
    };

    let _ = event_tx
        .send(DownlinkEvent::DownloadProgress {
            id,
            status: DownloadStatus::Downloading,
            progress: Progress {
                percent: Some(0.0),
                bytes_downloaded: Some(0),
                bytes_total: None,
                speed_bps: Some(0),
                eta_seconds: None,
                phase: Some(Phase {
                    name: "Connecting to BitTorrent swarm...".to_string(),
                    detail: Some("Discovering peers via DHT".to_string()),
                }),
            },
        })
        .await;

    let mut last_downloaded: u64 = 0;
    let mut last_time = Instant::now();
    let mut check_interval = tokio::time::interval(Duration::from_millis(350));
    let mut metadata_emitted = false;

    loop {
        tokio::select! {
            _ = cancel_rx.recv() => {
                log::info!("Cancellation received for torrent task {}", id);
                let _ = session.delete(TorrentIdOrHash::Id(handle.id()), false).await;
                return Err(DownloadError::Canceled);
            }
            _ = check_interval.tick() => {
                if !metadata_emitted {
                    if let Some(ref name) = handle.name() {
                        if !name.trim().is_empty() && name != "BitTorrent Download" {
                            metadata_emitted = true;
                            let _ = event_tx.send(DownlinkEvent::MetadataReady {
                                id,
                                info: crate::events::MediaInfo {
                                    title: Some(name.clone()),
                                    uploader: None,
                                    duration_seconds: None,
                                    thumbnail_url: None,
                                    webpage_url: Some(url.to_string()),
                                },
                            }).await;
                        }
                    }
                }

                let stats = handle.stats();
                let downloaded = stats.progress_bytes;
                let total = stats.total_bytes;
                let is_finished = stats.finished;

                let now = Instant::now();
                let elapsed_secs = now.duration_since(last_time).as_secs_f64();
                let speed_bps = if elapsed_secs > 0.0 && downloaded >= last_downloaded {
                    ((downloaded - last_downloaded) as f64 / elapsed_secs) as u64
                } else {
                    0
                };

                let peers_count = stats.live.as_ref().map(|s| s.snapshot.peer_stats.live).unwrap_or(0);

                let percent = if total > 0 {
                    (downloaded as f64 / total as f64 * 100.0).clamp(0.0, 100.0)
                } else if is_finished {
                    100.0
                } else {
                    0.0
                };

                let eta = if speed_bps > 0 && total > downloaded {
                    Some((total - downloaded) / speed_bps)
                } else {
                    None
                };

                let phase_label = if is_finished {
                    "BitTorrent download complete".to_string()
                } else if peers_count > 0 {
                    format!("Downloading from {} peers", peers_count)
                } else {
                    "Discovering DHT swarms & peers...".to_string()
                };

                if downloaded != last_downloaded || is_finished {
                    last_downloaded = downloaded;
                    last_time = now;

                    let _ = event_tx.send(DownlinkEvent::DownloadProgress {
                        id,
                        status: if is_finished { DownloadStatus::Done } else { DownloadStatus::Downloading },
                        progress: Progress {
                            percent: Some(percent),
                            bytes_downloaded: Some(downloaded),
                            bytes_total: if total > 0 { Some(total) } else { None },
                            speed_bps: Some(speed_bps),
                            eta_seconds: eta,
                            phase: Some(Phase {
                                name: phase_label,
                                detail: None,
                            }),
                        },
                    }).await;
                }

                if is_finished {
                    log::info!("Torrent task {} finished successfully", id);
                    break;
                }
            }
        }
    }

    // Determine output directory / path
    let torrent_name: Option<String> = handle.name();

    let final_path = if let Some(ref name) = torrent_name {
        let candidate = handle.output_folder().join(name);
        if candidate.exists() {
            Some(candidate.to_string_lossy().to_string())
        } else {
            let direct = PathBuf::from(output_dir).join(name);
            Some(direct.to_string_lossy().to_string())
        }
    } else {
        Some(handle.output_folder().to_string_lossy().to_string())
    };

    Ok(final_path)
}
