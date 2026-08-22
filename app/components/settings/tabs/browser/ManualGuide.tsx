"use client";

import { Check, Copy, FolderOpen, Puzzle } from "lucide-react";
import type { BrowserTarget } from "./types";

interface ManualGuideProps {
  selectedBrowser: BrowserTarget;
  onSelectBrowser: (browser: BrowserTarget) => void;
  onRevealFolder: () => void;
  onCopyPath: () => void;
  copied: boolean;
  revealed: boolean;
}

export function ManualGuide({
  selectedBrowser,
  onSelectBrowser,
  onRevealFolder,
  onCopyPath,
  copied,
  revealed,
}: ManualGuideProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Puzzle className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-200">
            Manual Installation &amp; Developer Mode
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRevealFolder}
            title="Open extension directory in file manager"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-all hover:bg-white/[0.1] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            <FolderOpen className="h-3.5 w-3.5 text-blue-400" />
            <span>{revealed ? "Revealed!" : "Reveal in Folder"}</span>
          </button>

          <button
            type="button"
            onClick={onCopyPath}
            title="Copy path to clipboard"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-all hover:bg-white/[0.1] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Path Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Path</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Segmented Switcher */}
      <div className="flex rounded-lg border border-white/10 bg-black/40 p-0.5">
        <button
          type="button"
          onClick={() => onSelectBrowser("chrome")}
          className={`flex-1 rounded-md py-1 text-center text-xs font-medium transition-all ${
            selectedBrowser === "chrome"
              ? "bg-white/10 text-white shadow-sm font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Chromium (Chrome, Brave, Edge)
        </button>
        <button
          type="button"
          onClick={() => onSelectBrowser("firefox")}
          className={`flex-1 rounded-md py-1 text-center text-xs font-medium transition-all ${
            selectedBrowser === "firefox"
              ? "bg-white/10 text-white shadow-sm font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Firefox &amp; Zen
        </button>
        <button
          type="button"
          onClick={() => onSelectBrowser("safari")}
          className={`flex-1 rounded-md py-1 text-center text-xs font-medium transition-all ${
            selectedBrowser === "safari"
              ? "bg-white/10 text-white shadow-sm font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Safari
        </button>
      </div>

      {/* Step Instructions */}
      <div className="rounded-lg bg-black/30 border border-white/[0.06] p-3 text-[11px] text-zinc-300 font-normal leading-relaxed">
        {selectedBrowser === "chrome" && (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>
              Navigate to <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300 font-mono text-[10.5px]">chrome://extensions</code> (or <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300 font-mono text-[10.5px]">edge://extensions</code>).
            </li>
            <li>
              Toggle on <strong className="text-white font-medium">Developer mode</strong> in the top-right corner.
            </li>
            <li>
              Click <strong className="text-white font-medium">Load unpacked</strong> and select the revealed <code className="rounded bg-white/10 px-1.5 py-0.5 text-emerald-400 font-mono text-[10.5px]">extensions/chrome</code> folder.
            </li>
            <li>
              The Downlink icon will appear in your browser toolbar ready for 1-click video downloads.
            </li>
          </ol>
        )}

        {selectedBrowser === "firefox" && (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>
              Open <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300 font-mono text-[10.5px]">about:debugging#/runtime/this-firefox</code> in Firefox or Zen Browser.
            </li>
            <li>
              Click the <strong className="text-white font-medium">&quot;Load Temporary Add-on...&quot;</strong> button.
            </li>
            <li>
              Select the <code className="rounded bg-white/10 px-1.5 py-0.5 text-emerald-400 font-mono text-[10.5px]">manifest.json</code> file inside the revealed extension directory.
            </li>
            <li>
              The extension will instantly load and connect to your local Downlink gateway.
            </li>
          </ol>
        )}

        {selectedBrowser === "safari" && (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>
              In Safari, open <strong className="text-white font-medium">Settings &gt; Advanced</strong> &rarr; enable <strong className="text-white font-medium">&quot;Show features for web developers&quot;</strong>.
            </li>
            <li>
              In the top menu bar, select <strong className="text-white font-medium">Develop &gt; Allow Unsigned Extensions</strong>.
            </li>
            <li>
              Load the extension bundle from the revealed <code className="rounded bg-white/10 px-1.5 py-0.5 text-emerald-400 font-mono text-[10.5px]">extensions/safari</code> folder.
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
