"use client";

import { Loader2 } from "lucide-react";

interface PreviewItemSkeletonProps {
  url: string;
  fetchHint?: string;
}

export function PreviewItemSkeleton({
  url,
  fetchHint,
}: PreviewItemSkeletonProps) {
  return (
    <div className="w-full max-w-lg rounded-2xl bg-zinc-900/90 p-4 ring-1 ring-white/10 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 animate-pulse">
          <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-3/4 rounded bg-zinc-800 animate-pulse" />
          <div className="h-2.5 w-1/2 rounded bg-zinc-800/60 animate-pulse" />
          <p className="text-[10px] text-zinc-500 truncate">{url}</p>
        </div>
      </div>
      {fetchHint && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-zinc-800/80 pt-2 text-[10px] text-blue-400/90">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
          <span>{fetchHint}</span>
        </div>
      )}
    </div>
  );
}
