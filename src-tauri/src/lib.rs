use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

use tauri::{AppHandle, Manager, State};
use tokio::sync::{mpsc, Mutex, RwLock};
use uuid::Uuid;

pub mod commands;
pub mod db;
pub mod download_manager;
pub mod events;
pub mod models;
pub mod settings;
pub mod tool_manager;
pub mod url_utils;
pub mod whisper;
pub mod ytdlp;

use commands::FetchMetadataResult;
use download_manager::{DownloadConfig, DownloadManager};
use events::DownlinkEvent;
use settings::SettingsManager;
use tool_manager::{ToolManager, ToolManagerConfig};

pub struct CachedMeta {
    pub result: FetchMetadataResult,
    pub fetched_at: Instant,
}

pub struct AppState {
    pub db: Arc<Mutex<db::Db>>,
    pub download_manager: RwLock<Option<Arc<DownloadManager>>>,
    pub tool_manager: RwLock<Option<Arc<ToolManager>>>,
    pub event_tx: Arc<Mutex<Option<mpsc::Sender<DownlinkEvent>>>>,
    pub metadata_cache: Mutex<HashMap<String, CachedMeta>>,
}

pub async fn get_or_init_download_manager(
    state: &State<'_, AppState>,
    app: &AppHandle,
) -> Arc<DownloadManager> {
    {
        let dm = state.download_manager.read().await;
        if let Some(ref manager) = *dm {
            return manager.clone();
        }
    }

    let mut dm = state.download_manager.write().await;
    if let Some(ref manager) = *dm {
        return manager.clone();
    }

    let (event_tx, mut event_rx) = mpsc::channel::<DownlinkEvent>(256);

    {
        let mut tx_guard = state.event_tx.lock().await;
        *tx_guard = Some(event_tx.clone());
    }

    let app_handle = app.clone();
    tokio::spawn(async move {
        log::info!("Event forwarding task started");

        let mut speed_map: HashMap<Uuid, u64> = HashMap::new();
        let mut pct_map: HashMap<Uuid, f64> = HashMap::new();

        while let Some(event) = event_rx.recv().await {
            match &event {
                DownlinkEvent::DownloadProgress { id, progress, .. } => {
                    if let Some(spd) = progress.speed_bps {
                        speed_map.insert(*id, spd);
                    }
                    if let Some(pct) = progress.percent {
                        pct_map.insert(*id, pct);
                    }
                    update_dock_and_title(&app_handle, &speed_map, &pct_map);
                }
                DownlinkEvent::DownloadCompleted { id, .. }
                | DownlinkEvent::DownloadFailed { id, .. }
                | DownlinkEvent::DownloadCanceled { id }
                | DownlinkEvent::DownloadStopped { id } => {
                    speed_map.remove(id);
                    pct_map.remove(id);
                    update_dock_and_title(&app_handle, &speed_map, &pct_map);
                }
                _ => {}
            }

            log::info!("Forwarding event to frontend: {:?}", event);
            match events::emit_event(&app_handle, event) {
                Ok(_) => log::debug!("Event emitted successfully"),
                Err(e) => log::error!("Failed to emit event: {:?}", e),
            }
        }
        log::warn!("Event forwarding task ended");
    });

    {
        let mut db = state.db.lock().await;
        let _ = db.reset_orphaned_downloads();
    }
    crate::db::cleanup_stale_temp_files().await;

    let settings = {
        let db = state.db.lock().await;
        let manager = SettingsManager::new(db.conn());
        manager.get_user_settings().unwrap_or_default()
    };

    let (yt_dlp_path, ffmpeg_path) = {
        let tm = state.tool_manager.read().await;
        let yt_dlp_path = if let Some(ref manager) = *tm {
            manager.yt_dlp_path().await
        } else {
            None
        };
        let ffmpeg_path = if let Some(ref manager) = *tm {
            manager.ffmpeg_path().await
        } else {
            None
        };
        (yt_dlp_path, ffmpeg_path)
    };

    let config = DownloadConfig {
        yt_dlp_path: yt_dlp_path.unwrap_or_else(download_manager::find_ytdlp_binary),
        ffmpeg_path: ffmpeg_path.or_else(download_manager::find_ffmpeg_binary),
        max_concurrent: settings.general.concurrency as usize,
        default_output_template: settings.formats.filename_template,
    };
    let manager = Arc::new(DownloadManager::new(config, state.db.clone(), event_tx));
    manager.start_completion_listener();

    *dm = Some(manager.clone());
    manager
}

fn update_dock_and_title(
    app: &AppHandle,
    speed_map: &HashMap<Uuid, u64>,
    pct_map: &HashMap<Uuid, f64>,
) {
    let total_speed: u64 = speed_map.values().sum();
    let active_count = pct_map.len();

    if let Some(window) = app.get_webview_window("main") {
        let title = if active_count > 0 {
            format!("↓ {} — Downlink", format_speed_str(total_speed))
        } else {
            "Downlink".to_string()
        };
        let _ = window.set_title(&title);

        #[cfg(target_os = "macos")]
        {
            use tauri::window::ProgressBarState;
            if active_count > 0 {
                let avg_pct = pct_map.values().sum::<f64>() / active_count as f64;
                let _ = window.set_progress_bar(ProgressBarState {
                    progress: Some(avg_pct as u64),
                    status: Some(tauri::window::ProgressBarStatus::Normal),
                });
            } else {
                let _ = window.set_progress_bar(ProgressBarState {
                    progress: Some(0),
                    status: Some(tauri::window::ProgressBarStatus::None),
                });
            }
        }
    }
}

fn format_speed_str(bps: u64) -> String {
    const MB: u64 = 1_048_576;
    const KB: u64 = 1_024;
    if bps >= MB {
        format!("{:.1} MB/s", bps as f64 / MB as f64)
    } else if bps >= KB {
        format!("{:.0} KB/s", bps as f64 / KB as f64)
    } else {
        format!("{} B/s", bps)
    }
}

pub async fn build_ytdlp_runner(state: &State<'_, AppState>) -> ytdlp::YtDlpRunner {
    let yt_dlp_path = {
        let tm = state.tool_manager.read().await;
        if let Some(ref manager) = *tm {
            manager.yt_dlp_path().await
        } else {
            None
        }
    }
    .unwrap_or_else(download_manager::find_ytdlp_binary);

    let cfg = ytdlp::YtDlpConfig::new(yt_dlp_path);
    ytdlp::YtDlpRunner::new(cfg)
}

fn emit_app_ready(app: &AppHandle, yt_dlp_version: Option<String>, ffmpeg_version: Option<String>) {
    let _ = events::emit_event(
        app,
        events::DownlinkEvent::AppReady {
            versions: events::ToolVersions {
                app_version: env!("CARGO_PKG_VERSION").to_string(),
                yt_dlp_version,
                ffmpeg_version,
            },
        },
    );
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .register_uri_scheme_protocol("dlsniff", |ctx, request| {
            use tauri::Emitter;
            if let Some(query) = request.uri().query() {
                if let Some(url_part) = query.split('&').find(|s| s.starts_with("url=")) {
                    if let Ok(decoded) = urlencoding::decode(&url_part[4..]) {
                        let _ = ctx.app_handle().emit("sniffed-url", serde_json::json!({ "url": decoded.into_owned() }));
                    }
                }
            }
            tauri::http::Response::builder()
                .status(200)
                .header("Access-Control-Allow-Origin", "*")
                .body(Vec::new())
                .unwrap()
        })
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{Menu, PredefinedMenuItem, Submenu};
                if let Ok(menu) = Menu::new(app.handle()) {
                    if let Ok(app_submenu) = Submenu::with_items(
                        app.handle(),
                        "Downlink",
                        true,
                        &[
                            &PredefinedMenuItem::services(app.handle(), None).unwrap(),
                            &PredefinedMenuItem::separator(app.handle()).unwrap(),
                            &PredefinedMenuItem::hide(app.handle(), None).unwrap(),
                            &PredefinedMenuItem::hide_others(app.handle(), None).unwrap(),
                            &PredefinedMenuItem::show_all(app.handle(), None).unwrap(),
                            &PredefinedMenuItem::separator(app.handle()).unwrap(),
                            &PredefinedMenuItem::quit(app.handle(), None).unwrap(),
                        ],
                    ) {
                        let _ = menu.append(&app_submenu);
                    }

                    if let Ok(edit_submenu) = Submenu::with_items(
                        app.handle(),
                        "Edit",
                        true,
                        &[
                            &PredefinedMenuItem::undo(app.handle(), None).unwrap(),
                            &PredefinedMenuItem::redo(app.handle(), None).unwrap(),
                            &PredefinedMenuItem::separator(app.handle()).unwrap(),
                            &PredefinedMenuItem::cut(app.handle(), None).unwrap(),
                            &PredefinedMenuItem::copy(app.handle(), None).unwrap(),
                            &PredefinedMenuItem::paste(app.handle(), None).unwrap(),
                            &PredefinedMenuItem::select_all(app.handle(), None).unwrap(),
                        ],
                    ) {
                        let _ = menu.append(&edit_submenu);
                    }

                    let _ = app.set_menu(menu);
                }
            }

            let window = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{
                    apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState,
                };
                let _ = apply_vibrancy(
                    &window,
                    NSVisualEffectMaterial::HudWindow,
                    Some(NSVisualEffectState::Active),
                    None,
                );
            }
            #[cfg(target_os = "windows")]
            {
                let _ = window_vibrancy::apply_mica(&window, None);
            }

            let mut db = db::Db::open().map_err(|e| tauri::Error::Anyhow(e))?;
            let _ = db.reset_orphaned_downloads();

            let bundled_dir = std::env::current_exe()
                .ok()
                .and_then(|exe| exe.parent().map(|p| p.to_path_buf()));

            let tool_config = if let Some(dir) = bundled_dir {
                log::info!("Setting bundled_dir to: {:?}", dir);
                tool_manager::ToolManagerConfigBuilder::new()
                    .bundled_dir(dir)
                    .build()
            } else {
                log::warn!("Could not determine executable directory, using default config");
                ToolManagerConfig::default()
            };
            let tool_manager = ToolManager::new(tool_config).ok().map(Arc::new);

            app.manage(AppState {
                db: Arc::new(Mutex::new(db)),
                download_manager: RwLock::new(None),
                tool_manager: RwLock::new(tool_manager),
                event_tx: Arc::new(Mutex::new(None)),
                metadata_cache: Mutex::new(HashMap::new()),
            });

            emit_app_ready(&app.handle(), None, None);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // URL and queue management
            commands::downloads::add_urls,
            commands::metadata::fetch_metadata,
            commands::metadata::preview_playlist,
            commands::metadata::expand_playlist,
            commands::system::extract_urls_from_text,
            // Download control
            commands::downloads::start_download,
            commands::downloads::stop_download,
            commands::downloads::cancel_download,
            commands::downloads::retry_download,
            commands::downloads::start_all_downloads,
            commands::downloads::stop_all_downloads,
            // Queue and history
            commands::downloads::get_queue,
            commands::downloads::get_history,
            commands::downloads::clear_queue,
            commands::downloads::clear_history,
            commands::downloads::remove_download,
            commands::downloads::update_download_task,
            commands::downloads::clean_missing_downloads,
            // Settings
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::get_window_state,
            commands::settings::save_window_state,
            // Tools
            commands::tools::get_toolchain_status,
            commands::tools::check_for_updates,
            commands::tools::update_tool,
            // Presets
            commands::settings::get_presets,
            // Utilities
            commands::system::get_app_data_dir,
            commands::system::get_app_version,
            commands::settings::get_default_download_dir,
            commands::system::open_file,
            commands::system::open_folder,
            // App updates
            commands::system::check_app_update,
            commands::system::install_app_update,
            commands::system::restart_app,
            // Window
            commands::system::set_window_title,
            // Fast preview
            commands::metadata::fast_fetch_metadata,
            commands::metadata::proxy_oembed_request,
            // AI Transcription
            commands::tools::check_whisper,
            commands::tools::transcribe_file,
            // Cross-device Continuity
            commands::continuity::get_nearby_devices,
            commands::continuity::handoff_download,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
