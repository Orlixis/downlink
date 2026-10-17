use serde::{Deserialize, Deserializer, Serialize};
use uuid::Uuid;

use crate::ytdlp::VideoQualityOption;

pub fn deserialize_null_as_none<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    Ok(Option::<T>::deserialize(deserializer).unwrap_or(None))
}

#[derive(Debug, Serialize)]
pub struct AddUrlsResult {
    pub ids: Vec<Uuid>,
    pub urls: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddUrlsOptions {
    pub preset_id: String,
    pub output_dir: String,
    #[serde(default, deserialize_with = "deserialize_null_as_none")]
    pub parent_id: Option<Uuid>,
    #[serde(default, deserialize_with = "deserialize_null_as_none")]
    pub source_kind: Option<String>,
    #[serde(default, deserialize_with = "deserialize_null_as_none")]
    pub title: Option<String>,
    #[serde(default, deserialize_with = "deserialize_null_as_none")]
    pub uploader: Option<String>,
    #[serde(default, deserialize_with = "deserialize_null_as_none")]
    pub thumbnail_url: Option<String>,
    #[serde(default, deserialize_with = "deserialize_null_as_none")]
    pub duration_seconds: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_null_as_none")]
    pub stream_url: Option<String>,
    #[serde(default, deserialize_with = "deserialize_null_as_none")]
    pub referer_url: Option<String>,
    #[serde(default)]
    pub subtitles_enabled: bool,
    #[serde(default)]
    pub sponsorblock_enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct FetchMetadataOptions {
    pub preset_id: String,
    pub output_dir: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct FetchMetadataResult {
    pub id: Uuid,
    pub url: String,
    pub stream_url: Option<String>,
    pub is_playlist: bool,
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub duration_seconds: Option<u64>,
    pub thumbnail_url: Option<String>,
    pub filesize_bytes: Option<u64>,
    pub playlist_title: Option<String>,
    pub playlist_count_hint: Option<u64>,
    pub available_qualities: Vec<VideoQualityOption>,
}

#[derive(Debug, Serialize)]
pub struct PlaylistVideoPreview {
    pub id: String,
    pub url: String,
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub duration_seconds: Option<u64>,
    pub thumbnail_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PreviewPlaylistResult {
    pub playlist_title: Option<String>,
    pub videos: Vec<PlaylistVideoPreview>,
    pub count: usize,
}

#[derive(Debug, Serialize)]
pub struct ExpandPlaylistResult {
    pub parent_id: Uuid,
    pub item_ids: Vec<Uuid>,
    pub count: usize,
}

#[derive(Debug, Deserialize)]
pub struct ExpandPlaylistOptions {
    pub preset_id: String,
    pub output_dir: String,
}

#[derive(Debug, Serialize)]
pub struct QueueItem {
    pub id: Uuid,
    pub source_url: String,
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub thumbnail_url: Option<String>,
    pub status: String,
    pub phase: Option<String>,
    pub progress_percent: Option<f64>,
    pub speed_bps: Option<i64>,
    pub eta_seconds: Option<i64>,
    pub preset_id: String,
    pub output_dir: String,
    pub final_path: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PresetInfo {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct HardwareDetectionResult {
    pub has_apple_silicon: bool,
    pub has_nvidia_gpu: bool,
    pub cpu_cores: usize,
    pub total_memory_gb: u64,
    pub recommended_model: String,
}

#[derive(Debug, Serialize)]
pub struct WhisperModelInfo {
    pub name: String,
    pub display_name: String,
    pub size_mb: u64,
    pub is_downloaded: bool,
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDownloadTaskOptions {
    pub id: Uuid,
    pub source_url: String,
    #[serde(default, deserialize_with = "deserialize_null_as_none")]
    pub title: Option<String>,
    pub output_dir: String,
    #[serde(default, deserialize_with = "deserialize_null_as_none")]
    pub referer_url: Option<String>,
    pub preset_id: String,
}
