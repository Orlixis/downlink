"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Video,
  Play,
  Clock,
  HardDrive,
  ListVideo,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import type { FetchMetadataResult } from "@/app/types";
import { formatBytes, formatDuration } from "@/app/types";
import { FormatSelector } from "./FormatSelector";

interface PreviewItemDetailsProps {
  item: FetchMetadataResult;
  selectedQuality: string;
  onSelectQuality: (val: string) => void;
  qualitiesLoading?: boolean;
}

export function PreviewItemDetails({
  item,
  selectedQuality,
  onSelectQuality,
  qualitiesLoading,
}: PreviewItemDetailsProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const playableUrl = item.stream_url || item.url;
  const isDirectMedia =
    playableUrl.includes(".m3u8") ||
    playableUrl.includes(".mp4") ||
    playableUrl.includes(".webm");

  return (
    <div className="w-full">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/10 group">
          {item.thumbnail_url ? (
            <Image
              src={item.thumbnail_url}
              alt=""
              fill
              className="object-cover"
              sizes="112px"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {item.is_playlist ? (
                <ListVideo className="h-6 w-6 text-zinc-600" />
              ) : (
                <Video className="h-6 w-6 text-zinc-600" />
              )}
            </div>
          )}

          {isDirectMedia && !isPlaying && (
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Preview video"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </div>
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-tight">
            {item.title || "Video Stream"}
          </h3>
          {item.uploader && (
            <p className="mt-0.5 text-[10px] text-zinc-400 truncate">
              {item.uploader}
            </p>
          )}

          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-zinc-400 flex-wrap">
            {item.duration_seconds != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(item.duration_seconds)}
              </span>
            )}
            {item.filesize_bytes != null && (
              <span className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {formatBytes(item.filesize_bytes)}
              </span>
            )}
            {item.is_playlist && (
              <span className="flex items-center gap-1 text-blue-400 font-medium">
                <ListVideo className="h-3 w-3" />
                Playlist ({item.playlist_count_hint ?? "Multiple"} items)
              </span>
            )}
          </div>
        </div>
      </div>

      {isPlaying && isDirectMedia && (
        <div className="mt-3 overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
          <MediaPlayer src={playableUrl} viewType="video" autoPlay>
            <MediaProvider />
            <DefaultVideoLayout icons={defaultLayoutIcons} />
          </MediaPlayer>
        </div>
      )}

      <FormatSelector
        availableQualities={item.available_qualities}
        selectedQuality={selectedQuality}
        onSelectQuality={onSelectQuality}
        qualitiesLoading={qualitiesLoading}
      />
    </div>
  );
}
