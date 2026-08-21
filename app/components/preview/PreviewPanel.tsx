"use client";

import { useRef } from "react";
import type { FetchMetadataResult, UrlPreviewItem } from "@/app/types";
import { AnimatedPreviewMorph } from "./AnimatedPreviewMorph";
import { PreviewItemSkeleton } from "./PreviewItemSkeleton";
import { PreviewItemDetails } from "./PreviewItemDetails";
import { EmptyDropState } from "./EmptyDropState";
import { RangeGroupCard } from "./RangeGroupCard";

interface PreviewPanelProps {
  previewData?: FetchMetadataResult | null;
  previewLoading?: boolean;
  previewError?: string | null;
  isDragging?: boolean;
  isExiting?: boolean;
  onClearPreview?: () => void;
  allPreviews?: UrlPreviewItem[];
  rangeGroups?: { pattern: string; urls: string[] }[];
  selectedQualitiesMap?: Map<string, string>;
  trimEnabled?: boolean;
  trimStart?: number;
  trimEnd?: number;
  onTrimChange?: (start: number, end: number) => void;
  onSelectQuality?: (url: string, quality: string) => void;
  onSelectQualityForAll?: (quality: string) => void;
}

export function PreviewPanel({
  previewData,
  previewLoading,
  previewError,
  isDragging,
  isExiting,
  onClearPreview,
  allPreviews = [],
  rangeGroups = [],
  selectedQualitiesMap,
  onSelectQuality,
  onSelectQualityForAll,
}: PreviewPanelProps) {
  const lastPreviewsRef = useRef(allPreviews);
  if (allPreviews.length > 0) {
    lastPreviewsRef.current = allPreviews;
  }
  const displayPreviews =
    isExiting && allPreviews.length === 0 ? lastPreviewsRef.current : allPreviews;

  const hasPreviews = displayPreviews.length > 0 || rangeGroups.length > 0;

  if (!hasPreviews) {
    return <EmptyDropState isDragging={isDragging} />;
  }

  return (
    <div className="w-full space-y-4 py-2">
      {rangeGroups.map((group) => (
        <RangeGroupCard
          key={group.pattern}
          pattern={group.pattern}
          urls={group.urls}
        />
      ))}

      {displayPreviews.map((item, idx) => (
        <AnimatedPreviewMorph
          key={item.url}
          index={idx}
          loading={item.loading}
          isExiting={isExiting}
        >
          {item.loading ? (
            <PreviewItemSkeleton
              url={item.url}
              fetchHint={item.fetchHint}
            />
          ) : item.error ? (
            <div className="w-full max-w-lg mx-auto rounded-2xl bg-red-950/30 p-4 ring-1 ring-red-500/20 backdrop-blur-md">
              <div className="flex items-center justify-between text-red-400">
                <span className="text-xs font-semibold">
                  Preview Failed
                </span>
                {onClearPreview && (
                  <button
                    type="button"
                    onClick={onClearPreview}
                    className="text-[10px] text-zinc-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1 text-[10px] text-red-300/80 truncate">
                {item.error}
              </p>
            </div>
          ) : item.data ? (
            <div className="w-full max-w-lg mx-auto rounded-2xl bg-zinc-900/90 p-4 ring-1 ring-white/10 shadow-xl backdrop-blur-md">
              <PreviewItemDetails
                item={item.data}
                selectedQuality={
                  selectedQualitiesMap?.get(item.url) || "default"
                }
                onSelectQuality={(q) => onSelectQuality?.(item.url, q)}
                qualitiesLoading={item.qualitiesLoading}
              />
            </div>
          ) : null}
        </AnimatedPreviewMorph>
      ))}
    </div>
  );
}
