"use client";

import { useCallback, useState } from "react";
import type { AdvancedOptionsState } from "./types";
import { DEFAULT_OPTIONS } from "./types";
import { FormatTab } from "./FormatTab";
import { SubtitlesTab } from "./SubtitlesTab";
import { SponsorBlockTab } from "./SponsorBlockTab";
import { MetadataTab } from "./MetadataTab";
import { NetworkTab } from "./NetworkTab";

export type { AdvancedOptionsState };

interface AdvancedOptionsProps {
  isOpen: boolean;
  onClose: () => void;
  options: AdvancedOptionsState;
  onOptionsChange: (options: AdvancedOptionsState) => void;
  onApply: (options: AdvancedOptionsState) => void;
}

type TabId = "format" | "subtitles" | "sponsorblock" | "metadata" | "network";

export function AdvancedOptions({
  isOpen,
  onClose,
  options,
  onOptionsChange,
  onApply,
}: AdvancedOptionsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("format");
  const [localOptions, setLocalOptions] =
    useState<AdvancedOptionsState>(options);

  const updateOption = useCallback(
    <K extends keyof AdvancedOptionsState>(
      key: K,
      value: AdvancedOptionsState[K]
    ) => {
      setLocalOptions((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleSponsorBlockCategory = useCallback((category: string) => {
    setLocalOptions((prev) => {
      const categories = prev.sponsorBlockCategories;
      const newCategories = categories.includes(category)
        ? categories.filter((c) => c !== category)
        : [...categories, category];
      return { ...prev, sponsorBlockCategories: newCategories };
    });
  }, []);

  const handleApply = useCallback(() => {
    onOptionsChange(localOptions);
    onApply(localOptions);
    onClose();
  }, [localOptions, onOptionsChange, onApply, onClose]);

  const handleReset = useCallback(() => {
    setLocalOptions(DEFAULT_OPTIONS);
  }, []);

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string }[] = [
    { id: "format", label: "Format" },
    { id: "subtitles", label: "Subtitles" },
    { id: "sponsorblock", label: "SponsorBlock" },
    { id: "metadata", label: "Metadata" },
    { id: "network", label: "Network" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">
            Advanced Download Options
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-xs"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "format" && (
            <FormatTab
              options={localOptions}
              updateOption={updateOption}
            />
          )}

          {activeTab === "subtitles" && (
            <SubtitlesTab
              options={localOptions}
              updateOption={updateOption}
            />
          )}

          {activeTab === "sponsorblock" && (
            <SponsorBlockTab
              options={localOptions}
              updateOption={updateOption}
              toggleSponsorBlockCategory={toggleSponsorBlockCategory}
            />
          )}

          {activeTab === "metadata" && (
            <MetadataTab
              options={localOptions}
              updateOption={updateOption}
            />
          )}

          {activeTab === "network" && (
            <NetworkTab
              options={localOptions}
              updateOption={updateOption}
            />
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 bg-zinc-900/50">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Reset Defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Apply Options
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
