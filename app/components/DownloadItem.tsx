"use client";

import Image from "next/image";
import {
  Pause,
  Play,
  RotateCcw,
  PlayCircle,
  Folder,
  X,
  Check,
  AlertCircle,
  Video,
} from "lucide-react";
import { CircularProgress } from "./CircularProgress";
import type { QueueItem } from "../types";
import { formatBytes } from "../types";

interface DownloadItemProps {
  item: QueueItem;
  onStop: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onOpen: (path: string) => void;
  onOpenFolder: (path: string) => void;
}

export function DownloadItem({
  item,
  onStop,
  onCancel,
  onRetry,
  onOpen,
  onOpenFolder,
}: DownloadItemProps) {
  const isActive = item.status === "downloading" || item.status === "fetching";
  const isDone = item.status === "done";
  const isFailed = item.status === "failed";
  const isStopped = item.status === "stopped";
  const isQueued = item.status === "queued";
  const progress = item.progress_percent ?? 0;

  return (
    <div className="group flex items-center gap-3 rounded-xl bg-zinc-800/50 p-3 transition-all hover:bg-zinc-800">
      {/* Thumbnail with progress overlay */}
      <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
        {item.thumbnail_url ? (
          <Image
            src={item.thumbnail_url}
            alt={item.title || "Video"}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Video className="h-6 w-6 text-zinc-500" />
          </div>
        )}

        {/* Progress overlay for active downloads */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <CircularProgress percent={progress} size={32} strokeWidth={3} showText />
          </div>
        )}

        {/* Done overlay */}
        {isDone && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Check className="h-6 w-6 text-green-400" />
          </div>
        )}

        {/* Failed overlay */}
        {isFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <X className="h-6 w-6 text-red-400" />
          </div>
        )}

        {/* Stopped overlay */}
        {isStopped && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Pause className="h-5 w-5 text-yellow-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate text-sm">
          {item.title || "Untitled"}
        </div>
        <div className="text-xs text-zinc-400 truncate">
          {item.uploader || item.source_url}
        </div>

        {/* Status line */}
        <div className="flex items-center gap-2 mt-1">
          {isActive && (
            <>
              <div className="h-1 flex-1 max-w-[120px] rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-400">
                {item.speed_bps ? `${formatBytes(item.speed_bps)}/s` : ""}
                {item.eta_seconds ? ` · ${Math.ceil(item.eta_seconds / 60)}m left` : ""}
              </span>
            </>
          )}
          {isDone && (
            <span className="text-[10px] text-green-400 font-medium flex items-center gap-1">
              <Check className="h-3 w-3" />
              Completed
            </span>
          )}
          {isFailed && (
            <span className="text-[10px] text-red-400 font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Failed
            </span>
          )}
          {isStopped && (
            <span className="text-[10px] text-yellow-400 font-medium flex items-center gap-1">
              <Pause className="h-3 w-3" />
              Paused
            </span>
          )}
          {isQueued && (
            <span className="text-[10px] text-zinc-500 font-medium">Queued</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isActive && (
          <button
            onClick={() => onStop(item.id)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Pause"
          >
            <Pause className="h-4 w-4" />
          </button>
        )}

        {(isStopped || isQueued) && (
          <button
            onClick={() => onRetry(item.id)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Resume"
          >
            <Play className="h-4 w-4" />
          </button>
        )}

        {isFailed && (
          <button
            onClick={() => onRetry(item.id)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Retry"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}

        {isDone && item.final_path && (
          <>
            <button
              onClick={() => onOpen(item.final_path!)}
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Open"
            >
              <PlayCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => onOpenFolder(item.final_path!)}
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Show in folder"
            >
              <Folder className="h-4 w-4" />
            </button>
          </>
        )}

        <button
          onClick={() => onCancel(item.id)}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
          title="Remove"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
