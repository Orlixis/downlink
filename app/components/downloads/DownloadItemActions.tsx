"use client";

import { ExternalLink, RotateCcw, Pause, FolderOpen, X } from "lucide-react";
import type { QueueItem } from "@/app/types";

interface DownloadItemActionsProps {
  item: QueueItem;
  isActive: boolean;
  isDone: boolean;
  isFailed: boolean;
  isStopped: boolean;
  isQueued: boolean;
  onOpen: (path: string) => void;
  onRetry: (id: string) => void;
  onStop: (id: string) => void;
  onOpenFolder: (path: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}

export function DownloadItemActions({
  item,
  isActive,
  isDone,
  isFailed,
  isStopped,
  isQueued,
  onOpen,
  onRetry,
  onStop,
  onOpenFolder,
  onCancel,
  onRemove,
}: DownloadItemActionsProps) {
  return (
    <div className="flex flex-shrink-0 items-center gap-0.5">
      {isDone && item.final_path && (
        <button
          type="button"
          onClick={() => onOpen(item.final_path!)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
          title="Open file"
          aria-label="Open downloaded file"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      )}

      {(isFailed || isStopped) && (
        <button
          type="button"
          onClick={() => onRetry(item.id)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-blue-400"
          title="Retry download"
          aria-label="Retry download"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}

      {isActive && (
        <button
          type="button"
          onClick={() => onStop(item.id)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-yellow-400"
          title="Pause download"
          aria-label="Pause download"
        >
          <Pause className="h-3.5 w-3.5" />
        </button>
      )}

      <button
        type="button"
        onClick={() =>
          onOpenFolder(
            isDone && item.final_path ? item.final_path : item.output_dir
          )
        }
        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        title={isDone ? "Reveal in Finder" : "Open download folder"}
        aria-label="Open folder"
      >
        <FolderOpen className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() =>
          isActive || isQueued ? onCancel(item.id) : onRemove(item.id)
        }
        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
        title={isActive ? "Cancel" : "Remove"}
        aria-label={isActive ? "Cancel download" : "Remove from list"}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
