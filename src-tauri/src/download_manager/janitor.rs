use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::fs;

/// Determines whether a filename matches known yt-dlp/ffmpeg temporary or fragment files.
pub fn is_temp_fragment_file(filename: &str) -> bool {
    let lower = filename.to_lowercase();
    
    // Direct matches
    if lower.ends_with(".part") || lower.ends_with(".ytdl") || lower.ends_with(".temp") {
        return true;
    }
    
    // Fragment patterns (e.g., .part-Frag160, -Frag12, .Frag10.part)
    if lower.contains("-frag") || lower.contains(".frag") || lower.contains("part-frag") {
        return true;
    }
    
    // Intermediate stream format files (e.g. video.fhls-720.mp4.part or video.f2160.mp4)
    if lower.contains(".fhls-") || lower.contains(".fmp4") || lower.contains(".temp.") {
        return true;
    }

    false
}

/// Cleans up orphaned yt-dlp fragment files in a specific directory (e.g. Downloads folder).
/// Only removes files that have NOT been modified in the last 60 seconds to avoid interrupting active downloads.
pub async fn cleanup_directory_fragments(dir: &Path) -> usize {
    if !dir.exists() || !dir.is_dir() {
        return 0;
    }

    let mut count = 0;
    if let Ok(mut entries) = fs::read_dir(dir).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    if is_temp_fragment_file(file_name) {
                        // Safety check: ensure file is older than 60 seconds
                        if let Ok(meta) = path.metadata() {
                            if let Ok(modified) = meta.modified() {
                                if let Ok(elapsed) = modified.elapsed() {
                                    if elapsed < Duration::from_secs(60) {
                                        log::debug!("Janitor: Skipping recently modified fragment: {:?}", path);
                                        continue;
                                    }
                                }
                            }
                        }

                        log::info!("Janitor: Removing orphaned fragment file: {:?}", path);
                        if fs::remove_file(&path).await.is_ok() {
                            count += 1;
                        }
                    }
                }
            }
        }
    }
    count
}

/// Cleans up abandoned subfolders in the application's internal tmp directory.
/// Strictly skips any staging folder created or modified within the last 15 minutes to guarantee active downloads are never touched.
pub async fn cleanup_app_tmp_dir() -> usize {
    let mut count = 0;
    if let Ok(data_dir) = crate::db::app_data_dir() {
        let tmp_dir = data_dir.join("tmp");
        if tmp_dir.exists() {
            if let Ok(mut entries) = fs::read_dir(&tmp_dir).await {
                while let Ok(Some(entry)) = entries.next_entry().await {
                    let path = entry.path();
                    
                    // Safety check: ensure staging folder is older than 15 minutes (900 seconds)
                    if let Ok(meta) = path.metadata() {
                        if let Ok(modified) = meta.modified() {
                            if let Ok(elapsed) = modified.elapsed() {
                                if elapsed < Duration::from_secs(900) {
                                    log::debug!("Janitor: Skipping active/recent staging folder: {:?}", path);
                                    continue;
                                }
                            }
                        }
                    }

                    if path.is_dir() {
                        log::info!("Janitor: Cleaning abandoned staging folder: {:?}", path);
                        if fs::remove_dir_all(&path).await.is_ok() {
                            count += 1;
                        }
                    } else if path.is_file() {
                        let _ = fs::remove_file(&path).await;
                        count += 1;
                    }
                }
            }
        }
    }
    count
}

/// Runs a full cleanup across both the internal staging tmp directory and the user's default downloads directory.
pub async fn run_full_cleanup(download_dirs: Vec<PathBuf>) {
    log::info!("Janitor: Running fragment and temporary file cleanup...");
    let tmp_count = cleanup_app_tmp_dir().await;
    
    let mut dir_count = 0;
    for dir in download_dirs {
        dir_count += cleanup_directory_fragments(&dir).await;
    }

    log::info!(
        "Janitor: Cleanup completed. Removed {} abandoned staging folders and {} orphaned fragments in download folders.",
        tmp_count,
        dir_count
    );
}

/// Spawns the periodic janitor maintenance task.
pub fn start_janitor_service(_app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        // Initial delay after startup
        tokio::time::sleep(Duration::from_secs(10)).await;

        let get_dirs = || -> Vec<PathBuf> {
            let mut dirs = Vec::new();
            if let Some(dl) = dirs::download_dir() {
                dirs.push(dl);
            }
            dirs
        };

        run_full_cleanup(get_dirs()).await;

        // Periodic maintenance every 10 minutes
        let mut interval = tokio::time::interval(Duration::from_secs(600));
        loop {
            interval.tick().await;
            run_full_cleanup(get_dirs()).await;
        }
    });
}
