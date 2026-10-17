use std::path::PathBuf;
use std::time::Duration;
use serde::{Deserialize, Serialize};

/// Where to find yt-dlp.
#[derive(Debug, Clone)]
pub struct YtDlpConfig {
    pub yt_dlp_path: PathBuf,
    pub global_args: Vec<String>,
    pub metadata_timeout: Duration,
}

impl YtDlpConfig {
    pub fn new(yt_dlp_path: PathBuf) -> Self {
        Self {
            yt_dlp_path,
            global_args: vec![],
            metadata_timeout: Duration::from_secs(25),
        }
    }
}

/// Minimal preview metadata for the UI.
#[derive(Debug, Clone)]
pub struct PreviewMetadata {
    pub url: String,
    pub stream_url: Option<String>,
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub duration_seconds: Option<u64>,
    pub thumbnail_url: Option<String>,
    pub filesize_bytes: Option<u64>,

    pub is_playlist: bool,
    pub playlist_title: Option<String>,
    pub playlist_count_hint: Option<u64>,
    pub available_qualities: Vec<VideoQualityOption>,
}

/// A discrete quality option extracted from yt-dlp's format list.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoQualityOption {
    pub height: Option<u32>,
    pub label: String,
    pub filesize_approx: Option<u64>,
    pub format_string: String,
    pub is_audio_only: bool,
}

/// A single playlist entry returned by enumeration.
#[derive(Debug, Clone)]
pub struct PlaylistEntry {
    pub url: String,
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub duration_seconds: Option<u64>,
    pub thumbnail_url: Option<String>,
}

/// Low-level execution result.
#[derive(Debug, Clone)]
pub struct YtDlpOutput {
    pub stdout_lines: Vec<String>,
    pub stderr_lines: Vec<String>,
    pub exit_code: Option<i32>,
}

/// Error categories mapped to user-facing remediation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum YtDlpErrorKind {
    NotFound,
    Timeout,
    InvalidJson,
    NonZeroExit,
}

#[derive(Debug)]
pub struct YtDlpError {
    pub kind: YtDlpErrorKind,
    pub message: String,
    pub output: Option<YtDlpOutput>,
}

impl std::fmt::Display for YtDlpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}: {}", self.kind, self.message)
    }
}

impl std::error::Error for YtDlpError {}
