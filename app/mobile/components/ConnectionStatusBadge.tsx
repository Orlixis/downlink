"use client";

import React from "react";
import { Wifi, Cloud, AlertCircle, RefreshCw, Settings2 } from "lucide-react";

interface ConnectionStatusBadgeProps {
  mode: "lan" | "relay" | "offline";
  isChecking: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  desktopIp: string;
  roomCode: string;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  mode,
  isChecking,
  onRefresh,
  onOpenSettings,
  desktopIp,
  roomCode,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-xl rounded-2xl shadow-xl">
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-xl p-1"
        aria-label="Connection Settings"
      >
        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-800/90 border border-zinc-700/50">
          {mode === "lan" && (
            <>
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
            </>
          )}
          {mode === "relay" && (
            <>
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-500" />
            </>
          )}
          {mode === "offline" && (
            <>
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
            </>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-100">
              {mode === "lan" && "Local Wi-Fi"}
              {mode === "relay" && "Cloud Relay"}
              {mode === "offline" && "Offline Outbox"}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/50">
              {mode === "lan" ? (desktopIp.split(":")[0] || "LAN") : (roomCode || "Remote")}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            {mode === "lan" && "Direct high-speed connection to Mac"}
            {mode === "relay" && "Connected via encrypted cloud relay"}
            {mode === "offline" && "Links will auto-sync on reconnect"}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={onRefresh}
          disabled={isChecking}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          aria-label="Refresh connection"
          title="Test Connection"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin text-cyan-400" : ""}`} />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          aria-label="Pairing Settings"
          title="Configure Connection"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
