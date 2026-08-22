"use client";

import { ShieldCheck } from "lucide-react";

export function GatewayStatus() {
  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-800/40 border border-zinc-700/50 px-3.5 py-2">
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-2 w-2 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-200">Local RPC Gateway</span>
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
            Port 3984
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        <span>Loopback only</span>
      </div>
    </div>
  );
}
