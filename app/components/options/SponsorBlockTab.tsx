"use client";

import type { AdvancedOptionsState } from "./types";
import { SPONSORBLOCK_CATEGORIES } from "./types";

interface SponsorBlockTabProps {
  options: AdvancedOptionsState;
  updateOption: <K extends keyof AdvancedOptionsState>(
    key: K,
    value: AdvancedOptionsState[K]
  ) => void;
  toggleSponsorBlockCategory: (category: string) => void;
}

export function SponsorBlockTab({
  options,
  updateOption,
  toggleSponsorBlockCategory,
}: SponsorBlockTabProps) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.sponsorBlockEnabled}
          onChange={(e) =>
            updateOption("sponsorBlockEnabled", e.target.checked)
          }
          className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
        />
        <span className="text-xs text-zinc-300 font-medium">
          Enable SponsorBlock for this download
        </span>
      </label>

      {options.sponsorBlockEnabled && (
        <div className="space-y-3 pl-4 border-l border-zinc-800">
          <div>
            <label className="block text-xs font-medium text-zinc-300">
              Mode
            </label>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sponsorBlockMode"
                  value="remove"
                  checked={options.sponsorBlockMode === "remove"}
                  onChange={() => updateOption("sponsorBlockMode", "remove")}
                  className="text-blue-500 bg-zinc-800 border-zinc-700"
                />
                <span className="text-xs text-zinc-300">
                  Cut & Remove Segments
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sponsorBlockMode"
                  value="mark"
                  checked={options.sponsorBlockMode === "mark"}
                  onChange={() => updateOption("sponsorBlockMode", "mark")}
                  className="text-blue-500 bg-zinc-800 border-zinc-700"
                />
                <span className="text-xs text-zinc-300">
                  Mark as Chapters only
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Categories to Process
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPONSORBLOCK_CATEGORIES.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2 cursor-pointer rounded-lg bg-zinc-800/60 p-2 hover:bg-zinc-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={options.sponsorBlockCategories.includes(cat.id)}
                    onChange={() => toggleSponsorBlockCategory(cat.id)}
                    className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
                  />
                  <div>
                    <div className="text-xs text-zinc-300">{cat.label}</div>
                    <div className="text-[10px] text-zinc-500">
                      {cat.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
