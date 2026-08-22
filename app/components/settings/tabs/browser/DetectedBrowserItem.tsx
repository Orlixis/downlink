"use client";

import { Check, Chrome, Compass, ExternalLink, Globe, Loader2, Sparkles, Star } from "lucide-react";
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

  const isFirefox = browser.id === "firefox" || browser.id === "zen";

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 transition-colors hover:bg-zinc-800/40">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700/60 shadow-inner">
          {getBrowserIcon(browser.id)}
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
            {browser.name}
            {browser.is_default && (
              <span className="inline-flex items-center gap-0.5 rounded bg-blue-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-blue-400 border border-blue-500/20">
                <Star className="h-2 w-2 fill-current" />
                Default
              </span>
            )}
          </div>
          <p className="text-[10.5px] text-zinc-400">
            {isFirefox ? "Official Add-on (AMO)" : browser.id === "safari" ? "WebKit WebExtension" : "Chromium Engine"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isHintActive ? (
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
            <Check className="h-3 w-3" />
            <span>{isFirefox ? "Opened in Store" : "Opened & Copied"}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onInstall(browser)}
            disabled={isInstalling}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-[0.97] px-3 py-1 text-xs font-medium text-zinc-200 border border-zinc-700/60 transition-all"
          >
            {isInstalling ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                <span>Opening...</span>
              </>
            ) : isFirefox ? (
              <>
                <span>Install Add-on</span>
                <ExternalLink className="h-3 w-3 text-zinc-400" />
              </>
            ) : (
              <>
                <span>1-Click Setup</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
