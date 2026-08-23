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
        // High-contrast clean QR code
        const qr = await QRCode.toDataURL(url, {
          width: 280,
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
    if (!info?.pairing_url) return;
    try {
      await invoke("open_url", { url: info.pairing_url });
    } catch (err) {
      console.error("Failed to open browser URL:", err);
      // Fallback
      window.open(info.pairing_url, "_blank");
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
              Zero-config Bonjour discovery for iOS, Android & PCs
            </p>
          </div>
        </div>

        {info && (
          <div className="flex items-center gap-1.5 rounded-md bg-zinc-950/60 px-2.5 py-1 font-mono text-[11px] text-cyan-400 ring-1 ring-white/5">
            <Wifi className="h-3 w-3 text-cyan-500" />
            <span>{info.mdns_name}:{info.port}</span>
          </div>
        )}
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
              onClick={handleCopyPairingUrl}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/[0.05] py-1.5 px-2 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.1] hover:text-white"
              title="Click to copy pairing address"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="truncate font-mono text-[11px] text-zinc-400 hover:text-zinc-200">
                    {info.pairing_url}
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: Deep Linking & Apple Continuity */}
        <div className="flex flex-col justify-between gap-2.5 rounded-xl bg-white/[0.02] p-3.5 ring-1 ring-white/[0.05]">
          {/* Deep Linking */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Universal Deep Link Protocol</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400 leading-snug">
              Trigger instant downloads from Apple Shortcuts, Siri, Raycast, Alfred, or terminal scripts.
            </p>

            <div className="mt-2 flex items-center justify-between rounded-lg bg-zinc-950/80 px-2.5 py-1.5 font-mono text-[11px] text-cyan-300 ring-1 ring-white/5">
              <span className="truncate">downlink://capture?url=&lt;URL&gt;</span>
              <button
                type="button"
                onClick={handleCopyScheme}
                className="ml-1.5 rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Copy deep link URL template"
              >
                {copiedScheme ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Share Sheet & Mobile Companion */}
          <div className="border-t border-white/[0.06] pt-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <Share2 className="h-3.5 w-3.5 text-purple-400" />
              <span>Mobile Share Sheet Target</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400 leading-snug">
              Add the mobile companion to your phone&apos;s Home Screen to beam media directly from iOS & Android Share Sheets.
            </p>

            {info && (
              <button
                type="button"
                onClick={handleOpenCompanionInBrowser}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-400 hover:bg-blue-500/20 hover:text-cyan-300 transition-colors"
              >
                <span>Launch Companion in Browser</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
