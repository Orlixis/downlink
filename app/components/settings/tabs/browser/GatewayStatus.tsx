"use client";

import { Activity, ShieldCheck } from "lucide-react";

export function GatewayStatus() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 backdrop-blur-md transition-colors hover:border-white/[0.12]">
      <div className="flex items-center gap-3">
        <div className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
        </div>
        <div>
          <div className="text-xs font-medium text-zinc-100 flex items-center gap-1.5">
            Local Gateway Bridge
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Secure loopback RPC listening on <code className="font-mono text-zinc-300">127.0.0.1:3984</code>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />
        <span className="hidden sm:inline">Zero Cloud Relays</span>
      </div>
    </div>
  );
}
