"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Play,
  Check,
  AlertCircle,
  Video,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { QueueItem, WhisperModel } from "@/app/types";
import { formatSpeed, formatEta } from "@/app/types";
import { DownloadItemActions } from "./DownloadItemActions";
import { DownloadItemProgress } from "./DownloadItemProgress";
import { DownloadItemDiagnostics } from "./DownloadItemDiagnostics";
import { DownloadItemTranscribe } from "./DownloadItemTranscribe";

export type { WhisperModel };

interface DownloadItemProps {
  item: QueueItem;
  onStop: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onOpen: (path: string) => void;
  onOpenFolder: (path: string) => void;
  onTranscribe?: (
    filePath: string,
    model: WhisperModel
  ) => Promise<{ srt_path: string; method: string }>;
}

function StatusPill({
  status,
  phase,
}: {
  status: QueueItem["status"];
  phase: string | null;
}) {
  const label = phase || statusLabel(status);
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none";

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
      return (
        <span className={`${base} bg-zinc-700/60 text-zinc-400`}>{label}</span>
      );
    case "stopped": {
      const isInterrupted = phase?.toLowerCase().includes("interrupted");
      return (
        <span
          className={`${base} ${
            isInterrupted
              ? "bg-orange-500/15 text-orange-400"
              : "bg-yellow-500/15 text-yellow-400"
          }`}
        >
          {isInterrupted ? <Play className="h-2.5 w-2.5" /> : null}
          {isInterrupted ? "Interrupted — Resume" : label}
        </span>
      );
    }
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
      return (
        <span className={`${base} bg-zinc-700/60 text-zinc-500`}>{label}</span>
      );
    default:
      return (
        <span className={`${base} bg-zinc-700/60 text-zinc-400`}>{label}</span>
      );
  }
}

function statusLabel(status: QueueItem["status"]): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "fetching":
      return "Fetching info…";
    case "downloading":
      return "Downloading";
    case "postprocessing":
      return "Processing";
    case "done":
      return "Completed";
    case "failed":
      return "Failed";
    case "stopped":
      return "Paused";
    case "canceled":
      return "Cancelled";
    case "ready":
      return "Ready";
    default:
      return status;
  }
}

export function DownloadItem({
  item,
  onStop,
  onCancel,
  onRemove,
  onRetry,
  onOpen,
  onOpenFolder,
  onTranscribe,
}: DownloadItemProps) {
  const [errorExpanded, setErrorExpanded] = useState(false);

  const isActive =
    item.status === "downloading" ||
    item.status === "fetching" ||
    item.status === "postprocessing";
  const isDone = item.status === "done";
  const isFailed = item.status === "failed";
  const isStopped = item.status === "stopped";
  const isQueued = item.status === "queued" || item.status === "ready";
  const progress = item.progress_percent ?? 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (isActive) onStop(item.id);
        else if (isStopped || isQueued || isFailed) onRetry(item.id);
        else if (isDone && item.final_path) onOpen(item.final_path);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (isActive || isQueued) onCancel(item.id);
        else onRemove(item.id);
      }
    },
    [isActive, isDone, isFailed, isStopped, isQueued, item, onStop, onRetry, onOpen, onCancel, onRemove]
  );

  return (
    <div
      role="listitem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${item.title || item.source_url} — ${item.status}`}
      className="rounded-xl bg-zinc-800/50 p-2.5 ring-1 ring-white/5 transition-colors hover:bg-zinc-800/80 animate-fade-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
    >
      <div className="flex items-start gap-2.5">
        <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700/60">
          {item.thumbnail_url ? (
            <Image
              src={item.thumbnail_url}
              alt=""
              fill
              className={`object-cover transition-all duration-500 ${
                isDone ? "opacity-60 grayscale" : "opacity-90"
              }`}
              sizes="80px"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Video className="h-5 w-5 text-zinc-500" />
            </div>
          )}

          {isDone && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/90 shadow-sm">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-zinc-100 leading-snug">
                {item.title && item.title.trim() && item.title !== "Fetching info…"
                  ? item.title
                  : item.final_path
                  ? item.final_path.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, "") || "Video Download"
                  : item.source_url
                  ? (() => {
                      try {
                        return `Video from ${new URL(item.source_url).hostname}`;
                      } catch {
                        return "Video Stream";
                      }
                    })()
                  : "Video Download"}
              </p>
              {item.uploader && (
                <p className="truncate text-[10px] text-zinc-500 leading-snug">
                  {item.uploader}
                </p>
              )}
            </div>

            <DownloadItemActions
              item={item}
              isActive={isActive}
              isDone={isDone}
              isFailed={isFailed}
              isStopped={isStopped}
              isQueued={isQueued}
              onOpen={onOpen}
              onRetry={onRetry}
              onStop={onStop}
              onOpenFolder={onOpenFolder}
              onCancel={onCancel}
              onRemove={onRemove}
            />
          </div>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <StatusPill status={item.status} phase={item.phase} />

            {isActive && item.speed_bps != null && (
              <span className="text-[10px] text-zinc-400 tabular-nums">
                {formatSpeed(item.speed_bps)}
              </span>
            )}
            {isActive && item.eta_seconds != null && (
              <span className="text-[10px] text-zinc-500 tabular-nums">
                {formatEta(item.eta_seconds)}
              </span>
            )}

            {isFailed && item.error_message && (
              <button
                type="button"
                onClick={() => setErrorExpanded((v) => !v)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-red-400/90 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                title={item.error_message}
                aria-expanded={errorExpanded}
              >
                <span>{errorExpanded ? "Hide diagnostics" : "View error"}</span>
                {errorExpanded ? (
                  <ChevronUp className="h-2.5 w-2.5 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-2.5 w-2.5 flex-shrink-0" />
                )}
              </button>
            )}
          </div>

          {isFailed && item.error_message && errorExpanded && (
            <DownloadItemDiagnostics item={item} />
          )}
        </div>
      </div>

      <DownloadItemProgress
        item={item}
        isActive={isActive}
        isDone={isDone}
        isStopped={isStopped}
        progress={progress}
      />

      {isDone && item.final_path && onTranscribe && (
        <DownloadItemTranscribe
          finalPath={item.final_path}
          onOpen={onOpen}
          onTranscribe={onTranscribe}
        />
      )}
    </div>
  );
}
