"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  X,
  Settings,
  FileVideo,
  Scissors,
  Subtitles,
  RefreshCw,
  Globe,
  Save,
  Loader2,
  Mic,
} from "lucide-react";
import type { UserSettings, AppUpdateInfo } from "@/app/types";
import { useModalAnimation } from "@/app/hooks/useModalAnimation";
import {
  GeneralTab,
  FormatsTab,
  SponsorBlockTab,
  SubtitlesTab,
  UpdatesTab,
  NetworkTab,
  TranscriptionTab,
} from "./tabs";

type TabId =
  | "general"
  | "formats"
  | "sponsorblock"
  | "subtitles"
  | "updates"
  | "network"
  | "transcription";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings | null;
  onSave: (settings: UserSettings) => Promise<void>;
  currentVersion: string | null;
  checkAppUpdate: () => Promise<AppUpdateInfo>;
  installAppUpdate: () => Promise<void>;
  restartApp: () => Promise<void>;
  initialTab?: TabId;
}

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "formats", label: "Formats", icon: FileVideo },
  { id: "sponsorblock", label: "SponsorBlock", icon: Scissors },
  { id: "subtitles", label: "Subtitles", icon: Subtitles },
  { id: "updates", label: "Updates", icon: RefreshCw },
  { id: "network", label: "Network", icon: Globe },
  { id: "transcription", label: "Transcription", icon: Mic },
];

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  currentVersion,
  checkAppUpdate,
  installAppUpdate,
  restartApp,
  initialTab,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [localSettings, setLocalSettings] = useState<UserSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { renderState } = useModalAnimation({
    isOpen,
    onClose,
    targetId: "settings-button",
    modalRef,
    backdropRef,
    contentRef,
  });

  useEffect(() => {
    if (isOpen && settings) {
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
      setError(null);
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, settings, initialTab]);

  const handleSave = useCallback(async () => {
    if (!localSettings) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(localSettings);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }, [localSettings, onSave, onClose]);

  const updateGeneral = useCallback(
    <K extends keyof UserSettings["general"]>(
      key: K,
      value: UserSettings["general"][K]
    ) => {
      setLocalSettings((prev) =>
        prev ? { ...prev, general: { ...prev.general, [key]: value } } : prev
      );
    },
    []
  );

  const updateFormats = useCallback(
    <K extends keyof UserSettings["formats"]>(
      key: K,
      value: UserSettings["formats"][K]
    ) => {
      setLocalSettings((prev) =>
        prev ? { ...prev, formats: { ...prev.formats, [key]: value } } : prev
      );
    },
    []
  );

  const updateSponsorblock = useCallback(
    <K extends keyof UserSettings["sponsorblock"]>(
      key: K,
      value: UserSettings["sponsorblock"][K]
    ) => {
      setLocalSettings((prev) =>
        prev
          ? { ...prev, sponsorblock: { ...prev.sponsorblock, [key]: value } }
          : prev
      );
    },
    []
  );

  const updateSubtitles = useCallback(
    <K extends keyof UserSettings["subtitles"]>(
      key: K,
      value: UserSettings["subtitles"][K]
    ) => {
      setLocalSettings((prev) =>
        prev ? { ...prev, subtitles: { ...prev.subtitles, [key]: value } } : prev
      );
    },
    []
  );

  const updateNetwork = useCallback(
    <K extends keyof UserSettings["network"]>(
      key: K,
      value: UserSettings["network"][K]
    ) => {
      setLocalSettings((prev) =>
        prev ? { ...prev, network: { ...prev.network, [key]: value } } : prev
      );
    },
    []
  );

  const updateTranscription = useCallback(
    <K extends keyof UserSettings["transcription"]>(
      key: K,
      value: UserSettings["transcription"][K]
    ) => {
      setLocalSettings((prev) =>
        prev
          ? {
              ...prev,
              transcription: { ...prev.transcription, [key]: value },
            }
          : prev
      );
    },
    []
  );

  const toggleSponsorblockCategory = useCallback((category: string) => {
    setLocalSettings((prev) => {
      if (!prev) return prev;
      const categories = prev.sponsorblock.categories;
      const newCategories = categories.includes(category)
        ? categories.filter((c) => c !== category)
        : [...categories, category];
      return {
        ...prev,
        sponsorblock: { ...prev.sponsorblock, categories: newCategories },
      };
    });
  }, []);

  if (!renderState) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div ref={contentRef} className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Preferences</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-44 border-r border-zinc-800 bg-zinc-900/50 p-2 space-y-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            {localSettings && activeTab === "general" && (
              <GeneralTab
                settings={localSettings.general}
                updateGeneral={updateGeneral}
              />
            )}

            {localSettings && activeTab === "formats" && (
              <FormatsTab
                settings={localSettings.formats}
                updateFormats={updateFormats}
              />
            )}

            {localSettings && activeTab === "sponsorblock" && (
              <SponsorBlockTab
                settings={localSettings.sponsorblock}
                updateSponsorblock={updateSponsorblock}
                toggleSponsorblockCategory={toggleSponsorblockCategory}
              />
            )}

            {localSettings && activeTab === "subtitles" && (
              <SubtitlesTab
                settings={localSettings.subtitles}
                updateSubtitles={updateSubtitles}
              />
            )}

            {activeTab === "updates" && (
              <UpdatesTab
                currentVersion={currentVersion}
                checkAppUpdate={checkAppUpdate}
                installAppUpdate={installAppUpdate}
                restartApp={restartApp}
              />
            )}

            {localSettings && activeTab === "network" && (
              <NetworkTab
                settings={localSettings.network}
                updateNetwork={updateNetwork}
              />
            )}

            {localSettings && activeTab === "transcription" && (
              <TranscriptionTab
                settings={localSettings.transcription}
                updateTranscription={updateTranscription}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-zinc-800 bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
