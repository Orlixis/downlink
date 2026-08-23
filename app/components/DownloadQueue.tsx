"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CloudDownload, Clock, Trash2, Zap, FolderOpen, GripVertical, Sparkles } from "lucide-react";
import { DownloadItem } from "./downloads";
import type { QueueItem, WhisperModel } from "../types";
import { formatSpeed } from "../types";

interface DownloadQueueProps {
  queue: QueueItem[];
  history: QueueItem[];
  onStop: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onOpen: (path: string, id?: string) => void;
  onOpenFolder: (path: string, id?: string) => void;
  onClearQueue: () => void;
  onClearHistory: () => void;
  onEdit?: (item: QueueItem) => void;
  onCleanMissing?: () => Promise<string[]>;
  onTranscribe?: (filePath: string, model: WhisperModel) => Promise<{ srt_path: string; method: string }>;
}

// ── Sortable wrapper for a single queue item ──────────────────────
function SortableQueueItem({
  item,
  isDraggingOverlay = false,
  ...props
}: {
  item: QueueItem;
  isDraggingOverlay?: boolean;
  onStop: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onOpen: (path: string, id?: string) => void;
  onOpenFolder: (path: string, id?: string) => void;
  onEdit?: (item: QueueItem) => void;
  onTranscribe?: (filePath: string, model: WhisperModel) => Promise<{ srt_path: string; method: string }>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive = item.status === "downloading" || item.status === "postprocessing" ||
    item.status === "fetching";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-stretch gap-0 rounded-xl transition-all ${
        isDragging ? "dnd-dragging" : ""
      } ${isDraggingOverlay ? "dnd-drag-overlay" : ""}`}
    >
      {/* Drag handle — only for queue items, not history */}
      {!isActive && (
        <button
          className="flex w-5 flex-shrink-0 cursor-grab items-center justify-center rounded-l-xl opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      )}

      <div className={`min-w-0 flex-1 ${!isActive ? "-ml-5 group-hover:ml-0 transition-all duration-150" : ""}`}>
        <DownloadItem
          item={item}
          onStop={props.onStop}
          onCancel={props.onCancel}
          onRemove={props.onRemove}
          onRetry={props.onRetry}
          onOpen={props.onOpen}
          onOpenFolder={props.onOpenFolder}
          onEdit={props.onEdit}
          onTranscribe={props.onTranscribe}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
export function DownloadQueue({
  queue,
  history,
  onStop,
  onCancel,
  onRemove,
  onRetry,
  onOpen,
  onOpenFolder,
  onClearQueue,
  onClearHistory,
  onEdit,
  onCleanMissing,
  onTranscribe,
}: DownloadQueueProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [localQueueOrder, setLocalQueueOrder] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const displayQueue = [...queue].sort((a, b) => {
    const aIdx = localQueueOrder.indexOf(a.id);
    const bIdx = localQueueOrder.indexOf(b.id);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  const items = showHistory ? history : displayQueue;
  const isEmpty = items.length === 0;

  const activeItems = queue.filter(
    (item) =>
      item.status === "downloading" ||
      item.status === "fetching" ||
      item.status === "postprocessing"
  );
  const pendingCount = queue.filter(
    (item) => item.status === "queued" || item.status === "ready"
  ).length;

  const totalSpeedBps = activeItems.reduce(
    (sum, item) => sum + (item.speed_bps ?? 0),
    0
  );

  const completedWithPath = history.filter((item) => item.final_path != null);
  const showRevealAll = showHistory && completedWithPath.length >= 2;

  const handleRevealAll = () => {
    const paths = completedWithPath.map((item) => item.final_path!);
    paths.forEach((p, idx) => {
      setTimeout(() => onOpenFolder(p), idx * 100);
    });
  };

  const handleCleanMissing = async () => {
    if (!onCleanMissing || isCleaning) return;
    setIsCleaning(true);
    try {
      await onCleanMissing();
    } finally {
      setIsCleaning(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const currentOrder = displayQueue.map((item) => item.id);
    const oldIndex = currentOrder.indexOf(String(active.id));
    const newIndex = currentOrder.indexOf(String(over.id));

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
      setLocalQueueOrder(newOrder);
    }
  };

  const activeItem = activeDragId
    ? queue.find((i) => i.id === activeDragId)
    : null;

  return (
    <div className="flex h-full flex-col bg-transparent overflow-hidden select-none">
      {/* ── Header: Tab switcher ────────────────────────── */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 p-3 pb-2.5">
        <div className="flex rounded-lg bg-white/[0.04] p-0.5 ring-1 ring-white/[0.05]">
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              !showHistory
                ? "bg-white/10 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <CloudDownload className="h-3.5 w-3.5" />
            <span>Queue</span>
            {queue.length > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold leading-none ${
                  !showHistory
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-zinc-300"
                }`}
              >
                {queue.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              showHistory
                ? "bg-white/10 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>History</span>
            {history.length > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold leading-none ${
                  showHistory
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-zinc-300"
                }`}
              >
                {history.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-[11px] text-zinc-500 font-mono">
          {showHistory ? `${history.length} done` : `${queue.length} tasks`}
        </span>
      </div>

      {/* ── Active downloads summary strip ──────────────── */}
      {!showHistory && activeItems.length > 0 && (
        <div className="flex items-center justify-between border-b border-blue-500/10 bg-blue-500/5 px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
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

      {/* ── "Reveal All" batch bar (history with 2+ completed) ── */}
      {showRevealAll && (
        <div className="flex items-center justify-between border-b border-white/[0.04] bg-white/[0.01] px-3 py-1.5">
          <span className="text-[11px] text-zinc-500">
            {completedWithPath.length} downloads saved
          </span>
          <div className="flex items-center gap-1.5">
            {onCleanMissing && (
              <button
                type="button"
                onClick={handleCleanMissing}
                disabled={isCleaning}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-amber-300 disabled:opacity-50"
                title="Remove deleted files from download history"
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Clean Missing</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleRevealAll}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <FolderOpen className="h-3 w-3" />
              <span>Reveal All</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Item list ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
            {showHistory ? (
              <>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                  <Clock className="h-6 w-6 text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-400">No history yet</p>
                <p className="mt-1 text-xs text-zinc-600">Completed downloads will appear here</p>
              </>
            ) : (
              <>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                  <CloudDownload className="h-6 w-6 text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-400">No downloads yet</p>
                <p className="mt-1 text-xs text-zinc-600">Paste a URL above to get started</p>
              </>
            )}
          </div>
        ) : showHistory ? (
          // History — no drag-to-reorder needed
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
              onEdit={onEdit}
              onTranscribe={onTranscribe}
            />
          ))
        ) : (
          // Queue — drag-to-reorder with dnd-kit
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayQueue.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {displayQueue.map((item) => (
                <SortableQueueItem
                  key={item.id}
                  item={item}
                  onStop={onStop}
                  onCancel={onCancel}
                  onRemove={onRemove}
                  onRetry={onRetry}
                  onOpen={onOpen}
                  onOpenFolder={onOpenFolder}
                  onEdit={onEdit}
                  onTranscribe={onTranscribe}
                />
              ))}
            </SortableContext>

            <DragOverlay>
              {activeItem ? (
                <SortableQueueItem
                  item={activeItem}
                  isDraggingOverlay
                  onStop={onStop}
                  onCancel={onCancel}
                  onRemove={onRemove}
                  onRetry={onRetry}
                  onOpen={onOpen}
                  onOpenFolder={onOpenFolder}
                  onEdit={onEdit}
                  onTranscribe={onTranscribe}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* ── Footer: clear button ───────────────────────── */}
      {!isEmpty && (
        <div className="border-t border-white/[0.06] p-2 ">
          <button
            type="button"
            onClick={showHistory ? onClearHistory : onClearQueue}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {showHistory ? "Clear History" : "Clear Queue"}
          </button>
        </div>
      )}
    </div>
  );
}
