use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;

use super::types::{TranscriptionError, TranscriptionErrorKind, WhisperModel};
use crate::settings::TranscriptionProvider;

pub async fn transcribe_with_provider(
    resolved: &Path,
    model: WhisperModel,
    api_key: &str,
    provider: &TranscriptionProvider,
) -> Result<String, TranscriptionError> {
    match provider {
        TranscriptionProvider::Groq => {
            transcribe_openai_compat(resolved, api_key, provider.api_base(), model.groq_model()).await
        }
        TranscriptionProvider::OpenAI => {
            transcribe_openai_compat(resolved, api_key, provider.api_base(), "whisper-1").await
        }
        TranscriptionProvider::Gemini => {
            transcribe_gemini(resolved, api_key).await
        }
    }
}

async fn transcribe_openai_compat(
    resolved_path: &Path,
    api_key: &str,
    api_base: &str,
    model: &str,
) -> Result<String, TranscriptionError> {
    let upload_path = maybe_extract_audio(resolved_path).await?;
    let upload_ref = upload_path.as_deref().unwrap_or(resolved_path);

    let file_bytes = tokio::fs::read(upload_ref).await.map_err(|e| TranscriptionError {
        kind: TranscriptionErrorKind::GroqApiError,
        message: format!("Cannot read file: {e}"),
    })?;

    let mime = match upload_ref.extension().and_then(|e| e.to_str()) {
        Some("mp3") => "audio/mpeg",
        Some("m4a") => "audio/mp4",
        Some("wav") => "audio/wav",
        Some("ogg") => "audio/ogg",
        Some("flac") => "audio/flac",
        Some("opus") => "audio/ogg",
        _ => "video/mp4",
    };

    log::info!(
        "Uploading {:.1} MB → {api_base} (model: {model})",
        file_bytes.len() as f64 / 1_048_576.0
    );

    let part = reqwest::multipart::Part::bytes(file_bytes)
        .file_name(upload_ref.file_name().unwrap_or_default().to_string_lossy().to_string())
        .mime_str(mime)
        .map_err(|e| TranscriptionError {
            kind: TranscriptionErrorKind::GroqApiError,
            message: format!("MIME: {e}"),
        })?;

    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("model", model.to_string())
        .text("response_format", "verbose_json")
        .text("temperature", "0")
        .text(
            "prompt",
            "Transcribe verbatim with natural punctuation, proper capitalization, and concise sentence structures. Format clean standard subtitles without filler words or repetitions.",
        );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| TranscriptionError {
            kind: TranscriptionErrorKind::GroqApiError,
            message: format!("HTTP client: {e}"),
        })?;

    let resp = client
        .post(format!("{api_base}/audio/transcriptions"))
        .bearer_auth(api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| TranscriptionError {
            kind: TranscriptionErrorKind::GroqApiError,
            message: format!("Network error: {e}"),
        })?;

    if let Some(tmp) = &upload_path {
        let _ = tokio::fs::remove_file(tmp).await;
    }

    let status = resp.status();
    let body = resp.text().await.unwrap_or_default();
    if !status.is_success() {
        let msg = if status.as_u16() == 401 {
            "Invalid API key — check your key in Settings → Transcription.".to_string()
        } else if status.as_u16() == 413 {
            "File too large (max 25 MB). Try a shorter clip.".to_string()
        } else {
            format!("API error {status}: {body}")
        };
        return Err(TranscriptionError {
            kind: TranscriptionErrorKind::GroqApiError,
            message: msg,
        });
    }

    Ok(super::formatter::format_whisper_json_to_srt(&body))
}

async fn transcribe_gemini(
    resolved_path: &Path,
    api_key: &str,
) -> Result<String, TranscriptionError> {
    let upload_path = maybe_extract_audio(resolved_path).await?;
    let upload_ref = upload_path.as_deref().unwrap_or(resolved_path);

    let audio_bytes = tokio::fs::read(upload_ref).await.map_err(|e| TranscriptionError {
        kind: TranscriptionErrorKind::GroqApiError,
        message: format!("Cannot read file: {e}"),
    })?;

    if let Some(tmp) = &upload_path {
        let _ = tokio::fs::remove_file(tmp).await;
    }

    let b64 = {
        use std::io::Write;
        let mut enc = Vec::new();
        {
            let mut e = base64_encoder(&mut enc);
            e.write_all(&audio_bytes).ok();
        }
        String::from_utf8(enc).unwrap_or_default()
    };

    let body = serde_json::json!({
        "contents": [{
            "parts": [
                { "text": "Transcribe this audio verbatim into broadcast-quality SRT subtitle format with timestamps. Follow standard subtitling rules strictly: Maximum 40 characters per line, maximum 2 lines per subtitle cue (never 3+ lines covering the screen). Break lines at natural punctuation and clause boundaries. Return ONLY valid SRT text." },
                { "inline_data": { "mime_type": "audio/mp4", "data": b64 } }
            ]
        }],
        "generationConfig": { "temperature": 0.0 }
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| TranscriptionError {
            kind: TranscriptionErrorKind::GroqApiError,
            message: format!("HTTP client: {e}"),
        })?;

    let resp = client
        .post(format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        ))
        .json(&body)
        .send()
        .await
        .map_err(|e| TranscriptionError {
            kind: TranscriptionErrorKind::GroqApiError,
            message: format!("Network error: {e}"),
        })?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().await.unwrap_or_default();
    if !status.is_success() {
        return Err(TranscriptionError {
            kind: TranscriptionErrorKind::GroqApiError,
            message: format!("Gemini API error {status}"),
        });
    }

    let text = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(text)
}

fn base64_encoder(out: &mut Vec<u8>) -> impl std::io::Write + '_ {
    struct B64Writer<'a>(&'a mut Vec<u8>, [u8; 3], usize);
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    impl<'a> std::io::Write for B64Writer<'a> {
        fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
            for &b in buf {
                self.1[self.2] = b;
                self.2 += 1;
                if self.2 == 3 {
                    let [a, b, c] = self.1;
                    self.0.push(TABLE[(a >> 2) as usize]);
                    self.0.push(TABLE[((a & 3) << 4 | b >> 4) as usize]);
                    self.0.push(TABLE[((b & 15) << 2 | c >> 6) as usize]);
                    self.0.push(TABLE[(c & 63) as usize]);
                    self.2 = 0;
                }
            }
            Ok(buf.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            if self.2 > 0 {
                let (a, b) = (self.1[0], if self.2 > 1 { self.1[1] } else { 0 });
                self.0.push(TABLE[(a >> 2) as usize]);
                self.0.push(TABLE[((a & 3) << 4 | b >> 4) as usize]);
                if self.2 > 1 {
                    self.0.push(TABLE[((b & 15) << 2) as usize]);
                } else {
                    self.0.push(b'=');
                }
                self.0.push(b'=');
            }
            Ok(())
        }
    }
    B64Writer(out, [0u8; 3], 0)
}

async fn maybe_extract_audio(path: &Path) -> Result<Option<PathBuf>, TranscriptionError> {
    let size = tokio::fs::metadata(path)
        .await
        .map(|m| m.len())
        .unwrap_or(0);

    const MAX: u64 = 24 * 1024 * 1024;
    if size <= MAX {
        return Ok(None);
    }

    let Some(ffmpeg) = crate::download_manager::find_ffmpeg_binary() else {
        log::warn!("File > 24 MB and ffmpeg not found — uploading raw");
        return Ok(None);
    };

    let tmp = std::env::temp_dir().join(format!("downlink_audio_{}.m4a", uuid::Uuid::new_v4()));

    let ok = tokio::time::timeout(
        std::time::Duration::from_secs(120),
        Command::new(&ffmpeg)
            .args([
                "-y",
                "-i",
                &path.to_string_lossy(),
                "-vn",
                "-ar",
                "16000",
                "-ac",
                "1",
                "-b:a",
                "64k",
                &tmp.to_string_lossy(),
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

    Ok(if ok && tmp.exists() { Some(tmp) } else { None })
}
