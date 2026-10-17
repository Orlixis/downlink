use std::path::{Path, PathBuf};
use include_dir::{include_dir, Dir};
use serde::Serialize;
use tauri::AppHandle;

use crate::db;

static EMBEDDED_EXTENSIONS: Dir = include_dir!("$CARGO_MANIFEST_DIR/../extensions");

#[derive(Debug, Clone, Serialize)]
pub struct DetectedBrowser {
    pub id: String,
    pub name: String,
    pub is_installed: bool,
    pub is_default: bool,
    pub extension_type: String,
    pub app_path: Option<String>,
}

/// Ensures the browser extension files are extracted and ready on disk.
/// Returns the canonical absolute path to the specified browser's extension directory.
pub fn ensure_extension_dir(browser: &str) -> Result<PathBuf, String> {
    let sub = match browser {
        "firefox" | "zen" => "firefox",
        "safari" => "safari",
        _ => "chrome",
    };

    // 1. Check if running in development with workspace extensions directory
    if let Ok(current) = std::env::current_dir() {
        let dev_path = current.join("extensions").join(sub);
        if dev_path.join("manifest.json").exists() {
            return Ok(dev_path);
        }
        if let Some(parent) = current.parent() {
            let parent_dev = parent.join("extensions").join(sub);
            if parent_dev.join("manifest.json").exists() {
                return Ok(parent_dev);
            }
        }
    }

    // 2. Extract embedded extensions into the user's Downlink AppData directory
    let data_dir = db::app_data_dir().map_err(|e| format!("Failed to get app data dir: {e}"))?;
    let target_root = data_dir.join("extensions");
    let target_sub = target_root.join(sub);

    // If manifest doesn't exist or we need to update/extract files, extract from embedded bundle
    let needs_extraction = !target_sub.join("manifest.json").exists()
        || !target_sub.join("content.js").exists()
        || !target_sub.join("background.js").exists();

    if needs_extraction {
        let _ = std::fs::create_dir_all(&target_root);
        if let Err(e) = EMBEDDED_EXTENSIONS.extract(&target_root) {
            log::warn!("Failed to extract embedded extensions to {}: {}", target_root.display(), e);
        }
    }

    if target_sub.exists() {
        Ok(target_sub)
    } else {
        // Fallback: create directory and write minimal manifest if extraction failed
        let _ = std::fs::create_dir_all(&target_sub);
        Ok(target_sub)
    }
}

#[tauri::command]
pub async fn get_extension_folder_path(_app: AppHandle, browser: String) -> Result<String, String> {
    let path = ensure_extension_dir(&browser)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn detect_installed_browsers() -> Result<Vec<DetectedBrowser>, String> {
    let mut browsers = Vec::new();

    #[cfg(target_os = "macos")]
    {
        let mut default_bundle_id: Option<String> = None;
        if let Ok(output) = std::process::Command::new("defaults")
            .args(["read", "com.apple.LaunchServices/com.apple.launchservices.secure", "LSHandlers"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            let mut current_role = None;
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.contains("LSHandlerURLScheme = https;") || trimmed.contains("LSHandlerURLScheme = http;") {
                    current_role = Some("http");
                } else if trimmed.starts_with("LSHandlerRoleAll =") && current_role == Some("http") {
                    if let Some(bundle) = trimmed.split('"').nth(1) {
                        default_bundle_id = Some(bundle.to_string());
                        break;
                    }
                }
            }
        }

        let candidates = [
            ("chrome", "Google Chrome", "chrome", "com.google.Chrome", "/Applications/Google Chrome.app"),
            ("brave", "Brave Browser", "chrome", "com.brave.Browser", "/Applications/Brave Browser.app"),
            ("arc", "Arc", "chrome", "company.thebrowser.Browser", "/Applications/Arc.app"),
            ("edge", "Microsoft Edge", "chrome", "com.microsoft.edgemac", "/Applications/Microsoft Edge.app"),
            ("opera", "Opera", "chrome", "com.operasoftware.Opera", "/Applications/Opera.app"),
            ("vivaldi", "Vivaldi", "chrome", "com.vivaldi.Vivaldi", "/Applications/Vivaldi.app"),
            ("firefox", "Firefox", "firefox", "org.mozilla.firefox", "/Applications/Firefox.app"),
            ("zen", "Zen Browser", "firefox", "app.zen-browser.zen", "/Applications/Zen.app"),
            ("safari", "Safari", "safari", "com.apple.Safari", "/Applications/Safari.app"),
        ];

        for (id, name, ext_type, bundle_id, app_path) in candidates {
            let installed = Path::new(app_path).exists();
            let is_default = default_bundle_id.as_deref() == Some(bundle_id);

            if installed {
                browsers.push(DetectedBrowser {
                    id: id.to_string(),
                    name: name.to_string(),
                    is_installed: installed,
                    is_default,
                    extension_type: ext_type.to_string(),
                    app_path: Some(app_path.to_string()),
                });
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let program_files = std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
        let program_files_x86 = std::env::var("ProgramFiles(x86)").unwrap_or_else(|_| "C:\\Program Files (x86)".to_string());

        let candidates = [
            ("chrome", "Google Chrome", "chrome", vec![
                format!("{}\\Google\\Chrome\\Application\\chrome.exe", program_files),
                format!("{}\\Google\\Chrome\\Application\\chrome.exe", program_files_x86),
                format!("{}\\Google\\Chrome\\Application\\chrome.exe", local_app_data),
            ]),
            ("edge", "Microsoft Edge", "chrome", vec![
                format!("{}\\Microsoft\\Edge\\Application\\msedge.exe", program_files),
                format!("{}\\Microsoft\\Edge\\Application\\msedge.exe", program_files_x86),
            ]),
            ("brave", "Brave Browser", "chrome", vec![
                format!("{}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe", program_files),
                format!("{}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe", local_app_data),
            ]),
            ("firefox", "Firefox", "firefox", vec![
                format!("{}\\Mozilla Firefox\\firefox.exe", program_files),
                format!("{}\\Mozilla Firefox\\firefox.exe", program_files_x86),
            ]),
            ("opera", "Opera", "chrome", vec![
                format!("{}\\Programs\\Opera\\launcher.exe", local_app_data),
                format!("{}\\Opera\\launcher.exe", program_files),
            ]),
            ("vivaldi", "Vivaldi", "chrome", vec![
                format!("{}\\Vivaldi\\Application\\vivaldi.exe", local_app_data),
                format!("{}\\Vivaldi\\Application\\vivaldi.exe", program_files),
            ]),
            ("arc", "Arc", "chrome", vec![
                format!("{}\\Arc\\Arc.exe", local_app_data),
            ]),
        ];

        for (id, name, ext_type, paths) in candidates {
            let mut installed_path = None;
            for p in paths {
                if Path::new(&p).exists() {
                    installed_path = Some(p);
                    break;
                }
            }

            if let Some(path) = installed_path {
                browsers.push(DetectedBrowser {
                    id: id.to_string(),
                    name: name.to_string(),
                    is_installed: true,
                    is_default: id == "edge" || id == "chrome",
                    extension_type: ext_type.to_string(),
                    app_path: Some(path),
                });
            }
        }
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        let candidates = [
            ("chrome", "Google Chrome", "chrome", "/usr/bin/google-chrome"),
            ("chromium", "Chromium", "chrome", "/usr/bin/chromium-browser"),
            ("brave", "Brave Browser", "chrome", "/usr/bin/brave-browser"),
            ("firefox", "Firefox", "firefox", "/usr/bin/firefox"),
            ("zen", "Zen Browser", "firefox", "/usr/bin/zen"),
            ("edge", "Microsoft Edge", "chrome", "/usr/bin/microsoft-edge"),
        ];

        for (id, name, ext_type, bin_path) in candidates {
            if Path::new(bin_path).exists() {
                browsers.push(DetectedBrowser {
                    id: id.to_string(),
                    name: name.to_string(),
                    is_installed: true,
                    is_default: false,
                    extension_type: ext_type.to_string(),
                    app_path: Some(bin_path.to_string()),
                });
            }
        }
    }

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

    let extension_url = match browser_id.as_str() {
        "chrome" => "chrome://extensions",
        "brave" => "brave://extensions",
        "edge" => "edge://extensions",
        "opera" => "opera://extensions",
        "vivaldi" => "vivaldi://extensions",
        "arc" => "arc://extensions",
        "firefox" | "zen" => "https://addons.mozilla.org/en-US/firefox/addon/downlink-companion/",
        _ => "chrome://extensions",
    };

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

        if browser_id == "safari" {
            let _ = std::process::Command::new("open").arg("-a").arg("Safari").spawn();
        } else {
            let _ = std::process::Command::new("open").arg("-a").arg(app_name).arg(extension_url).spawn();
        }

        // Reveal the folder in Finder
        let _ = std::process::Command::new("open").arg(&folder_path).spawn();

        // Copy path to clipboard
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

    #[cfg(target_os = "windows")]
    {
        // Open browser extension page
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", extension_url])
            .spawn();

        // Open folder in Explorer
        let _ = std::process::Command::new("explorer")
            .arg(&folder_path)
            .spawn();

        // Copy path to clipboard via powershell
        let clipboard_text = if ext_type == "firefox" {
            format!("{}\\\\manifest.json", folder_path)
        } else {
            folder_path.clone()
        };

        let _ = std::process::Command::new("powershell")
            .args(["-Command", &format!("Set-Clipboard -Value '{}'", clipboard_text)])
            .spawn();
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        let _ = std::process::Command::new("xdg-open").arg(extension_url).spawn();
        let _ = std::process::Command::new("xdg-open").arg(&folder_path).spawn();
    }

    Ok(folder_path)
}
