"use client";

import { CloudDownload, Sparkles, ArrowDown } from "lucide-react";

interface EmptyDropStateProps {
  isDragging?: boolean;
}

export function EmptyDropState({ isDragging }: EmptyDropStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
      <div
        className={`relative flex h-20 w-20 items-center justify-center rounded-3xl transition-all duration-300 ${
          isDragging
            ? "bg-blue-500/20 ring-2 ring-blue-500 scale-110 shadow-xl shadow-blue-500/20"
            : "bg-zinc-800/60 ring-1 ring-white/10 shadow-inner"
        }`}
      >
        <CloudDownload
          className={`h-10 w-10 transition-colors ${
            isDragging ? "text-blue-400 animate-bounce" : "text-zinc-500"
          }`}
        />
        {isDragging && (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-md animate-pulse">
            <Sparkles className="h-3 w-3" />
          </div>
        )}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-zinc-200">
        {isDragging ? "Drop URL or video stream here" : "Ready to download"}
      </h3>
      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
        {isDragging
          ? "Release to instantly queue and analyze stream"
          : "Paste a video link or drop stream files above to get started."}
      </p>

      <div className="mt-6 flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-800/40 px-3 py-1 rounded-full ring-1 ring-white/5">
        <ArrowDown className="h-3 w-3 text-blue-400" />
        <span>Supports YouTube, TikTok, M3U8 & 1000+ sites</span>
      </div>
    </div>
  );
}
