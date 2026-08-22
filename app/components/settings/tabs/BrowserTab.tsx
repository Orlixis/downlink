"use client";

import { useEffect, useState } from "react";
import { Check, Chrome, Compass, Copy, FolderOpen, Globe, Info, Loader2, Play, Puzzle, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

type BrowserTarget = "chrome" | "firefox" | "safari";

interface DetectedBrowser {
  id: string;
  name: string;
  is_installed: boolean;
  is_default: boolean;
  extension_type: string;
  app_path?: string;
}

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

  const extensionSubpaths: Record<BrowserTarget, string> = {
    chrome: "extensions/chrome",
    firefox: "extensions/firefox",
    safari: "extensions/safari",
  };

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
      let fullPath = extensionSubpaths[selectedBrowser];
      try {
        fullPath = await invoke<string>("get_extension_folder_path", {
          browser: selectedBrowser,
        });
      } catch {
        // fallback to relative subpath
      }
      await navigator.clipboard.writeText(fullPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleRevealInFinder = async () => {
    try {
      let targetPath = extensionSubpaths[selectedBrowser];
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

  const activeInstalled = installedBrowsers.filter((b) => b.is_installed);

  return (
    <div className="space-y-4">
      {/* Gateway RPC Status Card */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-400">Local RPC Gateway Active</div>
              <div className="text-[10px] text-zinc-400">Listening on http://127.0.0.1:3984</div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            Port 3984 Ready
          </span>
        </div>
      </div>

      {/* 1-Click Browser Auto-Installer Section */}
      <div className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-sky-500/5 to-transparent p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-semibold text-white">Detected Browsers on Your System</span>
          </div>
          <span className="text-[10px] text-zinc-400">
            {activeInstalled.length} Installed
          </span>
        </div>

        {loadingBrowsers ? (
          <div className="flex items-center justify-center py-4 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-xs">Scanning installed browsers &amp; default handler...</span>
          </div>
        ) : activeInstalled.length === 0 ? (
          <p className="text-[11px] text-zinc-400">
            No supported browsers automatically detected in standard directories. Use manual load below.
          </p>
        ) : (
          <div className="space-y-2">
            {activeInstalled.map((browser) => {
              const isInstalling = installingId === browser.id;
              const isHintActive = activeHintBrowserId === browser.id;

              return (
                <div key={browser.id} className="space-y-1.5">
                  <div
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-all ${
                      browser.is_default
                        ? "border-emerald-500/30 bg-emerald-950/20 shadow-sm"
                        : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 border border-white/10">
                        {getBrowserIcon(browser.id)}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                          {browser.name}
                          {browser.is_default && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400">
                              <Star className="h-2.5 w-2.5 fill-current" />
                              Default Browser
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 capitalize">
                          {browser.extension_type === "chrome" ? "Chromium Engine" : `${browser.extension_type} Engine`}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handle1ClickInstall(browser)}
                      disabled={isInstalling}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        isHintActive
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                          : browser.is_default
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 hover:text-white shadow-sm"
                          : "bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-500/30 hover:text-white shadow-sm"
                      }`}
                    >
                      {isInstalling ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Launching...</span>
                        </>
                      ) : isHintActive ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span>Opened &amp; Path Copied!</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 fill-current" />
                          <span>1-Click Install</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Dynamic Post-Click Step Guidance */}
                  {isHintActive && (
                    <div className="rounded-lg border border-sky-500/20 bg-sky-950/20 p-2.5 text-[11px] text-sky-200 space-y-1 animate-in fade-in slide-in-from-top-1">
                      <div className="font-semibold flex items-center gap-1.5 text-sky-300">
                        <Info className="h-3.5 w-3.5" />
                        Next step in {browser.name}:
                      </div>
                      {browser.id === "zen" && (
                        <p className="text-[10.5px] leading-relaxed text-zinc-300">
                          1. Click <strong className="text-white">&quot;This Zen&quot;</strong> on the left sidebar &rarr; 2. Click <strong className="text-white">&quot;Load Temporary Add-on...&quot;</strong> &rarr; 3. Press <kbd className="rounded bg-black/50 px-1 py-0.5 font-mono text-[10px] text-sky-300">Cmd+Shift+G</kbd>, then <kbd className="rounded bg-black/50 px-1 py-0.5 font-mono text-[10px] text-sky-300">Cmd+V</kbd> (manifest.json path is already on your clipboard) &amp; hit Enter!
                        </p>
                      )}
                      {browser.id === "firefox" && (
                        <p className="text-[10.5px] leading-relaxed text-zinc-300">
                          1. Click <strong className="text-white">&quot;This Firefox&quot;</strong> on the left sidebar &rarr; 2. Click <strong className="text-white">&quot;Load Temporary Add-on...&quot;</strong> &rarr; 3. Press <kbd className="rounded bg-black/50 px-1 py-0.5 font-mono text-[10px] text-sky-300">Cmd+Shift+G</kbd>, then <kbd className="rounded bg-black/50 px-1 py-0.5 font-mono text-[10px] text-sky-300">Cmd+V</kbd> &amp; hit Enter!
                        </p>
                      )}
                      {browser.extension_type === "chrome" && (
                        <p className="text-[10.5px] leading-relaxed text-zinc-300">
                          1. Make sure <strong className="text-white">Developer mode</strong> is ON (top-right) &rarr; 2. Click <strong className="text-white">&quot;Load unpacked&quot;</strong> &rarr; 3. Select the opened folder in Finder (or press <kbd className="rounded bg-black/50 px-1 py-0.5 font-mono text-[10px] text-sky-300">Cmd+Shift+G</kbd> &rarr; <kbd className="rounded bg-black/50 px-1 py-0.5 font-mono text-[10px] text-sky-300">Cmd+V</kbd>).
                        </p>
                      )}
                      {browser.id === "safari" && (
                        <p className="text-[10.5px] leading-relaxed text-zinc-300">
                          1. In Safari, press <kbd className="rounded bg-black/50 px-1 py-0.5 font-mono text-[10px] text-sky-300">Cmd+,</kbd> (Settings) &gt; <strong className="text-white">Advanced</strong> &gt; Check <strong className="text-white">&quot;Show features for web developers&quot;</strong> &rarr; 2. Top menu: <strong className="text-white">Develop &gt; Allow Unsigned Extensions</strong>.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] leading-relaxed text-zinc-400 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
          <span>Clicking <strong className="text-zinc-300">1-Click Install</strong> automatically launches the browser to its Extension Manager, reveals the extension folder in Finder, and copies the path to your clipboard for instant loading.</span>
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
          <div className="flex items-center gap-1.5 text-sky-400">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">1-Click Video Pill</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400">
            Floating download button automatically attached to web video players.
          </p>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
          <div className="flex items-center gap-1.5 text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">Cookie Forwarding</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400">
            Passes active session cookies to prevent 403 Forbidden on protected media.
          </p>
        </div>
      </div>

      {/* Manual Step-by-Step Tabs */}
      <div className="flex rounded-lg border border-white/10 bg-black/40 p-1">
        <button
          type="button"
          onClick={() => setSelectedBrowser("chrome")}
          className={`flex-1 rounded-md py-1.5 text-center text-xs font-medium transition-all ${
            selectedBrowser === "chrome"
              ? "bg-white/10 text-white shadow-sm font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Chrome / Brave / Edge
        </button>
        <button
          type="button"
          onClick={() => setSelectedBrowser("firefox")}
          className={`flex-1 rounded-md py-1.5 text-center text-xs font-medium transition-all ${
            selectedBrowser === "firefox"
              ? "bg-white/10 text-white shadow-sm font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Firefox &amp; Zen
        </button>
        <button
          type="button"
          onClick={() => setSelectedBrowser("safari")}
          className={`flex-1 rounded-md py-1.5 text-center text-xs font-medium transition-all ${
            selectedBrowser === "safari"
              ? "bg-white/10 text-white shadow-sm font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Safari
        </button>
      </div>

      {/* Manual Installation Instructions by Browser */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Puzzle className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-semibold text-zinc-200">
              {selectedBrowser === "chrome" && "Chrome, Brave, Edge & Opera Manual Setup"}
              {selectedBrowser === "firefox" && "Mozilla Firefox, Zen & Librewolf Manual Setup"}
              {selectedBrowser === "safari" && "Apple Safari (macOS) Manual Setup"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRevealInFinder}
              title="Reveal folder in Finder / File Explorer"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <FolderOpen className="h-3 w-3 text-sky-400" />
              <span>{revealed ? "Revealed!" : "Reveal in Finder"}</span>
            </button>
            <button
              onClick={handleCopyPath}
              title="Copy folder path to clipboard"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Path Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy Path</span>
                </>
              )}
            </button>
          </div>
        </div>

        {selectedBrowser === "chrome" && (
          <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-zinc-300 font-normal leading-relaxed">
            <li>Open your browser and navigate to <code className="rounded bg-black/50 px-1.5 py-0.5 text-sky-300 font-mono text-[10.5px]">chrome://extensions</code> (or <code className="rounded bg-black/50 px-1.5 py-0.5 text-sky-300 font-mono text-[10.5px]">edge://extensions</code>).</li>
            <li>Turn on the <strong className="text-white font-medium">Developer mode</strong> toggle in the top-right corner.</li>
            <li>Click <strong className="text-white font-medium">Load unpacked</strong> and select the <code className="rounded bg-black/50 px-1.5 py-0.5 text-emerald-400 font-mono text-[10.5px]">extensions/chrome</code> folder (or click <em>Reveal in Finder</em> above).</li>
            <li>The <strong className="text-white font-medium">Downlink Companion</strong> icon will appear in your toolbar! Pin it for quick 1-click downloads.</li>
          </ol>
        )}

        {selectedBrowser === "firefox" && (
          <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-zinc-300 font-normal leading-relaxed">
            <li>In Firefox or Zen Browser, open <code className="rounded bg-black/50 px-1.5 py-0.5 text-sky-300 font-mono text-[10.5px]">about:debugging</code> and click <strong className="text-white font-medium">&quot;This Firefox / This Zen&quot;</strong> on the left.</li>
            <li>Click the <strong className="text-white font-medium">&quot;Load Temporary Add-on...&quot;</strong> button.</li>
            <li>Select the <code className="rounded bg-black/50 px-1.5 py-0.5 text-emerald-400 font-mono text-[10.5px]">extensions/firefox/manifest.json</code> file.</li>
            <li>Downlink Companion will immediately activate and show in your Firefox/Zen toolbar.</li>
          </ol>
        )}

        {selectedBrowser === "safari" && (
          <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-zinc-300 font-normal leading-relaxed">
            <li>In Safari, open <strong className="text-white font-medium">Settings &gt; Advanced</strong> and check <strong className="text-white font-medium">&quot;Show features for web developers&quot;</strong>.</li>
            <li>Under the top menu bar, click <strong className="text-white font-medium">Develop &gt; Allow Unsigned Extensions</strong>.</li>
            <li>Load the extension from the <code className="rounded bg-black/50 px-1.5 py-0.5 text-emerald-400 font-mono text-[10.5px]">extensions/safari</code> folder.</li>
          </ol>
        )}
      </div>
    </div>
  );
}
