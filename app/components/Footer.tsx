"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface FooterProps {
  appVersion?: string;
  ytDlpVersion?: string | null;
  ffmpegVersion?: string | null;
  onOpenSettings?: (tab: string) => void;
  hasToolUpdate?: boolean;
}

export function Footer({
  appVersion,
  onOpenSettings,
  hasToolUpdate = false,
}: FooterProps) {
  const handleToolClick = () => onOpenSettings?.("updates");

  const handleOpenWeb = async () => {
    const webUrl = "https://downlink-web.vercel.app";
    try {
      await invoke("open_url", { url: webUrl });
    } catch {
      window.open(webUrl, "_blank");
    }
  };

  return (
    <footer className="flex items-center justify-between bg-transparent px-4 py-2 pb-3 select-none">
      {/* Left: App Branding & Release Version (Clickable to Home Page) */}
      <button
        type="button"
        onClick={handleOpenWeb}
        title="Visit Downlink Website (https://downlink-web.vercel.app)"
        className="group flex items-center gap-2 rounded-lg px-1.5 py-1 -ml-1.5 hover:bg-zinc-800/60 active:scale-[0.98] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
      >
        <Image
          src="/downlink-square.png"
          alt="Downlink"
          width={14}
          height={14}
          className="rounded opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all"
        />
        <span className="text-[11px] font-medium text-zinc-500 group-hover:text-zinc-300 tracking-tight transition-colors flex items-center gap-1">
          Downlink{appVersion ? ` v${appVersion}` : ""}
          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity text-cyan-400" />
        </span>
      </button>

      {/* Right: Engine Status & Update Shortcut */}
      <div className="flex items-center gap-2">
        {hasToolUpdate ? (
          <button
            type="button"
            onClick={handleToolClick}
            title="Open Preferences → Updates"
            className="group flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/20 transition-all hover:bg-amber-500/20"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Update available</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-70 group-hover:opacity-100" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleToolClick}
            title="Engine ready — View toolchain details in Preferences"
            className="group flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
            <span className="tracking-tight">Engine Ready</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-70 transition-opacity" />
          </button>
        )}
      </div>
    </footer>
  );
}
