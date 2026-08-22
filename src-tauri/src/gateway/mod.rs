use std::net::SocketAddr;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

use crate::db::SourceKind;
use crate::AppState;

pub const DEFAULT_GATEWAY_PORT: u16 = 3984;

#[derive(serde::Deserialize, Debug)]
pub struct CaptureRequest {
    pub url: String,
    pub title: Option<String>,
    pub referer: Option<String>,
    pub cookies: Option<String>,
    pub user_agent: Option<String>,
    pub preset_id: Option<String>,
    pub auto_start: Option<bool>,
}

#[derive(serde::Serialize, Debug)]
pub struct StatusResponse {
    pub status: &'static str,
    pub app: &'static str,
    pub version: &'static str,
    pub port: u16,
}

#[derive(serde::Serialize, Debug)]
pub struct CaptureResponse {
    pub success: bool,
    pub id: Option<String>,
    pub message: String,
}

/// Starts the embedded Downlink local loopback RPC server.
pub fn start_gateway_server(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let addr = SocketAddr::from(([127, 0, 0, 1], DEFAULT_GATEWAY_PORT));
        let listener = match TcpListener::bind(addr).await {
            Ok(l) => {
                log::info!("Downlink Gateway RPC Server listening on http://{}", addr);
                l
            }
            Err(e) => {
                log::warn!(
                    "Downlink Gateway: Failed to bind to port {}: {}. Extension integration may be unavailable.",
                    DEFAULT_GATEWAY_PORT,
                    e
                );
                return;
            }
        };

        loop {
            match listener.accept().await {
                Ok((stream, _)) => {
                    let app = app_handle.clone();
                    tokio::spawn(async move {
                        if let Err(e) = handle_connection(stream, app).await {
                            log::debug!("Gateway connection error: {}", e);
                        }
                    });
                }
                Err(e) => {
                    log::debug!("Gateway accept error: {}", e);
                }
            }
        }
    });
}

async fn handle_connection(mut stream: TcpStream, app: AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut buffer = vec![0u8; 16384];
    let bytes_read = stream.read(&mut buffer).await?;
    if bytes_read == 0 {
        return Ok(());
    }

    let request_str = String::from_utf8_lossy(&buffer[..bytes_read]);
    let mut lines = request_str.lines();
    let request_line = match lines.next() {
        Some(l) => l,
        None => return Ok(()),
    };

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return Ok(());
    }

    let method = parts[0];
    let path = parts[1];

    // CORS Headers
    let cors_headers = "Access-Control-Allow-Origin: *\r\n\
Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\
Access-Control-Allow-Headers: Content-Type, Authorization\r\n\
Access-Control-Max-Age: 86400\r\n";

    if method == "OPTIONS" {
        let response = format!(
            "HTTP/1.1 204 No Content\r\n\
{}\
Content-Length: 0\r\n\
Connection: close\r\n\r\n",
            cors_headers
        );
        stream.write_all(response.as_bytes()).await?;
        return Ok(());
    }

    if method == "GET" && (path == "/health" || path == "/api/status" || path == "/") {
        let status_body = serde_json::to_string(&StatusResponse {
            status: "ok",
            app: "downlink",
            version: "0.1.54",
            port: DEFAULT_GATEWAY_PORT,
        })?;

        let response = format!(
            "HTTP/1.1 200 OK\r\n\
{}\
Content-Type: application/json\r\n\
Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
            cors_headers,
            status_body.len(),
            status_body
        );
        stream.write_all(response.as_bytes()).await?;
        return Ok(());
    }

    if method == "POST" && (path == "/api/capture" || path == "/capture") {
        // Extract JSON body after \r\n\r\n or \n\n
        let body = if let Some(idx) = request_str.find("\r\n\r\n") {
            &request_str[idx + 4..]
        } else if let Some(idx) = request_str.find("\n\n") {
            &request_str[idx + 2..]
        } else {
            ""
        };

        let capture_req: Result<CaptureRequest, _> = serde_json::from_str(body);
        match capture_req {
            Ok(req) => {
                log::info!("Gateway: Captured URL from browser: {}", req.url);
                let state = app.state::<AppState>();

                let raw_url = req.url.trim().to_string();
                // Self-healing: If a blob URL was sent from browser, fallback to referer or page URL
                let healed_url = if raw_url.starts_with("blob:") {
                    if let Some(ref ref_url) = req.referer {
                        if !ref_url.trim().is_empty() && !ref_url.starts_with("blob:") {
                            ref_url.trim().to_string()
                        } else {
                            raw_url.trim_start_matches("blob:").to_string()
                        }
                    } else {
                        raw_url.trim_start_matches("blob:").to_string()
                    }
                } else {
                    raw_url
                };

                let clean_healed = crate::ytdlp::clean_media_url(&healed_url);
                let target_url = crate::ytdlp::extract_dailymotion_canonical_url(&clean_healed)
                    .unwrap_or(clean_healed);
                if target_url.is_empty() {
                    let err_body = serde_json::to_string(&CaptureResponse {
                        success: false,
                        id: None,
                        message: "Empty URL provided".to_string(),
                    })?;
                    let response = format!(
                        "HTTP/1.1 400 Bad Request\r\n\
{}\
Content-Type: application/json\r\n\
Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
                        cors_headers,
                        err_body.len(),
                        err_body
                    );
                    stream.write_all(response.as_bytes()).await?;
                    return Ok(());
                }

                // Determine effective output directory and settings
                let (output_dir, default_auto_start) = {
                    let db_guard = state.db.lock().await;
                    let manager = crate::settings::SettingsManager::new(db_guard.conn());
                    if let Ok(settings) = manager.get_user_settings() {
                        (
                            settings.general.download_folder.to_string_lossy().to_string(),
                            settings.general.auto_start,
                        )
                    } else {
                        (
                            dirs::download_dir()
                                .unwrap_or_else(|| std::path::PathBuf::from("."))
                                .to_string_lossy()
                                .to_string(),
                            true,
                        )
                    }
                };

                let preset = req.preset_id.as_deref().unwrap_or("recommended_best");
                let referer = req.referer.as_deref();

                let id = {
                    let mut db = state.db.lock().await;
                    match db.insert_download(
                        &target_url,
                        SourceKind::Single,
                        None,
                        preset,
                        &output_dir,
                        None,
                        referer,
                    ) {
                        Ok(id) => id,
                        Err(e) => {
                            let err_body = serde_json::to_string(&CaptureResponse {
                                success: false,
                                id: None,
                                message: format!("Database error: {}", e),
                            })?;
                            let response = format!(
                                "HTTP/1.1 500 Internal Server Error\r\n\
{}\
Content-Type: application/json\r\n\
Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
                                cors_headers,
                                err_body.len(),
                                err_body
                            );
                            stream.write_all(response.as_bytes()).await?;
                            return Ok(());
                        }
                    }
                };

                if let Some(ref title) = req.title {
                    let mut db = state.db.lock().await;
                    let _ = db.update_metadata(id, Some(title.as_str()), None, None, None);
                }

                // Notify frontend to refresh queue & show toast
                let _ = app.emit(
                    "browser-link-captured",
                    serde_json::json!({
                        "id": id.to_string(),
                        "url": target_url,
                        "title": req.title,
                    }),
                );

                // Bring Downlink main window to front and focus
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.unminimize();
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }

                // Auto-start download if requested
                let should_auto_start = req.auto_start.unwrap_or(default_auto_start);
                if should_auto_start {
                    let manager = crate::get_or_init_download_manager(&state, &app).await;
                    let _ = manager.start(id).await;
                }

                let ok_body = serde_json::to_string(&CaptureResponse {
                    success: true,
                    id: Some(id.to_string()),
                    message: "Download added successfully to Downlink".to_string(),
                })?;

                let response = format!(
                    "HTTP/1.1 200 OK\r\n\
{}\
Content-Type: application/json\r\n\
Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
                    cors_headers,
                    ok_body.len(),
                    ok_body
                );
                stream.write_all(response.as_bytes()).await?;
                return Ok(());
            }
            Err(e) => {
                let err_body = serde_json::to_string(&CaptureResponse {
                    success: false,
                    id: None,
                    message: format!("Invalid JSON payload: {}", e),
                })?;
                let response = format!(
                    "HTTP/1.1 400 Bad Request\r\n\
{}\
Content-Type: application/json\r\n\
Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
                    cors_headers,
                    err_body.len(),
                    err_body
                );
                stream.write_all(response.as_bytes()).await?;
                return Ok(());
            }
        }
    }

    // 404 Not Found for other routes
    let not_found = "HTTP/1.1 404 Not Found\r\n\
Access-Control-Allow-Origin: *\r\n\
Content-Length: 0\r\n\
Connection: close\r\n\r\n";
    stream.write_all(not_found.as_bytes()).await?;
    Ok(())
}
