use std::time::{Duration as StdDuration, Instant};
use tauri::{AppHandle, State};
use uuid::Uuid;

use super::types::{
    ExpandPlaylistOptions, ExpandPlaylistResult, FetchMetadataOptions, FetchMetadataResult,
    PlaylistVideoPreview, PreviewPlaylistResult,
};
use crate::db::SourceKind;
use crate::url_utils;
use crate::{build_ytdlp_runner, AppState, CachedMeta};

#[tauri::command]
pub async fn fetch_metadata(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    _options: FetchMetadataOptions,
) -> Result<FetchMetadataResult, String> {
    let urls = url_utils::extract_urls(&url);
    let first = urls
        .into_iter()
        .next()
        .ok_or_else(|| "No valid http(s) URL found.".to_string())?;

    const CACHE_TTL: StdDuration = StdDuration::from_secs(600);
    {
        let cache = state.metadata_cache.lock().await;
        if let Some(entry) = cache.get(&first) {
            if entry.fetched_at.elapsed() < CACHE_TTL {
                log::debug!("metadata cache hit for {}", first);
                return Ok(entry.result.clone());
            }
        }
    }

    let runner = build_ytdlp_runner(&state).await;
    let meta = runner
        .fetch_preview_metadata(&first, Some(&app))
        .await
        .map_err(|e| format!("yt-dlp metadata failed: {e}"))?;

    let result = FetchMetadataResult {
        id: Uuid::nil(),
        url: meta.url,
        stream_url: meta.stream_url,
        is_playlist: meta.is_playlist,
        title: meta.title,
        uploader: meta.uploader,
        duration_seconds: meta.duration_seconds,
        thumbnail_url: meta.thumbnail_url,
        filesize_bytes: meta.filesize_bytes,
        playlist_title: meta.playlist_title,
        playlist_count_hint: meta.playlist_count_hint,
        available_qualities: meta.available_qualities,
    };

    {
        let mut cache = state.metadata_cache.lock().await;
        if cache.len() >= 64 {
            cache.retain(|_, v| v.fetched_at.elapsed() < CACHE_TTL);
        }
        cache.insert(
            first,
            CachedMeta {
                result: result.clone(),
                fetched_at: Instant::now(),
            },
        );
    }

    Ok(result)
}

#[tauri::command]
pub async fn fast_fetch_metadata(
    _app: AppHandle,
    state: State<'_, AppState>,
    url: String,
) -> Result<Option<FetchMetadataResult>, String> {
    let urls = url_utils::extract_urls(&url);
    let first = match urls.into_iter().next() {
        Some(u) => u,
        None => return Ok(None),
    };

    const CACHE_TTL: StdDuration = StdDuration::from_secs(600);
    {
        let cache = state.metadata_cache.lock().await;
        if let Some(entry) = cache.get(&first) {
            if entry.fetched_at.elapsed() < CACHE_TTL {
                log::debug!("fast_fetch cache hit for {}", first);
                return Ok(Some(entry.result.clone()));
            }
        }
    }

    let runner = build_ytdlp_runner(&state).await;
    match runner.fast_fetch_preview(&first).await {
        Ok(Some(meta)) => {
            let result = FetchMetadataResult {
                id: Uuid::nil(),
                url: meta.url,
                stream_url: meta.stream_url,
                is_playlist: meta.is_playlist,
                title: meta.title,
                uploader: meta.uploader,
                duration_seconds: meta.duration_seconds,
                thumbnail_url: meta.thumbnail_url,
                filesize_bytes: None,
                playlist_title: meta.playlist_title,
                playlist_count_hint: meta.playlist_count_hint,
                available_qualities: vec![],
            };
            {
                let mut cache = state.metadata_cache.lock().await;
                if cache.len() >= 64 {
                    cache.retain(|_, v| v.fetched_at.elapsed() < CACHE_TTL);
                }
                cache.insert(
                    first,
                    CachedMeta {
                        result: result.clone(),
                        fetched_at: Instant::now(),
                    },
                );
            }
            Ok(Some(result))
        }
        Ok(None) => Ok(None),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub async fn preview_playlist(
    state: State<'_, AppState>,
    playlist_url: String,
) -> Result<PreviewPlaylistResult, String> {
    let urls = url_utils::extract_urls(&playlist_url);
    let playlist = urls
        .into_iter()
        .next()
        .ok_or_else(|| "No valid http(s) playlist URL found.".to_string())?;

    let runner = build_ytdlp_runner(&state).await;
    let (entries, _output) = runner
        .fetch_playlist_entries(&playlist)
        .await
        .map_err(|e| format!("yt-dlp playlist enumeration failed: {e}"))?;

    let videos: Vec<PlaylistVideoPreview> = entries
        .into_iter()
        .enumerate()
        .map(|(idx, entry)| PlaylistVideoPreview {
            id: format!(
                "preview-{}-{}",
                idx,
                entry.url.chars().take(20).collect::<String>()
            ),
            url: entry.url,
            title: entry.title,
            uploader: entry.uploader,
            duration_seconds: entry.duration_seconds,
            thumbnail_url: entry.thumbnail_url,
        })
        .collect();

    let count = videos.len();

    Ok(PreviewPlaylistResult {
        playlist_title: None,
        videos,
        count,
    })
}

#[tauri::command]
pub async fn expand_playlist(
    _app: AppHandle,
    state: State<'_, AppState>,
    playlist_url: String,
    options: ExpandPlaylistOptions,
) -> Result<ExpandPlaylistResult, String> {
    let urls = url_utils::extract_urls(&playlist_url);
    let playlist = urls
        .into_iter()
        .next()
        .ok_or_else(|| "No valid http(s) playlist URL found.".to_string())?;

    let parent_id = {
        let mut db = state.db.lock().await;
        let parent_id = db
            .insert_download(
                &playlist,
                SourceKind::PlaylistParent,
                None,
                &options.preset_id,
                &options.output_dir,
                None,
                None,
            )
            .map_err(|e| format!("Failed to insert playlist parent: {e}"))?;

        db.set_status(
            parent_id,
            crate::db::DownloadStatus::Fetching,
            Some("Fetching playlist…"),
        )
        .map_err(|e| format!("Failed to update playlist status: {e}"))?;
        parent_id
    };

    let runner = build_ytdlp_runner(&state).await;
    let (entries, _output) = runner
        .fetch_playlist_entries(&playlist)
        .await
        .map_err(|e| format!("yt-dlp playlist enumeration failed: {e}"))?;

    let mut item_ids = Vec::with_capacity(entries.len());
    {
        let mut db = state.db.lock().await;
        for entry in &entries {
            let item_id = db
                .insert_download(
                    &entry.url,
                    SourceKind::PlaylistItem,
                    Some(parent_id),
                    &options.preset_id,
                    &options.output_dir,
                    None,
                    None,
                )
                .map_err(|e| format!("Failed to insert playlist item: {e}"))?;

            let _ = db.update_metadata(
                item_id,
                entry.title.as_deref(),
                entry.uploader.as_deref(),
                entry.duration_seconds.map(|d| d as i64),
                entry.thumbnail_url.as_deref(),
            );

            item_ids.push(item_id);
        }

        let _ = db.set_status(
            parent_id,
            crate::db::DownloadStatus::Ready,
            Some("Playlist ready"),
        );
    }

    Ok(ExpandPlaylistResult {
        parent_id,
        count: item_ids.len(),
        item_ids,
    })
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct RawOEmbed {
    pub title: Option<String>,
    pub author_name: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration: Option<u64>,
}

#[tauri::command]
pub async fn proxy_oembed_request(endpoint_url: String) -> Result<Option<RawOEmbed>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.get(&endpoint_url).send().await.map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Request failed with status: {}", res.status()));
    }

    let data: RawOEmbed = res.json().await.map_err(|e| e.to_string())?;
    Ok(Some(data))
}
