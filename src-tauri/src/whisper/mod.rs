pub mod api;
pub mod local;
pub mod types;

use std::path::{Path, PathBuf};

pub use self::local::{check_whisper, find_whisper_binary};
pub use self::types::{
    TranscriptionError, TranscriptionErrorKind, TranscriptionResult, WhisperModel,
};
use crate::settings::TranscriptionProvider;

const MEDIA_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "webm", "m4v", "mov", "avi", "mp3", "m4a", "flac", "opus", "ogg", "aac", "wav",
];

/// Returns the app's bundled Groq key compiled in at build time.
fn bundled_groq_key() -> &'static str {
    env!("DOWNLINK_GROQ_KEY")
}

/// Resolve the effective API key and provider.
pub fn resolve_api_config<'a>(
    user_key: Option<&'a str>,
    provider: &TranscriptionProvider,
) -> Option<(String, TranscriptionProvider)> {
    if let Some(k) = user_key {
        let k = k.trim();
        if !k.is_empty() {
            return Some((k.to_string(), provider.clone()));
        }
    }
    let bundled = bundled_groq_key().trim();
    if !bundled.is_empty() {
        return Some((bundled.to_string(), TranscriptionProvider::Groq));
    }
    None
}

pub fn resolve_media_path(file_path: &Path) -> Result<PathBuf, TranscriptionError> {
    if file_path.exists() {
        return Ok(file_path.to_path_buf());
    }
    let stem = file_path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let parent = file_path.parent().unwrap_or(Path::new("."));

    for ext in MEDIA_EXTENSIONS {
        let candidate = parent.join(format!("{stem}.{ext}"));
        if candidate.exists() {
            log::info!("Resolved {:?} → {:?} (remuxed)", file_path, candidate);
            return Ok(candidate);
        }
    }
    if let Ok(entries) = std::fs::read_dir(parent) {
        for entry in entries.flatten() {
            let p = entry.path();
            let s = p
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let e = p
                .extension()
                .unwrap_or_default()
                .to_string_lossy()
                .to_lowercase();
            if (s == stem || s.starts_with(&stem)) && MEDIA_EXTENSIONS.contains(&e.as_str()) {
                log::info!("Fuzzy-resolved {:?} → {:?}", file_path, p);
                return Ok(p);
            }
        }
    }
    Err(TranscriptionError {
        kind: TranscriptionErrorKind::FileNotFound,
        message: format!("File not found: {}", file_path.display()),
    })
}

/// Transcribe a media file.
pub async fn transcribe(
    file_path: &Path,
    model: WhisperModel,
    user_key: Option<&str>,
    provider: &TranscriptionProvider,
) -> Result<TranscriptionResult, TranscriptionError> {
    let resolved = resolve_media_path(file_path)?;
    let out_dir = resolved.parent().unwrap_or(Path::new(".")).to_path_buf();

    let has_user_key = user_key.map(|k| !k.trim().is_empty()).unwrap_or(false);

    if let Some((key, effective_provider)) = resolve_api_config(user_key, provider) {
        let method = if has_user_key {
            format!("{}_user", effective_provider.as_str())
        } else {
            "groq_bundled".to_string()
        };

        let srt_text =
            api::transcribe_with_provider(&resolved, model, &key, &effective_provider).await?;
        let stem = resolved.file_stem().unwrap_or_default().to_string_lossy();
        let srt_path = out_dir.join(format!("{stem}.srt"));
        tokio::fs::write(&srt_path, &srt_text)
            .await
            .map_err(|e| TranscriptionError {
                kind: TranscriptionErrorKind::TranscriptionFailed,
                message: format!("Failed to write .srt: {e}"),
            })?;
        return Ok(TranscriptionResult {
            srt_path: srt_path.to_string_lossy().to_string(),
            method,
        });
    }

    if find_whisper_binary().is_some() {
        local::transcribe_via_local(&resolved, model, &out_dir).await?;
        let stem = resolved.file_stem().unwrap_or_default().to_string_lossy();
        let srt = local::find_srt_by_stem(&out_dir, &stem).ok_or_else(|| TranscriptionError {
            kind: TranscriptionErrorKind::TranscriptionFailed,
            message: "Transcription ran but no .srt produced".to_string(),
        })?;
        return Ok(TranscriptionResult {
            srt_path: srt.to_string_lossy().to_string(),
            method: "local_whisper".to_string(),
        });
    }

    Err(TranscriptionError {
        kind: TranscriptionErrorKind::TranscriptionFailed,
        message: "Transcription unavailable".to_string(),
    })
}
