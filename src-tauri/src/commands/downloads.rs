use tauri::{AppHandle, State};
use uuid::Uuid;

use super::types::{AddUrlsOptions, AddUrlsResult, QueueItem, UpdateDownloadTaskOptions};
use crate::db::SourceKind;
use crate::url_utils;
use crate::{get_or_init_download_manager, AppState};

#[tauri::command]
pub fn add_urls(
    state: State<'_, AppState>,
    urls_text: String,
    options: AddUrlsOptions,
) -> Result<AddUrlsResult, String> {
    log::info!("add_urls called with urls_text: {:?}", urls_text);
    log::info!("add_urls options: {:?}", options);

    let urls = url_utils::extract_urls(&urls_text);
    if urls.is_empty() {
        return Err("No valid http(s) URLs found.".to_string());
    }

    let source_kind = match options.source_kind.as_deref() {
        Some("playlist_parent") => SourceKind::PlaylistParent,
        Some("playlist_item") => SourceKind::PlaylistItem,
        Some("single") | None => SourceKind::Single,
        Some(_) => SourceKind::Single,
    };

    let mut db = state.db.blocking_lock();

    let mut ids = Vec::with_capacity(urls.len());
    for u in &urls {
        let effective_preset = {
            let mut p = options.preset_id.clone();
            if options.subtitles_enabled {
                p.push_str("+subs");
            }
            if options.sponsorblock_enabled {
                p.push_str("+sb");
            }
            p
        };

        let stream_url = options.stream_url.as_deref();
        let referer_url = options.referer_url.as_deref().or_else(|| {
            if stream_url.is_some() {
                Some(u.as_str())
            } else {
                None
            }
        });

        let id = db
            .insert_download(
                u,
                source_kind,
                options.parent_id,
                &effective_preset,
                &options.output_dir,
                stream_url,
                referer_url,
            )
            .map_err(|e| format!("Failed to insert download: {e}"))?;

        if options.title.is_some() || options.uploader.is_some() || options.thumbnail_url.is_some() {
            let _ = db.update_metadata(
                id,
                options.title.as_deref(),
                options.uploader.as_deref(),
                options.duration_seconds,
                options.thumbnail_url.as_deref(),
            );
        }

        ids.push(id);
    }

    Ok(AddUrlsResult { ids, urls })
}

#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<(), String> {
    let manager = get_or_init_download_manager(&state, &app).await;
    manager
        .start(id)
        .await
        .map_err(|e| format!("Failed to start download: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn stop_download(
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<(), String> {
    let manager = get_or_init_download_manager(&state, &app).await;
    manager
        .stop(id)
        .await
        .map_err(|e| format!("Failed to stop download: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn cancel_download(
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<(), String> {
    let manager = get_or_init_download_manager(&state, &app).await;
    manager
        .cancel(id)
        .await
        .map_err(|e| format!("Failed to cancel download: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn retry_download(
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<(), String> {
    let manager = get_or_init_download_manager(&state, &app).await;
    manager
        .retry(id)
        .await
        .map_err(|e| format!("Failed to retry download: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn start_all_downloads(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let manager = get_or_init_download_manager(&state, &app).await;
    let max_concurrent = {
        let config_arc = manager.config();
        let config = config_arc.read().await;
        config.max_concurrent
    };

    for _ in 0..max_concurrent {
        if let Err(e) = manager.start_next_queued().await {
            log::error!("Error while trying to start next download: {}", e);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn stop_all_downloads(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let manager = get_or_init_download_manager(&state, &app).await;
    let _ = manager.shutdown().await;
    Ok(())
}

#[tauri::command]
pub async fn get_queue(state: State<'_, AppState>) -> Result<Vec<QueueItem>, String> {
    let mut db = state.db.lock().await;
    let rows = db
        .get_active_downloads()
        .map_err(|e| format!("Failed to get queue: {e}"))?;

    let items: Vec<QueueItem> = rows
        .into_iter()
        .map(|row| QueueItem {
            id: row.id,
            source_url: row.source_url,
            title: row.title,
            uploader: row.uploader,
            thumbnail_url: row.thumbnail_url,
            status: row.status.as_str().to_string(),
            phase: row.phase,
            progress_percent: row.progress_percent,
            speed_bps: row.speed_bps,
            eta_seconds: row.eta_seconds,
            preset_id: row.preset_id,
            output_dir: row.output_dir,
            final_path: row.final_path,
            error_message: row.error_message,
        })
        .collect();

    Ok(items)
}

#[tauri::command]
pub async fn get_history(
    state: State<'_, AppState>,
    limit: Option<u32>,
) -> Result<Vec<QueueItem>, String> {
    let mut db = state.db.lock().await;
    let rows = db
        .get_completed_downloads(limit.unwrap_or(100))
        .map_err(|e| format!("Failed to get history: {e}"))?;

    let items: Vec<QueueItem> = rows
        .into_iter()
        .map(|row| QueueItem {
            id: row.id,
            source_url: row.source_url,
            title: row.title,
            uploader: row.uploader,
            thumbnail_url: row.thumbnail_url,
            status: row.status.as_str().to_string(),
            phase: row.phase,
            progress_percent: row.progress_percent,
            speed_bps: row.speed_bps,
            eta_seconds: row.eta_seconds,
            preset_id: row.preset_id,
            output_dir: row.output_dir,
            final_path: row.final_path,
            error_message: row.error_message,
        })
        .collect();

    Ok(items)
}

#[tauri::command]
pub async fn clear_queue(state: State<'_, AppState>) -> Result<(), String> {
    let mut db = state.db.lock().await;
    db.clear_queued_downloads()
        .map_err(|e| format!("Failed to clear queue: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    let mut db = state.db.lock().await;
    db.clear_completed_downloads()
        .map_err(|e| format!("Failed to clear history: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn remove_download(state: State<'_, AppState>, id: Uuid) -> Result<(), String> {
    {
        let dm = state.download_manager.read().await;
        if let Some(ref manager) = *dm {
            let _ = manager.cancel(id).await;
        }
    }

    let mut db = state.db.lock().await;
    db.delete_download(id)
        .map_err(|e| format!("Failed to remove download: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn update_download_task(
    state: State<'_, AppState>,
    options: UpdateDownloadTaskOptions,
) -> Result<(), String> {
    let mut db = state.db.lock().await;
    db.update_download_task(
        options.id,
        &options.source_url,
        options.title.as_deref(),
        &options.output_dir,
        options.referer_url.as_deref(),
        &options.preset_id,
    )
    .map_err(|e| format!("Failed to update download task: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn clean_missing_downloads(state: State<'_, AppState>) -> Result<Vec<Uuid>, String> {
    let mut db = state.db.lock().await;
    db.clean_missing_downloads()
        .map_err(|e| format!("Failed to clean missing downloads: {e}"))
}
