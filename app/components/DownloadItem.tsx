"use client";

import Image from "next/image";
import {
  Pause,
  Play,
  RotateCcw,
  FolderOpen,
  X,
  Check,
  AlertCircle,
  Video,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { QueueItem } from "../types";
import { formatBytes, formatSpeed, formatEta } from "../types";

interface DownloadItemProps {
  item: QueueItem;
  onStop: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onOpen: (path: string) => void;
  onOpenFolder: (path: string) => void;
}

/** Tiny status pill */
function StatusPill({
  status,
  phase,
}: {
  status: QueueItem["status"];
  phase: string | null;
}) {
  const label = phase || statusLabel(status);

  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none";

  switch (status) {
    case "downloading":
    case "fetching":
      return (
        <span className={`${base} bg-blue-500/15 text-blue-400`}>
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          {label}
        </span>
      );
    case "postprocessing":
      return (
        <span className={`${base} bg-cyan-500/15 text-cyan-400`}>
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          {label}
        </span>
      );
    case "queued":
    case "ready":
      return <span className={`${base} bg-zinc-700/60 text-zinc-400`}>{label}</span>;
    case "stopped":
      return <span className={`${base} bg-yellow-500/15 text-yellow-400`}>{label}</span>;
    case "done":
      return (
        <span className={`${base} bg-green-500/15 text-green-400`}>
          <Check className="h-2.5 w-2.5" />
          {label}
        </span>
      );
    case "failed":
      return (
        <span className={`${base} bg-red-500/15 text-red-400`}>
          <AlertCircle className="h-2.5 w-2.5" />
          {label}
        </span>
      );
    case "canceled":
      return <span className={`${base} bg-zinc-700/60 text-zinc-500`}>{label}</span>;
    default:
      return <span className={`${base} bg-zinc-700/60 text-zinc-400`}>{label}</span>;
  }
}

function statusLabel(status: QueueItem["status"]): string {
  switch (status) {
    case "queued": return "Queued";
    case "fetching": return "Fetching…";
    case "ready": return "Ready";
    case "downloading": return "Downloading";
    case "postprocessing": return "Processing…";
    case "stopped": return "Paused";
    case "done": return "Done";
    case "failed": return "Failed";
    case "canceled": return "Canceled";
    default: return status;
  }
}

export function DownloadItem({
  item,
  onStop,
  onCancel,
  onRetry,
  onOpen,
  onOpenFolder,
}: DownloadItemProps) {
  const isActive =
    item.status === "downloading" ||
    item.status === "fetching" ||
    item.status === "postprocessing";
  const isDone = item.status === "done";
  const isFailed = item.status === "failed";
  const isStopped = item.status === "stopped";
  const isQueued = item.status === "queued" || item.status === "ready";
  const progress = item.progress_percent ?? 0;

  return (
    <div className="rounded-xl bg-zinc-800/50 p-2.5 ring-1 ring-white/5 transition-colors hover:bg-zinc-800/80">
      <div className="flex items-start gap-2.5">
        {/* ── Thumbnail ─────────────────────────────── */}
        <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
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
              <Video className="h-5 w-5 text-zinc-500" />
            </div>
          )}

          {/* Active: subtle dark overlay */}
          {isActive && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
            </div>
          )}

          {/* Done overlay */}
          {isDone && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Check className="h-4 w-4 text-green-400" />
            </div>
          )}

          {/* Failed overlay */}
          {isFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <X className="h-4 w-4 text-red-400" />
            </div>
          )}

          {/* Paused overlay */}
          {isStopped && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Pause className="h-4 w-4 text-yellow-400" />
            </div>
          )}
        </div>

        {/* ── Info ──────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          {/* Title + actions row */}
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-xs font-semibold text-white leading-tight"
                title={item.title || item.source_url}
              >
                {item.title || item.source_url}
              </p>
              {item.uploader && (
                <p className="truncate text-[10px] text-zinc-400 leading-tight mt-0.5">
                  {item.uploader}
                </p>
              )}
            </div>

            {/* ── Action buttons — always visible ─────── */}
            <div className="flex flex-shrink-0 items-center gap-0.5 ml-1">
              {(isQueued || isStopped) && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                  title={isStopped ? "Resume" : "Start"}
                  aria-label={isStopped ? "Resume download" : "Start download"}
                >
                  <Play className="h-3.5 w-3.5" fill="currentColor" />
                </button>
              )}

              {isActive && (
                <button
                  type="button"
                  onClick={() => onStop(item.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-yellow-300"
                  title="Pause"
                  aria-label="Pause download"
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
              )}

              {isFailed && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                  title="Retry"
                  aria-label="Retry download"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}

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

              {/* Reveal in folder (always) */}
              <button
                type="button"
                onClick={() => onOpenFolder(isDone && item.final_path ? item.final_path : item.output_dir)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                title={isDone ? "Reveal in Finder" : "Open download folder"}
                aria-label="Open folder"
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </button>

              {/* Cancel / remove */}
              <button
                type="button"
                onClick={() => onCancel(item.id)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                title={isActive ? "Cancel" : "Remove"}
                aria-label={isActive ? "Cancel download" : "Remove from queue"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Status pill + speed/ETA */}
          <div className="mt-1.5 flex items-center gap-2">
            <StatusPill status={item.status} phase={item.phase} />

            {isActive && item.speed_bps != null && (
              <span className="text-[10px] text-zinc-400">
                {formatSpeed(item.speed_bps)}
              </span>
            )}
            {isActive && item.eta_seconds != null && (
              <span className="text-[10px] text-zinc-500">
                {formatEta(item.eta_seconds)}
              </span>
            )}

            {isFailed && item.error_message && (
              <span
                className="truncate text-[10px] text-red-400 max-w-[140px]"
                title={item.error_message}
              >
                {item.error_message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress bar ──────────────────────────────── */}
      {(isActive || isStopped || isDone) && (
        <div className="mt-2">
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${isDone
                  ? "bg-green-500"
                  : isStopped
                    ? "bg-yellow-500"
                    : "bg-gradient-to-r from-blue-500 to-cyan-500"
                }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress labels */}
          <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
            <span>
              {isDone
                ? item.bytes_total
                  ? formatBytes(item.bytes_total)
                  : "Complete"
                : item.bytes_downloaded && item.bytes_total
                  ? `${formatBytes(item.bytes_downloaded)} / ${formatBytes(item.bytes_total)}`
                  : item.bytes_total
                    ? formatBytes(item.bytes_total)
                    : ""}
            </span>
            <span className="tabular-nums">
              {isDone ? "100%" : progress > 0 ? `${progress.toFixed(1)}%` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
