use std::path::PathBuf;
use serde::{Deserialize, Serialize};

use crate::events::{Action, ErrorCode};

/// Configuration for download execution.
#[derive(Debug, Clone)]
pub struct DownloadConfig {
    pub yt_dlp_path: PathBuf,
    pub ffmpeg_path: Option<PathBuf>,
    pub max_concurrent: usize,
    pub default_output_template: String,
    pub sponsorblock: Option<crate::settings::SponsorBlockSettings>,
}

/// Metadata fetched for a URL
#[derive(Debug, Clone)]
pub struct FetchedMetadata {
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub duration_seconds: Option<u64>,
    pub thumbnail_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub yt_dlp_args: Vec<String>,
}

impl Preset {
    pub fn builtin_presets() -> Vec<Preset> {
        vec![
            Preset {
                id: "recommended_best".to_string(),
                name: "Recommended (Best)".to_string(),
                yt_dlp_args: vec![
                    "-f".to_string(),
                    "bv*+ba/b".to_string(),
                    "--merge-output-format".to_string(),
                    "mp4".to_string(),
                ],
            },
            Preset {
                id: "mp4_1080p".to_string(),
                name: "1080p MP4".to_string(),
                yt_dlp_args: vec![
                    "-f".to_string(),
                    "bv*[height<=1080]+ba/b[height<=1080]".to_string(),
                    "--merge-output-format".to_string(),
                    "mp4".to_string(),
                ],
            },
            Preset {
                id: "mp4_best".to_string(),
                name: "Best MP4".to_string(),
                yt_dlp_args: vec![
                    "-f".to_string(),
                    "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]".to_string(),
                    "--merge-output-format".to_string(),
                    "mp4".to_string(),
                ],
            },
            Preset {
                id: "audio_m4a".to_string(),
                name: "Audio M4A".to_string(),
                yt_dlp_args: vec![
                    "-f".to_string(),
                    "ba[ext=m4a]/ba".to_string(),
                    "-x".to_string(),
                    "--audio-format".to_string(),
                    "m4a".to_string(),
                ],
            },
            Preset {
                id: "audio_mp3_320".to_string(),
                name: "Audio MP3 320".to_string(),
                yt_dlp_args: vec![
                    "-f".to_string(),
                    "ba/b".to_string(),
                    "-x".to_string(),
                    "--audio-format".to_string(),
                    "mp3".to_string(),
                    "--audio-quality".to_string(),
                    "320k".to_string(),
                ],
            },
            Preset {
                id: "audio_lossless".to_string(),
                name: "Audio Lossless (FLAC)".to_string(),
                yt_dlp_args: vec![
                    "-f".to_string(),
                    "ba/b".to_string(),
                    "-x".to_string(),
                    "--audio-format".to_string(),
                    "flac".to_string(),
                ],
            },
        ]
    }

    pub fn get_by_id(id: &str) -> Option<Preset> {
        Self::builtin_presets().into_iter().find(|p| p.id == id)
    }
}

use crate::db::DownloadStatus;

#[derive(Debug, Clone)]
pub struct DownloadItemInfo {
    pub source_url: String,
    pub stream_url: Option<String>,
    pub referer_url: Option<String>,
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration_seconds: Option<i64>,
    pub preset_id: String,
    pub output_dir: String,
    pub status: DownloadStatus,
}

#[derive(Debug, Clone)]
pub struct ParsedProgress {
    pub percent: Option<f64>,
    pub bytes_downloaded: Option<u64>,
    pub bytes_total: Option<u64>,
    pub speed_bps: Option<u64>,
    pub eta_seconds: Option<u64>,
    pub phase: Option<String>,
}

#[derive(Debug)]
pub enum DownloadError {
    Canceled,
    Stopped,
    Failed {
        code: ErrorCode,
        message: String,
        actions: Vec<Action>,
    },
}
