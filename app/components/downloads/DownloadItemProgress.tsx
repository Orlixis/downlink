"use client";

import type { QueueItem } from "@/app/types";
import { formatBytes } from "@/app/types";
import { LiquidProgress } from "../LiquidProgress";

interface DownloadItemProgressProps {
  item: QueueItem;
  isActive: boolean;
  isDone: boolean;
  isStopped: boolean;
  progress: number;
}

export function DownloadItemProgress({
  item,
  isActive,
  isDone,
  isStopped,
  progress,
}: DownloadItemProgressProps) {
  if (!isActive && !isStopped && !isDone) {
    return null;
  }

  return (
    <div className="mt-2.5">
      <LiquidProgress
        progress={progress}
        isActive={isActive}
        isDone={isDone}
        isStopped={isStopped}
      />

      <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500 tabular-nums">
        <span>
          {isDone
            ? item.bytes_total
              ? formatBytes(item.bytes_total)
              : "Complete"
            : item.bytes_downloaded && item.bytes_total
            ? `${formatBytes(item.bytes_downloaded)} / ${formatBytes(
                item.bytes_total
              )}`
            : item.bytes_total
            ? formatBytes(item.bytes_total)
            : ""}
        </span>
        <span>
          {isDone ? "100%" : progress > 0 ? `${progress.toFixed(1)}%` : ""}
        </span>
      </div>
    </div>
  );
}
