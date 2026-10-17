use anyhow::Result;
use uuid::Uuid;

use super::Db;

impl Db {
    /// Clear all queued downloads (not started yet).
    pub fn clear_queued_downloads(&mut self) -> Result<()> {
        self.conn
            .execute("DELETE FROM downloads WHERE status = 'queued'", [])?;
        Ok(())
    }

    /// Clear all completed downloads from history.
    pub fn clear_completed_downloads(&mut self) -> Result<()> {
        self.conn.execute(
            "DELETE FROM downloads WHERE status IN ('done', 'canceled', 'failed')",
            [],
        )?;
        Ok(())
    }

    /// Reset orphaned "active" downloads to Stopped on application startup.
    pub fn reset_orphaned_downloads(&mut self) -> Result<usize> {
        let count = self.conn.execute(
            "UPDATE downloads
             SET status = 'stopped', phase = 'Interrupted — tap ▶ to resume'
             WHERE status IN ('downloading', 'fetching', 'postprocessing')",
            [],
        )?;
        if count > 0 {
            log::info!("Reset {} orphaned download(s) to Stopped on startup", count);
        }
        Ok(count)
    }

    /// Clean up downloads whose final_path no longer exists on the local filesystem.
    pub fn clean_missing_downloads(&mut self) -> Result<Vec<Uuid>> {
        let completed = self.get_completed_downloads(1000)?;
        let mut removed_ids = Vec::new();

        for item in completed {
            if let Some(ref path_str) = item.final_path {
                let path = std::path::Path::new(path_str);
                if !path.exists() {
                    let _ = self.delete_download(item.id);
                    removed_ids.push(item.id);
                }
            }
        }

        if !removed_ids.is_empty() {
            log::info!("Cleaned {} missing download records", removed_ids.len());
        }

        Ok(removed_ids)
    }
}
