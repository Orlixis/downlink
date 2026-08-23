"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ConnectionStatusBadge } from "./components/ConnectionStatusBadge";
import { LinkInputCard } from "./components/LinkInputCard";
import { PendingOutboxCard, OutboxItem } from "./components/PendingOutboxCard";
import { PairingModal } from "./components/PairingModal";
import { Shield, CheckCircle2, AlertCircle, Cloud, Wifi } from "lucide-react";

export default function MobileCompanionPage() {
  const [desktopIp, setDesktopIp] = useState("192.168.100.94:3984");
  const [roomCode, setRoomCode] = useState("DL-9482");
  const [relayUrl, setRelayUrl] = useState("");

  const [mode, setMode] = useState<"lan" | "relay" | "offline">("relay");
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);
  const [toastNotification, setToastNotification] = useState<{
    text: string;
    type: "success" | "info" | "warning";
  } | null>(null);

  const showToast = (text: string, type: "success" | "info" | "warning" = "info") => {
    setToastNotification({ text, type });
    setTimeout(() => setToastNotification(null), 3500);
  };

  // 1. Service Worker & LocalStorage initialization
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./mobile-sw.js").catch(() => {});
      }

      const savedIp = localStorage.getItem("downlink_desktop_ip");
      const savedRoom = localStorage.getItem("downlink_room_code");
      const savedRelay = localStorage.getItem("downlink_relay_url");
      const savedOutbox = localStorage.getItem("downlink_outbox");

      if (savedIp) setDesktopIp(savedIp);
      if (savedRoom) setRoomCode(savedRoom);
      if (savedRelay) setRelayUrl(savedRelay);
      if (savedOutbox) {
        try {
          setOutbox(JSON.parse(savedOutbox));
        } catch {}
      }

      const params = new URLSearchParams(window.location.search);
      const qIp = params.get("ip");
      const qRoom = params.get("room");
      const qRelay = params.get("relay");

      if (qIp) {
        setDesktopIp(qIp);
        localStorage.setItem("downlink_desktop_ip", qIp);
      }
      if (qRoom) {
        setRoomCode(qRoom);
        localStorage.setItem("downlink_room_code", qRoom);
      }
      if (qRelay) {
        setRelayUrl(qRelay);
        localStorage.setItem("downlink_relay_url", qRelay);
      }
    }
  }, []);

  // Save outbox changes to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("downlink_outbox", JSON.stringify(outbox));
    }
  }, [outbox]);

  // 2. Health check connection
  const checkConnection = useCallback(
    async (isManual = false) => {
      setIsChecking(true);
      const startTime = Date.now();

      if (isManual && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([15]);
      }

      let detectedMode: "lan" | "relay" | "offline" = "offline";

      // Try LAN direct check
      try {
        const cleanIp = desktopIp.replace(/^https?:\/\//, "");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(`http://${cleanIp}/api/status`, {
          signal: controller.signal,
          mode: "cors",
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (res && res.ok) {
          detectedMode = "lan";
        }
      } catch {}

      // If LAN unreachable, fallback to relay if roomCode is set
      if (detectedMode === "offline" && roomCode.trim()) {
        detectedMode = "relay";
      }

      // Ensure minimum 600ms visual spin feedback on manual refresh
      const elapsed = Date.now() - startTime;
      if (isManual && elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed));
      }

      setMode(detectedMode);
      setIsChecking(false);

      if (isManual) {
        if (detectedMode === "lan") {
          showToast(`Direct LAN Connected (${desktopIp})`, "success");
        } else if (detectedMode === "relay") {
          showToast(`Cloud Relay Active (Room: ${roomCode})`, "info");
        } else {
          showToast("Offline Mode — Links queued to outbox", "warning");
        }
      }

      return detectedMode;
    },
    [desktopIp, roomCode]
  );

  // Periodic heartbeat check
  useEffect(() => {
    checkConnection();
    const interval = setInterval(() => checkConnection(false), 20000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  // 3. Send Download Link (Smart LAN -> Relay -> Outbox fallback)
  const handleSend = async (url: string, presetId: string): Promise<boolean> => {
    setIsSending(true);
    const cleanIp = desktopIp.replace(/^https?:\/\//, "");

    // Path A: Try Direct LAN
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`http://${cleanIp}/api/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          preset_id: presetId,
          auto_start: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        setMode("lan");
        setIsSending(false);
        showToast("Sent directly to Desktop via LAN!", "success");
        return true;
      }
    } catch {}

    // Path B: Try Cloud Relay
    if (roomCode.trim()) {
      try {
        const baseUrl = relayUrl.trim() || (typeof window !== "undefined" ? window.location.origin : "");
        const relayEndpoint = `${baseUrl.replace(/\/$/, "")}/api/relay/${encodeURIComponent(roomCode)}`;
        const res = await fetch(relayEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            preset_id: presetId,
            auto_start: true,
            timestamp: Date.now(),
          }),
        });

        if (res.ok) {
          setMode("relay");
          setIsSending(false);
          showToast(`Dispatched to Desktop (Room ${roomCode})`, "success");
          return true;
        }
      } catch {}
    }

    // Path C: Save to Offline Outbox
    const newItem: OutboxItem = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      url,
      preset_id: presetId,
      timestamp: Date.now(),
    };

    setOutbox((prev) => [newItem, ...prev]);
    setMode("offline");
    setIsSending(false);
    showToast("Queued in Offline Outbox (Auto-Sync Ready)", "warning");
    return true;
  };

  // 4. Sync Pending Outbox
  const handleSyncOutbox = async () => {
    if (outbox.length === 0 || isSyncingOutbox) return;
    setIsSyncingOutbox(true);

    const remaining: OutboxItem[] = [];
    for (const item of outbox) {
      const success = await handleSend(item.url, item.preset_id);
      if (!success) {
        remaining.push(item);
      }
    }

    setOutbox(remaining);
    setIsSyncingOutbox(false);
  };

  const handleClearOutbox = () => {
    setOutbox([]);
  };

  // Auto-sync outbox when LAN reconnects
  useEffect(() => {
    if (mode === "lan" && outbox.length > 0 && !isSyncingOutbox) {
      handleSyncOutbox();
    }
  }, [mode, outbox.length]);

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-between p-4 sm:p-6 select-none font-sans relative">
      {/* Toast Notification Banner */}
      {toastNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-xl text-xs font-medium ${
              toastNotification.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
                : toastNotification.type === "warning"
                ? "bg-amber-950/90 border-amber-500/40 text-amber-200"
                : "bg-cyan-950/90 border-cyan-500/40 text-cyan-200"
            }`}
          >
            {toastNotification.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastNotification.type === "warning" && <AlertCircle className="w-4 h-4 text-amber-400" />}
            {toastNotification.type === "info" && <Cloud className="w-4 h-4 text-cyan-400" />}
            <span>{toastNotification.text}</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg space-y-4 pt-2">
        {/* Brand Header */}
        <header className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <img
              src="./downlink-square.png"
              alt="Downlink"
              className="w-10 h-10 rounded-2xl shadow-lg shadow-cyan-500/20 object-cover border border-zinc-800"
            />
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                Downlink
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Mobile
                </span>
              </h1>
              <p className="text-xs text-zinc-400">Companion PWA</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPairingOpen(true)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all text-xs flex items-center gap-1.5"
              aria-label="Pairing Settings"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="font-mono font-medium">{roomCode}</span>
            </button>
          </div>
        </header>

        {/* Connection Status Badge */}
        <ConnectionStatusBadge
          mode={mode}
          isChecking={isChecking}
          onRefresh={() => checkConnection(true)}
          onOpenSettings={() => setIsPairingOpen(true)}
          desktopIp={desktopIp}
          roomCode={roomCode}
        />

        {/* Link Input & Preset Selector */}
        <LinkInputCard onSend={handleSend} isSending={isSending} />

        {/* Pending Outbox for Offline Capture */}
        <PendingOutboxCard
          items={outbox}
          isSyncing={isSyncingOutbox}
          onSyncAll={handleSyncOutbox}
          onRemoveItem={(id) => setOutbox((prev) => prev.filter((item) => item.id !== id))}
          onClearAll={handleClearOutbox}
        />
      </div>

      {/* Pairing & Network Settings Modal */}
      <PairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        desktopIp={desktopIp}
        roomCode={roomCode}
        relayUrl={relayUrl}
        onSave={(newIp, newRoom, newRelay) => {
          setDesktopIp(newIp);
          setRoomCode(newRoom);
          setRelayUrl(newRelay);
          localStorage.setItem("downlink_desktop_ip", newIp);
          localStorage.setItem("downlink_room_code", newRoom);
          localStorage.setItem("downlink_relay_url", newRelay);
          setIsPairingOpen(false);
          checkConnection(true);
        }}
      />

      {/* Minimal Footer */}
      <footer className="w-full max-w-lg py-4 text-center space-y-2">
        <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-zinc-600" />
          End-to-End Encrypted & Zero Data Collected
        </p>
        <p className="text-[10px] text-zinc-600">
          Downlink Companion • Next.js 16 App Router PWA • v0.1.63
        </p>
      </footer>
    </main>
  );
}
