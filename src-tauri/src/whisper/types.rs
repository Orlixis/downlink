use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WhisperModel {
    Tiny,
    Base,
    Small,
    Medium,
}

impl WhisperModel {
    pub fn as_str(&self) -> &'static str {
        match self {
            WhisperModel::Tiny => "tiny",
            WhisperModel::Base => "base",
            WhisperModel::Small => "small",
            WhisperModel::Medium => "medium",
        }
    }

    /// Maps to Groq's model names.
    pub fn groq_model(&self) -> &'static str {
        match self {
            WhisperModel::Tiny | WhisperModel::Base => "whisper-large-v3-turbo",
            WhisperModel::Small | WhisperModel::Medium => "whisper-large-v3",
        }
    }
}

#[derive(Debug, Serialize)]
pub struct TranscriptionResult {
    pub srt_path: String,
    pub method: String,
}

#[derive(Debug, Serialize)]
pub struct TranscriptionError {
    pub kind: TranscriptionErrorKind,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TranscriptionErrorKind {
    FileNotFound,
    NoSubtitlesAvailable,
    GroqApiError,
    LocalWhisperFailed,
    TranscriptionFailed,
}
