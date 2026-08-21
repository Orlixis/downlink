"use client";

import type { NetworkSettings } from "@/app/types";

interface NetworkTabProps {
  settings: NetworkSettings;
  updateNetwork: <K extends keyof NetworkSettings>(
    key: K,
    value: NetworkSettings[K]
  ) => void;
}

export function NetworkTab({ settings, updateNetwork }: NetworkTabProps) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.use_proxy}
          onChange={(e) => updateNetwork("use_proxy", e.target.checked)}
          className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
        />
        <span className="text-xs text-zinc-300 font-medium">
          Use HTTP/SOCKS5 Proxy
        </span>
      </label>

      {settings.use_proxy && (
        <div>
          <label className="block text-xs font-medium text-zinc-300">
            Proxy URL
          </label>
          <input
            type="text"
            placeholder="http://127.0.0.1:7890 or socks5://127.0.0.1:1080"
            value={settings.proxy_url}
            onChange={(e) => updateNetwork("proxy_url", e.target.value)}
            className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Concurrent Fragments per Download
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={32}
            value={settings.concurrent_fragments}
            onChange={(e) =>
              updateNetwork(
                "concurrent_fragments",
                parseInt(e.target.value, 10)
              )
            }
            className="w-48 accent-blue-500"
          />
          <span className="text-xs text-zinc-300 font-mono">
            {settings.concurrent_fragments}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-zinc-500">
          Higher values speed up multi-chunk stream downloads. Default: 16.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-300">
          Socket Timeout (seconds)
        </label>
        <input
          type="number"
          min={5}
          max={120}
          value={settings.socket_timeout}
          onChange={(e) =>
            updateNetwork("socket_timeout", parseInt(e.target.value, 10))
          }
          className="mt-1 w-28 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
