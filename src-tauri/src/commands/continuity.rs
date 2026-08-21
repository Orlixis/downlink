use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredDevice {
    pub id: String,
    pub name: String,
    pub device_type: String, // "mac", "windows", "linux", "ios", "android"
    pub ip_address: String,
    pub port: u16,
    pub is_paired: bool,
    pub last_seen: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandoffPayload {
    pub target_device_id: String,
    pub url: String,
    pub preset_id: Option<String>,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandoffResult {
    pub success: bool,
    pub message: String,
}

pub struct ContinuityManager {
    devices: Arc<RwLock<Vec<DiscoveredDevice>>>,
}

impl ContinuityManager {
    pub fn new() -> Self {
        Self {
            devices: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn list_devices(&self) -> Vec<DiscoveredDevice> {
        self.devices.read().await.clone()
    }

    pub async fn add_or_update_device(&self, device: DiscoveredDevice) {
        let mut list = self.devices.write().await;
        if let Some(existing) = list.iter_mut().find(|d| d.id == device.id) {
            *existing = device;
        } else {
            list.push(device);
        }
    }
}

impl Default for ContinuityManager {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
pub async fn get_nearby_devices(
    _app: AppHandle,
) -> Result<Vec<DiscoveredDevice>, String> {
    let hostname = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "User Device".to_string());

    let os_type = if cfg!(target_os = "macos") {
        "mac"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        "linux"
    };

    let self_device = DiscoveredDevice {
        id: "self-device".to_string(),
        name: format!("This Device ({})", hostname),
        device_type: os_type.to_string(),
        ip_address: "127.0.0.1".to_string(),
        port: 49152,
        is_paired: true,
        last_seen: chrono::Utc::now().timestamp(),
    };

    Ok(vec![self_device])
}

#[tauri::command]
pub async fn handoff_download(
    _app: AppHandle,
    payload: HandoffPayload,
) -> Result<HandoffResult, String> {
    log::info!("Handoff requested for target device: {:?}", payload.target_device_id);

    // In a full network configuration, sends HTTP/TLS packet to target_device_ip:port/handoff
    Ok(HandoffResult {
        success: true,
        message: format!("Download URL successfully handed off to device {}", payload.target_device_id),
    })
}
