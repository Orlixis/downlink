use std::path::PathBuf;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DownloadStatus {
    Queued,
    Fetching,
    Ready,
    Downloading,
    PostProcessing,
    Stopped,
    Done,
    Failed,
    Canceled,
}

impl DownloadStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            DownloadStatus::Queued => "queued",
            DownloadStatus::Fetching => "fetching",
            DownloadStatus::Ready => "ready",
            DownloadStatus::Downloading => "downloading",
            DownloadStatus::PostProcessing => "postprocessing",
            DownloadStatus::Stopped => "stopped",
            DownloadStatus::Done => "done",
            DownloadStatus::Failed => "failed",
            DownloadStatus::Canceled => "canceled",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        Some(match s {
            "queued" => DownloadStatus::Queued,
            "fetching" => DownloadStatus::Fetching,
            "ready" => DownloadStatus::Ready,
            "downloading" => DownloadStatus::Downloading,
            "postprocessing" => DownloadStatus::PostProcessing,
            "stopped" => DownloadStatus::Stopped,
            "done" => DownloadStatus::Done,
            "failed" => DownloadStatus::Failed,
            "canceled" => DownloadStatus::Canceled,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceKind {
    Single,
    PlaylistParent,
    PlaylistItem,
}

impl SourceKind {
    pub fn as_str(self) -> &'static str {
        match self {
            SourceKind::Single => "single",
            SourceKind::PlaylistParent => "playlist_parent",
            SourceKind::PlaylistItem => "playlist_item",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        Some(match s {
            "single" => SourceKind::Single,
            "playlist_parent" => SourceKind::PlaylistParent,
            "playlist_item" => SourceKind::PlaylistItem,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone)]
pub struct DownloadRow {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub source_url: String,
    pub source_kind: SourceKind,
    pub parent_id: Option<Uuid>,

    pub title: Option<String>,
    pub uploader: Option<String>,
    pub duration_seconds: Option<i64>,
    pub thumbnail_url: Option<String>,

    pub status: DownloadStatus,
    pub phase: Option<String>,

    pub preset_id: String,
    pub output_dir: String,

    pub final_path: Option<String>,

    pub progress_percent: Option<f64>,
    pub bytes_downloaded: Option<i64>,
    pub bytes_total: Option<i64>,
    pub speed_bps: Option<i64>,
    pub eta_seconds: Option<i64>,

    pub error_code: Option<String>,
    pub error_message: Option<String>,

    pub stream_url: Option<String>,
    pub referer_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AppDirs {
    pub data: PathBuf,
    pub logs: PathBuf,
    pub tools: PathBuf,
    pub tmp: PathBuf,
}
