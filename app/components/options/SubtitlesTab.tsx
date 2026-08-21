"use client";

import type { AdvancedOptionsState } from "./types";
import { SUBTITLE_LANGUAGES } from "./types";

interface SubtitlesTabProps {
  options: AdvancedOptionsState;
  updateOption: <K extends keyof AdvancedOptionsState>(
    key: K,
    value: AdvancedOptionsState[K]
  ) => void;
}

export function SubtitlesTab({ options, updateOption }: SubtitlesTabProps) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.subtitlesEnabled}
          onChange={(e) => updateOption("subtitlesEnabled", e.target.checked)}
          className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
        />
        <span className="text-xs text-zinc-300 font-medium">
          Download subtitles for this video
        </span>
      </label>

      {options.subtitlesEnabled && (
        <div className="space-y-3 pl-4 border-l border-zinc-800">
          <div>
            <label className="block text-xs font-medium text-zinc-300">
              Language
            </label>
            <select
              value={options.subtitlesLanguage}
              onChange={(e) =>
                updateOption("subtitlesLanguage", e.target.value)
              }
              className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUBTITLE_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.subtitlesEmbed}
              onChange={(e) => updateOption("subtitlesEmbed", e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-xs text-zinc-300">
              Embed subtitle track directly into output container
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.subtitlesAutoCaptions}
              onChange={(e) =>
                updateOption("subtitlesAutoCaptions", e.target.checked)
              }
              className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-xs text-zinc-300">
              Fall back to auto-generated captions
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
