"use client";

import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  ListVideo,
  Loader2,
  Video,
} from "lucide-react";
import type { UrlPreviewItem } from "@/app/types";
import { formatDuration } from "@/app/types";
import { AnimatedPreviewMorph } from "./AnimatedPreviewMorph";
import { Skeleton } from "./Skeleton";
import { CompactQualityPicker } from "./CompactQualityPicker";

interface MultiPreviewCardProps {
  index: number;
  preview: UrlPreviewItem;
  selectedQuality?: string | null;
  onSelectQuality?: (fmt: string) => void;
  isExiting?: boolean;
}

export function MultiPreviewCard({
  index,
  preview,
  selectedQuality,
  onSelectQuality,
  isExiting,
}: MultiPreviewCardProps) {
  if (preview.error || (!preview.loading && !preview.data)) {
    let hostname = preview.url;
    try {
      hostname = new URL(preview.url).hostname;
    } catch {
      /* keep raw url */
    }
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-zinc-800/40 p-2.5 ring-1 ring-red-500/10 w-full">
        <span className="w-5 flex-shrink-0 text-right text-[10px] tabular-nums text-zinc-600">
          {index}
        </span>
        <div className="flex h-10 w-[72px] flex-shrink-0 items-center justify-center rounded-lg bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[11px] font-medium text-zinc-400"
            title={preview.url}
          >
            {hostname}
          </p>
          <p className="text-[10px] text-red-400/80 mt-0.5">
            Preview unavailable
          </p>
        </div>
      </div>
    );
  }

  const { data } = preview;

  return (
    <AnimatedPreviewMorph
      loading={preview.loading}
      index={index - 1}
      className="w-full"
      isExiting={isExiting}
    >
      {preview.loading ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-zinc-800/50 p-2.5 ring-1 ring-white/5 w-full">
          <span className="w-5 flex-shrink-0 text-right text-[10px] tabular-nums text-zinc-600">
            {index}
          </span>
          <Skeleton className="h-10 w-[72px] flex-shrink-0 rounded-lg" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            {preview.fetchHint ? (
              <p className="text-[10px] text-blue-400/80 animate-pulse">
                {preview.fetchHint}
              </p>
            ) : (
              <Skeleton className="h-2.5 w-28" />
            )}
          </div>
          <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-blue-400" />
        </div>
      ) : data ? (
        <div className="rounded-xl bg-zinc-800/50 p-2.5 ring-1 ring-white/5 transition-colors hover:bg-zinc-800/80 w-full">
          <div className="flex items-center gap-2.5">
            <span className="w-5 flex-shrink-0 text-right text-[10px] tabular-nums text-zinc-600">
              {index}
            </span>
            <div className="relative h-10 w-[72px] flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
              {data.thumbnail_url ? (
                <Image
                  src={data.thumbnail_url}
                  alt={data.title || ""}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Video className="h-4 w-4 text-zinc-500" />
                </div>
              )}
              {data.duration_seconds && (
                <div className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[8px] font-medium text-white leading-tight">
                  {formatDuration(data.duration_seconds)}
                </div>
              )}
              {data.is_playlist && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <ListVideo className="h-4 w-4 text-blue-300" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[11px] font-semibold leading-tight text-white"
                title={data.title || ""}
              >
                {data.title || "Untitled"}
              </p>
              {data.uploader && (
                <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                  {data.uploader}
                </p>
              )}
            </div>
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500/60" />
          </div>
          {onSelectQuality && (
            <div className="ml-[112px]">
              <CompactQualityPicker
                qualities={data.available_qualities ?? []}
                loading={preview.qualitiesLoading}
                selected={selectedQuality}
                onSelect={onSelectQuality}
              />
            </div>
          )}
        </div>
      ) : null}
    </AnimatedPreviewMorph>
  );
}
