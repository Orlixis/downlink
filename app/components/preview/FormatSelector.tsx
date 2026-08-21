"use client";

import type { VideoQualityOption } from "@/app/types";
import { formatBytes } from "@/app/types";

interface FormatSelectorProps {
  availableQualities: VideoQualityOption[];
  selectedQuality: string;
  onSelectQuality: (val: string) => void;
  qualitiesLoading?: boolean;
}

export function FormatSelector({
  availableQualities,
  selectedQuality,
  onSelectQuality,
  qualitiesLoading,
}: FormatSelectorProps) {
  if (!availableQualities || availableQualities.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <label className="block text-[10px] font-medium text-zinc-400 mb-1">
        Quality:
      </label>
      <div className="flex flex-wrap gap-1.5">
        {availableQualities.map((q) => {
          const isSelected = selectedQuality === q.format_string;
          return (
            <button
              key={q.format_string}
              type="button"
              onClick={() => onSelectQuality(q.format_string)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500"
                  : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              <span>{q.label}</span>
              {q.filesize_approx ? (
                <span className="ml-1 opacity-70 text-[10px]">
                  ({formatBytes(q.filesize_approx)})
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {qualitiesLoading && (
        <span className="mt-1 block text-[10px] text-zinc-500 animate-pulse">
          Fetching extra quality formats...
        </span>
      )}
    </div>
  );
}
