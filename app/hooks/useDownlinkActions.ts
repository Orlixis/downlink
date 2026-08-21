"use client";

import { invoke } from "@tauri-apps/api/core";
import type {
  AddUrlsOptions,
  AddUrlsResult,
  AppUpdateInfo,
  ExpandPlaylistOptions,
  ExpandPlaylistResult,
  FetchMetadataOptions,
  FetchMetadataResult,
  PreviewPlaylistResult,
  PresetInfo,
  QueueItem,
  ToolchainStatus,
  UserSettings,
  WindowState,
  WhisperModel,
} from "@/app/types";

export function createDownlinkActions(
  refreshQueue: () => Promise<void>,
  refreshHistory: () => Promise<void>,
  setLastError: (err: string | null) => void
) {
  const addUrls = async (
    urlsText: string,
    options: AddUrlsOptions
  ): Promise<AddUrlsResult> => {
    try {
      const result = await invoke<AddUrlsResult>("add_urls", {
        urlsText,
        options,
      });
      await refreshQueue();
      return result;
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const fetchMetadata = async (
    url: string,
    options: FetchMetadataOptions
  ): Promise<FetchMetadataResult> => {
    try {
      return await invoke<FetchMetadataResult>("fetch_metadata", {
        url,
        options,
      });
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const fastFetchMetadata = async (
    url: string
  ): Promise<FetchMetadataResult | null> => {
    try {
      return await invoke<FetchMetadataResult | null>("fast_fetch_preview", {
        url,
      });
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const previewPlaylist = async (
    playlistUrl: string
  ): Promise<PreviewPlaylistResult> => {
    try {
      return await invoke<PreviewPlaylistResult>("preview_playlist", {
        playlistUrl,
      });
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const expandPlaylist = async (
    playlistUrl: string,
    options: ExpandPlaylistOptions
  ): Promise<ExpandPlaylistResult> => {
    try {
      const result = await invoke<ExpandPlaylistResult>("expand_playlist", {
        playlistUrl,
        options,
      });
      await refreshQueue();
      return result;
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const extractUrls = async (text: string): Promise<string[]> => {
    try {
      return await invoke<string[]>("extract_urls", { text });
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const startDownload = async (id: string): Promise<void> => {
    try {
      await invoke("start_download", { id });
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const stopDownload = async (id: string): Promise<void> => {
    try {
      await invoke("stop_download", { id });
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const cancelDownload = async (id: string): Promise<void> => {
    try {
      await invoke("cancel_download", { id });
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const retryDownload = async (id: string): Promise<void> => {
    try {
      await invoke("retry_download", { id });
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const startAllDownloads = async (): Promise<void> => {
    try {
      await invoke("start_all_downloads");
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const stopAllDownloads = async (): Promise<void> => {
    try {
      await invoke("stop_all_downloads");
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const removeDownload = async (id: string): Promise<void> => {
    try {
      await invoke("remove_download", { id });
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const clearQueue = async (): Promise<void> => {
    try {
      await invoke("clear_queue");
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const clearHistory = async (): Promise<void> => {
    try {
      await invoke("clear_history");
      await refreshHistory();
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const getSettings = async (): Promise<UserSettings> => {
    try {
      return await invoke<UserSettings>("get_settings");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const saveSettings = async (settings: UserSettings): Promise<void> => {
    try {
      await invoke("save_settings", { settings });
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const getWindowState = async (): Promise<WindowState> => {
    try {
      return await invoke<WindowState>("get_window_state");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const saveWindowState = async (windowState: WindowState): Promise<void> => {
    try {
      await invoke("save_window_state", { windowState });
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const getToolchainStatus = async (): Promise<ToolchainStatus> => {
    try {
      return await invoke<ToolchainStatus>("get_toolchain_status");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const checkForUpdates = async (): Promise<string[]> => {
    try {
      return await invoke<string[]>("check_for_updates");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const updateTool = async (toolName: string): Promise<string> => {
    try {
      return await invoke<string>("update_tool", { toolName });
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const checkAppUpdate = async (): Promise<AppUpdateInfo> => {
    try {
      return await invoke<AppUpdateInfo>("check_app_update");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const installAppUpdate = async (): Promise<void> => {
    try {
      await invoke("install_app_update");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const restartApp = async (): Promise<void> => {
    try {
      await invoke("restart_app");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const getPresets = async (): Promise<PresetInfo[]> => {
    try {
      return await invoke<PresetInfo[]>("get_presets");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const getAppDataDir = async (): Promise<string> => {
    try {
      return await invoke<string>("get_app_data_dir");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const getDefaultDownloadDir = async (): Promise<string> => {
    try {
      return await invoke<string>("get_default_download_dir");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const openFile = async (path: string): Promise<void> => {
    try {
      await invoke("open_file", { path });
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const openFolder = async (path: string): Promise<void> => {
    try {
      await invoke("open_folder", { path });
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const checkWhisper = async (): Promise<string> => {
    try {
      return await invoke<string>("check_whisper");
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const transcribeFile = async (
    filePath: string,
    model: WhisperModel = "base"
  ): Promise<{ srt_path: string; method: string }> => {
    try {
      return await invoke<{ srt_path: string; method: string }>(
        "transcribe_file",
        { filePath, model }
      );
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  return {
    addUrls,
    fetchMetadata,
    fastFetchMetadata,
    previewPlaylist,
    expandPlaylist,
    extractUrls,
    startDownload,
    stopDownload,
    cancelDownload,
    retryDownload,
    startAllDownloads,
    stopAllDownloads,
    removeDownload,
    clearQueue,
    clearHistory,
    getSettings,
    saveSettings,
    getWindowState,
    saveWindowState,
    getToolchainStatus,
    checkForUpdates,
    updateTool,
    checkAppUpdate,
    installAppUpdate,
    restartApp,
    getPresets,
    getAppDataDir,
    getDefaultDownloadDir,
    openFile,
    openFolder,
    checkWhisper,
    transcribeFile,
  };
}
