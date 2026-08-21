"use client";

import { Loader2 } from "lucide-react";
import type { VideoQualityOption } from "@/app/types";
import { formatBytes } from "@/app/types";
import { GLOBAL_QUALITY_PRESETS } from "./QualityPicker";

interface CompactQualityPickerProps {
  qualities: VideoQualityOption[];
  loading?: boolean;
  selected: string | null | undefined;
  onSelect: (fmt: string) => void;
}

export function CompactQualityPicker({
  qualities,
  loading,
  selected,
  onSelect,
}: CompactQualityPickerProps) {
  if (loading && qualities.length === 0) {
    return (
      <div className="mt-1.5 flex items-center gap-1">
        <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-700" />
        <span className="text-[9px] text-zinc-600">Loading quality…</span>
      </div>
    );
  }

  const isActive = (fmt: string) =>
    fmt === "default" ? !selected || selected === "default" : selected === fmt;

  const pillCls = (fmt: string, isAudio = false) =>
    `rounded px-1.5 py-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
      isActive(fmt)
        ? isAudio
          ? "bg-purple-600 text-white shadow-sm"
          : "bg-blue-600 text-white shadow-sm"
        : "bg-zinc-700/60 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
    }`;

  if (qualities.length > 0) {
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onSelect("default")}
          className={pillCls("default")}
        >
          Best
        </button>
        {qualities
          .filter((q) => !q.is_audio_only)
          .map((q) => (
            <button
              key={q.format_string}
              type="button"
              onClick={() => onSelect(q.format_string)}
              title={
                q.filesize_approx
                  ? `≈ ${formatBytes(q.filesize_approx)}`
                  : undefined
              }
              className={pillCls(q.format_string)}
            >
              {q.label}
            </button>
          ))}
        {qualities
          .filter((q) => q.is_audio_only)
          .map((q) => (
            <button
              key={q.format_string}
              type="button"
              onClick={() => onSelect(q.format_string)}
              title={
                q.filesize_approx
                  ? `≈ ${formatBytes(q.filesize_approx)}`
                  : undefined
              }
              className={pillCls(q.format_string, true)}
            >
              Audio
            </button>
          ))}
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {GLOBAL_QUALITY_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onSelect(preset.value)}
          className={pillCls(preset.value, preset.label.toLowerCase().includes("audio"))}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
