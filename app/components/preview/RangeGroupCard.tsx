"use client";

import { Hash } from "lucide-react";

interface RangeGroup {
  pattern: string;
  urls: string[];
}

interface RangeGroupCardProps {
  group: RangeGroup;
  startIndex: number;
}

export function RangeGroupCard({ group, startIndex }: RangeGroupCardProps) {
  const rangeMatch = /\[(\d+)-(\d+)\]/.exec(group.pattern);
  const from = rangeMatch ? rangeMatch[1] : "?";
  const to = rangeMatch ? rangeMatch[2] : "?";
  let displayPattern = group.pattern;
  try {
    displayPattern = group.pattern.replace(/^https?:\/\//, "");
  } catch {
    /* keep */
  }

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-2.5 ring-1 ring-blue-500/10 w-full">
      <div className="flex items-center gap-2.5">
        <span className="w-5 flex-shrink-0 text-right text-[10px] tabular-nums text-zinc-600">
          {startIndex}
        </span>
        <div className="flex h-10 w-[72px] flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
          <Hash className="h-4 w-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-blue-300">
            Range &middot; {group.urls.length} episodes
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Episodes {from} &rarr; {to}
          </p>
        </div>
      </div>
      <p className="ml-[calc(1.25rem+0.625rem+72px+0.625rem)] mt-1.5 truncate rounded bg-zinc-900/60 px-2 py-1 font-mono text-[9px] text-zinc-500">
        {displayPattern}
      </p>
    </div>
  );
}
