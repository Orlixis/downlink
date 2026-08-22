"use client";

import { Check, Chrome, Compass, Globe, Info, Loader2, Play, Sparkles, Star } from "lucide-react";
import type { DetectedBrowser } from "./types";

interface DetectedBrowserItemProps {
  browser: DetectedBrowser;
  isInstalling: boolean;
  isHintActive: boolean;
  onInstall: (browser: DetectedBrowser) => void;
}

export function DetectedBrowserItem({
  browser,
  isInstalling,
  isHintActive,
  onInstall,
}: DetectedBrowserItemProps) {
  const getBrowserIcon = (id: string) => {
    switch (id) {
      case "chrome":
      case "brave":
      case "edge":
      case "arc":
      case "opera":
      case "vivaldi":
        return <Chrome className="h-4 w-4 text-sky-400" />;
      case "firefox":
        return <Globe className="h-4 w-4 text-amber-400" />;
      case "zen":
        return <Sparkles className="h-4 w-4 text-purple-400" />;
      case "safari":
        return <Compass className="h-4 w-4 text-blue-400" />;
      default:
        return <Globe className="h-4 w-4 text-zinc-400" />;
    }
  };

  const isFirefoxFamily = browser.id === "firefox" || browser.id === "zen";

  return (
    <div className="space-y-2 p-3 transition-colors hover:bg-white/[0.02]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-white/10 shadow-inner">
            {getBrowserIcon(browser.id)}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
              {browser.name}
              {browser.is_default && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-semibold text-blue-400 border border-blue-500/20">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Default
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              {isFirefoxFamily
                ? "Official Mozilla Add-on Engine"
                : browser.extension_type === "safari"
                ? "WebKit WebExtension Engine"
                : "Chromium WebExtension Engine"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onInstall(browser)}
          disabled={isInstalling}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
            isHintActive
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : browser.is_default
              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20"
              : "bg-white/[0.08] hover:bg-white/[0.12] text-zinc-200 border border-white/10"
          }`}
        >
          {isInstalling ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-zinc-300" />
              <span>Launching...</span>
            </>
          ) : isHintActive ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span>Ready in Browser</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current opacity-80" />
              <span>{isFirefoxFamily ? "Install Add-on" : "1-Click Setup"}</span>
            </>
          )}
        </button>
      </div>

      {isHintActive && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-950/20 p-2.5 text-[11px] text-blue-200/90 space-y-1 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-1.5 font-semibold text-blue-300">
            <Info className="h-3.5 w-3.5" />
            Next step in {browser.name}:
          </div>
          {isFirefoxFamily ? (
            <p className="text-[11px] leading-relaxed text-zinc-300">
              Click <strong className="text-white">&quot;Add to Firefox&quot;</strong> on the opened Mozilla Add-ons store page to permanently activate the extension!
            </p>
          ) : browser.extension_type === "chrome" ? (
            <p className="text-[11px] leading-relaxed text-zinc-300">
              1. Enable <strong className="text-white">Developer mode</strong> (top-right) &rarr; 2. Click <strong className="text-white">&quot;Load unpacked&quot;</strong> &rarr; 3. Select the opened folder in your file manager (path copied to clipboard).
            </p>
          ) : (
            <p className="text-[11px] leading-relaxed text-zinc-300">
              In Safari &rarr; Settings &gt; Advanced &gt; Enable <strong className="text-white">&quot;Show features for web developers&quot;</strong> &rarr; Menu &gt; Develop &gt; <strong className="text-white">Allow Unsigned Extensions</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
