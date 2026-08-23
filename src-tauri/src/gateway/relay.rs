use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{OnceLock, RwLock};
use tauri::AppHandle;

use super::CaptureRequest;

static ACTIVE_ROOM_CODE: OnceLock<RwLock<String>> = OnceLock::new();
static RELAY_ACTIVE: AtomicBool = AtomicBool::new(false);
pub const DEFAULT_RELAY_URL: &str = "https://relay.downlink.app";

fn get_room_lock() -> &'static RwLock<String> {
    ACTIVE_ROOM_CODE.get_or_init(|| {
        let raw = uuid::Uuid::new_v4().to_string();
        let suffix = raw[..4].to_uppercase();
        RwLock::new(format!("DL-{}", suffix))
    })
}

pub fn get_room_code_sync() -> String {
    get_room_lock().read().map(|g| g.clone()).unwrap_or_else(|_| "DL-9482".to_string())
}

pub async fn get_room_code() -> String {
    get_room_code_sync()
}

pub async fn rotate_room_code() -> String {
    let raw = uuid::Uuid::new_v4().to_string();
    let suffix = raw[..4].to_uppercase();
    let new_code = format!("DL-{}", suffix);
    if let Ok(mut lock) = get_room_lock().write() {
        *lock = new_code.clone();
    }
    new_code
}

/// Spawns the background outbound relay listener for Universal Cloud Continuity.
/// Because this is an OUTBOUND client connection, it completely bypasses all local firewalls,
/// router NATs, and Wi-Fi client isolation without requiring open incoming ports.
pub fn start_relay_service(app: AppHandle) {
    if RELAY_ACTIVE.swap(true, Ordering::SeqCst) {
        return;
    }

    tauri::async_runtime::spawn(async move {
        log::info!("[Relay] Universal Continuity Cloud Relay Service started.");
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(35))
            .build()
            .unwrap_or_default();

        let mut backoff_secs = 2u64;

        loop {
            let room_code = get_room_code().await;
            let relay_url = DEFAULT_RELAY_URL.trim_end_matches('/');
            let poll_url = format!("{}/api/relay/{}/poll", relay_url, urlencoding::encode(&room_code));

            match client.get(&poll_url).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        backoff_secs = 2; // reset backoff on active connection

                        if let Ok(captures) = response.json::<Vec<CaptureRequest>>().await {
                            for req in captures {
                                log::info!("[Relay] 📥 Received cloud download request for: {}", req.url);
                                let app_clone = app.clone();
                                let _ = super::process_captured_download(&app_clone, req).await;
                            }
                        }
                    } else if response.status().as_u16() == 404 || response.status().as_u16() == 204 {
                        // Room is idle / no pending items
                        backoff_secs = 2;
                    } else {
                        tokio::time::sleep(std::time::Duration::from_secs(backoff_secs)).await;
                        backoff_secs = (backoff_secs * 2).min(30);
                    }
                }
                Err(_) => {
                    // Relay server unreachable or network offline - exponential backoff
                    tokio::time::sleep(std::time::Duration::from_secs(backoff_secs)).await;
                    backoff_secs = (backoff_secs * 2).min(30);
                }
            }

            tokio::time::sleep(std::time::Duration::from_millis(800)).await;
        }
    });
}
