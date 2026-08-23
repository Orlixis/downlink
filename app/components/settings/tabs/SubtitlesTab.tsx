"use client";

import React from "react";
import type { SubtitleSettings } from "@/app/types";
import { Check, Captions, FileText, Globe } from "lucide-react";

interface SubtitlesTabProps {
  settings: SubtitleSettings;
  updateSubtitles: <K extends keyof SubtitleSettings>(
    key: K,
    value: SubtitleSettings[K]
  ) => void;
}

export function SubtitlesTab({ settings, updateSubtitles }: SubtitlesTabProps) {
  const isEnabledByDefault = Boolean(settings?.enabled_by_default);
  const includeAutoCaptions = Boolean(settings?.include_auto_captions);
  const embedSubtitles = Boolean(settings?.embed_subtitles);
  const defaultLanguage = settings?.default_language || "en";
  const preferredFormat = settings?.preferred_format || "srt";

  return (
    <div className="space-y-6 text-left select-none">
      {/* Master Toggle */}
      <button
        type="button"
        onClick={() => updateSubtitles("enabled_by_default", !isEnabledByDefault)}
        className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-white/[0.06] transition-colors cursor-pointer text-left group"
      >
        <div>
          <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
            Download Subtitles by Default
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 font-normal">
            Automatically extract and mux subtitles on all incoming downloads
          </div>
        </div>

        {/* Custom Toggle Switch */}
        <div
          className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
            isEnabledByDefault ? "bg-blue-600" : "bg-zinc-700"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform ${
              isEnabledByDefault ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
      </button>

      {/* Language & Format Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Language Code */}
        <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-white/[0.04] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Default Language (ISO 639-1)</span>
          </div>
          <input
            type="text"
            value={defaultLanguage}
            onChange={(e) => updateSubtitles("default_language", e.target.value)}
            placeholder="en"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-all"
          />
          <div className="text-[10px] text-zinc-500">e.g. en, es, fr, de, ja, zh</div>
        </div>

        {/* Preferred Format */}
        <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-white/[0.04] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Subtitle Format</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {["srt", "vtt", "ass"].map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => updateSubtitles("preferred_format", fmt)}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  preferredFormat === fmt
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-zinc-500">SRT recommended for universal playback</div>
        </div>
      </div>

      {/* Subtitle Options Checkboxes */}
      <div className="space-y-2.5 pt-1 border-t border-zinc-800">
        <label className="block text-xs font-semibold text-zinc-300">
          Extraction Options
        </label>

        <div className="space-y-2">
          {/* Auto Captions */}
          <button
            type="button"
            onClick={() => updateSubtitles("include_auto_captions", !includeAutoCaptions)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              includeAutoCaptions
                ? "bg-blue-600/10 border-blue-500/30 text-white"
                : "bg-zinc-800/40 border-white/[0.04] text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                includeAutoCaptions
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-600 bg-zinc-800/80"
              }`}
            >
              {includeAutoCaptions && <Check className="w-3 h-3 stroke-[2.5]" />}
            </div>
            <div>
              <div className="text-xs font-semibold">Include Auto-Generated Captions</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Falls back to YouTube auto-captions if official creator subtitles are unavailable
              </div>
            </div>
          </button>

          {/* Embed Subtitles */}
          <button
            type="button"
            onClick={() => updateSubtitles("embed_subtitles", !embedSubtitles)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              embedSubtitles
                ? "bg-blue-600/10 border-blue-500/30 text-white"
                : "bg-zinc-800/40 border-white/[0.04] text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                embedSubtitles
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-600 bg-zinc-800/80"
              }`}
            >
              {embedSubtitles && <Check className="w-3 h-3 stroke-[2.5]" />}
            </div>
            <div>
              <div className="text-xs font-semibold">Embed Subtitles into Video Container</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Muxes soft subtitles directly into the MP4/MKV container instead of saving separate .srt files
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
