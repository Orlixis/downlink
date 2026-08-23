"use client";

import React, { useState, useEffect } from "react";
import {
  Link as LinkIcon,
  Sparkles,
  Clipboard,
  Send,
  Video,
  Music,
  Radio,
  FileCode,
  CheckCircle2,
  Subtitles,
  ShieldCheck,
} from "lucide-react";

interface LinkInputCardProps {
  onSend: (url: string, presetId: string, customTitle?: string) => Promise<boolean>;
  isSending: boolean;
}

const PRESETS = [
  { id: "recommended_best", label: "Best Video", icon: Sparkles, desc: "Highest Available" },
  { id: "video_1080p", label: "1080p FHD", icon: Video, desc: "Fast & Crisp" },
  { id: "video_720p", label: "720p HD", icon: Video, desc: "Lightweight" },
  { id: "audio_mp3", label: "MP3 Audio", icon: Music, desc: "Audio Only" },
];

export const LinkInputCard: React.FC<LinkInputCardProps> = ({ onSend, isSending }) => {
  const [url, setUrl] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("recommended_best");
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [includeSubs, setIncludeSubs] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Auto-detect URL format
  useEffect(() => {
    const trimmed = url.trim().toLowerCase();
    if (!trimmed) {
      setDetectedType(null);
      return;
    }

    if (trimmed.startsWith("magnet:") || trimmed.endsWith(".torrent") || trimmed.includes("xt=urn:btih:")) {
      setDetectedType("BitTorrent Swarm");
    } else if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
      setDetectedType("YouTube Video / Stream");
    } else if (trimmed.includes("tiktok.com")) {
      setDetectedType("TikTok Video");
    } else if (trimmed.includes("twitter.com") || trimmed.includes("x.com")) {
      setDetectedType("X / Twitter Media");
    } else if (trimmed.includes("instagram.com")) {
      setDetectedType("Instagram Media");
    } else if (trimmed.includes(".m3u8") || trimmed.includes(".mpd")) {
      setDetectedType("HLS / DASH Stream");
    } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      setDetectedType("Web Media Stream");
    } else {
      setDetectedType(null);
    }
  }, [url]);

  const handlePaste = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text.trim());
          if (navigator.vibrate) navigator.vibrate([15]);
        }
      }
    } catch {
      // Clipboard permissions denied
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isSending) return;

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([20]);
    }

    let finalPreset = selectedPreset;
    if (includeSubs && !finalPreset.includes("+subs")) {
      finalPreset += "+subs";
    }

    const success = await onSend(url.trim(), finalPreset);
    if (success) {
      setUrl("");
      setStatusMessage("Sent to Downlink Desktop!");
      setTimeout(() => setStatusMessage(null), 3000);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([15, 50, 15]);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 bg-zinc-900/90 border border-zinc-800 backdrop-blur-2xl rounded-3xl shadow-2xl space-y-4"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="url-input" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Download URL or Magnet
          </label>
          {detectedType && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full animate-in fade-in">
              <Sparkles className="w-3 h-3" />
              {detectedType}
            </span>
          )}
        </div>

        <div className="relative flex items-center">
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL, playlist, or magnet link..."
            required
            className="w-full pl-11 pr-24 py-3.5 bg-zinc-950/80 border border-zinc-700/60 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-500 transition-all outline-none"
          />
          <LinkIcon className="absolute left-4 w-4 h-4 text-zinc-500" />
          
          <button
            type="button"
            onClick={handlePaste}
            className="absolute right-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-medium text-zinc-300 rounded-xl border border-zinc-700/50 flex items-center gap-1.5 transition-all"
            aria-label="Paste from clipboard"
          >
            <Clipboard className="w-3.5 h-3.5" />
            Paste
          </button>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Quality Preset</span>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPreset(p.id);
                  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([10]);
                }}
                className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  isSelected
                    ? "bg-gradient-to-br from-cyan-950/60 to-blue-950/40 border-cyan-500/80 text-cyan-200 shadow-lg shadow-cyan-950/30"
                    : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl ${
                    isSelected ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-800/80 text-zinc-500"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-tight">{p.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{p.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Options Row */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-200">
          <input
            type="checkbox"
            checked={includeSubs}
            onChange={(e) => setIncludeSubs(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/30"
          />
          <Subtitles className="w-3.5 h-3.5 text-zinc-500" />
          Include Subtitles (.srt)
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!url.trim() || isSending}
        className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] ${
          !url.trim() || isSending
            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/40"
            : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 cursor-pointer"
        }`}
      >
        {isSending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Sending to Downlink...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Send to Desktop</span>
          </>
        )}
      </button>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-400 py-1 animate-in fade-in"
        >
          <CheckCircle2 className="w-4 h-4" />
          {statusMessage}
        </div>
      )}
    </form>
  );
};
