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
  const lastRawTextRef = useRef<string>("");
  const isCheckingRef = useRef(false);

  const checkClipboard = useCallback(async () => {
    if (!isTauri || typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
      const text = await readText();
      const trimmed = (text || "").trim();

      if (!trimmed) {
        lastRawTextRef.current = "";
        isCheckingRef.current = false;
        return;
      }

      // If user copied a new / different text in the OS
      if (trimmed !== lastRawTextRef.current) {
        lastRawTextRef.current = trimmed;

        const normalized = normalizeBareUrls(trimmed);
        const match = normalized.match(/https?:\/\/[^\s]+/);
        if (match) {
          const detected = match[0];
          // User freshly copied this URL — reset dismissal for this URL
          dismissedUrlsRef.current.delete(detected);
          setClipboardUrl(detected);
          onUrlDetected?.(detected);
        } else {
          setClipboardUrl(null);
        }
      } else {
        // Same text as last check: check if it's a URL that wasn't dismissed
        const normalized = normalizeBareUrls(trimmed);
        const match = normalized.match(/https?:\/\/[^\s]+/);
        if (match) {
          const detected = match[0];
          if (!dismissedUrlsRef.current.has(detected) && clipboardUrl !== detected) {
            setClipboardUrl(detected);
          }
        }
      }
    } catch {
      // Ignore clipboard read errors
    } finally {
      isCheckingRef.current = false;
    }
  }, [isTauri, onUrlDetected, clipboardUrl]);

  useEffect(() => {
    let tauriUnlisten: (() => void) | undefined;

    const setup = async () => {
      if (isTauri && typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        try {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          const appWindow = getCurrentWindow();
          const unlisten = await appWindow.onFocusChanged(({ payload: focused }) => {
            if (focused) {
              setTimeout(checkClipboard, 50);
            }
          });
          tauriUnlisten = unlisten;
        } catch {
          // Fallback to DOM events
        }
      }
    };

    setup();

    let lastMoveCheck = 0;
    const handlePointerMove = () => {
      const now = Date.now();
      if (now - lastMoveCheck > 300) {
        lastMoveCheck = now;
        checkClipboard();
      }
    };

    const handleMouseEnter = () => setTimeout(checkClipboard, 50);
    const handleFocus = () => setTimeout(checkClipboard, 50);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") setTimeout(checkClipboard, 50);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    document.documentElement.addEventListener("mouseenter", handleMouseEnter);
    document.documentElement.addEventListener("pointerenter", handleMouseEnter);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // Periodic heartbeat check every 700ms when window is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        checkClipboard();
      }
    }, 700);

    return () => {
      tauriUnlisten?.();
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.documentElement.removeEventListener("mouseenter", handleMouseEnter);
      document.documentElement.removeEventListener("pointerenter", handleMouseEnter);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [checkClipboard, isTauri]);

  const dismiss = async (url: string, clearSystemClipboard: boolean = false) => {
    dismissedUrlsRef.current.add(url);
    if (clipboardUrl === url) {
      setClipboardUrl(null);
    }

    if (clearSystemClipboard && isTauri && typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      try {
        const { clear } = await import("@tauri-apps/plugin-clipboard-manager");
        await clear();
        lastRawTextRef.current = "";
      } catch {
        // Ignore clipboard clear errors
      }
    }
  };

  return {
    clipboardUrl,
    dismissClipboardUrl: dismiss,
    checkClipboard,
  };
}
