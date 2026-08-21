"use client";

import { invoke } from "@tauri-apps/api/core";
import { toast } from "../components/Toast";
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
  UserSettings,
  WhisperModel,
} from "../types";

export function createDownlinkActions(
  refreshQueue: () => Promise<void>,
  refreshHistory: () => Promise<void>,
  setLastError: (err: string | null) => void
) {
  const addUrls = async (
    urlsText: string,
    options?: Partial<AddUrlsOptions>
  ): Promise<AddUrlsResult> => {
    try {
      const fullOptions: AddUrlsOptions = {
        preset_id: options?.preset_id || "best",
        output_dir: options?.output_dir || "",
        parent_id: options?.parent_id ?? null,
        source_kind: options?.source_kind ?? "single",
        title: options?.title ?? null,
        uploader: options?.uploader ?? null,
        thumbnail_url: options?.thumbnail_url ?? null,
        duration_seconds: options?.duration_seconds ?? null,
        stream_url: options?.stream_url ?? null,
        referer_url: options?.referer_url ?? null,
        subtitles_enabled: options?.subtitles_enabled,
        sponsorblock_enabled: options?.sponsorblock_enabled,
      };

      const result = await invoke<AddUrlsResult>("add_urls", {
        urlsText,
        options: fullOptions,
      });
      await refreshQueue();
      return result;
    } catch (e) {
      const msg = String(e);
      setLastError(msg);
      toast.error(msg);
      throw e;
    }
  };

  const startAllDownloads = async (ids?: string[]) => {
    try {
      await invoke("start_all_downloads", { ids: ids ?? null });
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
      toast.error(String(e));
    }
  };

  const fetchMetadata = async (
    url: string,
    opts?: { preset_id?: string; output_dir?: string }
  ): Promise<FetchMetadataResult> => {
    try {
      const options: FetchMetadataOptions = {
        preset_id: opts?.preset_id || "best",
        output_dir: opts?.output_dir || "",
      };

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
      return await invoke<FetchMetadataResult | null>("fast_fetch_metadata", {
        url,
      });
    } catch (e) {
      setLastError(String(e));
      return null;
    }
  };

  const previewPlaylist = async (
    url: string,
    opts?: { preset_id?: string; output_dir?: string }
  ): Promise<PreviewPlaylistResult> => {
    try {
      const options: FetchMetadataOptions = {
        preset_id: opts?.preset_id || "best",
        output_dir: opts?.output_dir || "",
      };

      return await invoke<PreviewPlaylistResult>("preview_playlist", {
        url,
        options,
      });
    } catch (e) {
      setLastError(String(e));
      throw e;
    }
  };

  const expandPlaylist = async (
    url: string,
    opts?: { preset_id?: string; output_dir?: string }
  ): Promise<ExpandPlaylistResult> => {
    try {
      const options: ExpandPlaylistOptions = {
        preset_id: opts?.preset_id || "best",
        output_dir: opts?.output_dir || "",
      };

      return await invoke<ExpandPlaylistResult>("expand_playlist", {
        url,
        options,
      });
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
      toast.error(String(e));
      throw e;
    }
  };

  const getDownloadDirectory = async (): Promise<string> => {
    try {
      return await invoke<string>("get_download_directory");
    } catch (e) {
      setLastError(String(e));
      return "";
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
      toast.error(String(e));
      throw e;
    }
  };

  const restartApp = async (): Promise<void> => {
    try {
      await invoke("restart_app");
    } catch (e) {
      setLastError(String(e));
      toast.error(String(e));
      throw e;
    }
  };

  const stopDownload = async (id: string) => {
    try {
      await invoke("stop_download", { id });
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
    }
  };

  const cancelDownload = async (id: string) => {
    try {
      await invoke("cancel_download", { id });
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
    }
  };

  const removeDownload = async (id: string) => {
    try {
      await invoke("remove_download", { id });
      await refreshQueue();
      await refreshHistory();
    } catch (e) {
      setLastError(String(e));
    }
  };

  const retryDownload = async (id: string) => {
    try {
      await invoke("retry_download", { id });
      await refreshQueue();
      await refreshHistory();
    } catch (e) {
      setLastError(String(e));
    }
  };

  const openFile = async (path: string, id?: string) => {
    try {
      await invoke("open_file", { path });
    } catch (e) {
      const errStr = String(e);
      setLastError(errStr);
      if (
        id &&
        (errStr.toLowerCase().includes("not found") ||
          errStr.toLowerCase().includes("does not exist") ||
          errStr.toLowerCase().includes("no such file"))
      ) {
        toast.info("File not found on disk. Removed from download history.");
        await removeDownload(id);
      } else {
        toast.error(`Cannot open file: ${errStr}`);
      }
    }
  };

  const openFolder = async (path: string, id?: string) => {
    try {
      await invoke("open_folder", { path });
    } catch (e) {
      const errStr = String(e);
      setLastError(errStr);
      if (
        id &&
        (errStr.toLowerCase().includes("not found") ||
          errStr.toLowerCase().includes("does not exist") ||
          errStr.toLowerCase().includes("no such file"))
      ) {
        toast.info("Folder or file not found on disk. Removed from history.");
        await removeDownload(id);
      } else {
        toast.error(`Cannot open folder: ${errStr}`);
      }
    }
  };

  const clearQueue = async () => {
    try {
      await invoke("clear_queue");
      await refreshQueue();
    } catch (e) {
      setLastError(String(e));
    }
  };

  const clearHistory = async () => {
    try {
      await invoke("clear_history");
      await refreshHistory();
    } catch (e) {
      setLastError(String(e));
    }
  };

  const transcribeFile = async (
    filePath: string,
    model: WhisperModel
  ): Promise<{ srt_path: string; method: string }> => {
    try {
      return await invoke<{ srt_path: string; method: string }>("transcribe_file", {
        filePath,
        model,
      });
    } catch (e) {
      const msg = String(e);
      setLastError(msg);
      toast.error(`Transcription failed: ${msg}`);
      throw e;
    }
  };

  const updateDownloadTask = async (options: {
    id: string;
    source_url: string;
    title?: string | null;
    output_dir: string;
    referer_url?: string | null;
    preset_id: string;
  }) => {
    try {
      await invoke("update_download_task", { options });
      await refreshQueue();
      await refreshHistory();
      toast.success("Download task updated successfully");
    } catch (e) {
      const msg = String(e);
      setLastError(msg);
      toast.error(`Failed to update task: ${msg}`);
      throw e;
    }
  };

  const cleanMissingDownloads = async (): Promise<string[]> => {
    try {
      const removedIds = await invoke<string[]>("clean_missing_downloads");
      await refreshHistory();
      await refreshQueue();
      if (removedIds.length > 0) {
        toast.success(`Cleaned ${removedIds.length} missing downloads from history`);
      } else {
        toast.info("No missing files found in download history");
      }
      return removedIds;
    } catch (e) {
      const msg = String(e);
      setLastError(msg);
      toast.error(`Clean missing failed: ${msg}`);
      return [];
    }
  };

  return {
    addUrls,
    startAllDownloads,
    fetchMetadata,
    fastFetchMetadata,
    previewPlaylist,
    expandPlaylist,
    getSettings,
    saveSettings,
    getDownloadDirectory,
    checkAppUpdate,
    installAppUpdate,
    restartApp,
    stopDownload,
    cancelDownload,
    removeDownload,
    retryDownload,
    openFile,
    openFolder,
    clearQueue,
    clearHistory,
    transcribeFile,
    updateDownloadTask,
    cleanMissingDownloads,
  };
}
