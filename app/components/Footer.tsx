"use client";

import Image from "next/image";

interface FooterProps {
  appVersion?: string;
  ytDlpVersion?: string | null;
  ffmpegVersion?: string | null;
}

export function Footer({ appVersion, ytDlpVersion, ffmpegVersion }: FooterProps) {
  return (
    <div className="flex items-center justify-between border-t border-zinc-800/80 bg-zinc-950 px-4 py-1.5">
      {/* Left: branding */}
      <div className="flex items-center gap-1.5">
        <Image
          src="/downlink-square.png"
          alt="Downlink"
          width={14}
          height={14}
          className="rounded opacity-50"
        />
        <span className="text-[11px] text-zinc-600">
          Downlink{appVersion ? ` v${appVersion}` : ""}
        </span>
      </div>

      {/* Right: tool versions */}
      <div className="flex items-center gap-2.5">
        {ytDlpVersion && (
          <span className="text-[11px] text-zinc-600">
            yt-dlp {ytDlpVersion}
          </span>
        )}
        {ffmpegVersion && (
          <>
            <span className="text-zinc-800">·</span>
            <span className="text-[11px] text-zinc-600">
              ffmpeg {ffmpegVersion}
            </span>
          </>
        )}
        {!ytDlpVersion && !ffmpegVersion && (
          <span className="text-[11px] text-zinc-700">Powered by yt-dlp</span>
        )}
      </div>
    </div>
  );
}
