pub mod executor;
pub mod fixup;
pub mod progress;
pub mod types;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{anyhow, Result};
use tokio::sync::{broadcast, mpsc, Mutex, RwLock};
use uuid::Uuid;

use crate::db::{Db, DownloadStatus};
use crate::events::{
    self, DownlinkEvent, MediaInfo, Phase, Progress,
};
pub use self::executor::{classify_error, execute_download};
pub use self::fixup::{
    extract_video_thumbnail_base64, fetch_metadata_for_url, find_ffmpeg_binary, find_ytdlp_binary,
    fixup_disguised_hls_stream,
};
pub use self::progress::{
    classify_error_message, parse_bytes, parse_eta, parse_percent, parse_speed,
};
pub use self::types::{
    DownloadConfig, DownloadError, DownloadItemInfo, FetchedMetadata, ParsedProgress, Preset,
};

pub const MAX_PER_DOMAIN: usize = 2;

fn extract_hostname(url_str: &str) -> String {
    url::Url::parse(url_str)
        .ok()
        .and_then(|u| u.host_str().map(|s| s.to_lowercase()))
        .unwrap_or_default()
}

pub struct DownloadManager {
    config: Arc<RwLock<DownloadConfig>>,
    db: Arc<Mutex<Db>>,
    event_tx: mpsc::Sender<DownlinkEvent>,
    active_downloads: Arc<RwLock<HashMap<Uuid, broadcast::Sender<()>>>>,
    active_domains: Arc<RwLock<HashMap<Uuid, String>>>,
    completion_tx: mpsc::Sender<()>,
    completion_rx: Mutex<Option<mpsc::Receiver<()>>>,
}

impl DownloadManager {
    pub fn new(
        config: DownloadConfig,
        db: Arc<Mutex<Db>>,
        event_tx: mpsc::Sender<DownlinkEvent>,
    ) -> Self {
        let (completion_tx, completion_rx) = mpsc::channel(32);
        Self {
            config: Arc::new(RwLock::new(config)),
            db,
            event_tx,
            active_downloads: Arc::new(RwLock::new(HashMap::new())),
            active_domains: Arc::new(RwLock::new(HashMap::new())),
            completion_tx,
            completion_rx: Mutex::new(Some(completion_rx)),
        }
    }

    pub fn config(&self) -> Arc<RwLock<DownloadConfig>> {
        self.config.clone()
    }

    pub async fn update_config(&self, new_config: DownloadConfig) {
        let mut config = self.config.write().await;
        *config = new_config;
    }

    pub fn start_completion_listener(self: &Arc<Self>) {
        let self_clone = self.clone();
        tokio::spawn(async move {
            log::info!("Download completion listener started");
            if let Some(mut rx) = self_clone.completion_rx.lock().await.take() {
                while (rx.recv().await).is_some() {
                    log::info!("Received download completion signal, checking for next in queue");
                    if let Err(e) = self_clone.start_next_queued().await {
                        log::error!("Failed to start next queued download: {}", e);
                    }
                }
            }
            log::warn!("Download completion listener stopped");
        });
    }

    pub async fn start(&self, id: Uuid) -> Result<()> {
        {
            let mut active = self.active_downloads.write().await;

            if active.contains_key(&id) {
                log::warn!("Download {} is already active", id);
                return Ok(());
            }

            let max_concurrent = self.config.read().await.max_concurrent;
            if active.len() >= max_concurrent {
                log::info!(
                    "Concurrency limit reached ({}/{}), download {} will wait",
                    active.len(),
                    max_concurrent,
                    id
                );
                return Ok(());
            }

            let source_url = {
                let mut db = self.db.lock().await;
                db.get_download(id)
                    .ok()
                    .flatten()
                    .map(|row| row.source_url)
                    .unwrap_or_default()
            };
            let hostname = extract_hostname(&source_url);
            if !hostname.is_empty() {
                let domains = self.active_domains.read().await;
                let domain_count = domains.values().filter(|h| *h == &hostname).count();
                if domain_count >= MAX_PER_DOMAIN {
                    log::info!(
                        "Per-domain limit reached for '{}' ({}/{}), download {} will wait",
                        hostname,
                        domain_count,
                        MAX_PER_DOMAIN,
                        id
                    );
                    return Ok(());
                }
            }

            let (cancel_tx, _) = broadcast::channel::<()>(1);
            active.insert(id, cancel_tx);
            if !hostname.is_empty() {
                self.active_domains.write().await.insert(id, hostname);
            }
            log::info!(
                "Download {} registered as active ({}/{})",
                id,
                active.len(),
                max_concurrent
            );
        }

        let download_info = {
            let mut db = self.db.lock().await;
            match db.get_download(id) {
                Ok(Some(row)) => row,
                Ok(None) => {
                    log::error!("Download {} not found in database", id);
                    self.active_downloads.write().await.remove(&id);
                    return Err(anyhow!("Download not found"));
                }
                Err(e) => {
                    log::error!("Failed to get download {}: {}", id, e);
                    self.active_downloads.write().await.remove(&id);
                    return Err(anyhow!("Database error: {}", e));
                }
            }
        };

        match download_info.status {
            DownloadStatus::Queued | DownloadStatus::Ready | DownloadStatus::Stopped => {}
            _ => {
                log::info!(
                    "Download {} is in state {:?}, not starting",
                    id,
                    download_info.status
                );
                self.active_downloads.write().await.remove(&id);
                return Ok(());
            }
        }

        let config = self.config.clone();
        let db = self.db.clone();
        let event_tx = self.event_tx.clone();
        let active_downloads = self.active_downloads.clone();
        let active_domains = self.active_domains.clone();
        let completion_tx = self.completion_tx.clone();

        let was_stopped = matches!(download_info.status, DownloadStatus::Stopped);

        tokio::spawn(async move {
            let mut download_info = download_info;
            let yt_dlp_path = config.read().await.yt_dlp_path.clone();

            if download_info.title.is_none() {
                log::info!("Download {} has no title, fetching metadata first", id);

                {
                    let mut db_guard = db.lock().await;
                    let _ = db_guard.set_status(
                        id,
                        DownloadStatus::Fetching,
                        Some("Fetching metadata..."),
                    );
                }

                let _ = event_tx
                    .send(DownlinkEvent::DownloadProgress {
                        id,
                        status: events::DownloadStatus::Fetching,
                        progress: Progress {
                            percent: None,
                            bytes_downloaded: None,
                            bytes_total: None,
                            speed_bps: None,
                            eta_seconds: None,
                            phase: Some(Phase {
                                name: "Fetching metadata...".to_string(),
                                detail: None,
                            }),
                        },
                    })
                    .await;

                if let Some(metadata) =
                    fetch_metadata_for_url(&yt_dlp_path, &download_info.source_url).await
                {
                    log::info!("Fetched metadata for {}: title={:?}", id, metadata.title);

                    {
                        let mut db_guard = db.lock().await;
                        let _ = db_guard.update_metadata(
                            id,
                            metadata.title.as_deref(),
                            metadata.uploader.as_deref(),
                            metadata.duration_seconds.map(|d| d as i64),
                            metadata.thumbnail_url.as_deref(),
                        );
                    }

                    download_info.title = metadata.title.clone();
                    download_info.uploader = metadata.uploader.clone();
                    download_info.thumbnail_url = metadata.thumbnail_url.clone();
                    download_info.duration_seconds = metadata.duration_seconds.map(|d| d as i64);

                    let _ = event_tx
                        .send(DownlinkEvent::MetadataReady {
                            id,
                            info: MediaInfo {
                                title: metadata.title,
                                uploader: metadata.uploader,
                                duration_seconds: metadata.duration_seconds,
                                thumbnail_url: metadata.thumbnail_url,
                                webpage_url: Some(download_info.source_url.clone()),
                            },
                        })
                        .await;
                } else {
                    log::warn!("Failed to fetch metadata for {}, proceeding anyway", id);
                }
            }

            {
                let mut db_guard = db.lock().await;
                let _ = db_guard.set_status(id, DownloadStatus::Downloading, Some("Starting..."));
            }

            let _ = event_tx.send(DownlinkEvent::DownloadStarted { id }).await;

            let source_url = download_info.source_url.clone();
            let stream_url = download_info.stream_url.clone();
            let referer_url = download_info.referer_url.clone();
            let preset_id = download_info.preset_id.clone();
            let output_dir = download_info.output_dir.clone();

            let target_url = if let Some(ref s) = stream_url {
                if !s.trim().is_empty() {
                    s.clone()
                } else {
                    source_url.clone()
                }
            } else {
                source_url.clone()
            };

            let effective_referer = referer_url.as_deref().or_else(|| {
                if stream_url.is_some() {
                    Some(source_url.as_str())
                } else {
                    None
                }
            });

            let custom_title = download_info.title.clone().or_else(|| {
                let inferred = crate::ytdlp::infer_title_from_url(&source_url);
                if inferred != "Video Stream" && !inferred.starts_with("Video from") {
                    Some(inferred)
                } else {
                    None
                }
            });

            const MAX_RETRIES: u32 = 3;
            const BASE_DELAY_SECS: u64 = 5;

            let mut attempt = 0u32;
            let result: std::result::Result<Option<String>, DownloadError> = loop {
                let cancel_rx = {
                    let active = active_downloads.read().await;
                    active.get(&id).map(|tx| tx.subscribe())
                };
                let cancel_rx = match cancel_rx {
                    Some(rx) => rx,
                    None => {
                        log::info!(
                            "Download {} was removed before retry attempt {}",
                            id,
                            attempt + 1
                        );
                        break Err(DownloadError::Stopped);
                    }
                };

                let res = execute_download(
                    id,
                    &target_url,
                    effective_referer,
                    custom_title.as_deref(),
                    &preset_id,
                    &output_dir,
                    config.clone(),
                    cancel_rx,
                    event_tx.clone(),
                    was_stopped && attempt == 0,
                )
                .await;

                match &res {
                    Ok(_) => break res,
                    Err(DownloadError::Canceled) | Err(DownloadError::Stopped) => break res,
                    Err(DownloadError::Failed { code, .. })
                        if matches!(code, events::ErrorCode::Network | events::ErrorCode::Unknown)
                            && attempt < MAX_RETRIES - 1 =>
                    {
                        attempt += 1;
                        let delay = BASE_DELAY_SECS * (1 << attempt);
                        log::warn!(
                            "Download {} failed (attempt {}/{}), retrying in {}s…",
                            id,
                            attempt,
                            MAX_RETRIES,
                            delay
                        );
                        let _ = event_tx
                            .send(DownlinkEvent::DownloadProgress {
                                id,
                                status: events::DownloadStatus::Downloading,
                                progress: Progress {
                                    percent: None,
                                    bytes_downloaded: None,
                                    bytes_total: None,
                                    speed_bps: None,
                                    eta_seconds: Some(delay),
                                    phase: Some(Phase {
                                        name: format!(
                                            "Retrying in {}s… (attempt {}/{})",
                                            delay, attempt, MAX_RETRIES
                                        ),
                                        detail: None,
                                    }),
                                },
                            })
                            .await;
                        tokio::time::sleep(Duration::from_secs(delay)).await;
                    }
                    Err(_) => break res,
                }
            };

            active_downloads.write().await.remove(&id);
            active_domains.write().await.remove(&id);

            let mut db_guard = db.lock().await;
            match result {
                Ok(mut final_path) => {
                    let ffmpeg_bin = {
                        let cfg = config.read().await;
                        cfg.ffmpeg_path.clone()
                    };

                    if let (Some(ref bin), Some(ref path_str)) = (&ffmpeg_bin, &final_path) {
                        let path = PathBuf::from(path_str);
                        if path.exists() {
                            if let Some(fixed_path) = fixup_disguised_hls_stream(path_str, bin).await {
                                final_path = Some(fixed_path);
                            }
                        }
                    }

                    if let (Some(ref bin), Some(ref path_str)) = (&ffmpeg_bin, &final_path) {
                        let path = PathBuf::from(path_str);
                        if path.exists() && download_info.thumbnail_url.is_none() {
                            if let Some(thumb_data) = extract_video_thumbnail_base64(&path, bin).await {
                                let _ = db_guard.update_metadata(id, None, None, None, Some(&thumb_data));
                                let _ = event_tx.send(DownlinkEvent::MetadataReady {
                                    id,
                                    info: MediaInfo {
                                        title: None,
                                        uploader: None,
                                        duration_seconds: None,
                                        thumbnail_url: Some(thumb_data),
                                        webpage_url: None,
                                    },
                                }).await;
                            }
                        }
                    }

                    let final_path_str = final_path.unwrap_or_default();
                    let _ = db_guard.set_status(id, DownloadStatus::Done, Some("Completed"));
                    let _ = db_guard.set_final_path(id, &final_path_str);

                    if let Ok(data_dir) = crate::db::app_data_dir() {
                        let task_temp = data_dir.join("tmp").join(id.to_string());
                        let _ = tokio::fs::remove_dir_all(&task_temp).await;
                    }

                    let _ = event_tx
                        .send(DownlinkEvent::DownloadCompleted {
                            id,
                            final_path: final_path_str,
                        })
                        .await;
                }
                Err(DownloadError::Canceled) => {
                    if let Ok(data_dir) = crate::db::app_data_dir() {
                        let task_temp = data_dir.join("tmp").join(id.to_string());
                        let _ = tokio::fs::remove_dir_all(&task_temp).await;
                    }
                    let _ = event_tx.send(DownlinkEvent::DownloadCanceled { id }).await;
                }
                Err(DownloadError::Stopped) => {
                    let _ = event_tx.send(DownlinkEvent::DownloadStopped { id }).await;
                }
                Err(DownloadError::Failed {
                    code,
                    message,
                    actions,
                }) => {
                    let _ = db_guard.set_status(id, DownloadStatus::Failed, Some("Failed"));
                    let _ = event_tx
                        .send(DownlinkEvent::DownloadFailed {
                            id,
                            error_code: code,
                            user_message: message,
                            actions,
                        })
                        .await;
                }
            }

            let _ = completion_tx.send(()).await;
        });

        Ok(())
    }

    pub async fn stop(&self, id: Uuid) -> Result<()> {
        {
            let mut db = self.db.lock().await;
            let _ = db.set_status(id, DownloadStatus::Stopped, Some("Stopped by user"));
        }

        if let Some(cancel_tx) = self.active_downloads.read().await.get(&id) {
            let _ = cancel_tx.send(());
            log::info!("Sent stop signal to download {}", id);
        } else {
            log::info!("Download {} not active, just updated status to Stopped", id);
        }
        Ok(())
    }

    pub async fn cancel(&self, id: Uuid) -> Result<()> {
        {
            let mut db = self.db.lock().await;
            let _ = db.set_status(id, DownloadStatus::Canceled, Some("Canceled by user"));
        }

        if let Ok(data_dir) = crate::db::app_data_dir() {
            let task_temp = data_dir.join("tmp").join(id.to_string());
            let _ = tokio::fs::remove_dir_all(&task_temp).await;
        }

        if let Some(cancel_tx) = self.active_downloads.read().await.get(&id) {
            let _ = cancel_tx.send(());
            log::info!("Sent cancel signal to download {}", id);
        } else {
            log::info!(
                "Download {} not active, just updated status to Canceled",
                id
            );
        }
        Ok(())
    }

    pub async fn retry(&self, id: Uuid) -> Result<()> {
        {
            let mut db = self.db.lock().await;
            let _ = db.set_status(id, DownloadStatus::Queued, Some("Queued"));
        }
        self.start(id).await
    }

    pub async fn is_active(&self, id: Uuid) -> bool {
        self.active_downloads.read().await.contains_key(&id)
    }

    pub async fn active_count(&self) -> usize {
        self.active_downloads.read().await.len()
    }

    pub async fn shutdown(&self) -> Result<()> {
        let ids: Vec<Uuid> = self.active_downloads.read().await.keys().cloned().collect();
        for id in ids {
            self.stop(id).await?;
        }
        Ok(())
    }

    pub async fn start_next_queued(&self) -> Result<()> {
        let max_concurrent = self.config.read().await.max_concurrent;
        let active_count = self.active_downloads.read().await.len();

        if active_count >= max_concurrent {
            log::info!(
                "Concurrency limit reached ({}/{}), not starting next queued download",
                active_count,
                max_concurrent
            );
            return Ok(());
        }

        let next_id = {
            let db = self.db.lock().await;
            db.get_next_queued_download_id()
                .map_err(|e| anyhow!("Failed to get next queued download: {}", e))?
        };

        if let Some(id) = next_id {
            let should_start = {
                let mut db = self.db.lock().await;
                if let Ok(Some(row)) = db.get_download(id) {
                    matches!(row.status, DownloadStatus::Queued | DownloadStatus::Ready)
                } else {
                    false
                }
            };

            if should_start {
                log::info!("Auto-starting next queued download: {}", id);
                self.start(id).await?;
            } else {
                log::info!("Download {} is no longer in startable state, skipping", id);
            }
        }

        Ok(())
    }
}
