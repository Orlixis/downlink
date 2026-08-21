"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { QueueItem } from "@/app/types";

interface DownloadItemDiagnosticsProps {
  item: QueueItem;
}

export function DownloadItemDiagnostics({ item }: DownloadItemDiagnosticsProps) {
  const [copiedReport, setCopiedReport] = useState(false);

  if (!item.error_message) return null;

  const lower = item.error_message.toLowerCase();
  let tip: string | null = null;
  if (
    lower.includes("login") ||
    lower.includes("sign in") ||
    lower.includes("bot") ||
    lower.includes("cookie")
  ) {
    tip =
      "Authentication required. You may need to import cookies or authenticate in Preferences → Network.";
  } else if (
    lower.includes("geo") ||
    lower.includes("country") ||
    lower.includes("location") ||
    lower.includes("not available in your")
  ) {
    tip =
      "This video is restricted in your region. Configure a proxy in Preferences → Network.";
  } else if (
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit")
  ) {
    tip =
      "Provider rate limit reached. Please wait a few minutes before retrying.";
  } else if (lower.includes("private") || lower.includes("permission")) {
    tip = "This video is marked private or restricted by the author.";
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const report = [
      `=== Downlink Diagnostic Report ===`,
      `Item ID: ${item.id}`,
      `Title: ${item.title || "Unknown"}`,
      `URL: ${item.source_url || "N/A"}`,
      `Status: ${item.status}`,
      `Phase: ${item.phase || "N/A"}`,
      `Error Message: ${item.error_message || "N/A"}`,
      `Timestamp: ${new Date().toISOString()}`,
      `==================================`,
    ].join("\n");

    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
        await writeText(report);
      } else {
        await navigator.clipboard.writeText(report);
      }
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (err) {
      console.error("Failed to copy log:", err);
    }
  };

  return (
    <div className="mt-2 rounded-xl bg-red-950/40 p-2.5 ring-1 ring-red-500/20 animate-fade-in space-y-2">
      {tip && (
        <div className="flex items-start gap-1.5 text-[10px] text-amber-300/90 bg-amber-500/10 p-2 rounded-lg ring-1 ring-amber-500/15">
          <span className="shrink-0">💡</span>
          <span>{tip}</span>
        </div>
      )}

      <p className="text-[10px] leading-relaxed font-mono text-red-300/90 break-words bg-black/40 p-2 rounded-lg select-text">
        {item.error_message}
      </p>

      <div className="flex items-center justify-between pt-0.5">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-800/80 hover:bg-zinc-700/80 px-2 py-1 rounded-md"
        >
          {copiedReport ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied Report</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy Diagnostics</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
