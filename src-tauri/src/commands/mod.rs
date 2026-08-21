pub mod downloads;
pub mod metadata;
pub mod settings;
pub mod system;
pub mod tools;
pub mod types;

pub use self::downloads::{
    add_urls, cancel_download, clean_missing_downloads, clear_history, clear_queue, get_history,
    get_queue, remove_download, retry_download, start_all_downloads, start_download,
    stop_all_downloads, stop_download, update_download_task,
};
pub use self::metadata::{
    expand_playlist, fast_fetch_metadata, fetch_metadata, preview_playlist, proxy_oembed_request,
};
pub use self::settings::{
    get_default_download_dir, get_presets, get_settings, get_window_state, save_settings,
    save_window_state,
};
pub use self::system::{
    check_app_update, extract_urls_from_text, get_app_data_dir, get_app_version,
    install_app_update, open_file, open_folder, restart_app, set_window_title,
};
pub use self::tools::{
    check_for_updates, check_whisper, get_toolchain_status, transcribe_file, update_tool,
};
pub use self::types::*;
