"use client";

import { Download, Subtitles, Scissors } from "lucide-react";
import type { PresetWithHint } from "../types";

interface ActionBarProps {
  presetId: string;
  onPresetChange: (value: string) => void;
  presets: PresetWithHint[];
  subtitlesEnabled: boolean;
  onSubtitlesToggle: () => void;
  sponsorBlockEnabled: boolean;
  onSponsorBlockToggle: () => void;
  onDownload: () => void;
  isSubmitting: boolean;
  isPlaylist: boolean;
  disabled: boolean;
  previewLoading?: boolean;
}

export function ActionBar({
  presetId,
  onPresetChange,
  presets,
  subtitlesEnabled,
  onSubtitlesToggle,
  sponsorBlockEnabled,
  onSponsorBlockToggle,
  onDownload,
  isSubmitting,
  isPlaylist,
  disabled,
  previewLoading = false,
}: ActionBarProps) {
  return (
    <div className="border-t border-zinc-800 p-4">
      <div className="flex items-center gap-3">
        {/* Subtitles toggle */}
        <button
          onClick={onSubtitlesToggle}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${subtitlesEnabled
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          title="Enable subtitles/captions"
        >
          <Subtitles className="h-4 w-4" />
          <span>CC</span>
        </button>

        {/* SponsorBlock toggle */}
        <button
          onClick={onSponsorBlockToggle}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${sponsorBlockEnabled
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          title="Remove sponsored segments (SponsorBlock)"
        >
          <Scissors className="h-4 w-4" />
          <span>SB</span>
        </button>

        {/* Preset selector */}
        <select
          value={presetId}
          onChange={(e) => onPresetChange(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors"
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Download button */}
        <button
          onClick={onDownload}
          disabled={disabled || isSubmitting || previewLoading}
          className="btn-brand flex items-center gap-2 rounded-xl py-3 px-6 text-sm min-w-[160px] justify-center"
        >
          <Download className="h-4 w-4" />
          <span>
            {isSubmitting
              ? "Adding..."
              : previewLoading
                ? "Loading..."
                : isPlaylist
                  ? "Download Playlist"
                  : "Download"}
          </span>
        </button>
      </div>
    </div>
  );
}
