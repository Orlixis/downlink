"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, FolderOpen, Terminal } from "lucide-react";
import type { BrowserTarget } from "./types";

interface DeveloperOptionsProps {
  selectedBrowser: BrowserTarget;
  onSelectBrowser: (browser: BrowserTarget) => void;
  onRevealFolder: () => void;
  onCopyPath: () => void;
  copied: boolean;
  revealed: boolean;
}

export function DeveloperOptions({
  selectedBrowser,
  onSelectBrowser,
  onRevealFolder,
  onCopyPath,
  copied,
  revealed,
}: DeveloperOptionsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          )}
          <Terminal className="h-3.5 w-3.5 text-zinc-400" />
          <span>Manual Load &amp; Developer Files</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRevealFolder}
            title="Open extension directory in file manager"
            className="flex items-center gap-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 active:scale-[0.97] px-2.5 py-1 text-[11px] font-medium text-zinc-300 border border-zinc-700/50 transition-all"
          >
            <FolderOpen className="h-3 w-3 text-blue-400" />
            <span>{revealed ? "Opened" : "Reveal Folder"}</span>
          </button>

          <button
            type="button"
            onClick={onCopyPath}
            title="Copy path to clipboard"
            className="flex items-center gap-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 active:scale-[0.97] px-2.5 py-1 text-[11px] font-medium text-zinc-300 border border-zinc-700/50 transition-all"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-zinc-400" />
                <span>Copy Path</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable step-by-step instructions */}
      {expanded && (
        <div className="border-t border-zinc-800/60 p-3 space-y-2 bg-black/20 animate-in fade-in slide-in-from-top-1">
          <div className="flex rounded-lg border border-zinc-700/40 bg-zinc-900/80 p-0.5">
            <button
              type="button"
              onClick={() => onSelectBrowser("chrome")}
              className={`flex-1 rounded py-0.5 text-[10.5px] font-medium transition-all ${
                selectedBrowser === "chrome"
                  ? "bg-zinc-800 text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Chromium
            </button>
            <button
              type="button"
              onClick={() => onSelectBrowser("firefox")}
              className={`flex-1 rounded py-0.5 text-[10.5px] font-medium transition-all ${
                selectedBrowser === "firefox"
                  ? "bg-zinc-800 text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Firefox &amp; Zen
            </button>
            <button
              type="button"
              onClick={() => onSelectBrowser("safari")}
              className={`flex-1 rounded py-0.5 text-[10.5px] font-medium transition-all ${
                selectedBrowser === "safari"
                  ? "bg-zinc-800 text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Safari
            </button>
          </div>

          <div className="text-[11px] text-zinc-300 leading-relaxed pt-1">
            {selectedBrowser === "chrome" && (
              <p>
                In <code className="text-blue-300">chrome://extensions</code> &rarr; Enable <strong className="text-zinc-100">Developer mode</strong> &rarr; Click <strong className="text-zinc-100">Load unpacked</strong> and select the revealed <code className="text-emerald-400">extensions/chrome</code> folder.
              </p>
            )}
            {selectedBrowser === "firefox" && (
              <p>
                In <code className="text-blue-300">about:debugging</code> &rarr; Click <strong className="text-zinc-100">Load Temporary Add-on</strong> &rarr; Select the revealed <code className="text-emerald-400">extensions/firefox/manifest.json</code>.
              </p>
            )}
            {selectedBrowser === "safari" && (
              <p>
                In Safari &rarr; Settings &gt; Advanced &gt; <strong className="text-zinc-100">Show features for web developers</strong> &rarr; Develop menu &gt; <strong className="text-zinc-100">Allow Unsigned Extensions</strong>.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
