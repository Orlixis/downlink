use std::path::PathBuf;
use serde::{Deserialize, Serialize};

/// User settings structure with all configurable options.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    #[serde(default)]
    pub general: GeneralSettings,

    #[serde(default)]
    pub formats: FormatSettings,

    #[serde(default)]
    pub sponsorblock: SponsorBlockSettings,

    #[serde(default)]
    pub subtitles: SubtitleSettings,

    #[serde(default)]
    pub updates: UpdateSettings,

    #[serde(default)]
    pub privacy: PrivacySettings,

    #[serde(default)]
    pub network: NetworkSettings,

    #[serde(default)]
    pub transcription: TranscriptionSettings,
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            general: GeneralSettings::default(),
            formats: FormatSettings::default(),
            sponsorblock: SponsorBlockSettings::default(),
            subtitles: SubtitleSettings::default(),
            updates: UpdateSettings::default(),
            privacy: PrivacySettings::default(),
            network: NetworkSettings::default(),
            transcription: TranscriptionSettings::default(),
        }
    }
}

/// General application settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    #[serde(default = "default_download_folder")]
    pub download_folder: PathBuf,

    #[serde(default = "default_preset_id")]
    pub default_preset: String,

    #[serde(default = "default_concurrency")]
    pub concurrency: u32,

    #[serde(default = "default_true")]
    pub auto_start: bool,

    #[serde(default = "default_true")]
    pub notify_on_complete: bool,

    #[serde(default)]
    pub minimize_to_tray: bool,

    #[serde(default)]
    pub start_minimized: bool,

    #[serde(default = "default_true")]
    pub remember_window_state: bool,

    #[serde(default)]
    pub show_advanced_by_default: bool,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            download_folder: default_download_folder(),
            default_preset: default_preset_id(),
            concurrency: default_concurrency(),
            auto_start: true,
            notify_on_complete: true,
            minimize_to_tray: false,
            start_minimized: false,
            remember_window_state: true,
            show_advanced_by_default: false,
        }
    }
}

/// Format and quality settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormatSettings {
    #[serde(default = "default_true")]
    pub prefer_mp4: bool,

    #[serde(default)]
    pub max_video_height: u32,

    #[serde(default)]
    pub preferred_video_codec: String,

    #[serde(default)]
    pub preferred_audio_codec: String,

    #[serde(default = "default_true")]
    pub embed_metadata: bool,

    #[serde(default = "default_true")]
    pub embed_thumbnail: bool,

    #[serde(default)]
    pub write_info_json: bool,

    #[serde(default = "default_filename_template")]
    pub filename_template: String,
}

impl Default for FormatSettings {
    fn default() -> Self {
        Self {
            prefer_mp4: true,
            max_video_height: 0,
            preferred_video_codec: String::new(),
            preferred_audio_codec: String::new(),
            embed_metadata: true,
            embed_thumbnail: true,
            write_info_json: false,
            filename_template: default_filename_template(),
        }
    }
}

/// SponsorBlock integration settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SponsorBlockSettings {
    #[serde(default)]
    pub enabled_by_default: bool,

    #[serde(default = "default_sponsorblock_mode")]
    pub mode: String,

    #[serde(default = "default_sponsorblock_categories")]
    pub categories: Vec<String>,
}

impl Default for SponsorBlockSettings {
    fn default() -> Self {
        Self {
            enabled_by_default: false,
            mode: default_sponsorblock_mode(),
            categories: default_sponsorblock_categories(),
        }
    }
}

/// Subtitle settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtitleSettings {
    #[serde(default)]
    pub enabled_by_default: bool,

    #[serde(default = "default_subtitle_language")]
    pub default_language: String,

    #[serde(default)]
    pub include_auto_captions: bool,

    #[serde(default)]
    pub embed_subtitles: bool,

    #[serde(default = "default_subtitle_format")]
    pub preferred_format: String,
}

impl Default for SubtitleSettings {
    fn default() -> Self {
        Self {
            enabled_by_default: false,
            default_language: default_subtitle_language(),
            include_auto_captions: false,
            embed_subtitles: false,
            preferred_format: default_subtitle_format(),
        }
    }
}

/// Update settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSettings {
    #[serde(default = "default_true")]
    pub auto_update_app: bool,

    #[serde(default = "default_true")]
    pub auto_update_ytdlp: bool,

    #[serde(default)]
    pub auto_update_ffmpeg: bool,

    #[serde(default = "default_update_interval")]
    pub check_interval_hours: u32,

    #[serde(default)]
    pub last_checked: Option<String>,
}

impl Default for UpdateSettings {
    fn default() -> Self {
        Self {
            auto_update_app: true,
            auto_update_ytdlp: true,
            auto_update_ffmpeg: false,
            check_interval_hours: default_update_interval(),
            last_checked: None,
        }
    }
}

/// Privacy settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivacySettings {
    #[serde(default = "default_cookie_mode")]
    pub cookie_mode: String,

    #[serde(default)]
    pub cookies_path: Option<PathBuf>,

    #[serde(default)]
    pub clear_cookies_on_exit: bool,

    #[serde(default = "default_true")]
    pub keep_history: bool,

    #[serde(default = "default_max_history")]
    pub max_history_entries: u32,
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            cookie_mode: default_cookie_mode(),
            cookies_path: None,
            clear_cookies_on_exit: false,
            keep_history: true,
            max_history_entries: default_max_history(),
        }
    }
}

/// Network settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkSettings {
    #[serde(default)]
    pub use_proxy: bool,

    #[serde(default)]
    pub proxy_url: String,

    #[serde(default)]
    pub rate_limit_bps: u64,

    #[serde(default = "default_retries")]
    pub retries: u32,

    #[serde(default = "default_concurrent_fragments")]
    pub concurrent_fragments: u32,

    #[serde(default = "default_socket_timeout")]
    pub socket_timeout: u32,
}

impl Default for NetworkSettings {
    fn default() -> Self {
        Self {
            use_proxy: false,
            proxy_url: String::new(),
            rate_limit_bps: 0,
            retries: default_retries(),
            concurrent_fragments: default_concurrent_fragments(),
            socket_timeout: default_socket_timeout(),
        }
    }
}

/// Which AI provider to use for transcription.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum TranscriptionProvider {
    #[default]
    Groq,
    OpenAI,
    Gemini,
}

impl TranscriptionProvider {
    pub fn as_str(&self) -> &'static str {
        match self {
            TranscriptionProvider::Groq => "groq",
            TranscriptionProvider::OpenAI => "openai",
            TranscriptionProvider::Gemini => "gemini",
        }
    }

    pub fn api_base(&self) -> &'static str {
        match self {
            TranscriptionProvider::Groq => "https://api.groq.com/openai/v1",
            TranscriptionProvider::OpenAI => "https://api.openai.com/v1",
            TranscriptionProvider::Gemini => "https://generativelanguage.googleapis.com/v1beta",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            TranscriptionProvider::Groq => "Groq (Free)",
            TranscriptionProvider::OpenAI => "OpenAI",
            TranscriptionProvider::Gemini => "Google Gemini",
        }
    }
}

/// Transcription / AI subtitle settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionSettings {
    #[serde(default)]
    pub provider: TranscriptionProvider,

    #[serde(default)]
    pub api_key: String,
}

impl Default for TranscriptionSettings {
    fn default() -> Self {
        Self {
            provider: TranscriptionProvider::default(),
            api_key: String::new(),
        }
    }
}

/// Window state for persistence.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: 100,
            y: 100,
            width: 1200,
            height: 800,
            is_maximized: false,
        }
    }
}

// Default helper functions
fn default_download_folder() -> PathBuf {
    dirs::download_dir().unwrap_or_else(|| PathBuf::from("~/Downloads"))
}
fn default_preset_id() -> String {
    "recommended_best".to_string()
}
fn default_concurrency() -> u32 {
    2
}
fn default_true() -> bool {
    true
}
fn default_filename_template() -> String {
    "%(title)s [%(id)s].%(ext)s".to_string()
}
fn default_sponsorblock_mode() -> String {
    "remove".to_string()
}
fn default_sponsorblock_categories() -> Vec<String> {
    vec!["sponsor".to_string()]
}
fn default_subtitle_language() -> String {
    "en".to_string()
}
fn default_subtitle_format() -> String {
    "srt".to_string()
}
fn default_update_interval() -> u32 {
    24
}
fn default_cookie_mode() -> String {
    "on_demand".to_string()
}
fn default_max_history() -> u32 {
    1000
}
fn default_retries() -> u32 {
    3
}
fn default_concurrent_fragments() -> u32 {
    1
}
fn default_socket_timeout() -> u32 {
    30
}
