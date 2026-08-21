pub mod classifier;
pub mod executor;
pub mod fixup;
pub mod progress;
pub mod types;
pub mod worker;

use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use tokio::sync::{broadcast, mpsc, Mutex, RwLock};
use uuid::Uuid;

use crate::db::{Db, DownloadStatus};
use crate::events::{self, DownlinkEvent, MediaInfo, Phase, Progress};

pub use self::classifier::classify_error;
pub use self::executor::execute_download;
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
pub use self::worker::run_download_worker;

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
}

impl DownloadManager {
    pub fn new(
        config: DownloadConfig,
        db: Arc<Mutex<Db>>,
        event_tx: mpsc::Sender<DownlinkEvent>,
    ) -> Self {
        let (completion_tx, mut completion_rx) = mpsc::channel::<()>(32);
        let config = Arc::new(RwLock::new(config));
        let active_downloads: Arc<RwLock<HashMap<Uuid, broadcast::Sender<()>>>> =
            Arc::new(RwLock::new(HashMap::new()));
        let active_domains: Arc<RwLock<HashMap<Uuid, String>>> =
            Arc::new(RwLock::new(HashMap::new()));

        {
            let config = config.clone();
            let db = db.clone();
            let active_downloads = active_downloads.clone();
            let active_domains = active_domains.clone();
            let event_tx = event_tx.clone();
            let completion_tx = completion_tx.clone();

            tokio::spawn(async move {
                while completion_rx.recv().await.is_some() {
                    let max_concurrent = config.read().await.max_concurrent;
                    let active_count = active_downloads.read().await.len();

                    if active_count >= max_concurrent {
                        log::info!(
                            "Concurrency limit reached ({}/{}), skipping auto-start",
                            active_count,
                            max_concurrent
                        );
                        continue;
                    }

                    let slots_available = max_concurrent - active_count;
                    let next_ids = {
                        let db = db.lock().await;
                        db.get_next_queued_download_ids(slots_available)
                            .unwrap_or_default()
                    };

                    for id in next_ids {
                        let should_start = {
                            let mut db = db.lock().await;
                            if let Ok(Some(row)) = db.get_download(id) {
                                matches!(row.status, DownloadStatus::Queued | DownloadStatus::Ready)
                            } else {
                                false
                            }
                        };

                        if should_start {
                            log::info!("Auto-starting queued download from manager loop: {}", id);
                            let dm = DownloadManager {
                                config: config.clone(),
                                db: db.clone(),
                                event_tx: event_tx.clone(),
                                active_downloads: active_downloads.clone(),
                                active_domains: active_domains.clone(),
                                completion_tx: completion_tx.clone(),
                            };
                            if let Err(e) = dm.start(id).await {
                                log::error!("Failed to auto-start download {}: {}", id, e);
                            }
                        }
                    }
                }
            });
        }

        Self {
            config,
            db,
            event_tx,
            active_downloads,
            active_domains,
            completion_tx,
        }
    }

    pub fn config(&self) -> Arc<RwLock<DownloadConfig>> {
        self.config.clone()
    }

    pub fn start_completion_listener(&self) {}

    pub async fn update_config(&self, new_config: DownloadConfig) {
        let mut cfg = self.config.write().await;
        *cfg = new_config;
    }

    pub async fn start(&self, id: Uuid) -> Result<()> {
        let max_concurrent = self.config.read().await.max_concurrent;
        let active_count = self.active_downloads.read().await.len();

        if active_count >= max_concurrent {
            log::info!(
                "Concurrency limit reached ({}/{}), keeping download {} queued",
                active_count,
                max_concurrent,
                id
            );
            let mut db = self.db.lock().await;
            let _ = db.set_status(id, DownloadStatus::Queued, Some("Queued (limit reached)"));
            return Ok(());
        }

        let mut download_info = {
            let mut db = self.db.lock().await;
            let row = db
                .get_download(id)
                .map_err(|e| anyhow!("Failed to get download: {}", e))?
                .ok_or_else(|| anyhow!("Download not found: {}", id))?;

            DownloadItemInfo {
                source_url: row.source_url,
                stream_url: row.stream_url,
                referer_url: row.referer_url,
                title: row.title,
                uploader: row.uploader,
                thumbnail_url: row.thumbnail_url,
                duration_seconds: row.duration_seconds,
                preset_id: row.preset_id,
                output_dir: row.output_dir,
                status: row.status,
            }
        };

        let domain = extract_hostname(&download_info.source_url);
        if !domain.is_empty() {
            let domains = self.active_domains.read().await;
            let count_for_domain = domains.values().filter(|d| *d == &domain).count();
            if count_for_domain >= MAX_PER_DOMAIN {
                log::info!(
                    "Domain limit reached for {} ({}/{}), keeping download {} queued",
                    domain,
                    count_for_domain,
                    MAX_PER_DOMAIN,
                    id
                );
                let mut db = self.db.lock().await;
                let _ = db.set_status(id, DownloadStatus::Queued, Some("Queued (domain limit)"));
                return Ok(());
            }
        }

        let (cancel_tx, _) = broadcast::channel(1);
        self.active_downloads
            .write()
            .await
            .insert(id, cancel_tx.clone());

        if !domain.is_empty() {
            self.active_domains
                .write()
                .await
                .insert(id, domain.clone());
        }

        let config = self.config.clone();
        let db = self.db.clone();
        let event_tx = self.event_tx.clone();
        let active_downloads = self.active_downloads.clone();
        let active_domains = self.active_domains.clone();
        let completion_tx = self.completion_tx.clone();

        tokio::spawn(async move {
            let needs_metadata = download_info.title.is_none()
                || download_info.title.as_deref() == Some("Fetching info…")
                || download_info.title.as_deref() == Some("Fetching…");

            if needs_metadata {
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
                                name: "Fetching info…".to_string(),
                                detail: None,
                            }),
                        },
                    })
                    .await;

                let yt_dlp_path = {
                    let cfg = config.read().await;
                    cfg.yt_dlp_path.clone()
                };
                let target_url = download_info
                    .stream_url
                    .as_deref()
                    .unwrap_or(&download_info.source_url);

                if let Some(metadata) = fetch_metadata_for_url(&yt_dlp_path, target_url).await {
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
                }
            }

            {
                let mut db_guard = db.lock().await;
                let _ = db_guard.set_status(id, DownloadStatus::Downloading, Some("Starting..."));
            }

            let _ = event_tx.send(DownlinkEvent::DownloadStarted { id }).await;

            run_download_worker(
                id,
                download_info,
                config,
                db,
                event_tx,
                active_downloads,
                active_domains,
                completion_tx,
            )
            .await;
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
                self.start(id).await?;
            }
        }

        Ok(())
    }
}
