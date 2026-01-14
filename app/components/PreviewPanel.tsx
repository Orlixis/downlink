"use client";

import Image from "next/image";
import {
  Play,
  AlertTriangle,
  Loader2,
  CloudDownload,
  Video,
  ListVideo,
} from "lucide-react";
import type { FetchMetadataResult } from "../types";
import { formatBytes, formatDuration } from "../types";

interface PreviewPanelProps {
  previewData: FetchMetadataResult | null;
  previewLoading: boolean;
  previewError: string | null;
  isDragging: boolean;
  onClearPreview: () => void;
}

export function PreviewPanel({
  previewData,
  previewLoading,
  previewError,
  isDragging,
  onClearPreview,
}: PreviewPanelProps) {
  // Video preview state
  if (previewData) {
    return (
      <div className="text-center max-w-md">
        {/* Large thumbnail */}
        <div className="relative mx-auto mb-6 h-48 w-80 overflow-hidden rounded-xl bg-zinc-800 shadow-2xl">
          {previewData.thumbnail_url ? (
            <Image
              src={previewData.thumbnail_url}
              alt={previewData.title || "Video"}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Video className="h-16 w-16 text-zinc-600" />
            </div>
          )}

          {/* Duration badge */}
          {previewData.duration_seconds && (
            <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-xs font-medium text-white">
              {formatDuration(previewData.duration_seconds)}
            </div>
          )}

          {/* Playlist badge */}
          {previewData.is_playlist && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-gradient-to-r from-blue-600 to-cyan-600 px-2 py-0.5 text-xs font-medium text-white">
              <ListVideo className="h-3 w-3" />
              {previewData.playlist_count_hint ?? "?"} videos
            </div>
          )}

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90">
              <Play className="h-6 w-6 text-zinc-900 ml-1" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-white mb-1 line-clamp-2">
          {previewData.title || "Untitled"}
        </h2>

        {/* Uploader and details */}
        <p className="text-sm text-zinc-400 mb-4">
          {previewData.uploader}
          {previewData.filesize_bytes && (
            <span> · {formatBytes(previewData.filesize_bytes)}</span>
          )}
        </p>

        {/* Clear button */}
        <button
          onClick={onClearPreview}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Clear preview
        </button>
      </div>
    );
  }

  // Error state
  if (previewError) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Failed to fetch preview
        </h3>
        <p className="text-sm text-zinc-400 max-w-xs">{previewError}</p>
      </div>
    );
  }

  // Loading state
  if (previewLoading) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Fetching preview...
        </h3>
        <p className="text-sm text-zinc-400">Getting video information</p>
      </div>
    );
  }

  // Drag overlay state
  if (isDragging) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-dashed border-blue-500 bg-blue-500/10 animate-pulse">
          <CloudDownload className="h-12 w-12 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-blue-400 mb-2">Drop URL Here</h1>
        <p className="text-zinc-400">Release to add video to download</p>
      </div>
    );
  }

  // Empty state
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
        <CloudDownload className="h-10 w-10 text-blue-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">
        Paste or Drop Video URLs Here
      </h1>
      <p className="text-zinc-400 mb-8 max-w-md">
        Supports YouTube, Vimeo, Facebook, Instagram, Twitter, TikTok,
        Soundcloud, and 1000+ more sites
      </p>
      <div className="flex items-center justify-center gap-2 text-zinc-500">
        <kbd className="rounded bg-zinc-800 px-2 py-1 text-xs">⌘V</kbd>
        <span className="text-sm">to paste from clipboard</span>
      </div>
    </div>
  );
}
