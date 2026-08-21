"use client";

import type { AdvancedOptionsState } from "./types";

interface NetworkTabProps {
  options: AdvancedOptionsState;
  updateOption: <K extends keyof AdvancedOptionsState>(
    key: K,
    value: AdvancedOptionsState[K]
  ) => void;
}

export function NetworkTab({ options, updateOption }: NetworkTabProps) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.useProxy}
          onChange={(e) => updateOption("useProxy", e.target.checked)}
          className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
        />
        <span className="text-xs text-zinc-300 font-medium">
          Route through proxy
        </span>
      </label>

      {options.useProxy && (
        <div>
          <label className="block text-xs font-medium text-zinc-300">
            Proxy URL
          </label>
          <input
            type="text"
            placeholder="http://127.0.0.1:7890"
            value={options.proxyUrl}
            onChange={(e) => updateOption("proxyUrl", e.target.value)}
            className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Rate Limit (e.g. 5M, 500K)
        </label>
        <input
          type="text"
          placeholder="Leave empty for unlimited"
          value={options.rateLimit}
          onChange={(e) => updateOption("rateLimit", e.target.value)}
          className="mt-1 w-48 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Max Retries on Connection Failure
        </label>
        <input
          type="number"
          min={0}
          max={10}
          value={options.retries}
          onChange={(e) =>
            updateOption("retries", parseInt(e.target.value, 10) || 0)
          }
          className="mt-1 w-24 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
