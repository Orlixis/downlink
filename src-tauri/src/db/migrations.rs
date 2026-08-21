use anyhow::{anyhow, Result};
use rusqlite::{params, Connection, OptionalExtension};

pub const SCHEMA_VERSION: i64 = 2;

/// Apply migrations to bring database to current schema.
pub fn migrate(conn: &mut Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        "#,
    )?;

    // Ensure meta row exists for schema_version.
    let existing: Option<String> = conn
        .query_row(
            r#"SELECT value FROM meta WHERE key = 'schema_version'"#,
            [],
            |r| r.get(0),
        )
        .optional()?;

    let current_version: i64 = existing
        .as_deref()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);

    if current_version > SCHEMA_VERSION {
        return Err(anyhow!(
            "db schema version {} is newer than app supports {}",
            current_version,
            SCHEMA_VERSION
        ));
    }

    if current_version == 0 {
        migration_v1(conn)?;
        migration_v2(conn)?;
        set_schema_version(conn, 2)?;
    } else if current_version < 2 {
        migration_v2(conn)?;
        set_schema_version(conn, 2)?;
    }

    Ok(())
}

fn set_schema_version(conn: &mut Connection, v: i64) -> Result<()> {
    conn.execute(
        r#"
        INSERT INTO meta(key, value) VALUES('schema_version', ?1)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        "#,
        params![v.to_string()],
    )?;
    Ok(())
}

fn migration_v1(conn: &mut Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS downloads (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,

          source_url TEXT NOT NULL,
          source_kind TEXT NOT NULL,
          parent_id TEXT NULL,

          title TEXT NULL,
          uploader TEXT NULL,
          duration_seconds INTEGER NULL,
          thumbnail_url TEXT NULL,

          status TEXT NOT NULL,
          phase TEXT NULL,

          preset_id TEXT NOT NULL,
          output_dir TEXT NOT NULL,

          final_path TEXT NULL,

          progress_percent REAL NULL,
          bytes_downloaded INTEGER NULL,
          bytes_total INTEGER NULL,
          speed_bps INTEGER NULL,
          eta_seconds INTEGER NULL,

          error_code TEXT NULL,
          error_message TEXT NULL,

          stream_url TEXT NULL,
          referer_url TEXT NULL,

          FOREIGN KEY(parent_id) REFERENCES downloads(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
        CREATE INDEX IF NOT EXISTS idx_downloads_parent ON downloads(parent_id);
        CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at);

        CREATE TABLE IF NOT EXISTS download_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          download_id TEXT NOT NULL,
          ts TEXT NOT NULL,
          stream TEXT NOT NULL,
          line TEXT NOT NULL,
          FOREIGN KEY(download_id) REFERENCES downloads(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_download_logs_download_id ON download_logs(download_id);

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tools (
          tool TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          path TEXT NOT NULL,
          last_checked_at TEXT NULL,
          update_channel TEXT NOT NULL,
          status TEXT NOT NULL
        );
        "#,
    )?;

    Ok(())
}

fn migration_v2(conn: &mut Connection) -> Result<()> {
    // Migration v2: Add stream_url and referer_url columns for CDNs and sniffed media
    let _ = conn.execute("ALTER TABLE downloads ADD COLUMN stream_url TEXT NULL", []);
    let _ = conn.execute("ALTER TABLE downloads ADD COLUMN referer_url TEXT NULL", []);
    Ok(())
}
