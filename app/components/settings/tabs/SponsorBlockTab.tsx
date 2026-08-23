"use client";

import React from "react";
import type { SponsorBlockSettings } from "@/app/types";
import { Scissors, Bookmark, Check } from "lucide-react";

const SPONSORBLOCK_CATEGORIES = [
  { id: "sponsor", label: "Sponsor", desc: "Paid sponsor promotions and product plugs" },
  { id: "intro", label: "Intro", desc: "Intro animations and video bumpers" },
  { id: "outro", label: "Outro", desc: "End cards and credit rolls" },
  { id: "selfpromo", label: "Self-promo", desc: "Channel merch, Patreon, and socials" },
  { id: "interaction", label: "Interaction", desc: "Like, subscribe, and notification bell reminders" },
  { id: "music_offtopic", label: "Non-music", desc: "Dialogue & pauses in official music videos" },
  { id: "preview", label: "Preview / Recap", desc: "Recaps and coming up previews" },
  { id: "filler", label: "Filler / Tangent", desc: "Unrelated tangents and filler banter" },
];

interface SponsorBlockTabProps {
  settings: SponsorBlockSettings;
  updateSponsorblock: <K extends keyof SponsorBlockSettings>(
    key: K,
    value: SponsorBlockSettings[K]
  ) => void;
  toggleSponsorblockCategory: (category: string) => void;
}

export function SponsorBlockTab({
  settings,
  updateSponsorblock,
  toggleSponsorblockCategory,
}: SponsorBlockTabProps) {
  const activeCategories = Array.isArray(settings?.categories)
    ? settings.categories
    : ["sponsor", "intro", "outro", "selfpromo", "interaction"];

  const currentMode = settings?.mode || "remove";
  const isEnabledByDefault = Boolean(settings?.enabled_by_default);

  const handleSelectAll = () => {
    updateSponsorblock(
      "categories",
      SPONSORBLOCK_CATEGORIES.map((c) => c.id)
    );
  };

  const handleClearAll = () => {
    updateSponsorblock("categories", []);
  };

  return (
    <div className="space-y-6 text-left select-none">
      {/* Top Main Master Switch */}
      <button
        type="button"
        onClick={() => updateSponsorblock("enabled_by_default", !isEnabledByDefault)}
        className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-white/[0.06] transition-colors cursor-pointer text-left group"
      >
        <div>
          <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
            Enable SponsorBlock by Default
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 font-normal">
            Automatically process sponsor segments on all newly queued YouTube downloads
          </div>
        </div>

        {/* Custom Toggle Switch */}
        <div
          className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
            isEnabledByDefault ? "bg-blue-600" : "bg-zinc-700"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform ${
              isEnabledByDefault ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
      </button>

      {/* Action Mode Segmented Switch */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-zinc-300">
          Action Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateSponsorblock("mode", "remove")}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              currentMode === "remove"
                ? "bg-blue-600/15 border-blue-500/40 text-white shadow-sm ring-1 ring-blue-500/20"
                : "bg-zinc-800/40 border-white/[0.04] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${currentMode === "remove" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-700/40 text-zinc-400"}`}>
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold">Cut &amp; Remove</div>
              <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                Excises segments completely via lossless FFmpeg stream copy
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateSponsorblock("mode", "mark")}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              currentMode === "mark"
                ? "bg-blue-600/15 border-blue-500/40 text-white shadow-sm ring-1 ring-blue-500/20"
                : "bg-zinc-800/40 border-white/[0.04] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${currentMode === "mark" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-700/40 text-zinc-400"}`}>
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold">Mark as Chapters</div>
              <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                Embeds chapter markers into the file so players can auto-skip
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Category Selection Grid */}
      <div className="space-y-2.5 pt-1 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300">
            Categories to target
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium px-2 py-0.5 rounded hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Select all
            </button>
            <span className="text-zinc-600 text-xs">•</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-zinc-400 hover:text-zinc-300 font-medium px-2 py-0.5 rounded hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SPONSORBLOCK_CATEGORIES.map((cat) => {
            const isChecked = activeCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleSponsorblockCategory(cat.id)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isChecked
                    ? "bg-blue-600/10 border-blue-500/30 text-white"
                    : "bg-zinc-800/40 border-white/[0.04] text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                }`}
              >
                {/* Checkbox box */}
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                    isChecked
                      ? "bg-blue-600 text-white"
                      : "border border-zinc-600 bg-zinc-800/80"
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">{cat.label}</div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">{cat.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
