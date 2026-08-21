"use client";

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
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
} from "../types";
import { createDownlinkActions } from "./useDownlinkActions";
import { useDownlinkEvents } from "./useDownlinkEvents";

export interface UpdateAvailableState {
  available: boolean;
  latestVersion: string | null;
  releaseNotes: string | null;
  dismissed: boolean;
  downloading: boolean;
  downloadProgress: {
    downloaded: number;
    total: number | null;
  } | null;
  readyToInstall: boolean;
  error: string | null;
}

export type DownlinkActions = ReturnType<typeof createDownlinkActions>;

export interface UseDownlinkReturn extends DownlinkActions {
  isTauri: boolean;
  isReady: boolean;
  appVersion: string | null;
  ytDlpVersion: string | null;
  ffmpegVersion: string | null;
  updateAvailable: UpdateAvailableState;
  dismissUpdateNotification: () => void;
  queue: QueueItem[];
  history: QueueItem[];
  refreshQueue: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  lastError: string | null;
  clearError: () => void;
}

export function useDownlink(): UseDownlinkReturn {
  const [isTauri, setIsTauri] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [ytDlpVersion, setYtDlpVersion] = useState<string | null>(null);
  const [ffmpegVersion, setFfmpegVersion] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateAvailableState>({
    available: false,
    latestVersion: null,
    releaseNotes: null,
    dismissed: false,
    downloading: false,
    downloadProgress: null,
    readyToInstall: false,
    error: null,
  });

  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      setIsTauri(true);
    }
  }, []);

  const refreshQueue = useCallback(async () => {
    try {
      const items = await invoke<QueueItem[]>("get_queue");
      setQueue(items);
    } catch (e) {
      console.error("[Downlink] Failed to refresh queue:", e);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const items = await invoke<QueueItem[]>("get_history");
      setHistory(items);
    } catch (e) {
      console.error("[Downlink] Failed to refresh history:", e);
    }
  }, []);

  useDownlinkEvents({
    isTauri,
    setAppVersion,
    setYtDlpVersion,
    setFfmpegVersion,
    setIsReady,
    setQueue,
    refreshQueue,
    refreshHistory,
  });

  useEffect(() => {
    queue.forEach((item) => {
      if (item.status === "done" && !notifiedIdsRef.current.has(item.id)) {
        notifiedIdsRef.current.add(item.id);
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          import("@tauri-apps/plugin-notification")
            .then(async ({ isPermissionGranted, requestPermission, sendNotification }) => {
              let granted = await isPermissionGranted();
              if (!granted) {
                const permission = await requestPermission();
                granted = permission === "granted";
              }
              if (granted) {
                sendNotification({
                  title: "Download Complete",
                  body: `${item.title || "Video"} has finished downloading.`,
                });
              }
            })
            .catch((err) => {
              console.error("[Downlink] Failed to send notification:", err);
            });
        }
      }
    });
  }, [queue]);

  useEffect(() => {
    if (isTauri) {
      refreshQueue();
      refreshHistory();
    }
  }, [isTauri, refreshQueue, refreshHistory]);

  const actions = createDownlinkActions(
    refreshQueue,
    refreshHistory,
    setLastError
  );

  return {
    isTauri,
    isReady,
    appVersion,
    ytDlpVersion,
    ffmpegVersion,
    updateAvailable,
    dismissUpdateNotification: () =>
      setUpdateAvailable((prev) => ({ ...prev, dismissed: true })),
    queue,
    history,
    refreshQueue,
    refreshHistory,
    ...actions,
    lastError,
    clearError: () => setLastError(null),
  };
}
