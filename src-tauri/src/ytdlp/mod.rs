pub mod metadata;
pub mod sniffer;
pub mod types;

use std::path::Path;
use std::process::Stdio;
use std::time::Duration;

#[cfg(windows)]
#[allow(unused_imports)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

use anyhow::{anyhow, Context, Result};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

pub use self::metadata::{
    height_label_and_format, infer_title_from_url, is_token_or_hash, parse_playlist_entry,
    parse_preview_metadata, parse_quality_options,
};
pub use self::sniffer::{
    advanced_webview_sniffer, clean_media_url, extract_dailymotion_canonical_url,
    fallback_iframe_sniffer, is_native_platform_url,
};
pub use self::types::{
    PlaylistEntry, PreviewMetadata, VideoQualityOption, YtDlpConfig, YtDlpError, YtDlpErrorKind,
    YtDlpOutput,
};

#[derive(Debug, Clone)]
pub struct YtDlpRunner {
    cfg: YtDlpConfig,
}

impl YtDlpRunner {
    pub fn new(cfg: YtDlpConfig) -> Self {
        Self { cfg }
    }

    pub fn yt_dlp_path(&self) -> &Path {
        &self.cfg.yt_dlp_path
    }

    pub async fn fast_fetch_preview(&self, url: &str) -> Result<Option<PreviewMetadata>> {
        let has_playlist_param = url.contains("list=") || url.contains("/playlist");

        let mut args = vec![
            "--no-warnings".to_string(),
            "--no-playlist".to_string(),
            "--print".to_string(),
            "%(webpage_url)s\t%(title)s\t%(uploader|)s\t%(thumbnail|)s\t%(duration|)s".to_string(),
            "--socket-timeout".to_string(),
            "10".to_string(),
            "--retries".to_string(),
            "1".to_string(),
            "--extractor-retries".to_string(),
            "1".to_string(),
        ];

        if has_playlist_param {
            args.push("--playlist-items".to_string());
            args.push("1".to_string());
        }

        args.push(url.to_string());

        let fast_timeout = Duration::from_secs(12);
        let (lines, _output) = match self.exec_lines(&args, fast_timeout).await {
            Ok(v) => v,
            Err(_) => return Ok(None),
        };

        for line in &lines {
            let parts: Vec<&str> = line.splitn(5, '\t').collect();
            if parts.len() < 2 {
                continue;
            }
            let resolved_url = if parts[0].starts_with("http") {
                parts[0].to_string()
            } else {
                url.to_string()
            };
            let title = if parts[1].is_empty() || parts[1] == "NA" {
                None
            } else {
                Some(parts[1].to_string())
            };
            if title.is_none() {
                continue;
            }

            let uploader = parts
                .get(2)
                .filter(|s| !s.is_empty() && **s != "NA")
                .map(|s| s.to_string());
            let thumbnail_url = parts
                .get(3)
                .filter(|s| !s.is_empty() && **s != "NA")
                .map(|s| s.to_string());
            let duration_seconds = parts.get(4).and_then(|s| s.trim().parse::<u64>().ok());

            return Ok(Some(PreviewMetadata {
                url: resolved_url,
                stream_url: None,
                title,
                uploader,
                duration_seconds,
                thumbnail_url,
                filesize_bytes: None,
                is_playlist: has_playlist_param,
                playlist_title: None,
                playlist_count_hint: None,
                available_qualities: vec![],
            }));
        }

        Ok(None)
    }

    pub async fn fetch_preview_metadata(
        &self,
        url: &str,
        app: Option<&tauri::AppHandle>,
    ) -> Result<PreviewMetadata> {
        let is_playlist_url = url.contains("list=") || url.contains("/playlist");

        let mut args = vec![
            "--dump-single-json".to_string(),
            "--no-warnings".to_string(),
            "--flat-playlist".to_string(),
            "--socket-timeout".to_string(),
            "15".to_string(),
            "--retries".to_string(),
            "2".to_string(),
            "--extractor-retries".to_string(),
            "2".to_string(),
        ];

        if is_playlist_url {
            args.push("--playlist-items".to_string());
            args.push("1".to_string());
        }

        args.push(url.to_string());

        let timeout = self.cfg.metadata_timeout;
        let exec_result = self.exec_json(&args, timeout).await;

        match exec_result {
            Ok((json_lines, _output)) => {
                let first = json_lines
                    .into_iter()
                    .next()
                    .ok_or_else(|| anyhow!("no json line emitted by yt-dlp"))?;
                parse_preview_metadata(&first, url)
            }
            Err(e) => {
                log::warn!(
                    "yt-dlp Tier 1 failed for {}: {}. Attempting fallback iframe sniffer...",
                    url,
                    e
                );

                if let Some(iframe_url) = fallback_iframe_sniffer(url).await {
                    log::info!("Tier 2: Found iframe URL: {}. Retrying yt-dlp...", iframe_url);
                    let fallback_args = vec![
                        "--dump-single-json".to_string(),
                        "--no-warnings".to_string(),
                        "--no-playlist".to_string(),
                        "--referer".to_string(),
                        url.to_string(),
                        iframe_url.clone(),
                    ];
                    if let Ok((json_lines, _)) = self.exec_json(&fallback_args, timeout).await {
                        if let Some(first) = json_lines.into_iter().next() {
                            if let Ok(mut meta) = parse_preview_metadata(&first, &iframe_url) {
                                meta.url = url.to_string();
                                if iframe_url.contains("dailymotion.com/video/") {
                                    meta.stream_url = None;
                                } else {
                                    meta.stream_url = Some(iframe_url.clone());
                                }
                                return Ok(meta);
                            }
                        }
                    }
                }

                // TikTok dedicated fallback preview
                if url.contains("tiktok.com") {
                    if let Some((direct_stream, title, cover)) = crate::ytdlp::sniffer::resolve_tiktok_fallback(url).await {
                        log::info!("Tier 2.5: TikTok fallback resolved direct stream: {}", direct_stream);
                        return Ok(PreviewMetadata {
                            url: url.to_string(),
                            stream_url: Some(direct_stream),
                            title: Some(title),
                            uploader: Some("TikTok Creator".to_string()),
                            duration_seconds: None,
                            thumbnail_url: cover,
                            filesize_bytes: None,
                            is_playlist: false,
                            playlist_title: None,
                            playlist_count_hint: None,
                            available_qualities: vec![],
                        });
                    }
                }

                if let Some(app_handle) = app {
                    if let Some(mut sniffed_url) = advanced_webview_sniffer(app_handle, url).await {
                        log::info!("Tier 3: Found sniffed URL: {}. Extracting metadata...", sniffed_url);

                        if let Some(canonical) = extract_dailymotion_canonical_url(&sniffed_url) {
                            log::info!("Tier 3: Normalized Dailymotion sniffed URL to canonical: {}", canonical);
                            sniffed_url = canonical;
                        }

                        let is_direct_media = (sniffed_url.contains(".m3u8")
                            || sniffed_url.contains(".mp4")
                            || sniffed_url.contains(".ts"))
                            && !sniffed_url.contains("dailymotion.com");

                        if is_direct_media {
                            let title = infer_title_from_url(url);
                            return Ok(PreviewMetadata {
                                url: url.to_string(),
                                stream_url: Some(sniffed_url.clone()),
                                title: Some(title),
                                uploader: None,
                                duration_seconds: None,
                                thumbnail_url: None,
                                filesize_bytes: None,
                                is_playlist: false,
                                playlist_title: None,
                                playlist_count_hint: None,
                                available_qualities: vec![],
                            });
                        }

                        let sniffed_args = vec![
                            "--dump-single-json".to_string(),
                            "--no-warnings".to_string(),
                            "--no-playlist".to_string(),
                            "--referer".to_string(),
                            url.to_string(),
                            sniffed_url.clone(),
                        ];
                        if let Ok((json_lines, _)) = self.exec_json(&sniffed_args, timeout).await {
                            if let Some(first) = json_lines.into_iter().next() {
                                if let Ok(mut meta) = parse_preview_metadata(&first, &sniffed_url) {
                                    meta.url = url.to_string();
                                    if sniffed_url.contains("dailymotion.com/video/") {
                                        meta.stream_url = None;
                                    } else {
                                        meta.stream_url = Some(sniffed_url.clone());
                                    }
                                    return Ok(meta);
                                }
                            }
                        }
                    }
                }

                Err(e)
            }
        }
    }

    pub async fn fetch_playlist_entries(
        &self,
        playlist_url: &str,
    ) -> Result<(Vec<PlaylistEntry>, YtDlpOutput)> {
        let args = vec![
            "--flat-playlist".to_string(),
            "--dump-single-json".to_string(),
            "--no-warnings".to_string(),
            "--socket-timeout".to_string(),
            "15".to_string(),
            "--retries".to_string(),
            "2".to_string(),
            playlist_url.to_string(),
        ];

        let timeout = Duration::from_secs(60);
        let (json_lines, output) = self.exec_json(&args, timeout).await?;

        let mut entries = Vec::new();

        for line in &json_lines {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(arr) = v.get("entries").and_then(|x| x.as_array()) {
                    for entry_val in arr {
                        let entry_str = serde_json::to_string(entry_val).unwrap_or_default();
                        if let Ok(entry) = parse_playlist_entry(&entry_str, playlist_url) {
                            entries.push(entry);
                        }
                    }
                } else if let Ok(entry) = parse_playlist_entry(line, playlist_url) {
                    entries.push(entry);
                }
            }
        }

        Ok((entries, output))
    }

    async fn exec_lines(
        &self,
        extra_args: &[String],
        timeout: Duration,
    ) -> Result<(Vec<String>, YtDlpOutput)> {
        let mut cmd = Command::new(&self.cfg.yt_dlp_path);
        for a in &self.cfg.global_args {
            cmd.arg(a);
        }
        for a in extra_args {
            cmd.arg(a);
        }

        cmd.stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let mut child = cmd.spawn().with_context(|| {
            format!("failed to spawn yt-dlp: {}", self.cfg.yt_dlp_path.display())
        })?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| anyhow!("failed to capture stdout"))?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| anyhow!("failed to capture stderr"))?;

        let mut stdout_reader = BufReader::new(stdout).lines();
        let mut stderr_reader = BufReader::new(stderr).lines();

        let mut stdout_lines: Vec<String> = Vec::new();
        let mut stderr_lines: Vec<String> = Vec::new();
        let mut stdout_done = false;
        let mut stderr_done = false;

        let read_task = async {
            loop {
                if stdout_done && stderr_done {
                    break;
                }
                tokio::select! {
                    line = stdout_reader.next_line(), if !stdout_done => {
                        match line {
                            Ok(Some(l)) => { if stdout_lines.len() < 2000 { stdout_lines.push(l); } }
                            Ok(None) => stdout_done = true,
                            Err(e) => return Err(anyhow!("stdout error: {e}")),
                        }
                    }
                    line = stderr_reader.next_line(), if !stderr_done => {
                        match line {
                            Ok(Some(l)) => { if stderr_lines.len() < 2000 { stderr_lines.push(l); } }
                            Ok(None) => stderr_done = true,
                            Err(e) => return Err(anyhow!("stderr error: {e}")),
                        }
                    }
                }
            }
            Ok::<(), anyhow::Error>(())
        };

        let timed = tokio::time::timeout(timeout, read_task).await;
        if timed.is_err() {
            let _ = child.kill().await;
            return Err(anyhow!("yt-dlp exec_lines timed out after {:?}", timeout));
        }
        timed.unwrap()?;

        let status = child.wait().await?;
        let exit_code = status.code();

        let output = YtDlpOutput {
            stdout_lines: stdout_lines.clone(),
            stderr_lines,
            exit_code,
        };

        if !status.success() {
            return Err(YtDlpError {
                kind: YtDlpErrorKind::NonZeroExit,
                message: format!("yt-dlp failed with exit code {:?}", exit_code),
                output: Some(output),
            }
            .into());
        }

        Ok((stdout_lines, output))
    }

    async fn exec_json(
        &self,
        extra_args: &[String],
        timeout: Duration,
    ) -> Result<(Vec<String>, YtDlpOutput)> {
        let mut cmd = Command::new(&self.cfg.yt_dlp_path);
        for a in &self.cfg.global_args {
            cmd.arg(a);
        }
        for a in extra_args {
            cmd.arg(a);
        }

        cmd.stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let mut child = cmd.spawn().with_context(|| {
            format!("failed to spawn yt-dlp: {}", self.cfg.yt_dlp_path.display())
        })?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| anyhow!("failed to capture yt-dlp stdout"))?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| anyhow!("failed to capture yt-dlp stderr"))?;

        let mut stdout_reader = BufReader::new(stdout).lines();
        let mut stderr_reader = BufReader::new(stderr).lines();

        const MAX_STDOUT_LINES: usize = 20_000;
        const MAX_STDERR_LINES: usize = 20_000;

        let mut stdout_lines: Vec<String> = Vec::new();
        let mut stderr_lines: Vec<String> = Vec::new();
        let mut json_lines: Vec<String> = Vec::new();
        let mut stdout_done = false;
        let mut stderr_done = false;

        let read_task = async {
            loop {
                if stdout_done && stderr_done {
                    break;
                }
                tokio::select! {
                    line = stdout_reader.next_line(), if !stdout_done => {
                        match line {
                            Ok(Some(l)) => {
                                if stdout_lines.len() < MAX_STDOUT_LINES {
                                    stdout_lines.push(l.clone());
                                }
                                if looks_like_json_object(&l) {
                                    json_lines.push(l);
                                }
                            }
                            Ok(None) => stdout_done = true,
                            Err(e) => return Err(anyhow!("error reading yt-dlp stdout: {e}")),
                        }
                    }
                    line = stderr_reader.next_line(), if !stderr_done => {
                        match line {
                            Ok(Some(l)) => {
                                if stderr_lines.len() < MAX_STDERR_LINES {
                                    stderr_lines.push(l);
                                }
                            }
                            Ok(None) => stderr_done = true,
                            Err(e) => return Err(anyhow!("error reading yt-dlp stderr: {e}")),
                        }
                    }
                }
            }
            Ok::<(), anyhow::Error>(())
        };

        let timed = tokio::time::timeout(timeout, read_task).await;
        if timed.is_err() {
            let _ = child.kill().await;
            return Err(YtDlpError {
                kind: YtDlpErrorKind::Timeout,
                message: format!("yt-dlp timed out after {:?}", timeout),
                output: Some(YtDlpOutput {
                    stdout_lines,
                    stderr_lines,
                    exit_code: None,
                }),
            }
            .into());
        }
        timed.unwrap()?;

        let status = child.wait().await?;
        let exit_code = status.code();

        let output = YtDlpOutput {
            stdout_lines: stdout_lines.clone(),
            stderr_lines,
            exit_code,
        };

        if !status.success() {
            return Err(YtDlpError {
                kind: YtDlpErrorKind::NonZeroExit,
                message: format!(
                    "yt-dlp exited with status {:?}. See logs for details.",
                    exit_code
                ),
                output: Some(output),
            }
            .into());
        }

        Ok((json_lines, output))
    }
}

fn looks_like_json_object(s: &str) -> bool {
    let t = s.trim_start();
    t.starts_with('{') && t.ends_with('}')
}
