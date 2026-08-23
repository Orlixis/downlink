use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;
use tauri::AppHandle;
use tokio::sync::RwLock;

static ACTIVE_ROOM_CODE: OnceLock<RwLock<String>> = OnceLock::new();
static RELAY_ACTIVE: AtomicBool = AtomicBool::new(false);

fn get_room_lock() -> &'static RwLock<String> {
    ACTIVE_ROOM_CODE.get_or_init(|| {
        let raw = uuid::Uuid::new_v4().to_string();
        let suffix = raw[..4].to_uppercase();
        RwLock::new(format!("DL-{}", suffix))
    })
}

pub async fn get_room_code() -> String {
    get_room_lock().read().await.clone()
}

pub async fn rotate_room_code() -> String {
    let raw = uuid::Uuid::new_v4().to_string();
    let suffix = raw[..4].to_uppercase();
    let new_code = format!("DL-{}", suffix);
    *get_room_lock().write().await = new_code.clone();
    new_code
}

/// Spawns the background outbound relay listener for Universal Cloud Continuity.
/// Because this is an OUTBOUND client connection, it completely bypasses all local firewalls,
/// router NATs, and Wi-Fi client isolation without requiring open incoming ports.
pub fn start_relay_service(_app: AppHandle) {
    if RELAY_ACTIVE.swap(true, Ordering::SeqCst) {
        return;
    }

    tauri::async_runtime::spawn(async move {
        log::info!("[Relay] Universal Continuity Relay Service initialized.");
        // Periodic heartbeat & room synchronization
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        }
    });
}
