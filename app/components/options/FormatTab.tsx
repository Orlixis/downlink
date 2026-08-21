"use client";

import type { AdvancedOptionsState } from "./types";
import { QUALITY_OPTIONS, FORMAT_OPTIONS } from "./types";

interface FormatTabProps {
  options: AdvancedOptionsState;
  updateOption: <K extends keyof AdvancedOptionsState>(
    key: K,
    value: AdvancedOptionsState[K]
  ) => void;
}

export function FormatTab({ options, updateOption }: FormatTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Preferred Quality
        </label>
        <select
          value={options.preferredQuality}
          onChange={(e) => updateOption("preferredQuality", e.target.value)}
          className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {QUALITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Preferred Format / Container
        </label>
        <select
          value={options.preferredFormat}
          onChange={(e) => updateOption("preferredFormat", e.target.value)}
          className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FORMAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Filename Template
        </label>
        <input
          type="text"
          value={options.filenameTemplate}
          onChange={(e) => updateOption("filenameTemplate", e.target.value)}
          className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.remuxVideo}
            onChange={(e) => updateOption("remuxVideo", e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-xs text-zinc-300">
            Remux video to target container if needed
          </span>
        </label>
      </div>
    </div>
  );
}
