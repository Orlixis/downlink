"use client";

import { FolderOpen } from "lucide-react";
import type { GeneralSettings } from "@/app/types";

interface GeneralTabProps {
  settings: GeneralSettings;
  updateGeneral: <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K]
  ) => void;
}

export function GeneralTab({ settings, updateGeneral }: GeneralTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Download Location
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={settings.download_folder}
            onChange={(e) => updateGeneral("download_folder", e.target.value)}
            className="flex-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-zinc-700/80 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-600 transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Browse
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Maximum Concurrent Downloads
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={10}
            value={settings.concurrency}
            onChange={(e) =>
              updateGeneral("concurrency", parseInt(e.target.value, 10))
            }
            className="w-48 accent-blue-500"
          />
          <span className="text-xs text-zinc-300 font-mono">
            {settings.concurrency}
          </span>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.auto_start}
            onChange={(e) => updateGeneral("auto_start", e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-xs text-zinc-300">
            Automatically start downloads when added
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.notify_on_complete}
            onChange={(e) =>
              updateGeneral("notify_on_complete", e.target.checked)
            }
            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-xs text-zinc-300">
            Show notification when download completes
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.show_advanced_by_default}
            onChange={(e) =>
              updateGeneral("show_advanced_by_default", e.target.checked)
            }
            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-xs text-zinc-300">
            Show advanced options by default
          </span>
        </label>
      </div>
    </div>
  );
}
