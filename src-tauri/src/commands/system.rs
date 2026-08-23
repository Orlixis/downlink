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
pub fn get_continuity_info() -> crate::gateway::discovery::ConnectionInfo {
    crate::gateway::discovery::get_local_connection_info()
}


#[tauri::command]
pub async fn open_file(path: String) -> Result<(), String> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(format!("File does not exist: {}", path.display()));
    }

    let target_path = if path.is_dir() {
        crate::download_manager::fixup::find_primary_media_file(&path).unwrap_or(path)
    } else {
        path
    };

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&target_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {e}"))?;
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        open::that(&target_path).map_err(|e| format!("Failed to open file: {e}"))?;
        Ok(())
    }
}

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {e}"))?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {e}"))?;
        Ok(())
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {e}"))?;
        Ok(())
    }
}

#[tauri::command]
pub async fn open_folder(_app: AppHandle, path: String) -> Result<(), String> {
    let raw_path = PathBuf::from(&path);

    let resolved_path = if raw_path.exists() {
        raw_path
    } else {
        let current = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let in_current = current.join(&raw_path);
        if in_current.exists() {
            in_current
        } else if let Some(parent) = current.parent() {
            let in_parent = parent.join(&raw_path);
            if in_parent.exists() {
                in_parent
            } else {
                in_current
            }
        } else {
            in_current
        }
    };

    let folder = if resolved_path.is_file() {
        resolved_path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| resolved_path.clone())
    } else if resolved_path.exists() {
        resolved_path.clone()
    } else {
        resolved_path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| dirs::download_dir().unwrap_or_else(|| PathBuf::from("/")))
    };

    #[cfg(target_os = "macos")]
    {
        if resolved_path.is_file() && resolved_path.exists() {
            std::process::Command::new("open")
                .arg("-R")
                .arg(&resolved_path)
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
        if resolved_path.is_file() && resolved_path.exists() {
            std::process::Command::new("explorer")
                .arg("/select,")
                .arg(&resolved_path)
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
    use tauri::Emitter;
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

    let mut downloaded: u64 = 0;

    let app_clone = app.clone();
    let app_clone_install = app.clone();
    update
        .download_and_install(
            move |chunk_length, content_length| {
                downloaded += chunk_length as u64;
                let total = content_length.unwrap_or(0);
                let _ = app_clone.emit(
                    "app-update-progress",
                    serde_json::json!({
                        "downloaded": downloaded,
                        "total": total,
                        "status": "downloading"
                    }),
                );
                log::info!("Downloaded {} of {} bytes", downloaded, total);
            },
            move || {
                let _ = app_clone_install.emit(
                    "app-update-progress",
                    serde_json::json!({
                        "downloaded": downloaded,
                        "total": downloaded,
                        "status": "installing"
                    }),
                );
                log::info!("Download complete, installing update...");
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
