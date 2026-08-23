"use client";

import React from "react";
import { Clock, RefreshCw, Trash2, ArrowUpRight, CheckCircle2 } from "lucide-react";

export interface OutboxItem {
  id: string;
  url: string;
  preset_id: string;
  timestamp: number;
}

interface PendingOutboxCardProps {
  items: OutboxItem[];
  isSyncing: boolean;
  onSyncAll: () => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export const PendingOutboxCard: React.FC<PendingOutboxCardProps> = ({
  items,
  isSyncing,
  onSyncAll,
  onRemoveItem,
  onClearAll,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="p-4 bg-zinc-900/70 border border-amber-500/30 backdrop-blur-xl rounded-3xl space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
          <Clock className="w-4 h-4" />
          <span>Offline Outbox ({items.length} Pending)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            Sync Now
          </button>
          <button
            onClick={onClearAll}
            className="p-1 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
            title="Clear all pending"
            aria-label="Clear all pending items"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs"
          >
            <div className="min-w-0 flex-1">
              <p className="text-zinc-200 truncate font-mono text-[11px]">{item.url}</p>
              <span className="text-[10px] text-zinc-500">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <button
              onClick={() => onRemoveItem(item.id)}
              className="p-1 text-zinc-500 hover:text-red-400 rounded-md transition-colors"
              aria-label="Remove item"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
