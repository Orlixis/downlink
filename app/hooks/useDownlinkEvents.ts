"use client";

import { useEffect, useRef, useCallback } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { DownlinkEvent, QueueItem } from "@/app/types";
import type { UpdateAvailableState } from "./useDownlinkActions";

const DOWNLINK_EVENT_NAME = "downlink://event";

interface UseDownlinkEventsProps {
  isTauri: boolean;
  setAppVersion: (v: string) => void;
  setYtDlpVersion: (v: string | null) => void;
  setFfmpegVersion: (v: string | null) => void;
  setIsReady: (v: boolean) => void;
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  refreshQueue: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  setUpdateAvailable?: React.Dispatch<React.SetStateAction<UpdateAvailableState>>;
}

export function useDownlinkEvents({
  isTauri,
  setAppVersion,
  setYtDlpVersion,
  setFfmpegVersion,
  setIsReady,
  setQueue,
  refreshQueue,
  refreshHistory,
  setUpdateAvailable,
}: UseDownlinkEventsProps) {
  const unlistenRefs = useRef<UnlistenFn[]>([]);

  const handleEvent = useCallback(
    (event: DownlinkEvent) => {
      switch (event.event) {
        case "AppReady": {
          const data = event.data as {
            versions: {
              app_version: string;
              yt_dlp_version: string | null;
              ffmpeg_version: string | null;
            };
          };
          setAppVersion(data.versions.app_version);
          setYtDlpVersion(data.versions.yt_dlp_version);
          setFfmpegVersion(data.versions.ffmpeg_version);
          setIsReady(true);
          break;
        }

        case "DownloadQueued": {
          refreshQueue();
          break;
        }

        case "DownloadStarted": {
          const data = event.data as { id: string };
          setQueue((prev) =>
            prev.map((item) =>
              item.id === data.id
                ? { ...item, status: "downloading", phase: "Downloading" }
                : item
            )
          );
          break;
        }

        case "DownloadProgress": {
          const data = event.data as {
            id: string;
            status: string;
            progress: {
              percent: number | null;
              bytes_downloaded: number | null;
              bytes_total: number | null;
              speed_bps: number | null;
              eta_seconds: number | null;
              phase: { name: string; detail: string | null } | null;
            };
          };

          setQueue((prev) =>
            prev.map((item) => {
              if (item.id !== data.id) return item;
              return {
                ...item,
                status: (data.status.toLowerCase() as QueueItem["status"]) || item.status,
                phase: data.progress.phase?.name || item.phase,
                progress_percent: data.progress.percent ?? item.progress_percent,
                bytes_downloaded: data.progress.bytes_downloaded ?? item.bytes_downloaded,
                bytes_total: data.progress.bytes_total ?? item.bytes_total,
                speed_bps: data.progress.speed_bps ?? item.speed_bps,
                eta_seconds: data.progress.eta_seconds ?? item.eta_seconds,
              };
            })
          );
          break;
        }

        case "DownloadPostProcessing": {
          const data = event.data as { id: string; stage: string };
          setQueue((prev) =>
            prev.map((item) =>
              item.id === data.id
                ? {
                    ...item,
                    status: "postprocessing",
                    phase: data.stage || "Processing",
                  }
                : item
            )
          );
          break;
        }

        case "DownloadStopped": {
          const data = event.data as { id: string };
          setQueue((prev) =>
            prev.map((item) =>
              item.id === data.id
                ? { ...item, status: "stopped", phase: "Paused" }
                : item
            )
          );
          break;
        }

        case "DownloadCanceled": {
          refreshQueue();
          break;
        }

        case "DownloadCompleted": {
          const data = event.data as { id: string; final_path: string };
          setQueue((prev) =>
            prev.map((item) =>
              item.id === data.id
                ? {
                    ...item,
                    status: "done",
                    phase: "Completed",
                    final_path: data.final_path,
                    progress_percent: 100,
                  }
                : item
            )
          );
          refreshHistory();
          break;
        }

        case "DownloadFailed": {
          const data = event.data as {
            id: string;
            error_code: string;
            user_message: string;
          };
          setQueue((prev) =>
            prev.map((item) =>
              item.id === data.id
                ? {
                    ...item,
                    status: "failed",
                    phase: "Failed",
                    error_message: data.user_message,
                  }
                : item
            )
          );
          break;
        }

        case "MetadataReady": {
          const data = event.data as {
            id: string;
            info: {
              title?: string;
              uploader?: string;
              thumbnail_url?: string;
              duration_seconds?: number;
            };
          };
          setQueue((prev) =>
            prev.map((item) => {
              if (item.id !== data.id) return item;
              return {
                ...item,
                title: data.info.title || item.title,
                uploader: data.info.uploader || item.uploader,
                thumbnail_url: data.info.thumbnail_url || item.thumbnail_url,
                duration_seconds:
                  data.info.duration_seconds || item.duration_seconds,
              };
            })
          );
          break;
        }
      }
    },
    [refreshQueue, refreshHistory, setAppVersion, setYtDlpVersion, setFfmpegVersion, setIsReady, setQueue]
  );

  useEffect(() => {
    if (!isTauri) return;

    let isMounted = true;
    unlistenRefs.current = [];

    // Main Downlink event stream
    listen<DownlinkEvent>(DOWNLINK_EVENT_NAME, (eventPayload) => {
      if (isMounted) {
        handleEvent(eventPayload.payload);
      }
    }).then((unlisten) => {
      if (isMounted) {
        unlistenRefs.current.push(unlisten);
      } else {
        unlisten();
      }
    });

    // App Update download progress stream
    listen<{ downloaded: number; total: number }>("app-update-progress", (eventPayload) => {
      if (isMounted && setUpdateAvailable) {
        setUpdateAvailable((prev) => ({
          ...prev,
          downloading: true,
          downloadProgress: {
            downloaded: eventPayload.payload.downloaded,
            total: eventPayload.payload.total,
          },
        }));
      }
    }).then((unlisten) => {
      if (isMounted) {
        unlistenRefs.current.push(unlisten);
      } else {
        unlisten();
      }
    });

    return () => {
      isMounted = false;
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
    };
  }, [isTauri, handleEvent, setUpdateAvailable]);
}
