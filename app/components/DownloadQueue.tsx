"use client";

import { CloudDownload, Clock, Trash2 } from "lucide-react";
import { DownloadItem } from "./DownloadItem";
import type { QueueItem } from "../types";

interface DownloadQueueProps {
  queue: QueueItem[];
  history: QueueItem[];
  showHistory: boolean;
  onShowHistoryChange: (value: boolean) => void;
  onStop: (id: string) => void;
  onCancel: (id: string) => void;
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
  onRetry,
  onOpen,
  onOpenFolder,
  onClearQueue,
  onClearHistory,
}: DownloadQueueProps) {
  const activeCount = queue.filter(
    (q) => q.status === "downloading" || q.status === "fetching" || q.status === "queued"
  ).length;
  const completedCount = history.length;

  const items = showHistory ? history : queue;
  const isEmpty = items.length === 0;

  return (
    <div className="w-80 flex flex-col bg-zinc-900/50">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => onShowHistoryChange(false)}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors flex items-center justify-center gap-2 ${!showHistory
              ? "text-white border-b-2 border-blue-500"
              : "text-zinc-400 hover:text-white"
            }`}
        >
          <CloudDownload className="h-4 w-4" />
          Downloads ({activeCount})
        </button>
        <button
          onClick={() => onShowHistoryChange(true)}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors flex items-center justify-center gap-2 ${showHistory
              ? "text-white border-b-2 border-blue-500"
              : "text-zinc-400 hover:text-white"
            }`}
        >
          <Clock className="h-4 w-4" />
          History ({completedCount})
        </button>
      </div>

      {/* Download list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            {showHistory ? (
              <>
                <Clock className="h-12 w-12 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">No history yet</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Completed downloads appear here
                </p>
              </>
            ) : (
              <>
                <CloudDownload className="h-12 w-12 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">No active downloads</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Paste a URL to get started
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
              onRetry={onRetry}
              onOpen={onOpen}
              onOpenFolder={onOpenFolder}
            />
          ))
        )}
      </div>

      {/* Bottom actions */}
      {!isEmpty && (
        <div className="border-t border-zinc-800 p-3">
          <button
            onClick={showHistory ? onClearHistory : onClearQueue}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-800 py-2 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {showHistory ? "Clear History" : "Clear Queue"}
          </button>
        </div>
      )}
    </div>
  );
}
