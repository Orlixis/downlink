"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ConnectionStatusBadge } from "./components/ConnectionStatusBadge";
import { LinkInputCard } from "./components/LinkInputCard";
import { PendingOutboxCard, OutboxItem } from "./components/PendingOutboxCard";
import { PairingModal } from "./components/PairingModal";
import { Smartphone, Download, CheckCircle2, Shield } from "lucide-react";

export default function MobileCompanionPage() {
  const [desktopIp, setDesktopIp] = useState("192.168.100.94:3984");
  const [roomCode, setRoomCode] = useState("DL-9482");
  const [relayUrl, setRelayUrl] = useState("https://relay.downlink.app");
  
  const [mode, setMode] = useState<"lan" | "relay" | "offline">("lan");
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);

  // 1. Service Worker & LocalStorage initialization
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Register Service Worker for PWA
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./mobile-sw.js").catch(() => {});
      }

      // Load saved settings
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

      // Parse query params for instant 1-tap QR code pairing
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
  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const cleanIp = desktopIp.replace(/^https?:\/\//, "");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      const res = await fetch(`http://${cleanIp}/api/status`, {
        signal: controller.signal,
        mode: "cors",
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        setMode("lan");
        setIsChecking(false);
        return "lan";
      }
    } catch {}

    if (roomCode.trim()) {
      setMode("relay");
      setIsChecking(false);
      return "relay";
    }

    setMode("offline");
    setIsChecking(false);
    return "offline";
  }, [desktopIp, roomCode]);

  // Periodic heartbeat check
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
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
        return true;
      }
    } catch {
      // LAN failed, fall through to Cloud Relay
    }

    // Path B: Try Cloud Relay
    if (roomCode.trim()) {
      try {
        const relayEndpoint = `${relayUrl.replace(/\/$/, "")}/api/relay/${encodeURIComponent(roomCode)}`;
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
          return true;
        }
      } catch {
        // Relay failed, fall through to Outbox
      }
    }

    // Path C: Save to Offline Outbox
    const newItem: OutboxItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      url,
      preset_id: presetId,
      timestamp: Date.now(),
    };

    setOutbox((prev) => [newItem, ...prev]);
    setMode("offline");
    setIsSending(false);
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

  // Auto-sync outbox when LAN reconnects
  useEffect(() => {
    if (mode === "lan" && outbox.length > 0 && !isSyncingOutbox) {
      handleSyncOutbox();
    }
  }, [mode, outbox.length]);

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-between p-4 sm:p-6 select-none font-sans">
      <div className="w-full max-w-lg space-y-4 pt-2">
        {/* Brand Header */}
        <header className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <Download className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
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
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono font-medium">{roomCode || "Pair"}</span>
            </button>
          </div>
        </header>

        {/* Connection Status Pill */}
        <ConnectionStatusBadge
          mode={mode}
          isChecking={isChecking}
          onRefresh={checkConnection}
          onOpenSettings={() => setIsPairingOpen(true)}
          desktopIp={desktopIp}
          roomCode={roomCode}
        />

        {/* Offline Outbox Queue (if any) */}
        <PendingOutboxCard
          items={outbox}
          isSyncing={isSyncingOutbox}
          onSyncAll={handleSyncOutbox}
          onRemoveItem={(id) => setOutbox((prev) => prev.filter((i) => i.id !== id))}
          onClearAll={() => setOutbox([])}
        />

        {/* Main Input Form */}
        <LinkInputCard onSend={handleSend} isSending={isSending} />
      </div>

      {/* Footer & PWA Details */}
      <footer className="w-full max-w-lg py-4 text-center space-y-2">
        <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-zinc-600" />
          End-to-End Encrypted & Zero Data Collected
        </p>
        <p className="text-[10px] text-zinc-600">
          Downlink Companion &bull; Next.js 16 App Router PWA &bull; v0.1.63
        </p>
      </footer>

      {/* Pairing Modal */}
      <PairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        desktopIp={desktopIp}
        roomCode={roomCode}
        relayUrl={relayUrl}
        onSave={(ip, room, relay) => {
          setDesktopIp(ip);
          setRoomCode(room);
          setRelayUrl(relay);
          if (typeof window !== "undefined") {
            localStorage.setItem("downlink_desktop_ip", ip);
            localStorage.setItem("downlink_room_code", room);
            localStorage.setItem("downlink_relay_url", relay);
          }
          checkConnection();
        }}
      />
    </main>
  );
}
