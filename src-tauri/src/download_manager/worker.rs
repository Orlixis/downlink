use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, Mutex, RwLock};
use uuid::Uuid;

use super::executor::execute_download;
use super::fixup::{extract_video_thumbnail_base64, fixup_disguised_hls_stream};
use super::types::{DownloadConfig, DownloadError, DownloadItemInfo};
use crate::db::{Db, DownloadStatus};
use crate::events::{self, DownlinkEvent, MediaInfo};

pub async fn run_download_worker(
    id: Uuid,
    download_info: DownloadItemInfo,
    config: Arc<RwLock<DownloadConfig>>,
    db: Arc<Mutex<Db>>,
    event_tx: mpsc::Sender<DownlinkEvent>,
    active_downloads: Arc<RwLock<HashMap<Uuid, broadcast::Sender<()>>>>,
    active_domains: Arc<RwLock<HashMap<Uuid, String>>>,
    completion_tx: mpsc::Sender<()>,
) {
    let was_stopped = download_info.status == DownloadStatus::Stopped;
    let target_url = download_info
        .stream_url
        .as_deref()
        .unwrap_or(&download_info.source_url)
        .to_string();
    let effective_referer = download_info
        .referer_url
        .as_deref()
        .or(if download_info.stream_url.is_some() {
            Some(download_info.source_url.as_str())
        } else {
            None
        });
    let custom_title = download_info.title.clone();
    let preset_id = download_info.preset_id.clone();
    let output_dir = download_info.output_dir.clone();

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
                tokio::time::sleep(tokio::time::Duration::from_secs(delay)).await;
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
                        let _ = event_tx
                            .send(DownlinkEvent::MetadataReady {
                                id,
                                info: MediaInfo {
                                    title: None,
                                    uploader: None,
                                    duration_seconds: None,
                                    thumbnail_url: Some(thumb_data),
                                    webpage_url: None,
                                },
                            })
                            .await;
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
}
