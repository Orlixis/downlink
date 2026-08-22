"use client";

import { Chrome, ExternalLink, Globe } from "lucide-react";

interface OfficialStoreCardProps {
  onOpenStore: (url: string) => void;
}

export function OfficialStoreCard({ onOpenStore }: OfficialStoreCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-semibold text-zinc-100">Official Browser Add-ons</span>
        </div>
        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-semibold text-blue-400 border border-blue-500/20">
          Permanent Auto-Updates
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Firefox AMO Store */}
        <button
          type="button"
          onClick={() => onOpenStore("https://addons.mozilla.org/en-US/firefox/addon/downlink-companion/")}
          className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5 text-left transition-all hover:bg-amber-500/[0.08] hover:border-amber-500/40 active:scale-[0.98] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <Globe className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-100">Firefox Add-ons (AMO)</div>
              <p className="text-[10px] text-zinc-400">addons.mozilla.org</p>
            </div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-amber-400/80 group-hover:text-amber-300 transition-colors" />
        </button>

        {/* Chrome Web Store */}
        <button
          type="button"
          onClick={() => onOpenStore("https://chrome.google.com/webstore")}
          className="flex items-center justify-between rounded-lg border border-sky-500/20 bg-sky-500/[0.04] px-3 py-2.5 text-left transition-all hover:bg-sky-500/[0.08] hover:border-sky-500/40 active:scale-[0.98] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 group-hover:scale-105 transition-transform">
              <Chrome className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-100">Chrome Web Store</div>
              <p className="text-[10px] text-zinc-400">Chrome, Brave, Edge &amp; Opera</p>
            </div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-sky-400/80 group-hover:text-sky-300 transition-colors" />
        </button>
      </div>
    </div>
  );
}
