"use client";

import { useState, useCallback } from "react";
import { Mic, Loader2, FileText, ExternalLink, ChevronDown } from "lucide-react";
import type { WhisperModel } from "@/app/types";

const WHISPER_MODEL_LABELS: Record<WhisperModel, string> = {
  tiny: "Tiny (fast)",
  base: "Base (balanced)",
  small: "Small (accurate)",
  medium: "Medium (best)",
  large_v3: "Large v3 (ultra)",
};

interface DownloadItemTranscribeProps {
  finalPath: string;
  onOpen: (path: string) => void;
  onTranscribe: (
    filePath: string,
    model: WhisperModel
  ) => Promise<{ srt_path: string; method: string }>;
}

export function DownloadItemTranscribe({
  finalPath,
  onOpen,
  onTranscribe,
}: DownloadItemTranscribeProps) {
  const [transcribeState, setTranscribeState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [selectedModel, setSelectedModel] = useState<WhisperModel>("base");
  const [srtPath, setSrtPath] = useState<string | null>(null);
  const [transcribeMethod, setTranscribeMethod] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const handleTranscribe = useCallback(async () => {
    setTranscribeState("loading");
    setTranscribeError(null);
    setSrtPath(null);
    setTranscribeMethod(null);
    try {
      const result = await onTranscribe(finalPath, selectedModel);
      setSrtPath(result.srt_path);
      setTranscribeMethod(result.method);
      setTranscribeState("done");
    } catch (e) {
      const msg = String(e);
      let displayMsg = msg;
      try {
        const parts = msg.split(": ");
        if (parts.length > 1) {
          displayMsg = parts.slice(1).join(": ");
        }
      } catch (_) {}
      setTranscribeState("error");
      setTranscribeError(displayMsg);
    }
  }, [onTranscribe, finalPath, selectedModel]);

  return (
    <div className="mt-2.5 border-t border-zinc-700/50 pt-2.5">
      {transcribeState === "idle" && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelPicker((v) => !v)}
              className="flex items-center gap-1 rounded-md bg-zinc-700/60 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
            >
              {WHISPER_MODEL_LABELS[selectedModel]}
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
            {showModelPicker && (
              <div className="absolute bottom-full left-0 mb-1 z-50 w-36 rounded-lg bg-zinc-800 p-1 ring-1 ring-white/10 shadow-xl animate-fade-in">
                {(Object.keys(WHISPER_MODEL_LABELS) as WhisperModel[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSelectedModel(m);
                      setShowModelPicker(false);
                    }}
                    className={`w-full rounded-md px-2 py-1 text-left text-[10px] transition-colors ${
                      selectedModel === m
                        ? "bg-violet-600/20 text-violet-300"
                        : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {WHISPER_MODEL_LABELS[m]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleTranscribe}
            className="flex items-center gap-1.5 rounded-md bg-violet-600/15 px-2.5 py-1 text-[10px] font-medium text-violet-400 ring-1 ring-violet-500/30 hover:bg-violet-600/25 hover:text-violet-300 transition-colors"
          >
            <Mic className="h-3 w-3" />
            Transcribe
          </button>
          <span className="text-[9px] text-zinc-600">AI subtitle generation</span>
        </div>
      )}

      {transcribeState === "loading" && (
        <div className="flex items-center gap-2 text-[10px] text-violet-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Transcribing... (Using AI provider or local Whisper)</span>
        </div>
      )}

      {transcribeState === "done" && srtPath && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[10px] text-green-400">
            <FileText className="h-3 w-3" />
            <span className="font-medium">SRT generated successfully</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-500 font-mono text-[9px] uppercase">
              {transcribeMethod?.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(srtPath)}
              className="flex items-center gap-1 rounded-md bg-green-600/10 px-2 py-0.5 text-[10px] text-green-400 ring-1 ring-green-500/20 hover:bg-green-600/20 transition-colors"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Open .srt
            </button>
            <button
              type="button"
              onClick={() => {
                setTranscribeState("idle");
                setSrtPath(null);
              }}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Transcribe again
            </button>
          </div>
        </div>
      )}

      {transcribeState === "error" && (
        <div className="rounded-lg bg-red-500/8 px-2.5 py-2 ring-1 ring-red-500/15">
          <p className="text-[10px] text-red-400 break-words">
            Transcription failed: {transcribeError}
          </p>
          <button
            type="button"
            onClick={() => {
              setTranscribeState("idle");
              setTranscribeError(null);
            }}
            className="mt-1 text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
