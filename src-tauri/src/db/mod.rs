pub mod downloads;
pub mod logs;
pub mod migrations;
pub mod types;

use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};
use directories::ProjectDirs;
use rusqlite::Connection;

pub use self::types::{AppDirs, DownloadRow, DownloadStatus, SourceKind};

/// Database handle wrapper.
///
/// Notes:
/// - This uses `rusqlite::Connection`, which is not `Send`/`Sync`.
/// - In practice, you should keep DB access on a single thread (or wrap behind a Tokio task).
pub struct Db {
    conn: Connection,
    path: PathBuf,
}

/// Determines the per-user app data directory and returns its path.
///
/// macOS:  ~/Library/Application Support/Downlink
/// Windows: %APPDATA%\\Downlink
/// Linux:  ~/.local/share/downlink (depending on XDG)
pub fn app_project_dirs() -> Result<ProjectDirs> {
    ProjectDirs::from("com", "downlink", "Downlink")
        .ok_or_else(|| anyhow!("failed to resolve per-user app data directory"))
}

/// Returns the directory where Downlink stores its state (db, logs, tools).
pub fn app_data_dir() -> Result<PathBuf> {
    Ok(app_project_dirs()?.data_dir().to_path_buf())
}

/// Returns the path to the SQLite database file.
pub fn db_path() -> Result<PathBuf> {
    Ok(app_data_dir()?.join("downlink.sqlite3"))
}

/// Create required directories for state storage: data dir, logs dir, tools dir, tmp dir.
pub fn ensure_app_dirs() -> Result<AppDirs> {
    let data = app_data_dir()?;
    let logs = data.join("logs");
    let tools = data.join("tools");
    let tmp = data.join("tmp");

    fs::create_dir_all(&data).with_context(|| format!("create data dir: {}", data.display()))?;
    fs::create_dir_all(&logs).with_context(|| format!("create logs dir: {}", logs.display()))?;
    fs::create_dir_all(&tools).with_context(|| format!("create tools dir: {}", tools.display()))?;
    fs::create_dir_all(&tmp).with_context(|| format!("create tmp dir: {}", tmp.display()))?;

    Ok(AppDirs {
        data,
        logs,
        tools,
        tmp,
    })
}

/// Scans the application tmp/ directory and cleans up stale temporary directories or leftover fragment files
/// older than 6 hours (e.g. from crashed or force-quit sessions).
pub async fn cleanup_stale_temp_files() {
    if let Ok(data_dir) = app_data_dir() {
        let tmp_dir = data_dir.join("tmp");
        if let Ok(mut entries) = tokio::fs::read_dir(&tmp_dir).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let path = entry.path();
                if let Ok(meta) = entry.metadata().await {
                    if let Ok(modified) = meta.modified() {
                        if let Ok(elapsed) = modified.elapsed() {
                            if elapsed > std::time::Duration::from_secs(6 * 3600) {
                                if meta.is_dir() {
                                    let _ = tokio::fs::remove_dir_all(&path).await;
                                } else {
                                    let _ = tokio::fs::remove_file(&path).await;
                                }
                                log::info!("Cleaned up stale temp remnant: {:?}", path);
                            }
                        }
                    }
                }
            }
        }
    }
}

impl Db {
    /// Open database connection at the per-user location and apply migrations.
    pub fn open() -> Result<Self> {
        let dirs = ensure_app_dirs()?;
        let path = dirs.data.join("downlink.sqlite3");

        let mut conn = Connection::open(&path)
            .with_context(|| format!("open sqlite db: {}", path.display()))?;

        // pragmatic defaults for a desktop app:
        // - WAL for concurrency
        // - foreign keys ON
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;

        migrations::migrate(&mut conn)?;

        Ok(Self { conn, path })
    }

    /// Open an in-memory database for testing.
    pub fn open_in_memory() -> Result<Self> {
        let mut conn = Connection::open_in_memory()
            .with_context(|| "open in-memory sqlite db")?;

        conn.pragma_update(None, "foreign_keys", "ON")?;
        migrations::migrate(&mut conn)?;

        Ok(Self {
            conn,
            path: PathBuf::from(":memory:"),
        })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    pub fn conn_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }
}
