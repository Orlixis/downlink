pub mod discovery;
pub mod mobile;

use axum::{
    extract::State,
    http::{Method, StatusCode},
    response::{Html, IntoResponse, Json},
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tauri::{AppHandle, Emitter, Manager};
use tower_http::cors::{Any, CorsLayer};

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

#[derive(Clone)]
struct GatewayState {
    app: AppHandle,
}

pub fn start_gateway_server(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([Method::GET, Method::POST, Method::OPTIONS, Method::HEAD])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::AUTHORIZATION,
            ]);

        let state = GatewayState {
            app: app_handle,
        };

        let app = Router::new()
            .route("/", get(serve_mobile))
            .route("/mobile", get(serve_mobile))
            .route("/companion", get(serve_mobile))
            .route("/api/pairing", get(serve_pairing))
            .route("/api/continuity", get(serve_pairing))
            .route("/health", get(serve_status))
            .route("/api/status", get(serve_status))
            .route("/api/capture", post(handle_capture))
            .layer(cors)
            .with_state(state);

        let addr = SocketAddr::from(([0, 0, 0, 0], DEFAULT_GATEWAY_PORT));
        log::info!("Downlink Gateway (Axum Engine) listening on http://0.0.0.0:{}", DEFAULT_GATEWAY_PORT);

        match tokio::net::TcpListener::bind(addr).await {
            Ok(listener) => {
                if let Err(e) = axum::serve(listener, app).await {
                    log::warn!("Downlink Gateway server error: {}", e);
                }
            }
            Err(e) => {
                log::warn!(
                    "Downlink Gateway: Failed to bind to port {}: {}. Extension integration may be unavailable.",
                    DEFAULT_GATEWAY_PORT,
                    e
                );
            }
        }
    });
}

async fn serve_mobile() -> Html<&'static str> {
    Html(mobile::MOBILE_APP_HTML)
}

async fn serve_pairing() -> Json<discovery::ConnectionInfo> {
    Json(discovery::get_local_connection_info())
}

async fn serve_status() -> Json<StatusResponse> {
    Json(StatusResponse {
        status: "ok",
        app: "downlink",
        version: env!("CARGO_PKG_VERSION"),
        port: DEFAULT_GATEWAY_PORT,
    })
}

async fn handle_capture(
    State(gateway): State<GatewayState>,
    Json(req): Json<CaptureRequest>,
) -> impl IntoResponse {
    let app = gateway.app;
    log::info!("Gateway: Captured URL from client: {}", req.url);
    let state = app.state::<AppState>();

    let raw_url = req.url.trim().to_string();
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
        return (
            StatusCode::BAD_REQUEST,
            Json(CaptureResponse {
                success: false,
                id: None,
                message: "Empty URL provided".to_string(),
            }),
        );
    }

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
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(CaptureResponse {
                        success: false,
                        id: None,
                        message: format!("Database error: {}", e),
                    }),
                );
            }
        }
    };

    if let Some(ref title) = req.title {
        let mut db = state.db.lock().await;
        let _ = db.update_metadata(id, Some(title.as_str()), None, None, None);
    }

    let _ = app.emit(
        "browser-link-captured",
        serde_json::json!({
            "id": id.to_string(),
            "url": target_url,
            "title": req.title,
        }),
    );

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.unminimize();
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }

    let should_auto_start = req.auto_start.unwrap_or(default_auto_start);
    if should_auto_start {
        let manager = crate::get_or_init_download_manager(&state, &app).await;
        let _ = manager.start(id).await;
    }

    (
        StatusCode::OK,
        Json(CaptureResponse {
            success: true,
            id: Some(id.to_string()),
            message: "Download added successfully to Downlink".to_string(),
        }),
    )
}
