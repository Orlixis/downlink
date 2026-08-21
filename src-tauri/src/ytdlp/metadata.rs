use anyhow::{anyhow, Result};
use serde_json::Value;
use std::collections::HashMap;

use super::types::{PlaylistEntry, PreviewMetadata, VideoQualityOption, YtDlpError, YtDlpErrorKind};

pub fn is_token_or_hash(s: &str) -> bool {
    let clean = s.trim();
    if clean.is_empty() {
        return true;
    }
    let lower = clean.to_lowercase();
    if matches!(
        lower.as_str(),
        "master"
            | "index"
            | "playlist"
            | "manifest"
            | "video"
            | "stream"
            | "undefined"
            | "null"
            | "hls"
            | "dash"
            | "video stream"
            | "media"
            | "v"
            | "play"
            | "watch"
    ) {
        return true;
    }
    if clean.starts_with("aHR0") || clean.starts_with("AHR0") {
        return true;
    }
    if clean.len() >= 20 && clean.chars().all(|c| c.is_ascii_hexdigit()) {
        return true;
    }
    if clean.len() >= 24 && !clean.contains(' ') && !clean.contains('-') {
        return true;
    }
    false
}

pub fn infer_title_from_url(url_str: &str) -> String {
    if let Ok(parsed) = url::Url::parse(url_str) {
        if let Some(path_segments) = parsed.path_segments() {
            let segs: Vec<&str> = path_segments.filter(|s| !s.trim().is_empty()).collect();
            for &seg in segs.iter().rev() {
                let without_ext = seg.split('.').next().unwrap_or(seg);
                if is_token_or_hash(without_ext) {
                    if without_ext.starts_with("aHR0") || without_ext.starts_with("AHR0") {
                        use base64::Engine;
                        if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(without_ext) {
                            if let Ok(decoded_url) = String::from_utf8(bytes) {
                                let inferred = infer_title_from_url(&decoded_url);
                                if inferred != "Video Stream" && !inferred.starts_with("Video from") {
                                    return inferred;
                                }
                            }
                        }
                    }
                    continue;
                }

                let cleaned = without_ext
                    .replace("tmdb-movie-", "")
                    .replace("tmdb-tv-", "")
                    .replace("-lucifer-donghua", "")
                    .replace('-', " ")
                    .replace('_', " ");
                let words: Vec<String> = cleaned
                    .split_whitespace()
                    .filter(|w| !w.chars().all(|c| c.is_ascii_digit()))
                    .map(|word| {
                        let mut chars = word.chars();
                        match chars.next() {
                            None => String::new(),
                            Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
                        }
                    })
                    .collect();
                let title = words.join(" ");
                if !title.trim().is_empty() && !is_token_or_hash(&title) {
                    return title;
                }
            }
        }
        if let Some(host) = parsed.host_str() {
            return format!("Video from {}", host);
        }
    }
    "Video Stream".to_string()
}

pub fn parse_preview_metadata(json_line: &str, fallback_url: &str) -> Result<PreviewMetadata> {
    let v: Value = serde_json::from_str(json_line).map_err(|e| YtDlpError {
        kind: YtDlpErrorKind::InvalidJson,
        message: format!("invalid yt-dlp JSON: {e}"),
        output: None,
    })?;

    let webpage_url = v
        .get("webpage_url")
        .and_then(|x| x.as_str())
        .unwrap_or(fallback_url)
        .to_string();

    let is_direct_stream = fallback_url.contains(".m3u8")
        || fallback_url.contains(".mpd")
        || fallback_url.contains(".mp4")
        || fallback_url.contains(".ts");

    let stream_url = if is_direct_stream {
        v.get("url")
            .and_then(|x| x.as_str())
            .map(|s| s.to_string())
            .or_else(|| Some(fallback_url.to_string()))
    } else {
        None
    };

    let title = v
        .get("title")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string())
        .filter(|t| !is_token_or_hash(t))
        .or_else(|| Some(infer_title_from_url(fallback_url)));
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

    let filesize_bytes = v
        .get("filesize")
        .and_then(|x| x.as_u64())
        .or_else(|| v.get("filesize_approx").and_then(|x| x.as_u64()));

    let type_is_playlist = v
        .get("_type")
        .and_then(|x| x.as_str())
        .map(|t| t == "playlist")
        .unwrap_or(false);

    let has_entries = v.get("entries").is_some();

    let playlist_id = v
        .get("playlist_id")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());

    let is_playlist = type_is_playlist || has_entries || playlist_id.is_some();

    let playlist_title = if type_is_playlist || has_entries {
        v.get("title")
            .and_then(|x| x.as_str())
            .map(|s| s.to_string())
    } else {
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

pub fn height_label_and_format(height: u32) -> (String, String) {
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

pub fn parse_quality_options(v: &serde_json::Value) -> Vec<VideoQualityOption> {
    let formats = match v.get("formats").and_then(|f| f.as_array()) {
        Some(arr) => arr,
        None => return vec![],
    };

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

pub fn parse_playlist_entry(json_line: &str, playlist_url: &str) -> Result<PlaylistEntry> {
    let v: Value = serde_json::from_str(json_line).map_err(|e| YtDlpError {
        kind: YtDlpErrorKind::InvalidJson,
        message: format!("invalid yt-dlp playlist JSON: {e}"),
        output: None,
    })?;

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

    if let Some(u) = v.get("webpage_url").and_then(|x| x.as_str()) {
        return Ok(PlaylistEntry {
            url: u.to_string(),
            title,
            uploader,
            duration_seconds,
            thumbnail_url,
        });
    }

    if let Some(u) = v.get("url").and_then(|x| x.as_str()) {
        if u.starts_with("http://") || u.starts_with("https://") {
            return Ok(PlaylistEntry {
                url: u.to_string(),
                title,
                uploader,
                duration_seconds,
                thumbnail_url,
            });
        }

        if let Ok(mut base) = url::Url::parse(playlist_url) {
            if !base.path().ends_with('/') {
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
