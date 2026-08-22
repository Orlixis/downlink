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
                    }),
                );
                log::info!("Downloaded {} of {} bytes", downloaded, total);
            },
            move || {
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

#[tauri::command]
pub async fn get_extension_folder_path(app: AppHandle, browser: String) -> Result<String, String> {
    let sub = match browser.as_str() {
        "firefox" => "extensions/firefox",
        "safari" => "extensions/safari",
        _ => "extensions/chrome",
    };

    let current = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

    // Check current dir
    let in_current = current.join(sub);
    if in_current.exists() {
        return Ok(in_current.to_string_lossy().to_string());
    }

    // Check parent dir (dev mode when working directory is src-tauri)
    if let Some(parent) = current.parent() {
        let in_parent = parent.join(sub);
        if in_parent.exists() {
            return Ok(in_parent.to_string_lossy().to_string());
        }
    }

    // Check app resource dir (packaged app)
    if let Ok(resource_dir) = app.path().resource_dir() {
        let in_res = resource_dir.join(sub);
        if in_res.exists() {
            return Ok(in_res.to_string_lossy().to_string());
        }
    }

    // Fallback
    if let Some(parent) = current.parent() {
        Ok(parent.join(sub).to_string_lossy().to_string())
    } else {
        Ok(in_current.to_string_lossy().to_string())
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct DetectedBrowser {
    pub id: String,
    pub name: String,
    pub is_installed: bool,
    pub is_default: bool,
    pub extension_type: String,
    pub app_path: Option<String>,
}

#[tauri::command]
pub async fn detect_installed_browsers() -> Result<Vec<DetectedBrowser>, String> {
    let mut browsers = Vec::new();

    #[cfg(target_os = "macos")]
    {
        // 1. Query Default Browser Bundle ID via LaunchServices
        let mut default_bundle_id: Option<String> = None;
        if let Ok(output) = std::process::Command::new("defaults")
            .args(["read", "com.apple.LaunchServices/com.apple.launchservices.secure", "LSHandlers"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            let mut current_role = None;
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("LSHandlerRoleAll = \"") && !trimmed.contains("\"-\"") {
                    if let Some(start) = trimmed.find('"') {
                        if let Some(end) = trimmed[start + 1..].find('"') {
                            current_role = Some(trimmed[start + 1..start + 1 + end].to_string());
                        }
                    }
                } else if trimmed == "LSHandlerURLScheme = https;" || trimmed == "LSHandlerURLScheme = http;" {
                    if let Some(ref role) = current_role {
                        default_bundle_id = Some(role.clone());
                        break;
                    }
                }
            }
        }

        let default_bid = default_bundle_id.unwrap_or_else(|| "com.apple.Safari".to_string());

        let candidates = [
            ("zen", "Zen Browser", "firefox", vec!["app.zen-browser.zen"], vec![
                "/Applications/Zen.app",
                "/Applications/Zen Browser.app",
                "~/Applications/Zen.app",
                "~/Applications/Zen Browser.app"
            ]),
            ("chrome", "Google Chrome", "chrome", vec!["com.google.Chrome", "com.google.Chrome.canary"], vec![
                "/Applications/Google Chrome.app",
                "~/Applications/Google Chrome.app"
            ]),
            ("safari", "Apple Safari", "safari", vec!["com.apple.Safari"], vec![
                "/Applications/Safari.app",
                "/System/Applications/Safari.app"
            ]),
            ("brave", "Brave Browser", "chrome", vec!["com.brave.Browser"], vec![
                "/Applications/Brave Browser.app",
                "~/Applications/Brave Browser.app"
            ]),
            ("arc", "Arc", "chrome", vec!["company.thebrowser.Browser"], vec![
                "/Applications/Arc.app",
                "~/Applications/Arc.app"
            ]),
            ("edge", "Microsoft Edge", "chrome", vec!["com.microsoft.edgemac"], vec![
                "/Applications/Microsoft Edge.app",
                "~/Applications/Microsoft Edge.app"
            ]),
            ("firefox", "Mozilla Firefox", "firefox", vec!["org.mozilla.firefox"], vec![
                "/Applications/Firefox.app",
                "~/Applications/Firefox.app",
                "/Applications/Firefox Developer Edition.app"
            ]),
            ("opera", "Opera", "chrome", vec!["com.operasoftware.Opera", "com.operasoftware.OperaGX"], vec![
                "/Applications/Opera.app",
                "/Applications/Opera GX.app",
                "~/Applications/Opera.app"
            ]),
            ("vivaldi", "Vivaldi", "chrome", vec!["com.vivaldi.Vivaldi"], vec![
                "/Applications/Vivaldi.app",
                "~/Applications/Vivaldi.app"
            ]),
        ];

        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));

        for (id, name, ext_type, bundle_ids, paths) in candidates {
            let mut found_path = None;
            for p in paths {
                let expanded = if p.starts_with("~/") {
                    home.join(&p[2..])
                } else {
                    PathBuf::from(p)
                };
                if expanded.exists() {
                    found_path = Some(expanded.to_string_lossy().to_string());
                    break;
                }
            }

            let is_installed = found_path.is_some();
            let is_default = bundle_ids.iter().any(|b| default_bid.eq_ignore_ascii_case(b));

            if is_installed {
                browsers.push(DetectedBrowser {
                    id: id.to_string(),
                    name: name.to_string(),
                    is_installed,
                    is_default,
                    extension_type: ext_type.to_string(),
                    app_path: found_path,
                });
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let candidates = [
            ("chrome", "Google Chrome", "chrome", vec![
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
            ]),
            ("edge", "Microsoft Edge", "chrome", vec![
                "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
                "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
            ]),
            ("brave", "Brave Browser", "chrome", vec![
                "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
            ]),
            ("firefox", "Mozilla Firefox", "firefox", vec![
                "C:\\Program Files\\Mozilla Firefox\\firefox.exe"
            ]),
            ("zen", "Zen Browser", "firefox", vec![
                "C:\\Program Files\\Zen Browser\\zen.exe"
            ]),
            ("opera", "Opera", "chrome", vec![
                "C:\\Program Files\\Opera\\launcher.exe"
            ]),
        ];

        for (id, name, ext_type, paths) in candidates {
            let mut found = false;
            let mut found_p = None;
            for p in paths {
                if PathBuf::from(p).exists() {
                    found = true;
                    found_p = Some(p.to_string());
                    break;
                }
            }
            if found {
                browsers.push(DetectedBrowser {
                    id: id.to_string(),
                    name: name.to_string(),
                    is_installed: found,
                    is_default: false,
                    extension_type: ext_type.to_string(),
                    app_path: found_p,
                });
            }
        }
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        let candidates = [
            ("chrome", "Google Chrome", "chrome", "/usr/bin/google-chrome"),
            ("firefox", "Mozilla Firefox", "firefox", "/usr/bin/firefox"),
            ("zen", "Zen Browser", "firefox", "/usr/bin/zen"),
            ("brave", "Brave Browser", "chrome", "/usr/bin/brave-browser"),
            ("edge", "Microsoft Edge", "chrome", "/usr/bin/microsoft-edge"),
        ];

        for (id, name, ext_type, bin_path) in candidates {
            let installed = PathBuf::from(bin_path).exists();
            if installed {
                browsers.push(DetectedBrowser {
                    id: id.to_string(),
                    name: name.to_string(),
                    is_installed: installed,
                    is_default: false,
                    extension_type: ext_type.to_string(),
                    app_path: Some(bin_path.to_string()),
                });
            }
        }
    }

    // Sort so default browser appears first
    browsers.sort_by(|a, b| b.is_default.cmp(&a.is_default));

    Ok(browsers)
}

#[tauri::command]
pub async fn launch_browser_extension_installer(
    app: AppHandle,
    browser_id: String,
) -> Result<String, String> {
    let ext_type = match browser_id.as_str() {
        "firefox" | "zen" => "firefox",
        "safari" => "safari",
        _ => "chrome",
    };

    let folder_path = get_extension_folder_path(app.clone(), ext_type.to_string()).await?;

    #[cfg(target_os = "macos")]
    {
        let app_name = match browser_id.as_str() {
            "chrome" => "Google Chrome",
            "brave" => "Brave Browser",
            "arc" => "Arc",
            "edge" => "Microsoft Edge",
            "opera" => "Opera",
            "vivaldi" => "Vivaldi",
            "firefox" => "Firefox",
            "zen" => "Zen",
            "safari" => "Safari",
            _ => "Google Chrome",
        };

        let extension_url = match browser_id.as_str() {
            "chrome" => "chrome://extensions",
            "brave" => "brave://extensions",
            "edge" => "edge://extensions",
            "opera" => "opera://extensions",
            "vivaldi" => "vivaldi://extensions",
            "arc" => "arc://extensions",
            "firefox" | "zen" => "about:debugging",
            _ => "chrome://extensions",
        };

        if browser_id == "safari" {
            let _ = std::process::Command::new("open")
                .arg("-a")
                .arg("Safari")
                .spawn();
        } else {
            let _ = std::process::Command::new("open")
                .arg("-a")
                .arg(app_name)
                .arg(extension_url)
                .spawn();
        }

        // Reveal the folder in Finder side-by-side
        let _ = std::process::Command::new("open")
            .arg(&folder_path)
            .spawn();

        // Copy optimal path to clipboard via pbcopy
        let clipboard_text = if ext_type == "firefox" {
            format!("{}/manifest.json", folder_path)
        } else {
            folder_path.clone()
        };

        if let Ok(mut child) = std::process::Command::new("pbcopy")
            .stdin(std::process::Stdio::piped())
            .spawn()
        {
            use std::io::Write;
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(clipboard_text.as_bytes());
            }
        }
    }

    Ok(folder_path)
}




