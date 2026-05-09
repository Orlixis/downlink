"use client";

import { Download, Captions, Scissors, Loader2 } from "lucide-react";
import type { PresetWithHint } from "../types";
import { PresetSelector } from "./PresetSelector";

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
  const isLoading = isSubmitting || previewLoading;

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
      <div className="flex items-center gap-2">

        {/* ── Toggle buttons ─────────────────────────── */}
        <div className="flex items-center gap-1.5">
          {/* Subtitles toggle */}
          <button
            type="button"
            onClick={onSubtitlesToggle}
            title="Download subtitles / captions"
            aria-pressed={subtitlesEnabled}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
              subtitlesEnabled
                ? "bg-blue-600 text-white shadow-sm shadow-blue-900/40"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            }`}
          >
            <Captions className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Subtitles</span>
          </button>

          {/* SponsorBlock toggle */}
          <button
            type="button"
            onClick={onSponsorBlockToggle}
            title="Skip sponsored segments via SponsorBlock"
            aria-pressed={sponsorBlockEnabled}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
              sponsorBlockEnabled
                ? "bg-blue-600 text-white shadow-sm shadow-blue-900/40"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            }`}
          >
            <Scissors className="h-3.5 w-3.5 flex-shrink-0" />
            <span>SponsorBlock</span>
          </button>
        </div>

        {/* ── Preset selector (Radix) ─────────────────── */}
        <PresetSelector
          presets={presets}
          value={presetId}
          onChange={onPresetChange}
        />

        {/* ── Download button ─────────────────────────── */}
        <button
          type="button"
          onClick={onDownload}
          disabled={disabled || isLoading}
          className="btn-brand flex min-w-[130px] items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{isSubmitting ? "Adding…" : "Loading…"}</span>
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              <span>{isPlaylist ? "Download Playlist" : "Download"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
