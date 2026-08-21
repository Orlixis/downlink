"use client";

import { CloudDownload } from "lucide-react";

export function EmptyDropState() {
  return (
    <div className="flex flex-col items-center text-center animate-fade-in px-4 w-full max-w-sm">
      {/* Floating icon with animated pull-down arrows */}
      <div className="relative mb-8 mt-2">
        {/* Ambient glow */}
        <div className="absolute inset-0 blur-2xl opacity-40 rounded-full bg-gradient-to-br from-blue-500/50 to-cyan-500/30 scale-150" />

        {/* Icon container — floats gently */}
        <div className="relative animate-float flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 ring-1 ring-white/8 shadow-xl">
          <CloudDownload className="h-10 w-10 text-blue-400" />
        </div>

        {/* Staggered chevron arrows pulling downward */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-arrow-pull-down"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <svg width="14" height="9" viewBox="0 0 14 9" fill="none">
                <path
                  d="M1 1L7 7L13 1"
                  stroke="url(#empty-arrow)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient
                    id="empty-arrow"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Heading */}
      <h1 className="mb-2 mt-4 text-xl font-bold tracking-tight text-white">
        Paste a video URL to begin
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-zinc-500">
        Supports YouTube, Vimeo, TikTok, Twitter, Instagram &amp; 1,000+ other
        sites
      </p>

      {/* Keyboard hint */}
      <div className="mb-7 flex items-center gap-2 text-zinc-500">
        <kbd className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-xs font-medium text-zinc-300 shadow-sm">
          ⌘V
        </kbd>
        <span className="text-sm">to paste from clipboard</span>
      </div>

      {/* Ghost example URLs — show off range patterns */}
      <div className="w-full space-y-2">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
          Example patterns
        </p>
        {[
          { label: "Single video", url: "youtube.com/watch?v=…" },
          { label: "Episode range", url: "site.com/episode-[1-24]" },
          { label: "Playlist", url: "youtube.com/playlist?list=…" },
        ].map(({ label, url }) => (
          <div
            key={url}
            className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-left"
          >
            <span className="min-w-[76px] text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
              {label}
            </span>
            <span className="flex-1 truncate font-mono text-[11px] text-zinc-600">
              {url}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
