use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Windows flag to prevent console window from appearing when spawning processes.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

/// Where to find yt-dlp.
#[derive(Debug, Clone)]
pub struct YtDlpConfig {
    /// Absolute path to `yt-dlp` binary (preferred for deterministic packaging).
    pub yt_dlp_path: PathBuf,

    /// Optional extra arguments injected into every yt-dlp call (e.g., proxy).
    pub global_args: Vec<String>,

    /// Timeout for metadata enumeration calls (not for downloads).
    pub metadata_timeout: Duration,
}

impl YtDlpConfig {
    pub fn new(yt_dlp_path: PathBuf) -> Self {
        Self {
            yt_dlp_path,
            global_args: vec![],
            metadata_timeout: Duration::from_secs(25),
        }
    }
}

/// Minimal preview metadata for the UI.
#[derive(Debug, Clone)]
pub struct PreviewMetadata {
    pub url: String,
    pub stream_url: Option<String>,
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub duration_seconds: Option<u64>,
    pub thumbnail_url: Option<String>,
    pub filesize_bytes: Option<u64>,

    pub is_playlist: bool,
    pub playlist_title: Option<String>,
    pub playlist_count_hint: Option<u64>,
    pub available_qualities: Vec<VideoQualityOption>,
}

/// A discrete quality option extracted from yt-dlp's format list.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoQualityOption {
    pub height: Option<u32>,
    pub label: String, // "4K", "1080p", "720p", "Audio Only"
    pub filesize_approx: Option<u64>,
    pub format_string: String, // the yt-dlp -f argument string
    pub is_audio_only: bool,
}

/// A single playlist entry returned by enumeration.
#[derive(Debug, Clone)]
pub struct PlaylistEntry {
    pub url: String,
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub duration_seconds: Option<u64>,
    pub thumbnail_url: Option<String>,
}

/// Low-level execution result.
#[derive(Debug, Clone)]
pub struct YtDlpOutput {
    /// Raw stdout lines captured (bounded).
    pub stdout_lines: Vec<String>,
    /// Raw stderr lines captured (bounded).
    pub stderr_lines: Vec<String>,
    /// Exit code if available.
    pub exit_code: Option<i32>,
}

/// Error categories we can map to user-facing remediation later.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum YtDlpErrorKind {
    NotFound,
    Timeout,
    InvalidJson,
    NonZeroExit,
}

#[derive(Debug)]
pub struct YtDlpError {
    pub kind: YtDlpErrorKind,
    pub message: String,
    pub output: Option<YtDlpOutput>,
}

impl std::fmt::Display for YtDlpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}: {}", self.kind, self.message)
    }
}

impl std::error::Error for YtDlpError {}

/// Primary runner for metadata and playlist operations.
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

    /// Fast Phase-1 preview: uses `--print` to get only title / uploader /
    /// thumbnail / duration WITHOUT fetching the full format list.
    ///
    /// This resolves in ~1-3 s for most sites because yt-dlp only makes the
    /// minimum number of HTTP requests needed to identify the video — it does
    /// NOT probe every CDN stream or enumerate formats.
    ///
    /// Returns None if the site is unsupported or the URL can't be resolved.
    pub async fn fast_fetch_preview(&self, url: &str) -> Result<Option<PreviewMetadata>> {
        let has_playlist_param = url.contains("list=") || url.contains("/playlist");

        let mut args = vec![
            "--no-warnings".to_string(),
            "--no-playlist".to_string(),
            // Print exactly what we need — no JSON blob, no format table
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
            Err(_) => return Ok(None), // graceful fallback to full fetch
        };

        // Find the first line matching our tab-delimited print format
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
            } // no title = not a valid video

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
                available_qualities: vec![], // populated by background fetch_metadata call
            }));
        }

        Ok(None)
    }

    /// Full metadata fetch via `--dump-json` — used for quality option enumeration
    /// and as a fallback when fast_fetch_preview returns None.
    ///
    /// Slower (5-15 s) because yt-dlp must enumerate every available format stream.
    pub async fn fetch_metadata(&self, url: &str) -> Result<(PreviewMetadata, YtDlpOutput)> {
        // Check if URL contains playlist parameter (e.g., &list= or ?list=)
        let has_playlist_param = url.contains("list=") || url.contains("/playlist");

        let mut args = vec![
            "--dump-json".to_string(),
            "--no-warnings".to_string(),
            "--newline".to_string(),
            // Preview-tuned flags: faster than defaults but not so aggressive that complex
            // streaming sites (which do multiple HTTP round-trips per page) fail.
            //
            // NOTE: --no-check-formats was removed — it breaks many streaming site extractors
            // that rely on format-check to resolve the actual video embed URL.
            "--socket-timeout".to_string(),
            "15".to_string(), // 15 s per socket op
            "--retries".to_string(),
            "2".to_string(), // 1 retry on network failure
            "--extractor-retries".to_string(),
            "2".to_string(), // 1 retry in extractor
        ];

        if has_playlist_param {
            // Use --playlist-items 1 to get playlist info while only fetching one video
            // This preserves playlist_id and playlist_title in the output
            args.push("--playlist-items".to_string());
            args.push("1".to_string());
        } else {
            // For non-playlist URLs, use --no-playlist for faster fetching
            args.push("--no-playlist".to_string());
        }

        args.push(url.to_string());

        let (json_lines, output) = self
            .exec_json_lines(&args, self.cfg.metadata_timeout)
            .await?;
        let first = json_lines
            .into_iter()
            .next()
            .ok_or_else(|| anyhow!("yt-dlp returned no JSON output"))?;

        let meta = parse_preview_metadata(&first, url)?;

        Ok((meta, output))
    }

    /// Enumerate a playlist into per-item entries.
    ///
    /// This is the key v1 UX behavior: playlist expands to individual queue items.
    ///
    /// Strategy:
    /// - Prefer `--flat-playlist --dump-json` for fast enumeration of entries.
    /// - Each line is a JSON object representing the playlist entry.
    ///
    /// Caveats:
    /// - Some extractors don't provide full `webpage_url` in flat mode; we attempt to build a URL.
    /// - If URLs can't be determined, we still return entries with best-effort URL.
    pub async fn enumerate_playlist(
        &self,
        playlist_url: &str,
    ) -> Result<(Vec<PlaylistEntry>, YtDlpOutput)> {
        let args = vec![
            "--flat-playlist".to_string(),
            "--dump-json".to_string(),
            "--no-warnings".to_string(),
            "--newline".to_string(),
            playlist_url.to_string(),
        ];

        let (json_lines, output) = self
            .exec_json_lines(&args, self.cfg.metadata_timeout)
            .await?;

        let mut entries = Vec::with_capacity(json_lines.len());
        for line in json_lines {
            if line.trim().is_empty() {
                continue;
            }
            match parse_playlist_entry(&line, playlist_url) {
                Ok(e) => entries.push(e),
                Err(_) => {
                    // For enumeration we don't want a single bad entry to kill the playlist.
                    // We can improve this by collecting per-entry parse errors later.
                    continue;
                }
            }
        }

        Ok((entries, output))
    }

    /// Execute yt-dlp and collect stdout lines (any line, not just JSON).
    async fn exec_lines(
        &self,
        args: &[String],
        timeout: Duration,
    ) -> Result<(Vec<String>, YtDlpOutput)> {
        if !self.cfg.yt_dlp_path.exists() {
            return Err(YtDlpError {
                kind: YtDlpErrorKind::NotFound,
                message: format!("yt-dlp not found at {}", self.cfg.yt_dlp_path.display()),
                output: None,
            }
            .into());
        }

        let mut cmd = Command::new(&self.cfg.yt_dlp_path);
        cmd.args(&self.cfg.global_args)
            .args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let mut child = cmd.spawn().with_context(|| {
            format!("failed to spawn yt-dlp: {}", self.cfg.yt_dlp_path.display())
        })?;

        let stdout = child.stdout.take().ok_or_else(|| anyhow!("no stdout"))?;
        let stderr = child.stderr.take().ok_or_else(|| anyhow!("no stderr"))?;
        let mut stdout_reader = BufReader::new(stdout).lines();
        let mut stderr_reader = BufReader::new(stderr).lines();

        let mut all_lines: Vec<String> = Vec::new();
        let mut stderr_lines: Vec<String> = Vec::new();

        let mut stdout_done = false;
        let mut stderr_done = false;

        let read_task = async {
            loop {
                if stdout_done && stderr_done {
                    break;
                }
                tokio::select! {
                    line = stdout_reader.next_line(), if !stdout_done => match line {
                        Ok(Some(l)) => { all_lines.push(l); }
                        Ok(None) => stdout_done = true,
                        Err(e) => return Err(anyhow!("stdout read error: {e}")),
                    },
                    line = stderr_reader.next_line(), if !stderr_done => match line {
                        Ok(Some(l)) => { if stderr_lines.len() < 500 { stderr_lines.push(l); } }
                        Ok(None) => stderr_done = true,
                        Err(e) => return Err(anyhow!("stderr read error: {e}")),
                    },
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
                    stdout_lines: all_lines,
                    stderr_lines,
                    exit_code: None,
                }),
            }
            .into());
        }
        timed.unwrap()?;
        let status = child.wait().await?;
        let output = YtDlpOutput {
            stdout_lines: all_lines.clone(),
            stderr_lines,
            exit_code: status.code(),
        };

        if !status.success() {
            return Err(YtDlpError {
                kind: YtDlpErrorKind::NonZeroExit,
                message: format!("yt-dlp exited {:?}", status.code()),
                output: Some(output),
            }
            .into());
        }
        Ok((all_lines, output))
    }

    /// Execute yt-dlp and return each stdout line that parses as a JSON object.
    async fn exec_json_lines(
        &self,
        args: &[String],
        timeout: Duration,
    ) -> Result<(Vec<String>, YtDlpOutput)> {
        // Prefer explicit binary path; check existence early for nicer errors.
        if !self.cfg.yt_dlp_path.exists() {
            return Err(YtDlpError {
                kind: YtDlpErrorKind::NotFound,
                message: format!("yt-dlp not found at {}", self.cfg.yt_dlp_path.display()),
                output: None,
            }
            .into());
        }

        let mut cmd = Command::new(&self.cfg.yt_dlp_path);
        cmd.args(&self.cfg.global_args)
            .args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Hide console window on Windows
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

        // Bound log capture to avoid unbounded memory use.
        const MAX_STDOUT_LINES: usize = 20_000;
        const MAX_STDERR_LINES: usize = 20_000;

        let mut stdout_lines: Vec<String> = Vec::new();
        let mut stderr_lines: Vec<String> = Vec::new();
        let mut json_lines: Vec<String> = Vec::new();
        let mut stdout_done = false;
        let mut stderr_done = false;

        // Read concurrently-ish in a simple loop. This is fine for metadata sized output.
        // If it becomes a perf issue, we can select over streams.
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
                                // json lines are typically full objects per line in these modes
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
            // Timeout: kill process and return error with partial output.
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
        timed.unwrap()?; // propagate read errors

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

fn parse_preview_metadata(json_line: &str, fallback_url: &str) -> Result<PreviewMetadata> {
    let v: Value = serde_json::from_str(json_line).map_err(|e| YtDlpError {
        kind: YtDlpErrorKind::InvalidJson,
        message: format!("invalid yt-dlp JSON: {e}"),
        output: None,
    })?;

    // Common yt-dlp fields:
    // - webpage_url
    // - title
    // - uploader / uploader_id
    // - duration
    // - thumbnail
    // Playlist indicators:
    // - _type: "playlist"
    // - entries: [...]
    // - playlist_count
    let webpage_url = v
        .get("webpage_url")
        .and_then(|x| x.as_str())
        .unwrap_or(fallback_url)
        .to_string();

    let stream_url = v
        .get("url")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            v.get("requested_formats")
                .and_then(|x| x.as_array())
                .and_then(|arr| arr.first())
                .and_then(|f| f.get("url"))
                .and_then(|x| x.as_str())
                .map(|s| s.to_string())
        });

    let title = v
        .get("title")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());
    let uploader = v
        .get("uploader")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());

    let duration_seconds = v
        .get("duration")
        .and_then(|x| x.as_u64())
        .or_else(|| v.get("duration").and_then(|x| x.as_f64()).map(|f| f as u64));

    let thumbnail_url = v
        .get("thumbnail")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());

    // Try filesize first, then filesize_approx
    let filesize_bytes = v
        .get("filesize")
        .and_then(|x| x.as_u64())
        .or_else(|| v.get("filesize_approx").and_then(|x| x.as_u64()));

    // Detect if this is a playlist in two ways:
    // 1. _type is "playlist" (direct playlist URL)
    // 2. The video has playlist_id field (video URL that's part of a playlist)
    let type_is_playlist = v
        .get("_type")
        .and_then(|x| x.as_str())
        .map(|t| t == "playlist")
        .unwrap_or(false);

    let has_entries = v.get("entries").is_some();

    // Check if this video belongs to a playlist (video URL with &list= parameter)
    let playlist_id = v
        .get("playlist_id")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());

    let is_playlist = type_is_playlist || has_entries || playlist_id.is_some();

    // Get playlist title - either from direct playlist or from video's playlist_title field
    let playlist_title = if type_is_playlist || has_entries {
        // Direct playlist URL - use the title field
        v.get("title")
            .and_then(|x| x.as_str())
            .map(|s| s.to_string())
    } else {
        // Video that belongs to a playlist - use playlist_title field
        v.get("playlist_title")
            .and_then(|x| x.as_str())
            .map(|s| s.to_string())
    };

    let playlist_count_hint = v
        .get("playlist_count")
        .and_then(|x| x.as_u64())
        .or_else(|| v.get("n_entries").and_then(|x| x.as_u64()));

    let available_qualities = parse_quality_options(&v);

    Ok(PreviewMetadata {
        url: webpage_url,
        stream_url,
        title,
        uploader,
        duration_seconds,
        thumbnail_url,
        filesize_bytes,
        is_playlist,
        playlist_title,
        playlist_count_hint,
        available_qualities,
    })
}

/// Map a video height to a human-readable label and a yt-dlp format selection string.
fn height_label_and_format(height: u32) -> (String, String) {
    let label = match height {
        h if h >= 2160 => "4K".to_string(),
        h if h >= 1440 => "1440p".to_string(),
        h if h >= 1080 => "1080p".to_string(),
        h if h >= 720 => "720p".to_string(),
        h if h >= 480 => "480p".to_string(),
        h => format!("{}p", h),
    };
    let format_string = format!(
        "bestvideo[height<={}]+bestaudio/best[height<={}]",
        height, height
    );
    (label, format_string)
}

/// Parse the `formats` array from a yt-dlp JSON dump into quality options.
/// Groups by unique height, picks the entry with the largest filesize per group,
/// and appends an "Audio Only" option if audio-only streams are available.
fn parse_quality_options(v: &serde_json::Value) -> Vec<VideoQualityOption> {
    use std::collections::HashMap;

    let formats = match v.get("formats").and_then(|f| f.as_array()) {
        Some(arr) => arr,
        None => return vec![],
    };

    // height (pixels) → max video filesize seen for that height
    let mut height_map: HashMap<u32, u64> = HashMap::new();
    let mut best_audio_filesize: u64 = 0;
    let mut has_audio_only = false;

    for fmt in formats {
        let vcodec = fmt.get("vcodec").and_then(|v| v.as_str()).unwrap_or("none");
        let acodec = fmt.get("acodec").and_then(|v| v.as_str()).unwrap_or("none");
        let height = fmt.get("height").and_then(|h| h.as_u64()).map(|h| h as u32);
        let filesize = fmt
            .get("filesize")
            .and_then(|f| f.as_u64())
            .or_else(|| fmt.get("filesize_approx").and_then(|f| f.as_u64()))
            .unwrap_or(0);

        let has_video = !vcodec.is_empty() && vcodec != "none";
        let has_audio = !acodec.is_empty() && acodec != "none";

        if has_video {
            if let Some(h) = height {
                if h >= 360 {
                    let entry = height_map.entry(h).or_insert(0);
                    if filesize > *entry {
                        *entry = filesize;
                    }
                }
            }
        } else if has_audio && !has_video {
            has_audio_only = true;
            if filesize > best_audio_filesize {
                best_audio_filesize = filesize;
            }
        }
    }

    // Build sorted list (highest quality first)
    let mut qualities: Vec<VideoQualityOption> = height_map
        .iter()
        .map(|(&height, &filesize)| {
            let (label, format_string) = height_label_and_format(height);
            VideoQualityOption {
                height: Some(height),
                label,
                filesize_approx: if filesize > 0 { Some(filesize) } else { None },
                format_string,
                is_audio_only: false,
            }
        })
        .collect();

    qualities.sort_by(|a, b| b.height.cmp(&a.height));

    if has_audio_only {
        qualities.push(VideoQualityOption {
            height: None,
            label: "Audio Only".to_string(),
            filesize_approx: if best_audio_filesize > 0 {
                Some(best_audio_filesize)
            } else {
                None
            },
            format_string: "bestaudio".to_string(),
            is_audio_only: true,
        });
    }

    qualities
}

fn parse_playlist_entry(json_line: &str, playlist_url: &str) -> Result<PlaylistEntry> {
    let v: Value = serde_json::from_str(json_line).map_err(|e| YtDlpError {
        kind: YtDlpErrorKind::InvalidJson,
        message: format!("invalid yt-dlp playlist JSON: {e}"),
        output: None,
    })?;

    // In flat-playlist mode, yt-dlp typically yields one object per entry:
    // - id
    // - url (sometimes)
    // - webpage_url (sometimes)
    // - title
    // - uploader (sometimes)
    let title = v
        .get("title")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());
    let uploader = v
        .get("uploader")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());

    let duration_seconds = v
        .get("duration")
        .and_then(|x| x.as_u64())
        .or_else(|| v.get("duration").and_then(|x| x.as_f64()).map(|f| f as u64));

    let thumbnail_url = v
        .get("thumbnail")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            v.get("thumbnails")
                .and_then(|t| t.as_array())
                .and_then(|arr| arr.last())
                .and_then(|t| t.get("url"))
                .and_then(|x| x.as_str())
                .map(|s| s.to_string())
        });

    // Prefer `webpage_url` if present.
    if let Some(u) = v.get("webpage_url").and_then(|x| x.as_str()) {
        return Ok(PlaylistEntry {
            url: u.to_string(),
            title,
            uploader,
            duration_seconds,
            thumbnail_url,
        });
    }

    // Some extractors provide `url` without scheme/host or use `id`.
    if let Some(u) = v.get("url").and_then(|x| x.as_str()) {
        // Best-effort: if it already looks like a URL, use it.
        if u.starts_with("http://") || u.starts_with("https://") {
            return Ok(PlaylistEntry {
                url: u.to_string(),
                title,
                uploader,
                duration_seconds,
                thumbnail_url,
            });
        }

        // Otherwise, try to derive from playlist URL's domain.
        if let Ok(mut base) = url::Url::parse(playlist_url) {
            // Place the entry `url` under the same origin if possible.
            // This is imperfect but better than returning empty.
            // If it fails, we'll fall back to just the raw string.
            if base.path().ends_with('/') {
                // keep
            } else {
                // strip last path segment
                let mut segs: Vec<&str> = base.path().split('/').collect();
                segs.pop();
                base.set_path(&segs.join("/"));
            }
            if let Ok(joined) = base.join(u) {
                return Ok(PlaylistEntry {
                    url: joined.to_string(),
                    title,
                    uploader,
                    duration_seconds,
                    thumbnail_url,
                });
            }
        }

        return Ok(PlaylistEntry {
            url: u.to_string(),
            title,
            uploader,
            duration_seconds,
            thumbnail_url,
        });
    }

    // Last resort: if we have an id, return it as url-ish.
    if let Some(id) = v.get("id").and_then(|x| x.as_str()) {
        return Ok(PlaylistEntry {
            url: id.to_string(),
            title,
            uploader,
            duration_seconds,
            thumbnail_url,
        });
    }

    Err(anyhow!("playlist entry missing url/webpage_url/id"))
}
