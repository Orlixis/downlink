"use client";

import { useState, useEffect, useRef } from "react";
import { X, Folder, Link as LinkIcon, RefreshCw } from "lucide-react";
import type { QueueItem } from "@/app/types";
import { useModalAnimation } from "@/app/hooks/useModalAnimation";

interface EditTaskModalProps {
  isOpen: boolean;
  item: QueueItem | null;
  onClose: () => void;
  onSave: (options: {
    id: string;
    source_url: string;
    title?: string | null;
    output_dir: string;
    referer_url?: string | null;
    preset_id: string;
    startImmediately?: boolean;
  }) => Promise<void>;
}

export function EditTaskModal({
  isOpen,
  item,
  onClose,
  onSave,
}: EditTaskModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [referer, setReferer] = useState("");
  const [presetId, setPresetId] = useState("best");
  const [startImmediately, setStartImmediately] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { renderState } = useModalAnimation({
    isOpen,
    onClose,
    backdropRef,
    modalRef,
    contentRef,
    targetId: item ? `download-item-${item.id}` : "download-item-edit",
  });

  useEffect(() => {
    if (item) {
      setUrl(item.source_url || "");
      setTitle(item.title || "");
      setOutputDir(item.output_dir || "");
      setPresetId(item.preset_id || "best");
      setReferer("");
      setStartImmediately(true);
    }
  }, [item]);

  if (!renderState || !item) return null;

  const handlePickDirectory = async () => {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          directory: true,
          multiple: false,
          defaultPath: outputDir || undefined,
        });
        if (selected && typeof selected === "string") {
          setOutputDir(selected);
        }
      }
    } catch (err) {
      console.error("Failed to select folder:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        id: item.id,
        source_url: url.trim(),
        title: title.trim() || null,
        output_dir: outputDir.trim(),
        referer_url: referer.trim() || null,
        preset_id: presetId,
        startImmediately,
      });
      onClose();
    } catch (err) {
      console.error("Failed to update task:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fullscreen Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
      />

      {/* Centered Modal Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-zinc-900/90 p-5 shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl animate-fade-in"
      >
        <div ref={contentRef} className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <h3
                  id="edit-task-title"
                  className="text-sm font-semibold text-zinc-100 tracking-tight"
                >
                  Edit Download Task
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Update stream URL, target location, or HTTP headers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Stream / Download URL */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Download URL / Stream Token
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  required
                  className="w-full rounded-xl bg-white/[0.04] px-3 py-2 pl-8 text-xs font-mono text-zinc-200 placeholder-zinc-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              </div>
              <p className="mt-1 text-[10px] text-zinc-500">
                Replace expired signed URLs to seamlessly resume without losing progress.
              </p>
            </div>

            {/* Custom Rename / Title */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Custom Name / Rename
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave blank to use original title"
                className="w-full rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Save Directory */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Save Destination
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                  className="flex-1 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={handlePickDirectory}
                  className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors ring-1 ring-white/10"
                >
                  <Folder className="h-3.5 w-3.5" />
                  Browse
                </button>
              </div>
            </div>

            {/* HTTP Referer */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Custom Referer Header (Optional)
              </label>
              <input
                type="text"
                value={referer}
                onChange={(e) => setReferer(e.target.value)}
                placeholder="https://example.com/video-page"
                className="w-full rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Start Option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={startImmediately}
                  onChange={(e) => setStartImmediately(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-xs text-zinc-300">
                  Resume / start download immediately
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !url.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-1.5 text-xs font-medium text-white shadow-lg shadow-blue-500/20 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <span>Apply Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
