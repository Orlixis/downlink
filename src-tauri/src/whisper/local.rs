use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;

use super::types::{TranscriptionError, TranscriptionErrorKind, WhisperModel};

pub fn check_whisper() -> Option<String> {
    find_whisper_binary().map(|p| p.to_string_lossy().to_string())
}

pub fn find_whisper_binary() -> Option<PathBuf> {
    let home = std::env::var_os("HOME")
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_default();
    let candidates = [
        "whisper".to_string(),
        format!("{home}/.local/bin/whisper"),
        format!("{home}/Library/Python/3.11/bin/whisper"),
        format!("{home}/Library/Python/3.12/bin/whisper"),
        format!("{home}/Library/Python/3.13/bin/whisper"),
        "/opt/homebrew/bin/whisper".to_string(),
        "/usr/local/bin/whisper".to_string(),
    ];
    for c in &candidates {
        let p = PathBuf::from(c);
        if p.is_absolute() && p.exists() {
            return Some(p);
        }
        #[cfg(not(windows))]
        if let Ok(out) = std::process::Command::new("which").arg(c).output() {
            if out.status.success() {
                let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !s.is_empty() {
                    return Some(PathBuf::from(s));
                }
            }
        }
    }
    None
}

pub async fn transcribe_via_local(
    resolved: &Path,
    model: WhisperModel,
    out_dir: &Path,
) -> Result<(), TranscriptionError> {
    let bin = find_whisper_binary().ok_or_else(|| TranscriptionError {
        kind: TranscriptionErrorKind::LocalWhisperFailed,
        message: "whisper not found".to_string(),
    })?;

    let ok = tokio::time::timeout(
        std::time::Duration::from_secs(600),
        Command::new(&bin)
            .args([
                resolved.to_string_lossy().as_ref(),
                "--model",
                model.as_str(),
                "--output_format",
                "srt",
                "--output_dir",
                out_dir.to_string_lossy().as_ref(),
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status(),
    )
    .await
    .ok()
    .and_then(|r| r.ok())
    .map(|s| s.success())
    .unwrap_or(false);

    if ok {
        Ok(())
    } else {
        Err(TranscriptionError {
            kind: TranscriptionErrorKind::LocalWhisperFailed,
            message: "Local whisper failed".to_string(),
        })
    }
}

pub fn find_srt_by_stem(dir: &Path, stem: &str) -> Option<PathBuf> {
    std::fs::read_dir(dir).ok()?.flatten().find_map(|e| {
        let p = e.path();
        let name = p.file_name()?.to_string_lossy().to_string();
        if name.starts_with(stem) && name.ends_with(".srt") {
            Some(p)
        } else {
            None
        }
    })
}
