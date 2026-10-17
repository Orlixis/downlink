use anyhow::Result;
use chrono::Utc;
use rusqlite::params;
use uuid::Uuid;

use super::Db;

impl Db {
    /// Add a log entry for a download.
    pub fn add_log_entry(&mut self, download_id: Uuid, stream: &str, line: &str) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            r#"
            INSERT INTO download_logs (download_id, ts, stream, line)
            VALUES (?1, ?2, ?3, ?4)
            "#,
            params![download_id.to_string(), now, stream, line],
        )?;
        Ok(())
    }

    /// Retrieve all log entries for a download, ordered chronologically.
    pub fn get_logs(&mut self, download_id: Uuid) -> Result<Vec<(String, String, String)>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT ts, stream, line
            FROM download_logs
            WHERE download_id = ?1
            ORDER BY id ASC
            "#,
        )?;

        let rows = stmt.query_map(params![download_id.to_string()], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Trim old log entries to keep database size manageable.
    pub fn trim_logs(&mut self, download_id: Uuid, keep_count: u32) -> Result<()> {
        self.conn.execute(
            r#"
            DELETE FROM download_logs
            WHERE download_id = ?1
            AND id NOT IN (
                SELECT id FROM download_logs
                WHERE download_id = ?1
                ORDER BY id DESC
                LIMIT ?2
            )
            "#,
            params![download_id.to_string(), keep_count],
        )?;
        Ok(())
    }
}
