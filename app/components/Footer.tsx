"use client";

import Image from "next/image";

interface FooterProps {
  appVersion?: string;
}

export function Footer({ appVersion = "0.1.11" }: FooterProps) {
  return (
    <div className="border-t border-zinc-800 px-4 py-2 flex items-center justify-center gap-2">
      <Image
        src="/downlink-square.png"
        alt="Downlink"
        width={16}
        height={16}
        className="rounded opacity-60"
      />
      <span className="text-xs text-zinc-500">
        Downlink v{appVersion} · Powered by yt-dlp
      </span>
    </div>
  );
}
