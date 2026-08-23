"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  Smartphone,
  Zap,
  Shield,
  Radio,
  Sparkles,
  Terminal,
  Cpu,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Flame,
  Globe,
  Layers,
  Activity,
} from "lucide-react";

const GITHUB_REPO = "https://github.com/Orlixis/downlink";
const CURRENT_VERSION = "v0.1.63";

export default function LandingPage() {
  const [detectedOs, setDetectedOs] = useState<"mac-arm" | "mac-intel" | "windows" | "linux">("mac-arm");

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("win")) {
        setDetectedOs("windows");
      } else if (ua.includes("linux")) {
        setDetectedOs("linux");
      } else if (ua.includes("mac")) {
        setDetectedOs("mac-arm");
      }
    }
  }, []);

  const getPrimaryDownload = () => {
    switch (detectedOs) {
      case "windows":
        return {
          label: `Download for Windows (${CURRENT_VERSION})`,
          subtext: "Windows 10 / 11 64-bit • .exe",
          url: `${GITHUB_REPO}/releases/latest/download/Downlink_${CURRENT_VERSION.replace('v','')}_x64-setup.exe`,
          icon: Laptop,
        };
      case "linux":
        return {
          label: `Download for Linux (${CURRENT_VERSION})`,
          subtext: "x86_64 AppImage • Portable",
          url: `${GITHUB_REPO}/releases/latest/download/downlink_${CURRENT_VERSION.replace('v','')}_amd64.AppImage`,
          icon: Terminal,
        };
      case "mac-arm":
      default:
        return {
          label: `Download for macOS (${CURRENT_VERSION})`,
          subtext: "Apple Silicon M1/M2/M3/M4 & Intel • .dmg",
          url: `${GITHUB_REPO}/releases/latest/download/Downlink_${CURRENT_VERSION.replace('v','')}_aarch64.dmg`,
          icon: Download,
        };
    }
  };

  const primaryDownload = getPrimaryDownload();

  return (
    <div className="relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-cyan-500/15 via-blue-600/10 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#09090b]/80 border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/downlink-square.png"
              alt="Downlink Logo"
              className="w-9 h-9 rounded-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-white">Downlink</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                {CURRENT_VERSION}
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-zinc-200 transition-colors">Features</a>
            <a href="#architecture" className="hover:text-zinc-200 transition-colors">Architecture</a>
            <a href="#downloads" className="hover:text-zinc-200 transition-colors">Downloads</a>
            <Link href="/mobile" className="hover:text-cyan-400 flex items-center gap-1.5 transition-colors">
              <Smartphone className="w-4 h-4" />
              Mobile Companion
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/mobile"
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Launch PWA
            </Link>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold backdrop-blur-md shadow-lg shadow-cyan-500/10 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Universal Continuity & Cloud Relay is Live</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
          The high-speed media downloader{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
            built for the desktop.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Powered by Rust, yt-dlp, and Aria2. Seamlessly capture 8K streams, audio tracks, and BitTorrent swarms—or beam them straight from your phone over the encrypted Cloud Relay.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <a
            href={primaryDownload.url}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-base group"
          >
            <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <div className="text-left">
              <div>{primaryDownload.label}</div>
              <div className="text-[11px] font-normal text-cyan-100/80">{primaryDownload.subtext}</div>
            </div>
          </a>

          <Link
            href="/mobile"
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-zinc-900/90 border border-zinc-700/60 hover:bg-zinc-800 text-zinc-200 font-semibold shadow-lg hover:border-zinc-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-base"
          >
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <span>Open Mobile Companion PWA</span>
            <ArrowRight className="w-4 h-4 text-zinc-500" />
          </Link>
        </div>

        <p className="text-xs text-zinc-500 flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Free & Open Source • Zero Tracking • No Account Required</span>
        </p>
      </section>

      {/* Feature Bento Grid */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Engineered for extreme performance.</h2>
          <p className="text-sm sm:text-base text-zinc-400">Everything you need in a modern downloader, without bloat or ads.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl space-y-4 hover:border-zinc-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">16x Multi-Thread Acceleration</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Integrated Aria2 multi-connection chunking splits large files and saturates your bandwidth up to 10 Gbps with intelligent retry.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl space-y-4 hover:border-zinc-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Universal Cloud Continuity</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Browse videos on your phone. Hit share or paste in the Companion PWA, and your desktop begins downloading in real time.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl space-y-4 hover:border-zinc-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">1,000+ Extractors & Torrents</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Supports YouTube 4K/8K, Bilibili, TikTok, X, Dailymotion, Instagram, Vimeo, and full BitTorrent / Magnet stream swarms.
            </p>
          </div>
        </div>
      </section>

      {/* Download Matrix */}
      <section id="downloads" className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">All Platforms & Architectures</h2>
          <p className="text-sm text-zinc-400">Download the native standalone binary for your operating system.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={`${GITHUB_REPO}/releases/latest/download/Downlink_${CURRENT_VERSION.replace('v','')}_aarch64.dmg`}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/50 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-cyan-400 group-hover:-translate-y-0.5 transition-transform" />
              <div>
                <div className="text-sm font-bold text-white">macOS Apple Silicon (M1/M2/M3/M4)</div>
                <div className="text-xs text-zinc-400">.dmg • aarch64</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </a>

          <a
            href={`${GITHUB_REPO}/releases/latest/download/Downlink_${CURRENT_VERSION.replace('v','')}_x64.dmg`}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/50 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-cyan-400 group-hover:-translate-y-0.5 transition-transform" />
              <div>
                <div className="text-sm font-bold text-white">macOS Intel</div>
                <div className="text-xs text-zinc-400">.dmg • x86_64</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </a>

          <a
            href={`${GITHUB_REPO}/releases/latest/download/Downlink_${CURRENT_VERSION.replace('v','')}_x64-setup.exe`}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/50 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <Laptop className="w-5 h-5 text-blue-400 group-hover:-translate-y-0.5 transition-transform" />
              <div>
                <div className="text-sm font-bold text-white">Windows 10 / 11 Installer</div>
                <div className="text-xs text-zinc-400">.exe • 64-bit</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </a>

          <a
            href={`${GITHUB_REPO}/releases/latest/download/downlink_${CURRENT_VERSION.replace('v','')}_amd64.AppImage`}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/50 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-emerald-400 group-hover:-translate-y-0.5 transition-transform" />
              <div>
                <div className="text-sm font-bold text-white">Linux AppImage / Flatpak</div>
                <div className="text-xs text-zinc-400">.AppImage • amd64</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <img src="/downlink-square.png" alt="Downlink" className="w-5 h-5 rounded-md" />
            <span>Downlink Media Technologies • MIT Licensed</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/mobile" className="hover:text-zinc-300 transition-colors">Mobile Companion</Link>
            <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">GitHub Repository</a>
            <a href={`${GITHUB_REPO}/releases`} target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">Release Notes</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
