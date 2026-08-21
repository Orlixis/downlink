"use client";

import { Loader2 } from "lucide-react";
import type { VideoQualityOption } from "@/app/types";
import { formatBytes } from "@/app/types";

export const GLOBAL_QUALITY_PRESETS = [
  { label: "Best", value: "default" },
  { label: "4K", value: "bv*[height<=2160][ext=mp4]+ba[ext=m4a]/b[height<=2160][ext=mp4]/bv*[height<=2160]+ba/b[height<=2160]" },
  { label: "1080p", value: "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/bv*[height<=1080]+ba/b[height<=1080]" },
  { label: "720p", value: "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/bv*[height<=720]+ba/b[height<=720]" },
  { label: "480p", value: "bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]/bv*[height<=480]+ba/b[height<=480]" },
  { label: "Audio", value: "ba[ext=m4a]/ba" },
] as const;

interface QualityPickerProps {
  qualities: VideoQualityOption[];
  loading: boolean;
  selected: string | null;
  onSelect: (fmt: string) => void;
}

export function QualityPicker({
  qualities,
  loading,
  selected,
  onSelect,
}: QualityPickerProps) {
  if (loading && qualities.length === 0) {
    return (
      <div className="w-full">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Quality
        </p>
        <div className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin text-zinc-600" />
          <span className="text-[11px] text-zinc-600">Loading quality options…</span>
        </div>
      </div>
    );
  }

  const isSelected = (fmt: string) =>
    fmt === "default" ? !selected || selected === "default" : selected === fmt;

  const videoPillCls = (fmt: string) =>
    `rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
      isSelected(fmt)
        ? "bg-blue-600 text-white shadow-sm shadow-blue-900/40"
        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
    }`;

  const audioPillCls = (fmt: string) =>
    `rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
      isSelected(fmt)
        ? "bg-purple-600 text-white shadow-sm"
        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
    }`;

  if (qualities.length > 0) {
    return (
      <div className="w-full">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Quality
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onSelect("default")}
            className={videoPillCls("default")}
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
                className={videoPillCls(q.format_string)}
              >
                {q.label}
                {q.filesize_approx && (
                  <span
                    className={`ml-1 font-normal ${
                      isSelected(q.format_string)
                        ? "text-blue-200"
                        : "text-zinc-600"
                    }`}
                  >
                    · {formatBytes(q.filesize_approx)}
                  </span>
                )}
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
                className={audioPillCls(q.format_string)}
              >
                Audio
                {q.filesize_approx && (
                  <span
                    className={`ml-1 font-normal ${
                      isSelected(q.format_string)
                        ? "text-purple-200"
                        : "text-zinc-600"
                    }`}
                  >
                    · {formatBytes(q.filesize_approx)}
                  </span>
                )}
              </button>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        Quality
      </p>
      <div className="flex flex-wrap gap-1.5">
        {GLOBAL_QUALITY_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onSelect(preset.value)}
            className={
              preset.label.toLowerCase().includes("audio")
                ? audioPillCls(preset.value)
                : videoPillCls(preset.value)
            }
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
