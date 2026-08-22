"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

import type { BrowserTarget, DetectedBrowser } from "./browser/types";
import { GatewayStatus } from "./browser/GatewayStatus";
import { OfficialStoreCard } from "./browser/OfficialStoreCard";
import { DetectedBrowserItem } from "./browser/DetectedBrowserItem";
import { ManualGuide } from "./browser/ManualGuide";

export function BrowserTab() {
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserTarget>("chrome");
  const [installedBrowsers, setInstalledBrowsers] = useState<DetectedBrowser[]>([]);
  const [loadingBrowsers, setLoadingBrowsers] = useState(true);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [activeHintBrowserId, setActiveHintBrowserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    async function loadBrowsers() {
      try {
        const detected = await invoke<DetectedBrowser[]>("detect_installed_browsers");
        setInstalledBrowsers(detected || []);
      } catch (err) {
        console.error("Failed to detect installed browsers:", err);
      } finally {
        setLoadingBrowsers(false);
      }
    }
    loadBrowsers();
  }, []);

  const handle1ClickInstall = async (browser: DetectedBrowser) => {
    setInstallingId(browser.id);
    try {
      await invoke("launch_browser_extension_installer", {
        browserId: browser.id,
      });
      setActiveHintBrowserId(browser.id);
    } catch (err) {
      console.error("Failed to launch extension installer:", err);
    } finally {
      setInstallingId(null);
    }
  };

  const handleCopyPath = async () => {
    try {
      let fullPath = `extensions/${selectedBrowser}`;
      try {
        fullPath = await invoke<string>("get_extension_folder_path", {
          browser: selectedBrowser,
        });
      } catch {
        // fallback
      }
      await navigator.clipboard.writeText(fullPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  };

  const handleRevealInFinder = async () => {
    try {
      let targetPath = `extensions/${selectedBrowser}`;
      try {
        targetPath = await invoke<string>("get_extension_folder_path", {
          browser: selectedBrowser,
        });
      } catch {
        // fallback
      }
      await invoke("open_folder", { path: targetPath });
      setRevealed(true);
      setTimeout(() => setRevealed(false), 2000);
    } catch (e) {
      console.error("Failed to open extension folder:", e);
    }
  };

  const handleOpenStore = async (url: string) => {
    try {
      await invoke("open_url", { url });
    } catch {
      window.open(url, "_blank");
    }
  };

  const activeInstalled = installedBrowsers.filter((b) => b.is_installed);

  return (
    <div className="space-y-4">
      {/* 1. Loopback Gateway RPC Card */}
      <GatewayStatus />

      {/* 2. Official Stores (Permanent signed installs) */}
      <OfficialStoreCard onOpenStore={handleOpenStore} />

      {/* 3. Detected Browsers on System */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold text-zinc-100">
              Installed Browsers
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            {loadingBrowsers ? "Scanning..." : `${activeInstalled.length} Detected`}
          </span>
        </div>

        {loadingBrowsers ? (
          <div className="flex items-center justify-center py-6 text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-400" />
            <span className="text-xs">Discovering installed browsers...</span>
          </div>
        ) : activeInstalled.length === 0 ? (
          <p className="py-2 text-[11px] text-zinc-400 text-center">
            No browsers automatically detected in standard directories. Use manual setup below.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.06] bg-black/20 overflow-hidden">
            {activeInstalled.map((browser) => (
              <DetectedBrowserItem
                key={browser.id}
                browser={browser}
                isInstalling={installingId === browser.id}
                isHintActive={activeHintBrowserId === browser.id}
                onInstall={handle1ClickInstall}
              />
            ))}
          </div>
        )}
      </div>

      {/* 4. Manual / Developer Installation Guide */}
      <ManualGuide
        selectedBrowser={selectedBrowser}
        onSelectBrowser={setSelectedBrowser}
        onRevealFolder={handleRevealInFinder}
        onCopyPath={handleCopyPath}
        copied={copied}
        revealed={revealed}
      />

      {/* 5. Feature summary badges */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5">
          <div className="flex items-center gap-1.5 text-blue-400">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium text-zinc-200">1-Click Video Pill</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400 leading-relaxed">
            Floating download button automatically attached to web video players.
          </p>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium text-zinc-200">Cookie Forwarding</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400 leading-relaxed">
            Passes active session cookies to prevent 403 Forbidden on protected streams.
          </p>
        </div>
      </div>
    </div>
  );
}
