"use client";

import type { FormatSettings } from "@/app/types";

interface FormatsTabProps {
  settings: FormatSettings;
  updateFormats: <K extends keyof FormatSettings>(
    key: K,
    value: FormatSettings[K]
  ) => void;
}

export function FormatsTab({ settings, updateFormats }: FormatsTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Filename Template
        </label>
        <input
          type="text"
          value={settings.filename_template}
          onChange={(e) => updateFormats("filename_template", e.target.value)}
          className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <p className="mt-1 text-[10px] text-zinc-500">
          Available tokens: %(title)s, %(id)s, %(ext)s, %(uploader)s
        </p>
      </div>

      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.prefer_mp4}
            onChange={(e) => updateFormats("prefer_mp4", e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-xs text-zinc-300">
            Prefer MP4 container format
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.embed_metadata}
            onChange={(e) => updateFormats("embed_metadata", e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-xs text-zinc-300">
            Embed metadata into output file
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.embed_thumbnail}
            onChange={(e) => updateFormats("embed_thumbnail", e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-xs text-zinc-300">
            Embed thumbnail as cover art
          </span>
        </label>
      </div>
    </div>
  );
}
