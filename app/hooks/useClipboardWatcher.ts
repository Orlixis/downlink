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
    let tauriUnlisten: (() => void) | undefined;

    const setup = async () => {
      if (isTauri && typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        try {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          const appWindow = getCurrentWindow();
          const unlisten = await appWindow.onFocusChanged(({ payload: focused }) => {
            if (focused) {
              setTimeout(checkClipboard, 150);
            }
          });
          tauriUnlisten = unlisten;
        } catch {
          // Fallback to DOM events
        }
      }
    };

    setup();

    const handleMouseEnter = () => setTimeout(checkClipboard, 80);
    const handleFocus = () => setTimeout(checkClipboard, 150);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") setTimeout(checkClipboard, 150);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    document.documentElement.addEventListener("mouseenter", handleMouseEnter);
    document.documentElement.addEventListener("pointerenter", handleMouseEnter);

    return () => {
      tauriUnlisten?.();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.documentElement.removeEventListener("mouseenter", handleMouseEnter);
      document.documentElement.removeEventListener("pointerenter", handleMouseEnter);
    };
  }, [checkClipboard, isTauri]);

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
