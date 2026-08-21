use std::path::PathBuf;
use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::db;
use crate::url_utils;

#[derive(Debug, Clone, Serialize)]
pub struct AppUpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub release_notes: Option<String>,
    pub download_url: Option<String>,
}

#[tauri::command]
pub fn get_app_data_dir() -> Result<String, String> {
    db::app_data_dir()
        .map(|p: PathBuf| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn set_window_title(app: AppHandle, title: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_title(&title).map_err(|e| e.to_string())
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
pub fn extract_urls_from_text(text: String) -> Vec<String> {
    url_utils::extract_urls(&text)
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<(), String> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(format!("File does not exist: {}", path.display()));
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {e}"))?;
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        open::that(&path).map_err(|e| format!("Failed to open file: {e}"))
    }
}

#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    let path = PathBuf::from(&path);

    let folder = if path.is_file() {
        path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| path.clone())
    } else if path.exists() {
        path.clone()
    } else {
        path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| dirs::download_dir().unwrap_or_else(|| PathBuf::from("/")))
    };

    #[cfg(target_os = "macos")]
    {
        if path.is_file() && path.exists() {
            std::process::Command::new("open")
                .arg("-R")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("Failed to reveal in Finder: {e}"))?;
        } else {
            std::process::Command::new("open")
                .arg(&folder)
                .spawn()
                .map_err(|e| format!("Failed to open folder: {e}"))?;
        }
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        if path.is_file() && path.exists() {
            std::process::Command::new("explorer")
                .arg("/select,")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("Failed to reveal in Explorer: {e}"))?;
        } else {
            std::process::Command::new("explorer")
                .arg(&folder)
                .spawn()
                .map_err(|e| format!("Failed to open folder: {e}"))?;
        }
        Ok(())
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        open::that(&folder).map_err(|e| format!("Failed to open folder: {e}"))
    }
}

#[tauri::command]
pub async fn check_app_update(app: AppHandle) -> Result<AppUpdateInfo, String> {
    use tauri_plugin_updater::UpdaterExt;

    let current_version = env!("CARGO_PKG_VERSION").to_string();

    match app.updater() {
        Ok(updater) => {
            match updater.check().await {
                Ok(Some(update)) => Ok(AppUpdateInfo {
                    available: true,
                    current_version,
                    latest_version: Some(update.version.clone()),
                    release_notes: update.body.clone(),
                    download_url: None,
                }),
                Ok(None) => Ok(AppUpdateInfo {
                    available: false,
                    current_version,
                    latest_version: None,
                    release_notes: None,
                    download_url: None,
                }),
                Err(e) => {
                    log::warn!(
                        "Failed to check for updates (this is normal if no release exists yet): {}",
                        e
                    );
                    Ok(AppUpdateInfo {
                        available: false,
                        current_version,
                        latest_version: None,
                        release_notes: None,
                        download_url: None,
                    })
                }
            }
        }
        Err(e) => {
            log::warn!("Updater not available: {}", e);
            Ok(AppUpdateInfo {
                available: false,
                current_version: current_version.clone(),
                latest_version: None,
                release_notes: None,
                download_url: None,
            })
        }
    }
}

#[tauri::command]
pub async fn install_app_update(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app
        .updater()
        .map_err(|e| format!("Updater not available: {}", e))?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("Failed to check for updates: {}", e))?
        .ok_or_else(|| "No update available".to_string())?;

    log::info!(
        "Downloading and installing update to version {}",
        update.version
    );

    let mut downloaded = 0;
    let mut total = 0;

    update
        .download_and_install(
            |chunk_length, content_length| {
                downloaded += chunk_length;
                total = content_length.unwrap_or(0);
                log::info!("Downloaded {} of {} bytes", downloaded, total);
            },
            || {
                log::info!("Download complete, installing...");
            },
        )
        .await
        .map_err(|e| format!("Failed to download/install update: {}", e))?;

    log::info!("Update installed successfully. Restart required.");

    Ok(())
}

#[tauri::command]
pub async fn restart_app(app: AppHandle) -> Result<(), String> {
    app.restart();
}
