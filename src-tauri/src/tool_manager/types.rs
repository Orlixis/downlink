use std::path::PathBuf;
use std::time::Duration;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Tool {
    YtDlp,
    Ffmpeg,
    Ffprobe,
}

impl Tool {
    pub fn as_str(&self) -> &'static str {
        match self {
            Tool::YtDlp => "yt-dlp",
            Tool::Ffmpeg => "ffmpeg",
            Tool::Ffprobe => "ffprobe",
        }
    }

    pub fn binary_name(&self) -> &'static str {
        #[cfg(target_os = "windows")]
        {
            match self {
                Tool::YtDlp => "yt-dlp.exe",
                Tool::Ffmpeg => "ffmpeg.exe",
                Tool::Ffprobe => "ffprobe.exe",
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            match self {
                Tool::YtDlp => "yt-dlp",
                Tool::Ffmpeg => "ffmpeg",
                Tool::Ffprobe => "ffprobe",
            }
        }
    }

    pub fn version_args(&self) -> &[&str] {
        match self {
            Tool::YtDlp => &["--version"],
            Tool::Ffmpeg => &["-version"],
            Tool::Ffprobe => &["-version"],
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ToolStatus {
    Ok,
    Outdated,
    Missing,
    Broken,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolInfo {
    pub tool: Tool,
    pub path: PathBuf,
    pub version: Option<String>,
    pub status: ToolStatus,
    pub is_bundled: bool,
    pub last_checked: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolchainStatus {
    pub yt_dlp: Option<ToolInfo>,
    pub ffmpeg: Option<ToolInfo>,
    pub ffprobe: Option<ToolInfo>,
    pub overall_status: ToolStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolManifestEntry {
    pub tool: String,
    pub version: String,
    pub download_url: String,
    pub sha256: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateManifest {
    pub manifest_version: u32,
    pub updated_at: String,
    pub tools: Vec<ToolManifestEntry>,
}

#[derive(Debug, Clone)]
pub struct ToolManagerConfig {
    pub bundled_dir: Option<PathBuf>,
    pub updated_dir: PathBuf,
    pub manifest_url: Option<String>,
    pub version_timeout: Duration,
}

impl Default for ToolManagerConfig {
    fn default() -> Self {
        Self {
            bundled_dir: None,
            updated_dir: PathBuf::new(),
            manifest_url: None,
            version_timeout: Duration::from_secs(5),
        }
    }
}

pub struct ToolManagerConfigBuilder {
    config: ToolManagerConfig,
}

impl ToolManagerConfigBuilder {
    pub fn new() -> Self {
        Self {
            config: ToolManagerConfig::default(),
        }
    }

    pub fn bundled_dir(mut self, path: PathBuf) -> Self {
        self.config.bundled_dir = Some(path);
        self
    }

    pub fn updated_dir(mut self, path: PathBuf) -> Self {
        self.config.updated_dir = path;
        self
    }

    pub fn manifest_url(mut self, url: String) -> Self {
        self.config.manifest_url = Some(url);
        self
    }

    pub fn version_timeout(mut self, timeout: Duration) -> Self {
        self.config.version_timeout = timeout;
        self
    }

    pub fn build(self) -> ToolManagerConfig {
        self.config
    }
}

impl Default for ToolManagerConfigBuilder {
    fn default() -> Self {
        Self::new()
    }
}
