use std::path::PathBuf;

use anyhow::{Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{de::DeserializeOwned, Serialize};

use super::types::{UserSettings, WindowState};

/// Settings keys used in the database.
pub mod keys {
    pub const USER_SETTINGS: &str = "user_settings";
    pub const WINDOW_STATE: &str = "window_state";
    pub const LAST_PRESET: &str = "last_preset";
    pub const LAST_DESTINATION: &str = "last_destination";
    pub const COOKIES_IMPORTED: &str = "cookies_imported";
}

/// Settings manager for reading and writing settings to the database.
pub struct SettingsManager<'a> {
    conn: &'a Connection,
}

impl<'a> SettingsManager<'a> {
    /// Create a new settings manager with a database connection.
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    /// Get a setting value by key.
    pub fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        let result: Option<String> = self
            .conn
            .query_row(
                "SELECT value_json FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()
            .context("Failed to query settings")?;

        match result {
            Some(json) => {
                let value: T =
                    serde_json::from_str(&json).context("Failed to deserialize setting")?;
                Ok(Some(value))
            }
            None => Ok(None),
        }
    }

    /// Set a setting value by key.
    pub fn set<T: Serialize>(&self, key: &str, value: &T) -> Result<()> {
        let json = serde_json::to_string(value).context("Failed to serialize setting")?;

        self.conn
            .execute(
                "INSERT INTO settings (key, value_json) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json",
                params![key, json],
            )
            .context("Failed to save setting")?;

        Ok(())
    }

    /// Delete a setting by key.
    pub fn delete(&self, key: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM settings WHERE key = ?1", params![key])
            .context("Failed to delete setting")?;
        Ok(())
    }

    /// Get the user settings, returning defaults if not set.
    pub fn get_user_settings(&self) -> Result<UserSettings> {
        self.get::<UserSettings>(keys::USER_SETTINGS)
            .map(|opt| opt.unwrap_or_default())
    }

    /// Save user settings.
    pub fn save_user_settings(&self, settings: &UserSettings) -> Result<()> {
        self.set(keys::USER_SETTINGS, settings)
    }

    /// Get window state.
    pub fn get_window_state(&self) -> Result<WindowState> {
        self.get::<WindowState>(keys::WINDOW_STATE)
            .map(|opt| opt.unwrap_or_default())
    }

    /// Save window state.
    pub fn save_window_state(&self, state: &WindowState) -> Result<()> {
        self.set(keys::WINDOW_STATE, state)
    }

    /// Get the last used preset ID.
    pub fn get_last_preset(&self) -> Result<Option<String>> {
        self.get::<String>(keys::LAST_PRESET)
    }

    /// Save the last used preset ID.
    pub fn save_last_preset(&self, preset_id: &str) -> Result<()> {
        self.set(keys::LAST_PRESET, &preset_id.to_string())
    }

    /// Get the last used destination folder.
    pub fn get_last_destination(&self) -> Result<Option<PathBuf>> {
        self.get::<PathBuf>(keys::LAST_DESTINATION)
    }

    /// Save the last used destination folder.
    pub fn save_last_destination(&self, path: &PathBuf) -> Result<()> {
        self.set(keys::LAST_DESTINATION, path)
    }

    /// Check if cookies have been imported.
    pub fn are_cookies_imported(&self) -> Result<bool> {
        self.get::<bool>(keys::COOKIES_IMPORTED)
            .map(|opt| opt.unwrap_or(false))
    }

    /// Set cookies imported flag.
    pub fn set_cookies_imported(&self, imported: bool) -> Result<()> {
        self.set(keys::COOKIES_IMPORTED, &imported)
    }
}
