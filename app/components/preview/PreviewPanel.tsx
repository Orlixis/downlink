"use client";

import type { FetchMetadataResult, UrlPreviewItem } from "@/app/types";
import { GLOBAL_QUALITY_PRESETS } from "./QualityPicker";
import { AnimatedPreviewMorph } from "./AnimatedPreviewMorph";
import { EmptyDropState } from "./EmptyDropState";
import { MultiPreviewCard } from "./MultiPreviewCard";
import { RangeGroupCard } from "./RangeGroupCard";
import { SinglePreviewCard } from "./SinglePreviewCard";
import { SinglePreviewSkeleton } from "./SinglePreviewSkeleton";

interface RangeGroup {
  pattern: string;
  urls: string[];
}

interface PreviewPanelProps {
  previewData?: FetchMetadataResult | null;
  previewLoading?: boolean;
  previewError?: string | null;
  isDragging?: boolean;
  isExiting?: boolean;
  onClearPreview?: () => void;
  allPreviews?: UrlPreviewItem[];
  rangeGroups?: RangeGroup[];
  selectedQualitiesMap?: Map<string, string>;
  onSelectQuality?: (url: string, formatString: string) => void;
  onSelectQualityForAll?: (formatString: string) => void;
  trimEnabled?: boolean;
  trimStart?: number;
  trimEnd?: number;
  onTrimChange?: (start: number, end: number) => void;
}

export function PreviewPanel({
  previewData,
  previewLoading = false,
  isExiting = false,
  onClearPreview,
  allPreviews = [],
  rangeGroups = [],
  selectedQualitiesMap,
  onSelectQuality,
  onSelectQualityForAll,
  trimEnabled,
  trimStart,
  trimEnd,
  onTrimChange,
}: PreviewPanelProps) {
  const isMultiple = allPreviews.length > 1 || rangeGroups.length > 0;

  /* ── Multi-URL list ───────────────────────────────────── */
  if (isMultiple) {
    const rangeTotal = rangeGroups.reduce((acc, g) => acc + g.urls.length, 0);
    const totalUrls = allPreviews.length + rangeTotal;
    const loadedCount = allPreviews.filter((p) => !p.loading && p.data).length;
    const loadingCount = allPreviews.filter((p) => p.loading).length;

    return (
      <div className="w-full max-w-xl animate-fade-in space-y-2">
        {/* Header summary */}
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {totalUrls} URL{totalUrls !== 1 ? "s" : ""} detected
            </h2>
            <p className="text-xs text-zinc-500">
              {loadingCount > 0
                ? `Fetching previews… ${loadedCount} / ${allPreviews.length} ready`
                : rangeTotal > 0
                ? `${allPreviews.length} preview${
                    allPreviews.length !== 1 ? "s" : ""
                  } + ${rangeTotal} range items`
                : "All previews loaded"}
            </p>
          </div>
          {onClearPreview && (
            <button
              type="button"
              onClick={onClearPreview}
              className="text-xs text-zinc-600 underline-offset-2 transition-colors hover:text-zinc-400 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Global batch quality apply */}
        {/* {onSelectQualityForAll && (
          <div className="mb-2.5 rounded-xl bg-zinc-900/60 p-2.5 ring-1 ring-white/5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Apply quality to all
            </p>
            <div className="flex flex-wrap gap-1">
              {GLOBAL_QUALITY_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onSelectQualityForAll(preset.value)}
                  className="rounded px-2 py-1 text-[10px] font-semibold bg-zinc-800 text-zinc-400 hover:bg-blue-600 hover:text-white transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )} */}

        {/* List of items */}
        <div className="space-y-1.5 w-full">
          {allPreviews.map((preview, idx) => (
            <MultiPreviewCard
              key={preview.url}
              index={idx + 1}
              preview={preview}
              selectedQuality={selectedQualitiesMap?.get(preview.url)}
              onSelectQuality={(fmt) => onSelectQuality?.(preview.url, fmt)}
              isExiting={isExiting}
            />
          ))}

          {/* Range group batch cards */}
          {rangeGroups.map((group, gi) => (
            <RangeGroupCard
              key={group.pattern}
              group={group}
              startIndex={allPreviews.length + gi + 1}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Single URL: preview loading or loaded ───────────── */
  if (previewLoading || previewData) {
    const singleUrl = allPreviews[0]?.url || previewData?.url || "";
    const effectivePreviewData = previewData || allPreviews[0]?.data || null;

    return (
      <AnimatedPreviewMorph
        loading={previewLoading}
        index={0}
        className="w-full max-w-sm flex justify-center"
        isExiting={isExiting}
      >
        {previewLoading || !effectivePreviewData ? (
          <SinglePreviewSkeleton
            fetchHint={allPreviews[0]?.fetchHint ?? "Fetching video info…"}
          />
        ) : (
          <SinglePreviewCard
            previewData={effectivePreviewData}
            url={singleUrl}
            selectedQuality={selectedQualitiesMap?.get(singleUrl)}
            onSelectQuality={(fmt) => onSelectQuality?.(singleUrl, fmt)}
            qualitiesLoading={allPreviews[0]?.qualitiesLoading}
            onClearPreview={onClearPreview}
            trimEnabled={trimEnabled}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onTrimChange={onTrimChange}
          />
        )}
      </AnimatedPreviewMorph>
    );
  }

  /* ── Empty / default state ────────────────────────────── */
  return <EmptyDropState />;
}
