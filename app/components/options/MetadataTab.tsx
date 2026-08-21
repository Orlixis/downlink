"use client";

import type { AdvancedOptionsState } from "./types";

interface MetadataTabProps {
  options: AdvancedOptionsState;
  updateOption: <K extends keyof AdvancedOptionsState>(
    key: K,
    value: AdvancedOptionsState[K]
  ) => void;
}

export function MetadataTab({ options, updateOption }: MetadataTabProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.embedMetadata}
          onChange={(e) => updateOption("embedMetadata", e.target.checked)}
          className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
        />
        <span className="text-xs text-zinc-300">
          Embed video metadata into file tags
        </span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.embedThumbnail}
          onChange={(e) => updateOption("embedThumbnail", e.target.checked)}
          className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
        />
        <span className="text-xs text-zinc-300">
          Embed thumbnail image as cover art
        </span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.writeInfoJson}
          onChange={(e) => updateOption("writeInfoJson", e.target.checked)}
          className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
        />
        <span className="text-xs text-zinc-300">
          Save full metadata JSON sidecar file (.info.json)
        </span>
      </label>
    </div>
  );
}
