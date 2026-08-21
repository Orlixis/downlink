use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use regex::Regex;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::{broadcast, mpsc, RwLock};
use uuid::Uuid;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

use super::classifier::classify_error;
use super::progress::{parse_bytes, parse_eta, parse_percent, parse_speed};
use super::types::{DownloadConfig, DownloadError, ParsedProgress, Preset};
use crate::events::{DownlinkEvent, DownloadStatus, ErrorCode, Phase, Progress};

pub async fn execute_download(
    id: Uuid,
    url: &str,
    referer: Option<&str>,
    custom_title: Option<&str>,
    preset_id: &str,
    output_dir: &str,
    config: Arc<RwLock<DownloadConfig>>,
    mut cancel_rx: broadcast::Receiver<()>,
    event_tx: mpsc::Sender<DownlinkEvent>,
    resumable: bool,
) -> std::result::Result<Option<String>, DownloadError> {
    let wants_subtitles = preset_id.contains("+subs");
    let wants_sponsorblock = preset_id.contains("+sb");
    let wants_meta = preset_id.contains("+meta");

    let trim_section: Option<String> = {
        if let Some(trim_idx) = preset_id.find("+trim:") {
            let after = &preset_id[trim_idx + 6..];
            let end = after.find('+').unwrap_or(after.len());
            let range_str = &after[..end];
            if let Some(dash) = range_str.find('-') {
                let start_s = range_str[..dash].parse::<f64>().ok();
                let end_s = range_str[dash + 1..].parse::<f64>().ok();
                if let (Some(s), Some(e)) = (start_s, end_s) {
                    let fmt = |secs: f64| -> String {
                        let total = secs as u64;
                        let h = total / 3600;
                        let m = (total % 3600) / 60;
                        let sec = total % 60;
                        format!("{:02}:{:02}:{:02}", h, m, sec)
                    };
                    Some(format!("*{}-{}", fmt(s), fmt(e)))
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        }
    };

    let clean_preset = {
        let mut p = preset_id.to_string();
        p = p.replace("+subs", "");
        p = p.replace("+sb", "");
        p = p.replace("+meta", "");
        while let Some(idx) = p.find("+trim:") {
            let end = p[idx + 1..].find('+').map(|i| idx + 1 + i).unwrap_or(p.len());
            p.drain(idx..end);
        }
        p
    };
    let preset_id = clean_preset.as_str();

    let preset = if let Some(fmt) = preset_id.strip_prefix("custom:") {
        Preset {
            id: preset_id.to_string(),
            name: "Custom Quality".to_string(),
            yt_dlp_args: vec![
                "-f".to_string(),
                fmt.to_string(),
                "--merge-output-format".to_string(),
                "mp4".to_string(),
            ],
        }
    } else {
        Preset::get_by_id(preset_id).unwrap_or_else(|| Preset::builtin_presets()[0].clone())
    };

    let config_guard = config.read().await;

    let output_template = if let Some(title) = custom_title {
        let safe = sanitize_filename::sanitize(title);
        let trimmed: String = safe.chars().take(120).collect();
        if !trimmed.trim().is_empty() {
            format!("{}/{}.%(ext)s", output_dir, trimmed)
        } else {
            format!("{}/{}", output_dir, config_guard.default_output_template)
        }
    } else {
        format!("{}/{}", output_dir, config_guard.default_output_template)
    };

    let temp_staging_dir = crate::db::app_data_dir()
        .map(|d| d.join("tmp").join(id.to_string()))
        .unwrap_or_else(|_| PathBuf::from(output_dir));
    let _ = tokio::fs::create_dir_all(&temp_staging_dir).await;

    let mut args = vec![
        "--newline".to_string(),
        "--no-warnings".to_string(),
        "--no-playlist".to_string(),
        "--progress".to_string(),
        "--progress-template".to_string(),
        "download:[downlink] %(progress._percent_str)s %(progress._speed_str)s %(progress._eta_str)s %(progress._total_bytes_str)s".to_string(),
        "--paths".to_string(),
        format!("temp:{}", temp_staging_dir.display()),
        "-o".to_string(),
        output_template,
        "--trim-filenames".to_string(),
        "160".to_string(),
        "--windows-filenames".to_string(),
        "--concurrent-fragments".to_string(),
        "16".to_string(),
        "--user-agent".to_string(),
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36".to_string(),
    ];

    if let Some(ref_url) = referer {
        if !ref_url.trim().is_empty() {
            args.push("--referer".to_string());
            args.push(ref_url.to_string());
        }
    }

    args.extend(preset.yt_dlp_args.clone());

    if wants_subtitles {
        args.extend([
            "--write-auto-subs".to_string(),
            "--embed-subs".to_string(),
            "--sub-langs".to_string(),
            "en,en-US,en-GB".to_string(),
            "--convert-subs".to_string(),
            "srt".to_string(),
        ]);
        log::info!("Download {} — subtitles enabled", id);
    }

    if wants_sponsorblock {
        args.extend([
            "--sponsorblock-remove".to_string(),
            "sponsor,selfpromo,interaction,intro,outro".to_string(),
        ]);
        log::info!("Download {} — SponsorBlock removal enabled", id);
    }

    if let Some(ref section) = trim_section {
        args.push("--download-sections".to_string());
        args.push(section.clone());
        args.push("--force-keyframes-at-cuts".to_string());
        log::info!("Download {} — trim sections: {}", id, section);
    }

    if wants_meta {
        args.extend([
            "--embed-thumbnail".to_string(),
            "--add-metadata".to_string(),
            "--embed-metadata".to_string(),
            "--convert-thumbnails".to_string(),
            "jpg".to_string(),
        ]);
        log::info!("Download {} — metadata embedding enabled", id);
    }

    if resumable {
        args.push("--continue".to_string());
        args.push("--no-part".to_string());
        log::info!("Download {} is resumable — injecting --continue --no-part", id);
    }

    if let Some(ref ffmpeg_path) = config_guard.ffmpeg_path {
        args.push("--ffmpeg-location".to_string());
        args.push(ffmpeg_path.to_string_lossy().to_string());
    }

    args.push(url.to_string());
    log::info!("Starting download {} with args: {:?}", id, args);

    let mut cmd = Command::new(&config_guard.yt_dlp_path);
    cmd.args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut child = cmd.spawn().map_err(|e| DownloadError::Failed {
        code: ErrorCode::ToolMissing,
        message: format!("Failed to start yt-dlp: {}", e),
        actions: vec![],
    })?;

    let stdout = child.stdout.take().ok_or_else(|| DownloadError::Failed {
        code: ErrorCode::Unknown,
        message: "Failed to capture stdout".to_string(),
        actions: vec![],
    })?;

    let stderr = child.stderr.take().ok_or_else(|| DownloadError::Failed {
        code: ErrorCode::Unknown,
        message: "Failed to capture stderr".to_string(),
        actions: vec![],
    })?;

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    let mut stderr_lines: Vec<String> = Vec::new();
    let mut final_path: Option<String> = None;
    let mut reported_percent: f64 = 0.0;

    let progress_re = Regex::new(r"\[downlink\]\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)").ok();
    let fallback_progress_re =
        Regex::new(r"\[download\]\s+(\d+\.?\d*)%\s+of\s+(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)").ok();
    let fallback_progress_re2 = Regex::new(r"\[download\]\s+(\d+\.?\d*)%").ok();
    let merge_re = Regex::new(r"\[Merger\]|Merging formats|\[ffmpeg\]").ok();
    let dest_re = Regex::new(r#"\[download\] Destination: (.+)"#).ok();
    let already_re = Regex::new(r#"\[download\] (.+) has already been downloaded"#).ok();
    let merge_dest_re = Regex::new(r#"Merging formats into "([^"]+)""#).ok();
    let move_dest_re = Regex::new(r#"Moving file(?:.*?) to "([^"]+)""#).ok();
    let finished_re = Regex::new(r#"\[download\] 100%"#).ok();

    loop {
        tokio::select! {
            _ = cancel_rx.recv() => {
                log::info!("Download {} received cancel signal", id);
                let _ = child.kill().await;
                return Err(DownloadError::Stopped);
            }
            line = stdout_reader.next_line() => {
                match line {
                    Ok(Some(l)) => {
                        log::info!("yt-dlp stdout: {}", l);

                        let mut parsed: Option<ParsedProgress> = None;

                        if let Some(ref re) = progress_re {
                            if let Some(caps) = re.captures(&l) {
                                let percent_str = caps.get(1).map(|m| m.as_str()).unwrap_or("");
                                let speed_str = caps.get(2).map(|m| m.as_str()).unwrap_or("");
                                let eta_str = caps.get(3).map(|m| m.as_str()).unwrap_or("");
                                let total_str = caps.get(4).map(|m| m.as_str()).unwrap_or("");

                                parsed = Some(ParsedProgress {
                                    percent: parse_percent(percent_str),
                                    speed_bps: parse_speed(speed_str),
                                    eta_seconds: parse_eta(eta_str),
                                    bytes_total: parse_bytes(total_str),
                                    bytes_downloaded: None,
                                    phase: Some("Downloading".to_string()),
                                });
                            }
                        }

                        if parsed.is_none() {
                            if let Some(ref re) = fallback_progress_re {
                                if let Some(caps) = re.captures(&l) {
                                    let percent = caps.get(1).and_then(|m| m.as_str().parse::<f64>().ok());
                                    let total = caps.get(2).map(|m| m.as_str().to_string());
                                    let speed = caps.get(3).and_then(|m| parse_speed(m.as_str()));
                                    let eta = caps.get(4).and_then(|m| parse_eta(m.as_str()));
                                    parsed = Some(ParsedProgress {
                                        percent,
                                        bytes_total: total.as_deref().and_then(parse_bytes),
                                        bytes_downloaded: None,
                                        speed_bps: speed,
                                        eta_seconds: eta,
                                        phase: Some("Downloading".to_string()),
                                    });
                                }
                            }
                        }

                        if parsed.is_none() {
                            if let Some(ref re) = fallback_progress_re2 {
                                if let Some(caps) = re.captures(&l) {
                                    let percent = caps.get(1).and_then(|m| m.as_str().parse::<f64>().ok());
                                    if percent.is_some() {
                                        parsed = Some(ParsedProgress {
                                            percent,
                                            bytes_total: None,
                                            bytes_downloaded: None,
                                            speed_bps: None,
                                            eta_seconds: None,
                                            phase: Some("Downloading".to_string()),
                                        });
                                    }
                                }
                            }
                        }

                        if let Some(p) = parsed {
                            if let Some(pct) = p.percent {
                                if (pct - reported_percent).abs() >= 0.2 || pct >= 99.9 {
                                    reported_percent = pct;
                                    log::info!("Progress: {:.1}%", pct);
                                    let _ = event_tx.send(DownlinkEvent::DownloadProgress {
                                        id,
                                        status: DownloadStatus::Downloading,
                                        progress: Progress {
                                            percent: Some(pct),
                                            bytes_downloaded: p.bytes_downloaded,
                                            bytes_total: p.bytes_total,
                                            speed_bps: p.speed_bps,
                                            eta_seconds: p.eta_seconds,
                                            phase: Some(Phase {
                                                name: p.phase.clone().unwrap_or_else(|| "Downloading".to_string()),
                                                detail: None,
                                            }),
                                        },
                                    }).await;
                                }
                            }
                        }

                        if let Some(ref re) = merge_re {
                            if re.is_match(&l) {
                                log::info!("Post-processing: merging streams");
                                let _ = event_tx.send(DownlinkEvent::DownloadPostProcessing {
                                    id,
                                    step: "Merging streams".to_string(),
                                    detail: None,
                                }).await;
                            }
                        }

                        if let Some(ref re) = finished_re {
                            if re.is_match(&l) {
                                log::info!("Download complete, post-processing...");
                                let _ = event_tx.send(DownlinkEvent::DownloadProgress {
                                    id,
                                    status: DownloadStatus::Downloading,
                                    progress: Progress {
                                        percent: Some(100.0),
                                        bytes_downloaded: None,
                                        bytes_total: None,
                                        speed_bps: None,
                                        eta_seconds: None,
                                        phase: Some(Phase {
                                            name: "Finishing...".to_string(),
                                            detail: None,
                                        }),
                                    },
                                }).await;
                            }
                        }

                        if let Some(ref re) = dest_re {
                            if let Some(caps) = re.captures(&l) {
                                final_path = caps.get(1).map(|m| m.as_str().to_string());
                            }
                        }
                        if let Some(ref re) = merge_dest_re {
                            if let Some(caps) = re.captures(&l) {
                                final_path = caps.get(1).map(|m| m.as_str().to_string());
                            }
                        }
                        if let Some(ref re) = move_dest_re {
                            if let Some(caps) = re.captures(&l) {
                                final_path = caps.get(1).map(|m| m.as_str().to_string());
                            }
                        }
                        if let Some(ref re) = already_re {
                            if let Some(caps) = re.captures(&l) {
                                final_path = caps.get(1).map(|m| m.as_str().to_string());
                            }
                        }
                    }
                    Ok(None) => break,
                    Err(e) => {
                        log::error!("Error reading stdout: {}", e);
                        break;
                    }
                }
            }
            line = stderr_reader.next_line() => {
                match line {
                    Ok(Some(l)) => {
                        log::debug!("yt-dlp stderr: {}", l);
                        stderr_lines.push(l);
                    }
                    Ok(None) => {}
                    Err(e) => {
                        log::error!("Error reading stderr: {}", e);
                    }
                }
            }
        }
    }

    let status = child.wait().await.map_err(|e| DownloadError::Failed {
        code: ErrorCode::Unknown,
        message: format!("Failed to wait for yt-dlp: {}", e),
        actions: vec![],
    })?;

    if !status.success() {
        let stderr_text = stderr_lines.join("\n");
        let (code, message, actions) = classify_error(&stderr_text);

        if url.contains(".m3u8") || url.contains(".mp4") {
            log::warn!("Tier 4 Bypass: yt-dlp failed, falling back to raw ffmpeg bypass for {}", url);
            let final_fallback_path = format!("{}/downlink_raw_{}.mp4", output_dir, id);

            let ffmpeg_path = config.read().await.ffmpeg_path.clone();
            if let Some(ffmpeg_bin) = ffmpeg_path {
                let mut ffmpeg_cmd = Command::new(ffmpeg_bin);
                ffmpeg_cmd.args(["-i", url, "-c", "copy", "-y", &final_fallback_path]);

                #[cfg(windows)]
                ffmpeg_cmd.creation_flags(CREATE_NO_WINDOW);

                let _ = event_tx.send(DownlinkEvent::DownloadProgress {
                    id,
                    status: DownloadStatus::Downloading,
                    progress: Progress {
                        percent: None,
                        bytes_downloaded: None,
                        bytes_total: None,
                        speed_bps: None,
                        eta_seconds: None,
                        phase: Some(Phase {
                            name: "Fallback raw extraction...".to_string(),
                            detail: None,
                        }),
                    },
                }).await;

                if let Ok(mut ffmpeg_child) = ffmpeg_cmd.spawn() {
                    let _ = ffmpeg_child.wait().await;
                    if let Ok(metadata) = std::fs::metadata(&final_fallback_path) {
                        if metadata.len() > 0 {
                            log::info!("Tier 4 Bypass successful! Saved to {}", final_fallback_path);
                            return Ok(Some(final_fallback_path));
                        }
                    }
                }
            }
        }

        return Err(DownloadError::Failed {
            code,
            message,
            actions,
        });
    }

    Ok(final_path)
}
