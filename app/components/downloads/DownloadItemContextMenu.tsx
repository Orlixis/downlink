"use client";

import { useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Edit3,
  FolderOpen,
  Copy,
  FileText,
  Trash2,
  ExternalLink,
} from "lucide-react";
import type { QueueItem } from "@/app/types";

interface DownloadItemContextMenuProps {
  item: QueueItem;
  x: number;
  y: number;
  onClose: () => void;
  onStart?: (id: string) => void;
  onStop?: (id: string) => void;
  onEdit?: (item: QueueItem) => void;
  onOpen?: (path: string, id?: string) => void;
  onOpenFolder?: (path: string, id?: string) => void;
  onToggleDiagnostics?: () => void;
  onDelete?: (id: string) => void;
}

export function DownloadItemContextMenu({
  item,
  x,
  y,
  onClose,
  onStart,
  onStop,
  onEdit,
  onOpen,
  onOpenFolder,
  onToggleDiagnostics,
  onDelete,
}: DownloadItemContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive =
    item.status === "downloading" ||
    item.status === "fetching" ||
    item.status === "postprocessing";
  const isDone = item.status === "done";
  const isFailed = item.status === "failed";
  const isStopped = item.status === "stopped";
  const isQueued = item.status === "queued" || item.status === "ready";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const menuWidth = 190;
  const menuHeight = 220;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 12);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 12);

  const handleCopyLink = async () => {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
        await writeText(item.source_url);
      } else {
        await navigator.clipboard.writeText(item.source_url);
      }
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Download Task Options"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-48 rounded-xl bg-zinc-900/95 p-1 text-xs text-zinc-200 shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl animate-fade-in divide-y divide-zinc-800/60"
    >
      <div className="py-0.5">
        {(isStopped || isFailed || isQueued) && onStart && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onStart(item.id);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Play className="h-3.5 w-3.5 text-emerald-400" />
              <span>Start Task</span>
            </div>
            <span className="text-[10px] text-zinc-500">⌘S</span>
          </button>
        )}

        {isActive && onStop && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onStop(item.id);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Pause className="h-3.5 w-3.5 text-yellow-400" />
              <span>Stop Task</span>
            </div>
            <span className="text-[10px] text-zinc-500">⌘P</span>
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onEdit(item);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Edit3 className="h-3.5 w-3.5 text-blue-400" />
              <span>Edit Task…</span>
            </div>
            <span className="text-[10px] text-zinc-500">⌘E</span>
          </button>
        )}
      </div>

      <div className="py-0.5">
        {isDone && item.final_path && onOpen && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpen(item.final_path!, item.id);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open File</span>
            </div>
          </button>
        )}

        {onOpenFolder && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenFolder(
                isDone && item.final_path ? item.final_path : item.output_dir,
                item.id
              );
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Show in Finder</span>
            </div>
            <span className="text-[10px] text-zinc-500">⌘O</span>
          </button>
        )}

        <button
          type="button"
          role="menuitem"
          onClick={handleCopyLink}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Copy className="h-3.5 w-3.5 text-zinc-400" />
            <span>Copy Link Address</span>
          </div>
          <span className="text-[10px] text-zinc-500">⌘C</span>
        </button>

        {isFailed && onToggleDiagnostics && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onToggleDiagnostics();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-blue-600 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span>Show Diagnostics</span>
            </div>
            <span className="text-[10px] text-zinc-500">⌥L</span>
          </button>
        )}
      </div>

      {onDelete && (
        <div className="py-0.5">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDelete(item.id);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Task</span>
            </div>
            <span className="text-[10px] text-red-300/70">⌫</span>
          </button>
        </div>
      )}
    </div>
  );
}
