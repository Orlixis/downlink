pub mod manager;
pub mod types;

pub use self::manager::{keys, SettingsManager};
pub use self::types::{
    FormatSettings, GeneralSettings, NetworkSettings, PrivacySettings, SponsorBlockSettings,
    SubtitleSettings, TranscriptionProvider, TranscriptionSettings, UpdateSettings, UserSettings,
    WindowState,
};

/// Builder methods for UserSettings
impl UserSettings {
    pub fn with_general(mut self, general: GeneralSettings) -> Self {
        self.general = general;
        self
    }

    pub fn with_formats(mut self, formats: FormatSettings) -> Self {
        self.formats = formats;
        self
    }

    pub fn with_sponsorblock(mut self, sponsorblock: SponsorBlockSettings) -> Self {
        self.sponsorblock = sponsorblock;
        self
    }

    pub fn with_subtitles(mut self, subtitles: SubtitleSettings) -> Self {
        self.subtitles = subtitles;
        self
    }

    pub fn with_updates(mut self, updates: UpdateSettings) -> Self {
        self.updates = updates;
        self
    }

    pub fn with_privacy(mut self, privacy: PrivacySettings) -> Self {
        self.privacy = privacy;
        self
    }

    pub fn with_network(mut self, network: NetworkSettings) -> Self {
        self.network = network;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use std::path::PathBuf;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value_json TEXT NOT NULL
            )",
            [],
        )
        .unwrap();
        conn
    }

    #[test]
    fn test_default_settings() {
        let settings = UserSettings::default();
        assert_eq!(settings.general.concurrency, 2);
        assert!(settings.general.auto_start);
        assert!(settings.formats.prefer_mp4);
        assert!(!settings.sponsorblock.enabled_by_default);
    }

    #[test]
    fn test_settings_roundtrip() {
        let conn = setup_test_db();
        let manager = SettingsManager::new(&conn);

        let mut settings = UserSettings::default();
        settings.general.concurrency = 4;
        settings.general.download_folder = PathBuf::from("/custom/path");

        manager.save_user_settings(&settings).unwrap();
        let loaded = manager.get_user_settings().unwrap();

        assert_eq!(loaded.general.concurrency, 4);
        assert_eq!(
            loaded.general.download_folder,
            PathBuf::from("/custom/path")
        );
    }

    #[test]
    fn test_window_state_persistence() {
        let conn = setup_test_db();
        let manager = SettingsManager::new(&conn);

        let state = WindowState {
            x: 200,
            y: 150,
            width: 1400,
            height: 900,
            is_maximized: true,
        };

        manager.save_window_state(&state).unwrap();
        let loaded = manager.get_window_state().unwrap();

        assert_eq!(loaded.x, 200);
        assert_eq!(loaded.y, 150);
        assert_eq!(loaded.width, 1400);
        assert_eq!(loaded.height, 900);
        assert!(loaded.is_maximized);
    }

    #[test]
    fn test_last_preset() {
        let conn = setup_test_db();
        let manager = SettingsManager::new(&conn);

        assert!(manager.get_last_preset().unwrap().is_none());

        manager.save_last_preset("audio_m4a").unwrap();
        assert_eq!(
            manager.get_last_preset().unwrap(),
            Some("audio_m4a".to_string())
        );
    }

    #[test]
    fn test_delete_setting() {
        let conn = setup_test_db();
        let manager = SettingsManager::new(&conn);

        manager.save_last_preset("test").unwrap();
        assert!(manager.get_last_preset().unwrap().is_some());

        manager.delete(keys::LAST_PRESET).unwrap();
        assert!(manager.get_last_preset().unwrap().is_none());
    }
}
