"use client";

import { Hash, ListVideo } from "lucide-react";

interface RangeGroupCardProps {
  pattern: string;
  urls: string[];
}

export function RangeGroupCard({ pattern, urls }: RangeGroupCardProps) {
  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl bg-zinc-900/90 p-4 ring-1 ring-white/10 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Hash className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-100">
              Batch Pattern Range
            </h4>
            <p className="text-[10px] text-zinc-400 font-mono">{pattern}</p>
          </div>
        </div>
        <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-medium text-blue-300">
          {urls.length} URLs
        </span>
      </div>

      <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-zinc-950/60 p-2 space-y-1 font-mono text-[10px] text-zinc-400 border border-zinc-800/80">
        {urls.slice(0, 5).map((url, i) => (
          <div key={i} className="truncate">
            {url}
          </div>
        ))}
        {urls.length > 5 && (
          <div className="text-zinc-600 italic">
            + {urls.length - 5} more items...
          </div>
        )}
      </div>
    </div>
  );
}
