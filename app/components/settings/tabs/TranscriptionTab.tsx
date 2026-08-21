"use client";

import { ExternalLink, Check } from "lucide-react";
import type { TranscriptionSettings, TranscriptionProvider } from "@/app/types";
import { TRANSCRIPTION_PROVIDERS } from "@/app/types";

interface TranscriptionTabProps {
  settings: TranscriptionSettings;
  updateTranscription: <K extends keyof TranscriptionSettings>(
    key: K,
    value: TranscriptionSettings[K]
  ) => void;
}

export function TranscriptionTab({
  settings,
  updateTranscription,
}: TranscriptionTabProps) {
  const currentProvider = TRANSCRIPTION_PROVIDERS.find(
    (p) => p.id === settings.provider
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-2">
          Transcription Provider
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TRANSCRIPTION_PROVIDERS.map((provider) => {
            const isSelected = settings.provider === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() =>
                  updateTranscription(
                    "provider",
                    provider.id as TranscriptionProvider
                  )
                }
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-500/10 text-white"
                    : "border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/80"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold">{provider.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                </div>
                <span className="mt-1 text-[10px] text-zinc-500">
                  {provider.note}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-zinc-300">
            API Key
          </label>
          {currentProvider && (
            <a
              href={currentProvider.keyLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline"
            >
              <span>{currentProvider.keyLabel}</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
        <input
          type="password"
          placeholder="sk-..."
          value={settings.api_key}
          onChange={(e) => updateTranscription("api_key", e.target.value)}
          className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <p className="mt-1 text-[10px] text-zinc-500">
          Keys are stored locally in your SQLite application database.
        </p>
      </div>
    </div>
  );
}
