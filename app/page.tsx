"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDownlink } from "./hooks/useDownlink";
import { SettingsModal } from "./components/SettingsModal";
import { PlaylistDialog } from "./components/PlaylistDialog";
import { SplashScreen } from "./components/SplashScreen";
import { HeaderBar } from "./components/HeaderBar";
import { PreviewPanel } from "./components/PreviewPanel";
import { ActionBar } from "./components/ActionBar";
import { DownloadQueue } from "./components/DownloadQueue";
import { Footer } from "./components/Footer";
import { PRESETS, DEFAULT_PRESET_ID } from "./constants";
import type { UserSettings, FetchMetadataResult } from "./types";

// Preview data for URLs
interface UrlPreview {
  url: string;
  loading: boolean;
  data: FetchMetadataResult | null;
  error: string | null;
  presetId: string;
}

export default function Home() {
  const downlink = useDownlink();

  // Splash screen state
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  // Form state
  const [urlInput, setUrlInput] = useState("");
  const [destination, setDestination] = useState("");
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET_ID);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [sponsorBlockEnabled, setSponsorBlockEnabled] = useState(false);

  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Playlist dialog state
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [playlistDialogData, setPlaylistDialogData] = useState<{
    url: string;
    metadata: FetchMetadataResult;
  } | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<Array<{
    id: string;
    url: string;
    title: string;
    thumbnail_url?: string;
    duration_seconds?: number;
    uploader?: string;
  }>>([]);
  const [isLoadingPlaylistVideos, setIsLoadingPlaylistVideos] = useState(false);

  // Preview state
  const [urlPreviews, setUrlPreviews] = useState<Map<string, UrlPreview>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract URLs from input
  const extractedUrls = useMemo(() => {
    if (!urlInput.trim()) return [];
    const matches = urlInput.match(/https?:\/\/[^\s]+/g) ?? [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of matches) {
      const u = m.trim();
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
    return out;
  }, [urlInput]);

  // Single preview data
  const previewData = useMemo(() => {
    if (extractedUrls.length === 1) {
      return urlPreviews.get(extractedUrls[0])?.data ?? null;
    }
    return null;
  }, [extractedUrls, urlPreviews]);

  const previewLoading = useMemo(() => {
    if (extractedUrls.length === 1) {
      return urlPreviews.get(extractedUrls[0])?.loading ?? false;
    }
    return false;
  }, [extractedUrls, urlPreviews]);

  const previewError = useMemo(() => {
    if (extractedUrls.length === 1) {
      return urlPreviews.get(extractedUrls[0])?.error ?? null;
    }
    return null;
  }, [extractedUrls, urlPreviews]);

  // Handle splash screen completion
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Load settings on mount
  useEffect(() => {
    if (!downlink.isTauri) {
      setAppReady(true);
      return;
    }
    (async () => {
      try {
        const s = await downlink.getSettings();
        setSettings(s);
        setDestination(s.general.download_folder);
        setPresetId(s.general.default_preset);
        setAppReady(true);
      } catch (e) {
        console.error("Failed to load settings:", e);
        setAppReady(true);
      }
    })();
  }, [downlink.isTauri, downlink.getSettings]);

  // Global keyboard shortcut for Cmd+V / Ctrl+V
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          try {
            const text = await navigator.clipboard.readText();
            if (text && text.includes("http")) {
              setUrlInput(text);
              inputRef.current?.focus();
            }
          } catch {
            // Clipboard access denied
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const text = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
    if (text && text.includes("http")) {
      setUrlInput(text);
      inputRef.current?.focus();
    }
  }, []);

  // Auto-fetch preview when URL changes
  useEffect(() => {
    if (!downlink.isTauri || extractedUrls.length !== 1) return;

    const url = extractedUrls[0];
    const existing = urlPreviews.get(url);
    if (existing) return;

    let cancelled = false;

    const fetchPreview = async () => {
      setUrlPreviews((prev) => {
        const updated = new Map(prev);
        updated.set(url, { url, loading: true, data: null, error: null, presetId });
        return updated;
      });

      try {
        // Create a timeout promise that rejects after 30 seconds
        const fetchPromise = downlink.fetchMetadata(url, {
          preset_id: presetId,
          output_dir: destination,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Preview fetch timed out after 30 seconds. Please try again.")), 30000)
        );

        const result = await Promise.race([fetchPromise, timeoutPromise]);

        if (!cancelled) {
          setUrlPreviews((prev) => {
            const updated = new Map(prev);
            updated.set(url, { url, loading: false, data: result, error: null, presetId });
            return updated;
          });
        }
      } catch (e) {
        if (!cancelled) {
          const errorMessage = e instanceof Error ? e.message : "Failed to fetch preview";
          setUrlPreviews((prev) => {
            const updated = new Map(prev);
            updated.set(url, {
              url,
              loading: false,
              data: null,
              error: errorMessage,
              presetId,
            });
            return updated;
          });
        }
      }
    };

    const timeout = setTimeout(fetchPreview, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [downlink.isTauri, extractedUrls, presetId, destination, urlPreviews, downlink]);

  // Handle paste button
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrlInput(text);
      inputRef.current?.focus();
    } catch {
      inputRef.current?.focus();
    }
  }, []);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!urlInput.trim() || isSubmitting) return;

    // Check if it's a playlist
    if (previewData?.is_playlist && extractedUrls.length === 1) {
      setPlaylistDialogData({
        url: extractedUrls[0],
        metadata: previewData,
      });
      setPlaylistDialogOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await downlink.addUrls(urlInput, {
        preset_id: presetId,
        output_dir: destination,
        parent_id: null,
        source_kind: "single",
        title: previewData?.title ?? null,
        uploader: previewData?.uploader ?? null,
        thumbnail_url: previewData?.thumbnail_url ?? null,
        duration_seconds: previewData?.duration_seconds ?? null,
      });

      if (settings?.general.auto_start !== false && result.ids.length > 0) {
        await downlink.startAllDownloads();
      }

      setUrlInput("");
      setUrlPreviews(new Map());
    } catch (e) {
      console.error("Failed to add download:", e);
    } finally {
      setIsSubmitting(false);
    }
  }, [urlInput, isSubmitting, previewData, extractedUrls, downlink, presetId, destination, settings]);

  // Handle playlist confirm
  const handlePlaylistConfirm = useCallback(async (downloadPlaylist: boolean, selectedVideoIds?: string[]) => {
    if (!playlistDialogData) return;

    setIsSubmitting(true);
    const { url, metadata } = playlistDialogData;

    try {
      if (downloadPlaylist) {
        if (selectedVideoIds && selectedVideoIds.length > 0 && playlistVideos.length > 0) {
          const selectedVideos = playlistVideos.filter((video) =>
            selectedVideoIds.includes(video.id)
          );

          for (const video of selectedVideos) {
            await downlink.addUrls(video.url, {
              preset_id: presetId,
              output_dir: destination,
              parent_id: null,
              source_kind: "single",
              title: video.title ?? null,
              uploader: video.uploader ?? null,
              thumbnail_url: video.thumbnail_url ?? null,
              duration_seconds: video.duration_seconds ?? null,
            });
          }

          if (settings?.general.auto_start !== false) {
            await downlink.startAllDownloads();
          }
        } else {
          await downlink.expandPlaylist(url, {
            preset_id: presetId,
            output_dir: destination,
          });

          if (settings?.general.auto_start !== false) {
            await downlink.startAllDownloads();
          }
        }
      } else {
        await downlink.addUrls(url, {
          preset_id: presetId,
          output_dir: destination,
          parent_id: null,
          source_kind: "single",
          title: metadata.title ?? null,
          uploader: metadata.uploader ?? null,
          thumbnail_url: metadata.thumbnail_url ?? null,
          duration_seconds: metadata.duration_seconds ?? null,
        });

        if (settings?.general.auto_start !== false) {
          await downlink.startAllDownloads();
        }
      }

      setUrlInput("");
      setUrlPreviews(new Map());
    } catch (e) {
      console.error("Failed to handle playlist:", e);
    } finally {
      setIsSubmitting(false);
      setPlaylistDialogOpen(false);
      setPlaylistDialogData(null);
      setPlaylistVideos([]);
    }
  }, [playlistDialogData, playlistVideos, downlink, presetId, destination, settings]);

  // Load playlist videos
  const handleLoadPlaylistVideos = useCallback(async () => {
    if (!playlistDialogData) return;

    setIsLoadingPlaylistVideos(true);
    try {
      const result = await downlink.previewPlaylist(playlistDialogData.url);

      if (result.videos && result.videos.length > 0) {
        const videos = result.videos.map((video) => ({
          id: video.id,
          url: video.url,
          title: video.title ?? "Untitled",
          thumbnail_url: video.thumbnail_url ?? undefined,
          duration_seconds: video.duration_seconds ?? undefined,
          uploader: video.uploader ?? undefined,
        }));
        setPlaylistVideos(videos);
      }
    } catch (e) {
      console.error("Failed to load playlist videos:", e);
    } finally {
      setIsLoadingPlaylistVideos(false);
    }
  }, [playlistDialogData, downlink]);

  // Save settings
  const handleSaveSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      await downlink.saveSettings(newSettings);
      setSettings(newSettings);
      setDestination(newSettings.general.download_folder);
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }, [downlink]);

  // Clear preview
  const handleClearPreview = useCallback(() => {
    setUrlInput("");
    setUrlPreviews(new Map());
  }, []);

  // Show splash screen while app is loading
  if (showSplash || !appReady) {
    return <SplashScreen onComplete={handleSplashComplete} minimumDuration={2000} />;
  }

  return (
    <div
      className={`flex h-screen flex-col bg-zinc-950 text-white ${isDragging ? "ring-2 ring-inset ring-blue-500" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header bar */}
      <HeaderBar
        urlInput={urlInput}
        onUrlChange={setUrlInput}
        onPaste={handlePaste}
        onSubmit={handleDownload}
        onSettingsClick={() => setSettingsOpen(true)}
        isLoading={previewLoading}
        inputRef={inputRef}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left side - Preview or Empty state */}
        <div className="flex-1 flex flex-col border-r border-zinc-800">
          {/* Preview area */}
          <div className="flex-1 flex items-center justify-center p-8">
            <PreviewPanel
              previewData={previewData}
              previewLoading={previewLoading}
              previewError={previewError}
              isDragging={isDragging}
              onClearPreview={handleClearPreview}
            />
          </div>

          {/* Bottom action bar */}
          {(previewData || urlInput.trim()) && (
            <ActionBar
              presetId={presetId}
              onPresetChange={setPresetId}
              presets={PRESETS}
              subtitlesEnabled={subtitlesEnabled}
              onSubtitlesToggle={() => setSubtitlesEnabled(!subtitlesEnabled)}
              sponsorBlockEnabled={sponsorBlockEnabled}
              onSponsorBlockToggle={() => setSponsorBlockEnabled(!sponsorBlockEnabled)}
              onDownload={handleDownload}
              isSubmitting={isSubmitting}
              isPlaylist={previewData?.is_playlist ?? false}
              disabled={!urlInput.trim()}
              previewLoading={previewLoading}
            />
          )}
        </div>

        {/* Right side - Download queue */}
        <DownloadQueue
          queue={downlink.queue}
          history={downlink.history}
          showHistory={showHistory}
          onShowHistoryChange={setShowHistory}
          onStop={downlink.stopDownload}
          onCancel={downlink.cancelDownload}
          onRetry={downlink.retryDownload}
          onOpen={downlink.openFile}
          onOpenFolder={downlink.openFolder}
          onClearQueue={downlink.clearQueue}
          onClearHistory={downlink.clearHistory}
        />
      </div>

      {/* Footer */}
      <Footer appVersion={downlink.appVersion ?? undefined} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        currentVersion={downlink.appVersion}
        checkAppUpdate={downlink.checkAppUpdate}
        installAppUpdate={downlink.installAppUpdate}
        restartApp={downlink.restartApp}
      />

      {/* Playlist Dialog */}
      {playlistDialogData && (
        <PlaylistDialog
          isOpen={playlistDialogOpen}
          onClose={() => {
            setPlaylistDialogOpen(false);
            setPlaylistVideos([]);
          }}
          onConfirm={handlePlaylistConfirm}
          playlistTitle={playlistDialogData.metadata.playlist_title ?? "Playlist"}
          videoTitle={playlistDialogData.metadata.title ?? "Video"}
          videoThumbnail={playlistDialogData.metadata.thumbnail_url ?? undefined}
          playlistCount={playlistDialogData.metadata.playlist_count_hint ?? 0}
          playlistVideos={playlistVideos}
          isLoadingVideos={isLoadingPlaylistVideos}
          onLoadPlaylistVideos={handleLoadPlaylistVideos}
        />
      )}
    </div>
  );
}
