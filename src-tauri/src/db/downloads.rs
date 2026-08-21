use anyhow::Result;
use chrono::{DateTime, Utc};
use rusqlite::{params, OptionalExtension, Row};
use uuid::Uuid;

use super::types::{DownloadRow, DownloadStatus, SourceKind};
use super::Db;

impl Db {
    /// Insert a new download record in `queued` state.
    pub fn insert_download(
        &mut self,
        source_url: &str,
        source_kind: SourceKind,
        parent_id: Option<Uuid>,
        preset_id: &str,
        output_dir: &str,
        stream_url: Option<&str>,
        referer_url: Option<&str>,
    ) -> Result<Uuid> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        self.conn.execute(
            r#"
            INSERT INTO downloads (
              id, created_at, updated_at,
              source_url, source_kind, parent_id,
              title, uploader, duration_seconds, thumbnail_url,
              status, phase,
              preset_id, output_dir,
              final_path,
              progress_percent, bytes_downloaded, bytes_total, speed_bps, eta_seconds,
              error_code, error_message,
              stream_url, referer_url
            ) VALUES (
              ?1, ?2, ?3,
              ?4, ?5, ?6,
              NULL, NULL, NULL, NULL,
              ?7, NULL,
              ?8, ?9,
              NULL,
              NULL, NULL, NULL, NULL, NULL,
              NULL, NULL,
              ?10, ?11
            )
            "#,
            params![
                id.to_string(),
                now.to_rfc3339(),
                now.to_rfc3339(),
                source_url,
                source_kind.as_str(),
                parent_id.map(|p| p.to_string()),
                DownloadStatus::Queued.as_str(),
                preset_id,
                output_dir,
                stream_url,
                referer_url
            ],
        )?;

        Ok(id)
    }

    /// Retrieve a download row by id.
    pub fn get_download(&mut self, id: Uuid) -> Result<Option<DownloadRow>> {
        let row = self
            .conn
            .query_row(
                r#"
                SELECT
                  id, created_at, updated_at,
                  source_url, source_kind, parent_id,
                  title, uploader, duration_seconds, thumbnail_url,
                  status, phase,
                  preset_id, output_dir,
                  final_path,
                  progress_percent, bytes_downloaded, bytes_total, speed_bps, eta_seconds,
                  error_code, error_message,
                  stream_url, referer_url
                FROM downloads
                WHERE id = ?1
                "#,
                params![id.to_string()],
                |r| Self::row_to_download(r),
            )
            .optional()?;

        Ok(row)
    }

    /// Updates a download status+phase+updated_at.
    pub fn set_status(
        &mut self,
        id: Uuid,
        status: DownloadStatus,
        phase: Option<&str>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            r#"
            UPDATE downloads
            SET status = ?2, phase = ?3, updated_at = ?4
            WHERE id = ?1
            "#,
            params![id.to_string(), status.as_str(), phase, now],
        )?;
        Ok(())
    }

    /// Update metadata fields for a download.
    pub fn update_metadata(
        &mut self,
        id: Uuid,
        title: Option<&str>,
        uploader: Option<&str>,
        duration_seconds: Option<i64>,
        thumbnail_url: Option<&str>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            r#"
            UPDATE downloads
            SET title = ?2, uploader = ?3, duration_seconds = ?4, thumbnail_url = ?5, updated_at = ?6
            WHERE id = ?1
            "#,
            params![id.to_string(), title, uploader, duration_seconds, thumbnail_url, now],
        )?;
        Ok(())
    }

    /// Update progress fields for a download.
    pub fn update_progress(
        &mut self,
        id: Uuid,
        percent: Option<f64>,
        bytes_downloaded: Option<i64>,
        bytes_total: Option<i64>,
        speed_bps: Option<i64>,
        eta_seconds: Option<i64>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            r#"
            UPDATE downloads
            SET progress_percent = ?2, bytes_downloaded = ?3, bytes_total = ?4,
                speed_bps = ?5, eta_seconds = ?6, updated_at = ?7
            WHERE id = ?1
            "#,
            params![
                id.to_string(),
                percent,
                bytes_downloaded,
                bytes_total,
                speed_bps,
                eta_seconds,
                now
            ],
        )?;
        Ok(())
    }

    /// Set the final path for a completed download.
    pub fn set_final_path(&mut self, id: Uuid, final_path: &str) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            r#"
            UPDATE downloads
            SET final_path = ?2, updated_at = ?3
            WHERE id = ?1
            "#,
            params![id.to_string(), final_path, now],
        )?;
        Ok(())
    }

    /// Set error information for a failed download.
    pub fn set_error(
        &mut self,
        id: Uuid,
        error_code: Option<&str>,
        error_message: Option<&str>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            r#"
            UPDATE downloads
            SET error_code = ?2, error_message = ?3, status = ?4, phase = ?5, updated_at = ?6
            WHERE id = ?1
            "#,
            params![
                id.to_string(),
                error_code,
                error_message,
                DownloadStatus::Failed.as_str(),
                "Failed",
                now
            ],
        )?;
        Ok(())
    }

    /// Delete a download by ID.
    pub fn delete_download(&mut self, id: Uuid) -> Result<()> {
        self.conn.execute(
            "DELETE FROM downloads WHERE id = ?1",
            params![id.to_string()],
        )?;
        Ok(())
    }

    /// Update stream URL on an existing download record.
    pub fn update_stream_url(&mut self, id: Uuid, stream_url: &str) -> Result<()> {
        let now = Utc::now();
        self.conn.execute(
            "UPDATE downloads SET stream_url = ?1, updated_at = ?2 WHERE id = ?3",
            params![stream_url, now.to_rfc3339(), id.to_string()],
        )?;
        Ok(())
    }

    /// Get all active downloads (not completed, canceled, or failed).
    pub fn get_active_downloads(&mut self) -> Result<Vec<DownloadRow>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT
                id, created_at, updated_at,
                source_url, source_kind, parent_id,
                title, uploader, duration_seconds, thumbnail_url,
                status, phase,
                preset_id, output_dir,
                final_path,
                progress_percent, bytes_downloaded, bytes_total, speed_bps, eta_seconds,
                error_code, error_message,
                stream_url, referer_url
            FROM downloads
            WHERE status NOT IN ('done', 'canceled')
            ORDER BY created_at DESC
            "#,
        )?;

        let rows = stmt.query_map([], |row| Self::row_to_download(row))?;
        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Get completed downloads (done status).
    pub fn get_completed_downloads(&mut self, limit: u32) -> Result<Vec<DownloadRow>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT
                id, created_at, updated_at,
                source_url, source_kind, parent_id,
                title, uploader, duration_seconds, thumbnail_url,
                status, phase,
                preset_id, output_dir,
                final_path,
                progress_percent, bytes_downloaded, bytes_total, speed_bps, eta_seconds,
                error_code, error_message,
                stream_url, referer_url
            FROM downloads
            WHERE status = 'done'
            ORDER BY updated_at DESC
            LIMIT ?1
            "#,
        )?;

        let rows = stmt.query_map(params![limit], |row| Self::row_to_download(row))?;
        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Get IDs of all queued downloads.
    pub fn get_queued_download_ids(&mut self) -> Result<Vec<Uuid>> {
        let mut stmt = self.conn.prepare(
            "SELECT id FROM downloads WHERE status IN ('queued', 'ready', 'stopped') ORDER BY created_at ASC",
        )?;

        let rows = stmt.query_map([], |row| {
            let id_str: String = row.get(0)?;
            Uuid::parse_str(&id_str).map_err(|_| rusqlite::Error::InvalidQuery)
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Get the next download in the queue that should be auto-started.
    /// Only returns downloads in 'queued' or 'ready' status.
    /// Stopped downloads are NOT included - they must be manually restarted.
    pub fn get_next_queued_download_id(&self) -> Result<Option<Uuid>> {
        let result = self.conn.query_row(
            "SELECT id FROM downloads WHERE status IN ('queued', 'ready') ORDER BY created_at ASC LIMIT 1",
            [],
            |row| {
                let id_str: String = row.get(0)?;
                Uuid::parse_str(&id_str).map_err(|_| rusqlite::Error::InvalidQuery)
            },
        ).optional()?;

        Ok(result)
    }

    /// Get multiple queued downloads up to limit.
    pub fn get_next_queued_download_ids(&self, limit: usize) -> Result<Vec<Uuid>> {
        let mut stmt = self.conn.prepare(
            "SELECT id FROM downloads WHERE status IN ('queued', 'ready') ORDER BY created_at ASC LIMIT ?1",
        )?;
        let rows = stmt.query_map([limit as i64], |row| {
            let id_str: String = row.get(0)?;
            Uuid::parse_str(&id_str).map_err(|_| rusqlite::Error::InvalidQuery)
        })?;
        let mut ids = Vec::new();
        for r in rows {
            ids.push(r?);
        }
        Ok(ids)
    }

    /// Update an existing download task's configurable fields (URL, title/rename, output_dir, referer, preset).
    pub fn update_download_task(
        &mut self,
        id: Uuid,
        source_url: &str,
        title: Option<&str>,
        output_dir: &str,
        referer_url: Option<&str>,
        preset_id: &str,
    ) -> Result<()> {
        let now = Utc::now();
        self.conn.execute(
            r#"
            UPDATE downloads
            SET updated_at = ?2,
                source_url = ?3,
                title = COALESCE(?4, title),
                output_dir = ?5,
                referer_url = ?6,
                preset_id = ?7
            WHERE id = ?1
            "#,
            params![
                id.to_string(),
                now.to_rfc3339(),
                source_url,
                title,
                output_dir,
                referer_url,
                preset_id
            ],
        )?;
        Ok(())
    }

    /// Get downloads by parent ID (for playlist items).
    pub fn get_playlist_items(&mut self, parent_id: Uuid) -> Result<Vec<DownloadRow>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT
                id, created_at, updated_at,
                source_url, source_kind, parent_id,
                title, uploader, duration_seconds, thumbnail_url,
                status, phase,
                preset_id, output_dir,
                final_path,
                progress_percent, bytes_downloaded, bytes_total, speed_bps, eta_seconds,
                error_code, error_message,
                stream_url, referer_url
            FROM downloads
            WHERE parent_id = ?1
            ORDER BY created_at ASC
            "#,
        )?;

        let rows = stmt.query_map(params![parent_id.to_string()], |row| {
            Self::row_to_download(row)
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Count downloads by status.
    pub fn count_by_status(&mut self, status: DownloadStatus) -> Result<u64> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM downloads WHERE status = ?1",
            params![status.as_str()],
            |row| row.get(0),
        )?;
        Ok(count as u64)
    }

    /// Helper function to convert a database row to DownloadRow.
    fn row_to_download(row: &Row) -> rusqlite::Result<DownloadRow> {
        let id: String = row.get(0)?;
        let created_at: String = row.get(1)?;
        let updated_at: String = row.get(2)?;
        let source_url: String = row.get(3)?;
        let source_kind: String = row.get(4)?;
        let parent_id: Option<String> = row.get(5)?;
        let title: Option<String> = row.get(6)?;
        let uploader: Option<String> = row.get(7)?;
        let duration_seconds: Option<i64> = row.get(8)?;
        let thumbnail_url: Option<String> = row.get(9)?;
        let status: String = row.get(10)?;
        let phase: Option<String> = row.get(11)?;
        let preset_id: String = row.get(12)?;
        let output_dir: String = row.get(13)?;
        let final_path: Option<String> = row.get(14)?;
        let progress_percent: Option<f64> = row.get(15)?;
        let bytes_downloaded: Option<i64> = row.get(16)?;
        let bytes_total: Option<i64> = row.get(17)?;
        let speed_bps: Option<i64> = row.get(18)?;
        let eta_seconds: Option<i64> = row.get(19)?;
        let error_code: Option<String> = row.get(20)?;
        let error_message: Option<String> = row.get(21)?;
        let stream_url: Option<String> = row.get(22).ok().flatten();
        let referer_url: Option<String> = row.get(23).ok().flatten();

        let id = Uuid::parse_str(&id).map_err(|_| rusqlite::Error::InvalidQuery)?;
        let created_at = DateTime::parse_from_rfc3339(&created_at)
            .map_err(|_| rusqlite::Error::InvalidQuery)?
            .with_timezone(&Utc);
        let updated_at = DateTime::parse_from_rfc3339(&updated_at)
            .map_err(|_| rusqlite::Error::InvalidQuery)?
            .with_timezone(&Utc);

        let source_kind =
            SourceKind::from_str(&source_kind).ok_or(rusqlite::Error::InvalidQuery)?;
        let parent_id = match parent_id {
            Some(s) => Some(Uuid::parse_str(&s).map_err(|_| rusqlite::Error::InvalidQuery)?),
            None => None,
        };

        let status = DownloadStatus::from_str(&status).ok_or(rusqlite::Error::InvalidQuery)?;

        Ok(DownloadRow {
            id,
            created_at,
            updated_at,
            source_url,
            source_kind,
            parent_id,
            title,
            uploader,
            duration_seconds,
            thumbnail_url,
            status,
            phase,
            preset_id,
            output_dir,
            final_path,
            progress_percent,
            bytes_downloaded,
            bytes_total,
            speed_bps,
            eta_seconds,
            error_code,
            error_message,
            stream_url,
            referer_url,
        })
    }
}
