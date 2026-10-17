use std::path::PathBuf;
use tauri::{AppHandle, State};

use super::downloads::start_all_downloads;
use super::types::PresetInfo;
use crate::download_manager::{self, DownloadConfig, Preset};
use crate::settings::{SettingsManager, UserSettings, WindowState};
use crate::AppState;

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<UserSettings, String> {
    let db = state.db.lock().await;
    let manager = SettingsManager::new(db.conn());
    manager
        .get_user_settings()
        .map_err(|e| format!("Failed to get settings: {e}"))
}

#[tauri::command]
pub async fn save_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: UserSettings,
) -> Result<(), String> {
    {
        let db = state.db.lock().await;
        let manager = SettingsManager::new(db.conn());
        manager
            .save_user_settings(&settings)
            .map_err(|e| format!("Failed to save settings: {e}"))?;
    }

    let dm = state.download_manager.read().await;
    if let Some(ref manager) = *dm {
        let (yt_dlp_path, ffmpeg_path) = {
            let tm = state.tool_manager.read().await;
            let yt_dlp_path = if let Some(ref manager) = *tm {
                manager.yt_dlp_path().await
            } else {
                None
            }
            .unwrap_or_else(download_manager::find_ytdlp_binary);

            let ffmpeg_path = if let Some(ref manager) = *tm {
                manager.ffmpeg_path().await
            } else {
                None
            }
            .or_else(download_manager::find_ffmpeg_binary);

            (yt_dlp_path, ffmpeg_path)
        };

        let new_config = DownloadConfig {
            max_concurrent: settings.general.concurrency as usize,
            default_output_template: settings.formats.filename_template,
            yt_dlp_path,
            ffmpeg_path,
            sponsorblock: Some(settings.sponsorblock),
        };
        manager.update_config(new_config).await;
        log::info!("Updated download manager config");
    }

    let has_manager = dm.is_some();
    drop(dm);

    if has_manager {
        let _ = start_all_downloads(app, state).await;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_window_state(state: State<'_, AppState>) -> Result<WindowState, String> {
    let db = state.db.lock().await;
    let manager = SettingsManager::new(db.conn());
    manager
        .get_window_state()
        .map_err(|e| format!("Failed to get window state: {e}"))
}

#[tauri::command]
pub async fn save_window_state(
    state: State<'_, AppState>,
    window_state: WindowState,
) -> Result<(), String> {
    let db = state.db.lock().await;
    let manager = SettingsManager::new(db.conn());
    manager
        .save_window_state(&window_state)
        .map_err(|e| format!("Failed to save window state: {e}"))
}

#[tauri::command]
pub fn get_presets() -> Vec<PresetInfo> {
    Preset::builtin_presets()
        .into_iter()
        .map(|p| PresetInfo {
            id: p.id,
            name: p.name,
        })
        .collect()
}

#[tauri::command]
pub fn get_default_download_dir() -> String {
    dirs::download_dir()
        .unwrap_or_else(|| PathBuf::from("~/Downloads"))
        .to_string_lossy()
        .to_string()
}
