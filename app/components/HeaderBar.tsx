"use client";

import Image from "next/image";
import { Settings, Loader2, ClipboardPaste, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface HeaderBarProps {
  urlInput: string;
  onUrlChange: (value: string) => void;
  onPaste: () => void;
  onSubmit: () => void;
  onSettingsClick: () => void;
  isLoading?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Number of valid URLs extracted from the input */
  urlCount?: number;
}

export function HeaderBar({
  urlInput,
  onUrlChange,
  onPaste,
  onSubmit,
  onSettingsClick,
  isLoading = false,
  inputRef,
  urlCount = 0,
}: HeaderBarProps) {
  const hasInput = urlInput.trim().length > 0;

  // Internal ref for auto-resize; merged with the external inputRef via callback
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = inputRef ?? internalRef;

  // Auto-grow the textarea to fit its content (up to ~5 lines / 120 px)
  const adjustHeight = useCallback(() => {
    const el = resolvedRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [resolvedRef]);

  useEffect(() => {
    adjustHeight();
  }, [urlInput, adjustHeight]);

  // Enter = submit, Shift+Enter = newline (for multi-URL paste workflows)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit]
  );

  return (
    <div className="flex items-start gap-2.5 border-b border-zinc-800/80 bg-zinc-950 px-3 py-2.5">
      {/* Logo — aligned to top so it doesn't stretch when textarea grows */}
      <div className="flex-shrink-0 pt-0.5">
        <Image
          src="/downlink-square.png"
          alt="Downlink"
          width={28}
          height={28}
          className="rounded-md"
          priority
        />
      </div>

      {/* Auto-growing textarea */}
      <div className="relative flex-1">
        <textarea
          ref={resolvedRef}
          value={urlInput}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={adjustHeight}
          placeholder={"Paste one or more video URLs here…"}
          rows={1}
          className="w-full resize-none overflow-hidden rounded-lg border border-zinc-700/70 bg-zinc-900 py-2 pl-3 pr-20 text-sm leading-5 text-white placeholder-zinc-500 outline-none transition-[height,border-color,box-shadow] duration-150 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-gramm="false"
          style={{ minHeight: "36px" }}
        />

        {/* Controls pinned to top-right inside textarea */}
        <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
          {/* URL count badge */}
          {urlCount > 1 && (
            <span className="mr-1 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
              {urlCount}
            </span>
          )}

          {/* Clear button */}
          {hasInput && !isLoading && (
            <button
              type="button"
              onClick={() => onUrlChange("")}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              title="Clear input"
              aria-label="Clear URL input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Loading spinner or paste button */}
          {isLoading ? (
            <div className="flex h-6 w-6 items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
            </div>
          ) : (
            <button
              type="button"
              onClick={onPaste}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-blue-400"
              title="Paste from clipboard (⌘V)"
              aria-label="Paste URL from clipboard"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Settings button — aligned to top */}
      <button
        type="button"
        onClick={onSettingsClick}
        className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        title="Settings"
        aria-label="Open settings"
      >
        <Settings className="h-4 w-4" />
      </button>
    </div>
  );
}
