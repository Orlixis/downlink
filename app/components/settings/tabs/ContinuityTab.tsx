"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Smartphone,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Zap,
  Radio,
  ShieldAlert,
  Globe,
  HelpCircle,
} from "lucide-react";
import QRCode from "qrcode";

interface ContinuityInfo {
  ip: string;
  port: number;
  hostname: string;
  pairing_url: string;
  mdns_name: string;
  mdns_url: string;
  relay_code: string;
  relay_url: string;
}

type ConnectionMode = "lan" | "relay" | "mdns";

export function ContinuityTab() {
  const [info, setInfo] = useState<ContinuityInfo | null>(null);
  const [mode, setMode] = useState<ConnectionMode>("lan");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedScheme, setCopiedScheme] = useState(false);
  const [showFirewallHelp, setShowFirewallHelp] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await invoke<ContinuityInfo>("get_continuity_info");
        if (!mounted) return;
        setInfo(res);
      } catch (err) {
        console.debug("Failed to fetch continuity info:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Update QR Code when info or connection mode changes
  useEffect(() => {
    if (!info) return;

    let targetUrl = info.pairing_url;
    if (mode === "relay") {
      targetUrl = info.relay_url || `http://${info.ip}:${info.port}/mobile?relay=${info.relay_code}`;
    } else if (mode === "mdns") {
      targetUrl = info.mdns_url || `http://${info.mdns_name}:${info.port}/mobile`;
    }

    QRCode.toDataURL(targetUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: "#09090b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((qr) => setQrCodeDataUrl(qr))
      .catch((err) => console.error("QR Code error:", err));
  }, [info, mode]);

  const getActiveUrl = () => {
    if (!info) return "";
    if (mode === "relay") return info.relay_url || `http://${info.ip}:${info.port}/mobile?relay=${info.relay_code}`;
    if (mode === "mdns") return info.mdns_url || `http://${info.mdns_name}:${info.port}/mobile`;
    return info.pairing_url;
  };

  const handleCopyActiveUrl = () => {
    const url = getActiveUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyScheme = () => {
    navigator.clipboard.writeText("downlink://capture?url=<URL>");
    setCopiedScheme(true);
    setTimeout(() => setCopiedScheme(false), 2000);
  };

  const handleOpenCompanionInBrowser = async () => {
    const url = getActiveUrl();
    if (!url) return;
    try {
      await invoke("open_url", { url });
    } catch (err) {
      console.error("Failed to open browser URL:", err);
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-zinc-300">
      {/* ── Top Status Banner ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight text-white">
                Universal Continuity & Sync
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Axum Engine Ready
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Expo-style multi-tier continuity for iOS, Android, and desktop browsers
            </p>
          </div>
        </div>

        {info && (
          <div className="flex items-center gap-1.5 rounded-md bg-zinc-950/60 px-2.5 py-1 font-mono text-[11px] text-cyan-400 ring-1 ring-white/5">
            <Wifi className="h-3 w-3 text-cyan-500" />
            <span>{info.ip}:{info.port}</span>
          </div>
        )}
      </div>

      {/* ── Mode Switcher (Expo-style) ────────────────────────── */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-950/80 p-1 ring-1 ring-white/10 text-center text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode("lan")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
            mode === "lan"
              ? "bg-blue-600/20 text-cyan-400 ring-1 ring-cyan-500/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Wifi className="h-3.5 w-3.5" />
          <span>LAN (Wi-Fi)</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("relay")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
            mode === "relay"
              ? "bg-blue-600/20 text-cyan-400 ring-1 ring-cyan-500/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Tunnel / Relay</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("mdns")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
            mode === "mdns"
              ? "bg-blue-600/20 text-cyan-400 ring-1 ring-cyan-500/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          <span>mDNS Host</span>
        </button>
      </div>

      {/* ── Main Dual Column Grid ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {/* Left: Mobile Pairing QR Card */}
        <div className="flex flex-col items-center justify-between rounded-xl bg-white/[0.02] p-3.5 text-center ring-1 ring-white/[0.05]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Smartphone className="h-3.5 w-3.5 text-blue-400" />
            <span>Scan with Phone Camera</span>
          </div>

          <div className="my-2.5 relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-xl ring-2 ring-white/20">
            {qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeDataUrl}
                alt="Downlink Mobile Pairing QR Code"
                className="h-full w-full object-contain rounded-lg"
              />
            ) : (
              <div className="h-full w-full animate-pulse rounded-lg bg-zinc-200" />
            )}
          </div>

          {info && (
            <button
              type="button"
              onClick={handleCopyActiveUrl}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600/15 py-2 px-2 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/30 transition-all hover:bg-blue-600/25 hover:text-white"
              title="Click to copy companion address"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="truncate font-mono text-[11px]">
                    Copy Mobile URL ({getActiveUrl()})
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: Integration Methods */}
        <div className="flex flex-col justify-between gap-2.5">
          {/* Web Companion Launcher Card */}
          <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  Open Companion in Browser
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenCompanionInBrowser}
                className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-400 hover:bg-blue-500/20"
              >
                <span>Launch</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              Open the Liquid Glass controller in your Mac’s browser to test or control from another desktop.
            </p>
          </div>

          {/* Deep Link URL Scheme Card */}
          <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.05]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <div>
                  <span className="text-xs font-semibold text-zinc-200">
                    Apple Shortcuts / Automation
                  </span>
                  <span className="ml-1.5 rounded bg-white/5 px-1 py-0.5 text-[9px] font-medium text-zinc-400">
                    Protocol
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyScheme}
                className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-white/[0.1]"
                title="Copy custom protocol for Apple Shortcuts and scripts"
              >
                {copiedScheme ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-zinc-400" />
                    <span>Copy Scheme</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-1 text-[10.5px] text-zinc-400">
              Custom URI scheme for iOS Shortcuts, Raycast, and CLI automation.
            </p>
            <div className="mt-1.5 rounded-md bg-zinc-950/80 p-1.5 font-mono text-[10px] text-zinc-400 ring-1 ring-white/5 truncate">
              downlink://capture?url=https://...
            </div>
          </div>
        </div>
      </div>

      {/* ── Firewall & Troubleshooting Drawer ───────────────── */}
      <div className="rounded-xl bg-amber-500/[0.04] p-3 ring-1 ring-amber-500/20 text-[11.5px]">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowFirewallHelp(!showFirewallHelp)}
        >
          <div className="flex items-center gap-2 text-amber-300 font-semibold">
            <ShieldAlert className="h-4 w-4" />
            <span>macOS / Windows Firewall Troubleshooting</span>
          </div>
          <HelpCircle className="h-3.5 w-3.5 text-amber-400/80" />
        </div>

        {showFirewallHelp && (
          <div className="mt-2.5 pt-2.5 border-t border-amber-500/15 text-zinc-400 space-y-1.5 text-[11px] leading-relaxed">
            <p>
              If your phone cannot open the LAN address, macOS Firewall may be blocking incoming Wi-Fi connections to the local app:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-300 pl-1">
              <li>Open <strong>System Settings &rarr; Network &rarr; Firewall</strong> on your Mac.</li>
              <li>Click <strong>Options...</strong> and check that Downlink is set to <strong>&quot;Allow incoming connections&quot;</strong>.</li>
              <li>Or switch to <strong>Tunnel / Relay</strong> mode above to bypass local firewall restrictions.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
