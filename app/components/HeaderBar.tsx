"use client";

import Image from "next/image";
import { Settings, Loader2, ClipboardPaste, X, AlertCircle } from "lucide-react";
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
  // Text entered but no valid URLs parsed — warn the user
  const hasInvalidInput = hasInput && urlCount === 0 && !isLoading;

  const internalRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = inputRef ?? internalRef;

  const adjustHeight = useCallback(() => {
    const el = resolvedRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [resolvedRef]);

  useEffect(() => {
    adjustHeight();
  }, [urlInput, adjustHeight]);

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
    <div className="flex flex-col border-b border-zinc-800/80 bg-zinc-950">
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        {/* Logo */}
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
            placeholder="Paste one or more video URLs here…"
            rows={1}
            className={`
              w-full resize-none overflow-hidden rounded-lg border py-2 pl-3 pr-20
              text-sm leading-5 text-white placeholder-zinc-500 outline-none
              transition-[height,border-color,box-shadow] duration-150
              bg-zinc-900
              ${hasInvalidInput
                ? "border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/15"
                : "border-zinc-700/70 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20"
              }
            `}
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

            {/* Invalid URL indicator */}
            {hasInvalidInput && (
              <div
                className="flex h-6 w-6 items-center justify-center text-red-400"
                title="No valid URLs found — paste a full https:// link"
              >
                <AlertCircle className="h-3.5 w-3.5" />
              </div>
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

        {/* Settings button */}
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

      {/* Invalid URL inline hint — appears below the input row */}
      {hasInvalidInput && (
        <div className="flex items-center gap-1.5 px-3 pb-2 animate-fade-in">
          <AlertCircle className="h-3 w-3 flex-shrink-0 text-red-400/70" />
          <p className="text-[11px] text-red-400/70">
            No valid URLs detected — paste a full <span className="font-mono">https://</span> link, or try dropping a URL from your browser.
          </p>
        </div>
      )}
    </div>
  );
}
