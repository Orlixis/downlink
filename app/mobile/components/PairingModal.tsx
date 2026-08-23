"use client";

import React, { useState } from "react";
import { X, Wifi, Cloud, ShieldCheck, Check, RotateCcw } from "lucide-react";

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  desktopIp: string;
  roomCode: string;
  relayUrl: string;
  onSave: (ip: string, room: string, relay: string) => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  desktopIp,
  roomCode,
  relayUrl,
  onSave,
}) => {
  const [ip, setIp] = useState(desktopIp);
  const [room, setRoom] = useState(roomCode);
  const [relay, setRelay] = useState(relayUrl);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(ip.trim(), room.trim().toUpperCase(), relay.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Pairing & Network</h2>
              <p className="text-xs text-zinc-400">Configure connection to your desktop</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              Desktop Local IP & Port
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="e.g. 192.168.100.94:3984"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700/70 focus:border-cyan-500 rounded-xl text-sm font-mono text-zinc-100 outline-none"
            />
            <p className="text-[11px] text-zinc-500">
              Used when your phone is on the same Wi-Fi network for zero-latency transfer.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              Cloud Sync Room Code
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. DL-9482"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700/70 focus:border-cyan-500 rounded-xl text-sm font-mono text-zinc-100 uppercase tracking-widest outline-none"
            />
            <p className="text-[11px] text-zinc-500">
              Used when away on cellular (5G/LTE) to push links via the encrypted cloud relay.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIp("localhost:3984");
                setRoom("");
                setRelay("https://relay.downlink.app");
              }}
              className="px-4 py-2.5 rounded-xl border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
