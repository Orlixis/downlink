"use client";

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AppUpdateInfo,
  QueueItem,
  UserSettings,
  WhisperModel,
} from "../types";
import { createDownlinkActions, type UpdateAvailableState } from "./useDownlinkActions";
import { useDownlinkEvents } from "./useDownlinkEvents";

export type { UpdateAvailableState };

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

      invoke<string>("get_app_version")
        .then((v) => {
          if (v) setAppVersion(v);
        })
        .catch(() => {
          import("@tauri-apps/api/app")
            .then(({ getVersion }) => {
              getVersion().then((v) => {
                if (v) setAppVersion(v);
              });
            })
            .catch(() => {});
        });

      invoke<{
        ytdlp?: { version?: string };
        ffmpeg?: { version?: string };
      }>("get_toolchain_status")
        .then((status) => {
          if (status?.ytdlp?.version) setYtDlpVersion(status.ytdlp.version);
          if (status?.ffmpeg?.version) setFfmpegVersion(status.ffmpeg.version);
          setIsReady(true);
        })
        .catch(() => {});

      // Check app update in background
      setTimeout(() => {
        invoke<AppUpdateInfo>("check_app_update")
          .then((info) => {
            if (info.available) {
              setUpdateAvailable({
                available: true,
                latestVersion: info.latest_version,
                releaseNotes: info.release_notes,
                dismissed: false,
                downloading: false,
                downloadProgress: null,
                readyToInstall: false,
                error: null,
              });
            } else {
              setUpdateAvailable((prev) => ({
                ...prev,
                available: false,
                latestVersion: null,
              }));
            }
          })
          .catch((e) => {
            console.debug("[Downlink] Initial update check:", e);
          });
      }, 2500);
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
    setLastError,
    setUpdateAvailable
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
