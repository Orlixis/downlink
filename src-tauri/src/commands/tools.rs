use tauri::{AppHandle, State};

use crate::events::{self, DownlinkEvent};
use crate::settings::{SettingsManager, TranscriptionProvider};
use crate::tool_manager::ToolchainStatus;
use crate::whisper::{self, TranscriptionResult, WhisperModel};
use crate::AppState;

#[tauri::command]
pub async fn get_toolchain_status(state: State<'_, AppState>) -> Result<ToolchainStatus, String> {
    let tm = state.tool_manager.read().await;
    if let Some(ref manager) = *tm {
        Ok(manager.get_toolchain_status().await)
    } else {
        Err("Tool manager not initialized".to_string())
    }
}

#[tauri::command]
pub async fn check_for_updates(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let tm = state.tool_manager.read().await;
    if let Some(ref manager) = *tm {
        let updates = manager
            .check_for_updates()
            .await
            .map_err(|e| format!("Failed to check for updates: {e}"))?;
        Ok(updates.into_iter().map(|u| u.tool).collect())
    } else {
        Err("Tool manager not initialized".to_string())
    }
}

#[tauri::command]
pub async fn update_tool(
    app: AppHandle,
    state: State<'_, AppState>,
    tool_name: String,
) -> Result<String, String> {
    let tm = state.tool_manager.read().await;
    if let Some(ref manager) = *tm {
        let updates = manager
            .check_for_updates()
            .await
            .map_err(|e| format!("Failed to check for updates: {e}"))?;

        let entry = updates
            .into_iter()
            .find(|u| u.tool == tool_name)
            .ok_or_else(|| format!("No update available for {}", tool_name))?;

        let app_handle = app.clone();
        let tool_name_clone = tool_name.clone();
        let path = manager
            .update_tool(&entry, move |progress| {
                let _ = events::emit_event(
                    &app_handle,
                    DownlinkEvent::ToolUpdateProgress {
                        info: events::ToolUpdateProgressInfo {
                            tool: tool_name_clone.clone(),
                            percent: progress,
                        },
                    },
                );
            })
            .await
            .map_err(|e| format!("Failed to update {}: {e}", tool_name))?;

        let _ = events::emit_event(
            &app,
            DownlinkEvent::ToolUpdateCompleted {
                tool: tool_name.clone(),
                version: entry.version.clone(),
            },
        );

        Ok(path.to_string_lossy().to_string())
    } else {
        Err("Tool manager not initialized".to_string())
    }
}

#[tauri::command]
pub fn check_whisper() -> String {
    whisper::check_whisper().unwrap_or_default()
}

#[tauri::command]
pub async fn transcribe_file(
    state: State<'_, AppState>,
    file_path: String,
    model: Option<WhisperModel>,
) -> Result<TranscriptionResult, String> {
    let path = std::path::PathBuf::from(&file_path);
    let model = model.unwrap_or(WhisperModel::Base);

    let (user_key, provider) = {
        let db_guard = state.db.lock().await;
        let settings_manager = SettingsManager::new(db_guard.conn());
        match settings_manager.get_user_settings() {
            Ok(s) => {
                let key = s.transcription.api_key.trim().to_string();
                let key = if key.is_empty() { None } else { Some(key) };
                (key, s.transcription.provider)
            }
            Err(_) => (None, TranscriptionProvider::Groq),
        }
    };

    whisper::transcribe(&path, model, user_key.as_deref(), &provider)
        .await
        .map_err(|e| {
            let kind = serde_json::to_string(&e.kind).unwrap_or_default();
            format!("{kind}: {}", e.message)
        })
}
