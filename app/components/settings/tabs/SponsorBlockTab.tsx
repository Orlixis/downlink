"use client";

import type { SponsorBlockSettings } from "@/app/types";

const SPONSORBLOCK_CATEGORIES = [
  { id: "sponsor", label: "Sponsor" },
  { id: "intro", label: "Intro" },
  { id: "outro", label: "Outro" },
  { id: "selfpromo", label: "Self-promo" },
  { id: "interaction", label: "Interaction" },
  { id: "music_offtopic", label: "Non-music" },
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
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.enabled_by_default}
          onChange={(e) =>
            updateSponsorblock("enabled_by_default", e.target.checked)
          }
          className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
        />
        <span className="text-xs text-zinc-300 font-medium">
          Enable SponsorBlock by default
        </span>
      </label>

      <div className="pt-2 border-t border-zinc-800">
        <label className="block text-xs font-medium text-zinc-300 mb-2">
          Categories to remove
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SPONSORBLOCK_CATEGORIES.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2 cursor-pointer rounded-lg bg-zinc-800/60 p-2 hover:bg-zinc-800 transition-colors"
            >
              <input
                type="checkbox"
                checked={settings.categories.includes(cat.id)}
                onChange={() => toggleSponsorblockCategory(cat.id)}
                className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
              />
              <span className="text-xs text-zinc-300">{cat.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
