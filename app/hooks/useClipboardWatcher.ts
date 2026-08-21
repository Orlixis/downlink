"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { normalizeBareUrls } from "@/app/types";

interface UseClipboardWatcherOptions {
  isTauri: boolean;
  onUrlDetected?: (url: string) => void;
}

export function useClipboardWatcher({
  isTauri,
  onUrlDetected,
}: UseClipboardWatcherOptions) {
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const dismissedUrlsRef = useRef<Set<string>>(new Set());

  const checkClipboard = useCallback(async () => {
    if (!isTauri || typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    try {
      const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
      const text = await readText();
      if (!text) return;

      const normalized = normalizeBareUrls(text.trim());
      const match = normalized.match(/https?:\/\/[^\s]+/);
      if (match) {
        const detected = match[0];
        if (!dismissedUrlsRef.current.has(detected)) {
          setClipboardUrl(detected);
          onUrlDetected?.(detected);
        }
      }
    } catch {
      // Ignore clipboard read errors
    }
  }, [isTauri, onUrlDetected]);

  useEffect(() => {
    window.addEventListener("focus", checkClipboard);
    return () => window.removeEventListener("focus", checkClipboard);
  }, [checkClipboard]);

  const dismiss = (url: string) => {
    dismissedUrlsRef.current.add(url);
    if (clipboardUrl === url) {
      setClipboardUrl(null);
    }
  };

  return {
    clipboardUrl,
    dismissClipboardUrl: dismiss,
    checkClipboard,
  };
}
