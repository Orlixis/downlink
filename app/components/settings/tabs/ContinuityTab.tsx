"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Smartphone,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Radio,
} from "lucide-react";
import QRCode from "qrcode";

interface ContinuityInfo {
  ip: string;
  port: number;
  hostname: string;
  pairing_url: string;
  mdns_name: string;
}

export function ContinuityTab() {
  const [info, setInfo] = useState<ContinuityInfo | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedScheme, setCopiedScheme] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await invoke<ContinuityInfo>("get_continuity_info");
        if (!mounted) return;
        setInfo(res);

        const url = res.pairing_url || `http://${res.ip}:${res.port}/mobile`;
        const qr = await QRCode.toDataURL(url, {
          width: 320,
          margin: 1,
          color: {
            dark: "#09090b",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        });
        if (mounted) setQrCodeDataUrl(qr);
      } catch (err) {
        console.debug("Failed to fetch continuity info:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCopyPairingUrl = () => {
    if (!info) return;
    navigator.clipboard.writeText(info.pairing_url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyScheme = () => {
    navigator.clipboard.writeText("downlink://capture?url=<URL>");
    setCopiedScheme(true);
    setTimeout(() => setCopiedScheme(false), 2000);
  };

  const handleOpenCompanionInBrowser = async () => {
    const desktopUrl = `http://localhost:${info?.port || 3984}/mobile`;
    try {
      await invoke("open_url", { url: desktopUrl });
    } catch (err) {
      console.error("Failed to open browser URL:", err);
      window.open(desktopUrl, "_blank");
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
                Active on Wi-Fi
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Beam video, audio & magnet links directly to Downlink from any phone or PC
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

      {/* ── Main Dual Column Grid ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {/* Left: Mobile Pairing QR Card */}
        <div className="flex flex-col items-center justify-between rounded-xl bg-white/[0.02] p-4 text-center ring-1 ring-white/[0.05]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Smartphone className="h-3.5 w-3.5 text-blue-400" />
            <span>Scan with Phone Camera</span>
          </div>

          <div className="my-3 relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-2xl ring-2 ring-white/20">
            {qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeDataUrl}
                alt="Downlink Mobile Pairing QR Code"
                className="h-full w-full object-contain rounded-xl"
              />
            ) : (
              <div className="h-full w-full animate-pulse rounded-xl bg-zinc-200" />
            )}
          </div>

          {info && (
            <button
              type="button"
              onClick={handleCopyPairingUrl}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600/15 py-2 px-3 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/30 transition-all hover:bg-blue-600/25 hover:text-white active:scale-[0.98]"
              title="Click to copy companion link"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="truncate font-mono text-[11px]">
                    Copy Mobile Link ({info.pairing_url})
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: Integration & Automation Cards */}
        <div className="flex flex-col justify-between gap-3">
          {/* Web Companion Controller Card */}
          <div className="rounded-xl bg-white/[0.02] p-3.5 ring-1 ring-white/[0.05] flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">
                  Liquid Glass Web Companion
                </span>
                <button
                  type="button"
                  onClick={handleOpenCompanionInBrowser}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-400 hover:bg-blue-500/20 active:scale-95 transition-all"
                >
                  <span>Launch in Browser</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-zinc-400">
                A touch-optimized companion app for iOS & Android Safari/Chrome with 1-tap paste, quality presets, and instant link beaming.
              </p>
            </div>

            <div className="mt-3 rounded-lg bg-zinc-950/50 p-2 text-[11px] text-zinc-400 ring-1 ring-white/5">
              <strong>Pro Tip:</strong> On iPhone/Android, tap <em>Share &rarr; Add to Home Screen</em> to install Downlink as a native web app.
            </div>
          </div>

          {/* Deep Link Protocol Scheme Card */}
          <div className="rounded-xl bg-white/[0.02] p-3.5 ring-1 ring-white/[0.05]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  Apple Shortcuts & Automation
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyScheme}
                className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-white/[0.1] active:scale-95 transition-all"
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
              Pass links directly from Apple Shortcuts, Raycast, or terminal scripts.
            </p>
            <div className="mt-1.5 rounded-md bg-zinc-950/80 p-1.5 font-mono text-[10px] text-cyan-400/90 ring-1 ring-white/5 truncate">
              downlink://capture?url=https://...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
