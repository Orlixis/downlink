"use client";

import Image from "next/image";
import { Plus, Settings, Loader2 } from "lucide-react";

interface HeaderBarProps {
  urlInput: string;
  onUrlChange: (value: string) => void;
  onPaste: () => void;
  onSubmit: () => void;
  onSettingsClick: () => void;
  isLoading?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function HeaderBar({
  urlInput,
  onUrlChange,
  onPaste,
  onSubmit,
  onSettingsClick,
  isLoading = false,
  inputRef,
}: HeaderBarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
      {/* Logo */}
      <div className="flex-shrink-0">
        <Image
          src="/downlink-square.png"
          alt="Downlink"
          width={32}
          height={32}
          className="rounded-lg"
          priority
        />
      </div>

      {/* URL Input with integrated paste button */}
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={urlInput}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Paste video URL here..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 pr-12 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />

        {/* Loading spinner or paste button inside input */}
        {isLoading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          </div>
        ) : (
          <button
            onClick={onPaste}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-blue-400 transition-colors p-1 rounded hover:bg-zinc-800/50"
            title="Paste from clipboard (⌘V)"
            type="button"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Settings button */}
      <button
        onClick={onSettingsClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        title="Settings"
        type="button"
      >
        <Settings className="h-5 w-5" />
      </button>
    </div>
  );
}
