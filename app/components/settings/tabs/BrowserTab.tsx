"use client";

import { useEffect, useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

import type { BrowserTarget, DetectedBrowser } from "./browser/types";
import { GatewayStatus } from "./browser/GatewayStatus";
import { DetectedBrowserItem } from "./browser/DetectedBrowserItem";
import { DeveloperOptions } from "./browser/DeveloperOptions";

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

  const activeInstalled = installedBrowsers.filter((b) => b.is_installed);

  return (
    <div className="space-y-4">
      {/* 1. Compact Gateway RPC Status */}
      <GatewayStatus />

      {/* 2. Primary Detected Browsers List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-zinc-300">
            Detected Browsers
          </label>
          <span className="text-[11px] text-zinc-400 font-mono">
            {loadingBrowsers ? "Scanning..." : `${activeInstalled.length} Installed`}
          </span>
        </div>

        {loadingBrowsers ? (
          <div className="flex items-center justify-center py-8 text-zinc-400 rounded-xl border border-zinc-800 bg-zinc-900/30">
            <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-400" />
            <span className="text-xs">Detecting installed browsers...</span>
          </div>
        ) : activeInstalled.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-center text-xs text-zinc-400">
            No supported browsers automatically detected. Use developer load below.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
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

      {/* 3. Sleek Collapsible Developer & Offline Options */}
      <DeveloperOptions
        selectedBrowser={selectedBrowser}
        onSelectBrowser={setSelectedBrowser}
        onRevealFolder={handleRevealInFinder}
        onCopyPath={handleCopyPath}
        copied={copied}
        revealed={revealed}
      />
    </div>
  );
}
