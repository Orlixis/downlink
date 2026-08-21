"use client";

import { useState, useCallback } from "react";
import type { FetchMetadataResult } from "@/app/types";

interface PlaylistVideo {
  id: string;
  url: string;
  title: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  uploader?: string;
}

interface UsePlaylistDialogOptions {
  previewPlaylist: (url: string) => Promise<{ videos: any[] }>;
  addUrls: (urls: string, opts: any) => Promise<any>;
  expandPlaylist: (url: string, opts: any) => Promise<any>;
  startAllDownloads: () => Promise<void>;
  presetId: string;
  destination: string;
  autoStart: boolean;
  onSuccess: () => void;
}

export function usePlaylistDialog({
  previewPlaylist,
  addUrls,
  expandPlaylist,
  startAllDownloads,
  presetId,
  destination,
  autoStart,
  onSuccess,
}: UsePlaylistDialogOptions) {
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [playlistDialogData, setPlaylistDialogData] = useState<{
    url: string;
    metadata: FetchMetadataResult;
  } | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const openDialog = useCallback((url: string, metadata: FetchMetadataResult) => {
    setPlaylistDialogData({ url, metadata });
    setPlaylistDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setPlaylistDialogOpen(false);
    setPlaylistDialogData(null);
    setPlaylistVideos([]);
  }, []);

  const loadVideos = useCallback(async () => {
    if (!playlistDialogData) return;
    setIsLoadingVideos(true);
    try {
      const result = await previewPlaylist(playlistDialogData.url);
      if (result.videos) {
        setPlaylistVideos(
          result.videos.map((v) => ({
            id: v.id,
            url: v.url,
            title: v.title ?? "Untitled",
            thumbnail_url: v.thumbnail_url ?? undefined,
            duration_seconds: v.duration_seconds ?? undefined,
            uploader: v.uploader ?? undefined,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load playlist videos:", e);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [playlistDialogData, previewPlaylist]);

  const confirm = useCallback(
    async (downloadPlaylist: boolean, selectedVideoIds?: string[]) => {
      if (!playlistDialogData) return;

      setIsSubmitting(true);
      setIsAnimatingOut(true);
      const { url, metadata } = playlistDialogData;

      await new Promise((resolve) => setTimeout(resolve, 1100));

      try {
        if (downloadPlaylist) {
          if (selectedVideoIds && selectedVideoIds.length > 0 && playlistVideos.length > 0) {
            const selectedVideos = playlistVideos.filter((v) =>
              selectedVideoIds.includes(v.id)
            );
            for (const video of selectedVideos) {
              await addUrls(video.url, {
                preset_id: presetId,
                output_dir: destination,
                parent_id: null,
                source_kind: "single",
                title: video.title ?? null,
                uploader: video.uploader ?? null,
                thumbnail_url: video.thumbnail_url ?? null,
                duration_seconds: video.duration_seconds ?? null,
              });
            }
          } else {
            await expandPlaylist(url, {
              preset_id: presetId,
              output_dir: destination,
            });
          }
        } else {
          await addUrls(url, {
            preset_id: presetId,
            output_dir: destination,
            parent_id: null,
            source_kind: "single",
            title: metadata.title ?? null,
            uploader: metadata.uploader ?? null,
            thumbnail_url: metadata.thumbnail_url ?? null,
            duration_seconds: metadata.duration_seconds ?? null,
            stream_url: metadata.stream_url ?? null,
          });
        }

        if (autoStart) {
          await startAllDownloads();
        }

        onSuccess();
      } catch (e) {
        console.error("Failed to handle playlist:", e);
      } finally {
        setIsSubmitting(false);
        setTimeout(() => {
          setIsAnimatingOut(false);
          closeDialog();
        }, 200);
      }
    },
    [playlistDialogData, playlistVideos, addUrls, expandPlaylist, startAllDownloads, presetId, destination, autoStart, onSuccess, closeDialog]
  );

  return {
    playlistDialogOpen,
    playlistDialogData,
    playlistVideos,
    isLoadingVideos,
    isSubmitting,
    isAnimatingOut,
    openDialog,
    closeDialog,
    loadVideos,
    confirm,
  };
}
