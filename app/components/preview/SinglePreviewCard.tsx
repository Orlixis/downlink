"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Clock, HardDrive, ListVideo, Play, Video } from "lucide-react";
import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from "@vidstack/react";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import type { FetchMetadataResult } from "@/app/types";
import { formatBytes, formatDuration } from "@/app/types";
import { QualityPicker } from "./QualityPicker";

interface SinglePreviewCardProps {
  previewData: FetchMetadataResult;
  url?: string;
  selectedQuality?: string | null;
  onSelectQuality?: (fmt: string) => void;
  qualitiesLoading?: boolean;
  onClearPreview?: () => void;
  trimEnabled?: boolean;
  trimStart?: number;
  trimEnd?: number;
  onTrimChange?: (start: number, end: number) => void;
}

export function SinglePreviewCard({
  previewData,
  url,
  selectedQuality,
  onSelectQuality,
  qualitiesLoading = false,
  onClearPreview,
  trimEnabled = false,
  trimStart = 0,
  trimEnd = 0,
}: SinglePreviewCardProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const [, setIsPlaying] = useState(false);

  const effectiveUrl = url || previewData.url || "";
  const isShort = effectiveUrl.includes("/shorts/");

  return (
    <div className="flex flex-col items-center text-center w-full">
      {/* Thumbnail or Video Player */}
      <div
        className="group relative mb-4 w-full mx-auto overflow-hidden rounded-2xl bg-black ring-1 ring-white/10"
        style={{
          aspectRatio: isShort ? "9/16" : "16/9",
          maxWidth: isShort ? "225px" : "100%",
        }}
      >
        {trimEnabled && previewData.url ? (
          <div className="absolute inset-0 z-10 w-full h-full bg-black">
            <MediaPlayer
              ref={playerRef}
              src={previewData.stream_url || previewData.url}
              autoPlay={true}
              muted={true}
              onTimeUpdate={(e: any) => {
                if (trimEnd && e.detail > trimEnd) {
                  try {
                    if (playerRef.current)
                      playerRef.current.currentTime = trimStart ?? 0;
                  } catch {}
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full"
            >
              <MediaProvider />
            </MediaPlayer>
          </div>
        ) : previewData.thumbnail_url ? (
          <Image
            src={previewData.thumbnail_url}
            alt={previewData.title || "Video"}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Video className="h-14 w-14 text-zinc-600" />
          </div>
        )}

        {!trimEnabled && !previewData.is_playlist && previewData.duration_seconds && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            <Clock className="h-3 w-3 opacity-70" />
            {formatDuration(previewData.duration_seconds)}
          </div>
        )}

        {!trimEnabled && previewData.is_playlist && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 px-2 py-1 text-xs font-semibold text-white shadow">
            <ListVideo className="h-3.5 w-3.5" />
            {previewData.playlist_count_hint ?? "?"} videos
          </div>
        )}

        {!trimEnabled && !previewData.is_playlist && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-200 hover:bg-black/25 hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play className="ml-0.5 h-5 w-5 text-zinc-900" fill="currentColor" />
            </div>
          </div>
        )}
      </div>

      <h2 className="mb-1.5 line-clamp-2 text-base font-semibold leading-snug text-white">
        {previewData.title || "Untitled"}
      </h2>

      <div className="mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-zinc-400">
        {previewData.uploader && <span>{previewData.uploader}</span>}
        {previewData.filesize_bytes && (
          <>
            <span className="text-zinc-600">·</span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-3.5 w-3.5 text-zinc-500" />
              {formatBytes(previewData.filesize_bytes)}
            </span>
          </>
        )}
      </div>

      {/* Quality picker — single URL */}
      {onSelectQuality && (
        <div className="mb-4 w-full">
          <QualityPicker
            qualities={previewData.available_qualities ?? []}
            loading={qualitiesLoading}
            selected={selectedQuality ?? null}
            onSelect={onSelectQuality}
          />
        </div>
      )}

      {onClearPreview && (
        <button
          type="button"
          onClick={onClearPreview}
          className="text-xs text-zinc-600 underline-offset-2 transition-colors hover:text-zinc-400 hover:underline"
        >
          Clear preview
        </button>
      )}
    </div>
  );
}
