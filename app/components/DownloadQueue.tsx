"use client";

import { CloudDownload, Clock, Trash2, Zap } from "lucide-react";
import { DownloadItem } from "./DownloadItem";
import type { QueueItem } from "../types";
import { formatSpeed } from "../types";

interface DownloadQueueProps {
  queue: QueueItem[];
  history: QueueItem[];
  showHistory: boolean;
  onShowHistoryChange: (value: boolean) => void;
  onStop: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onOpen: (path: string) => void;
  onOpenFolder: (path: string) => void;
  onClearQueue: () => void;
  onClearHistory: () => void;
}

export function DownloadQueue({
  queue,
  history,
  showHistory,
  onShowHistoryChange,
  onStop,
  onCancel,
  onRemove,
  onRetry,
  onOpen,
  onOpenFolder,
  onClearQueue,
  onClearHistory,
}: DownloadQueueProps) {
  const activeItems = queue.filter(
    (q) => q.status === "downloading" || q.status === "postprocessing"
  );
  const pendingCount = queue.filter(
    (q) => q.status === "queued" || q.status === "ready" || q.status === "fetching"
  ).length;

  // Aggregate speed of all active downloads
  const totalSpeedBps = activeItems.reduce(
    (sum, item) => sum + (item.speed_bps ?? 0),
    0
  );
  const hasActiveDownloads = activeItems.length > 0;

  const items = showHistory ? history : queue;
  const isEmpty = items.length === 0;

  return (
    <div className="flex w-full flex-col border-l border-zinc-800/80 bg-zinc-950 h-full">
      {/* ── Header / Tabs ──────────────────────────────── */}
      <div className="flex border-b border-zinc-800/80 px-1 pt-1">
        <button
          type="button"
          onClick={() => onShowHistoryChange(false)}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-t-lg px-2 py-2.5 text-xs font-medium transition-colors ${!showHistory
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-300"
            }`}
        >
          <CloudDownload className="h-3.5 w-3.5" />
          <span>Downloads</span>
          {queue.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${!showHistory ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-500"
                }`}
            >
              {queue.length}
            </span>
          )}
          {!showHistory && (
            <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onShowHistoryChange(true)}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-t-lg px-2 py-2.5 text-xs font-medium transition-colors ${showHistory
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-300"
            }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>History</span>
          {history.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${showHistory ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-500"
                }`}
            >
              {history.length}
            </span>
          )}
          {showHistory && (
            <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-500" />
          )}
        </button>
      </div>

      {/* ── Aggregate stats bar (active downloads only) ── */}
      {!showHistory && hasActiveDownloads && (
        <div className="flex items-center gap-2 border-b border-zinc-800/60 bg-blue-500/5 px-3 py-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20">
            <Zap className="h-3 w-3 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-blue-300">
              {activeItems.length} downloading
              {pendingCount > 0 && (
                <span className="text-zinc-500">, {pendingCount} queued</span>
              )}
            </span>
          </div>
          {totalSpeedBps > 0 && (
            <span className="text-[11px] font-semibold text-blue-400 tabular-nums">
              {formatSpeed(totalSpeedBps)}
            </span>
          )}
        </div>
      )}

      {/* ── Item list ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
            {showHistory ? (
              <>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/80">
                  <Clock className="h-6 w-6 text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-500">No history yet</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Completed downloads will appear here
                </p>
              </>
            ) : (
              <>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/80">
                  <CloudDownload className="h-6 w-6 text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-500">No downloads yet</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Paste a URL above to get started
                </p>
              </>
            )}
          </div>
        ) : (
          items.map((item) => (
            <DownloadItem
              key={item.id}
              item={item}
              onStop={onStop}
              onCancel={onCancel}
              onRemove={onRemove}
              onRetry={onRetry}
              onOpen={onOpen}
              onOpenFolder={onOpenFolder}
            />
          ))
        )}
      </div>

      {/* ── Footer: clear button ───────────────────────── */}
      {!isEmpty && (
        <div className="border-t border-zinc-800/80 p-2">
          <button
            type="button"
            onClick={showHistory ? onClearHistory : onClearQueue}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {showHistory ? "Clear History" : "Clear Queue"}
          </button>
        </div>
      )}
    </div>
  );
}
