use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use base64::Engine;
use tokio::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

use super::types::FetchedMetadata;

pub fn find_ytdlp_binary() -> PathBuf {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let sidecar_path = exe_dir.join("yt-dlp");
            if sidecar_path.exists() {
                log::info!("Found bundled yt-dlp sidecar at: {:?}", sidecar_path);
                return sidecar_path;
            }

            if let Some(parent) = exe_dir.parent() {
                let resources_path = parent.join("Resources").join("yt-dlp");
                if resources_path.exists() {
                    log::info!("Found bundled yt-dlp in Resources at: {:?}", resources_path);
                    return resources_path;
                }
            }
        }
    }

    let common_paths = [
        "/opt/homebrew/bin/yt-dlp",
        "/usr/local/bin/yt-dlp",
        "$HOME/.local/bin/yt-dlp",
        "/usr/bin/yt-dlp",
        "$HOME/.local/pipx/venvs/yt-dlp/bin/yt-dlp",
        "/opt/local/bin/yt-dlp",
    ];

    for path_template in &common_paths {
        let expanded = if path_template.starts_with("$HOME") {
            if let Some(home) = std::env::var_os("HOME") {
                path_template.replace("$HOME", &home.to_string_lossy())
            } else {
                continue;
            }
        } else {
            path_template.to_string()
        };

        let path = PathBuf::from(&expanded);
        if path.exists() {
            log::info!("Found yt-dlp at: {:?}", path);
            return path;
        }
    }

    #[cfg(not(windows))]
    if let Ok(output) = std::process::Command::new("which").arg("yt-dlp").output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                let path = PathBuf::from(&path_str);
                if path.exists() {
                    log::info!("Found yt-dlp via which: {:?}", path);
                    return path;
                }
            }
        }
    }

    log::warn!("Could not find yt-dlp in common paths, falling back to PATH lookup");
    PathBuf::from("yt-dlp")
}

pub fn find_ffmpeg_binary() -> Option<PathBuf> {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let sidecar_path = exe_dir.join("ffmpeg");
            if sidecar_path.exists() {
                log::info!("Found bundled ffmpeg sidecar at: {:?}", sidecar_path);
                return Some(sidecar_path);
            }

            if let Some(parent) = exe_dir.parent() {
                let resources_path = parent.join("Resources").join("ffmpeg");
                if resources_path.exists() {
                    log::info!("Found bundled ffmpeg in Resources at: {:?}", resources_path);
                    return Some(resources_path);
                }
            }
        }
    }

    let common_paths = [
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
        "$HOME/.local/bin/ffmpeg",
    ];

    for path_template in &common_paths {
        let expanded = if path_template.starts_with("$HOME") {
            if let Some(home) = std::env::var_os("HOME") {
                path_template.replace("$HOME", &home.to_string_lossy())
            } else {
                continue;
            }
        } else {
            path_template.to_string()
        };

        let path = PathBuf::from(&expanded);
        if path.exists() {
            log::info!("Found ffmpeg at: {:?}", path);
            return Some(path);
        }
    }

    #[cfg(not(windows))]
    if let Ok(output) = std::process::Command::new("which").arg("ffmpeg").output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                let path = PathBuf::from(&path_str);
                if path.exists() {
                    log::info!("Found ffmpeg via which: {:?}", path);
                    return Some(path);
                }
            }
        }
    }

    None
}

pub async fn fetch_metadata_for_url(yt_dlp_path: &PathBuf, url: &str) -> Option<FetchedMetadata> {
    let mut cmd = Command::new(yt_dlp_path);
    cmd.args(["--dump-json", "--no-warnings", "--no-playlist", url]);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = tokio::time::timeout(Duration::from_secs(45), cmd.output()).await;

    match output {
        Ok(Ok(output)) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = stdout.lines().next() {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                    return Some(FetchedMetadata {
                        title: json
                            .get("title")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                        uploader: json
                            .get("uploader")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                        duration_seconds: json.get("duration").and_then(|v| v.as_u64()).or_else(
                            || {
                                json.get("duration")
                                    .and_then(|v| v.as_f64())
                                    .map(|f| f as u64)
                            },
                        ),
                        thumbnail_url: json
                            .get("thumbnail")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                    });
                }
            }
            None
        }
        _ => None,
    }
}

pub async fn fixup_disguised_hls_stream(final_path_str: &str, ffmpeg_bin: &Path) -> Option<String> {
    let target = Path::new(final_path_str);
    if !target.exists() {
        return None;
    }

    if let Ok(size) = std::fs::metadata(target).map(|m| m.len()) {
        if size < 500_000 {
            return None;
        }
    }

    let mut header = [0u8; 188];
    if let Ok(mut f) = std::fs::File::open(target) {
        use std::io::Read;
        if f.read_exact(&mut header).is_ok() {
            let is_png_disguise = header.starts_with(b"\x89PNG") || header.starts_with(b"GIF8");
            let has_ts_sync_byte = header.iter().any(|&b| b == 0x47);

            if is_png_disguise || has_ts_sync_byte {
                log::info!(
                    "Remuxing disguised stream into standard MP4 container: {:?}",
                    target
                );

                let temp_output = target.with_extension("fixed.mp4");
                let mut cmd = Command::new(ffmpeg_bin);
                cmd.args([
                    "-y",
                    "-f",
                    "mpegts",
                    "-i",
                    target.to_string_lossy().as_ref(),
                    "-c",
                    "copy",
                    temp_output.to_string_lossy().as_ref(),
                ])
                .stdout(Stdio::null())
                .stderr(Stdio::null());

                #[cfg(windows)]
                cmd.creation_flags(CREATE_NO_WINDOW);

                if let Ok(status) = cmd.status().await {
                    if status.success() && temp_output.exists() {
                        let _ = std::fs::remove_file(target);
                        let _ = std::fs::rename(&temp_output, target);
                        log::info!("Successfully remuxed stream to valid MP4 at {:?}", target);
                        return Some(target.to_string_lossy().to_string());
                    } else {
                        let _ = std::fs::remove_file(&temp_output);
                    }
                }
            }
        }
    }
    None
}

pub fn find_primary_media_file(path: &Path) -> Option<PathBuf> {
    if !path.exists() {
        return None;
    }
    if path.is_file() {
        return Some(path.to_path_buf());
    }
    if path.is_dir() {
        let media_extensions = [
            "mp4", "mkv", "avi", "webm", "mov", "m4v", "flv", "ts", "wmv", "mp3", "flac", "wav",
            "m4a", "aac", "ogg", "opus",
        ];
        let mut largest_file: Option<(PathBuf, u64)> = None;

        let mut stack = vec![path.to_path_buf()];
        while let Some(dir) = stack.pop() {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_dir() {
                        stack.push(p);
                    } else if p.is_file() {
                        let ext = p
                            .extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("")
                            .to_lowercase();
                        if media_extensions.contains(&ext.as_str()) {
                            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                            match &largest_file {
                                Some((_, max_size)) if size > *max_size => {
                                    largest_file = Some((p, size));
                                }
                                None => {
                                    largest_file = Some((p, size));
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
        }
        return largest_file.map(|(p, _)| p);
    }
    None
}

pub async fn extract_video_thumbnail_base64(video_path: &Path, ffmpeg_bin: &Path) -> Option<String> {
    let target_file = find_primary_media_file(video_path)?;

    let thumb_tmp = std::env::temp_dir().join(format!("downlink_thumb_{}.jpg", uuid::Uuid::new_v4()));

    let mut cmd = Command::new(ffmpeg_bin);
    cmd.args([
        "-y",
        "-ss",
        "00:00:03",
        "-i",
        target_file.to_string_lossy().as_ref(),
        "-vframes",
        "1",
        "-q:v",
        "2",
        "-vf",
        "scale=640:-1",
        thumb_tmp.to_string_lossy().as_ref(),
    ])
    .stdout(Stdio::null())
    .stderr(Stdio::null());

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if let Ok(status) = cmd.status().await {
        if status.success() && thumb_tmp.exists() {
            if let Ok(bytes) = tokio::fs::read(&thumb_tmp).await {
                let _ = tokio::fs::remove_file(&thumb_tmp).await;
                if !bytes.is_empty() {
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                    return Some(format!("data:image/jpeg;base64,{}", b64));
                }
            }
        }
    }

    let _ = tokio::fs::remove_file(&thumb_tmp).await;
    None
}
