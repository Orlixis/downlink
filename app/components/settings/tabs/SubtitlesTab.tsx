"use client";

import type { SubtitleSettings } from "@/app/types";

interface SubtitlesTabProps {
  settings: SubtitleSettings;
  updateSubtitles: <K extends keyof SubtitleSettings>(
    key: K,
    value: SubtitleSettings[K]
  ) => void;
}

export function SubtitlesTab({ settings, updateSubtitles }: SubtitlesTabProps) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.enabled_by_default}
          onChange={(e) =>
            updateSubtitles("enabled_by_default", e.target.checked)
          }
          className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
        />
        <span className="text-xs text-zinc-300 font-medium">
          Download subtitles by default
        </span>
      </label>

      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Default Language (ISO 639-1 code)
        </label>
        <input
          type="text"
          value={settings.default_language}
          onChange={(e) =>
            updateSubtitles("default_language", e.target.value)
          }
          className="mt-1 w-32 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.include_auto_captions}
            onChange={(e) =>
              updateSubtitles("include_auto_captions", e.target.checked)
            }
            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-xs text-zinc-300">
            Include auto-generated captions if manual subtitles unavailable
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.embed_subtitles}
            onChange={(e) =>
              updateSubtitles("embed_subtitles", e.target.checked)
            }
            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-xs text-zinc-300">
            Embed subtitle track directly into container
          </span>
        </label>
      </div>
    </div>
  );
}
