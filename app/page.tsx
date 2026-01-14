"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDownlink } from "./hooks/useDownlink";
import { SettingsModal } from "./components/SettingsModal";
import { PlaylistDialog } from "./components/PlaylistDialog";
import type { PresetWithHint, UserSettings, FetchMetadataResult, QueueItem } from "./types";
import { formatBytes, formatDuration } from "./types";
import Image from "next/image";

// Preview data for URLs
interface UrlPreview {
  url: string;
  loading: boolean;
  data: FetchMetadataResult | null;
  error: string | null;
  presetId: string;
}

const PRESETS: PresetWithHint[] = [
  { id: "recommended_best", name: "Best Quality", hint: "Highest quality available" },
  { id: "mp4_1080p", name: "1080p MP4", hint: "Full HD, compatible" },
  { id: "mp4_best", name: "Best MP4", hint: "Best quality in MP4" },
  { id: "audio_m4a", name: "Audio Only", hint: "M4A format" },
  { id: "audio_mp3_320", name: "MP3 320kbps", hint: "High quality audio" },
];

// Circular progress component like PullTube
function CircularProgress({ percent, size = 120 }: { percent: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-zinc-700"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-blue-500 transition-all duration-300"
      />
    </svg>
  );
}

// Download item component - compact list style like Folx
function DownloadItem({
  item,
  onStop,
  onCancel,
  onRetry,
  onOpen,
  onOpenFolder,
}: {
  item: QueueItem;
  onStop: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onOpen: (path: string) => void;
  onOpenFolder: (path: string) => void;
}) {
  const isActive = item.status === "downloading" || item.status === "fetching";
  const isDone = item.status === "done";
  const isFailed = item.status === "failed";
  const isStopped = item.status === "stopped";
  const progress = item.progress_percent ?? 0;

  return (
    <div className="group flex items-center gap-3 rounded-xl bg-zinc-800/50 p-3 transition-all hover:bg-zinc-800">
      {/* Thumbnail with progress overlay */}
      <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
        {item.thumbnail_url ? (
          <Image
            src={item.thumbnail_url}
            alt={item.title || "Video"}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-6 w-6 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
        {/* Progress overlay for active downloads */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="relative h-8 w-8">
              <CircularProgress percent={progress} size={32} />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        )}
        {/* Done overlay */}
        {isDone && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {/* Failed overlay */}
        {isFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate text-sm">
          {item.title || "Untitled"}
        </div>
        <div className="text-xs text-zinc-400 truncate">
          {item.uploader || item.source_url}
        </div>
        {/* Status line */}
        <div className="flex items-center gap-2 mt-1">
          {isActive && (
            <>
              <div className="h-1 flex-1 max-w-[120px] rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-400">
                {item.speed_bps ? `${formatBytes(item.speed_bps)}/s` : ""}
                {item.eta_seconds ? ` · ${Math.ceil(item.eta_seconds / 60)}m left` : ""}
              </span>
            </>
          )}
          {isDone && (
            <span className="text-[10px] text-green-400 font-medium">Completed</span>
          )}
          {isFailed && (
            <span className="text-[10px] text-red-400 font-medium">Failed</span>
          )}
          {isStopped && (
            <span className="text-[10px] text-yellow-400 font-medium">Paused</span>
          )}
          {item.status === "queued" && (
            <span className="text-[10px] text-zinc-500 font-medium">Queued</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isActive && (
          <button
            onClick={() => onStop(item.id)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Pause"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </button>
        )}
        {(isStopped || item.status === "queued") && (
          <button
            onClick={() => onRetry(item.id)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Resume"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
        {isFailed && (
          <button
            onClick={() => onRetry(item.id)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Retry"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        {isDone && item.final_path && (
          <>
            <button
              onClick={() => onOpen(item.final_path!)}
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Open"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={() => onOpenFolder(item.final_path!)}
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Show in folder"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
          </>
        )}
        <button
          onClick={() => onCancel(item.id)}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
          title="Remove"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const downlink = useDownlink();

  // Form state
  const [urlInput, setUrlInput] = useState("");
  const [destination, setDestination] = useState("");
  const [presetId, setPresetId] = useState<string>("recommended_best");
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

  // Load settings on mount
  useEffect(() => {
    if (!downlink.isTauri) return;
    (async () => {
      try {
        const s = await downlink.getSettings();
        setSettings(s);
        setDestination(s.general.download_folder);
        setPresetId(s.general.default_preset);
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    })();
  }, [downlink.isTauri, downlink.getSettings]);

  // Global keyboard shortcut for Cmd+V / Ctrl+V
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check for Cmd+V (Mac) or Ctrl+V (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        // Only handle if not already focused on an input
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          try {
            const text = await navigator.clipboard.readText();
            if (text && text.includes("http")) {
              setUrlInput(text);
              inputRef.current?.focus();
            }
          } catch {
            // Clipboard access denied, ignore
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

    // Check for URLs in dropped data
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
        const result = await downlink.fetchMetadata(url, {
          preset_id: presetId,
          output_dir: destination,
        });
        if (!cancelled) {
          setUrlPreviews((prev) => {
            const updated = new Map(prev);
            updated.set(url, { url, loading: false, data: result, error: null, presetId });
            return updated;
          });
        }
      } catch (e) {
        if (!cancelled) {
          setUrlPreviews((prev) => {
            const updated = new Map(prev);
            updated.set(url, {
              url,
              loading: false,
              data: null,
              error: e instanceof Error ? e.message : "Failed to fetch",
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
  }, [downlink.isTauri, extractedUrls.join(","), presetId, destination]);

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

  // Active and completed counts
  const activeCount = downlink.queue.filter(
    (q) => q.status === "downloading" || q.status === "fetching" || q.status === "queued"
  ).length;
  const completedCount = downlink.history.length;

  return (
    <div
      className={`flex h-screen flex-col bg-zinc-950 text-white ${isDragging ? "ring-2 ring-inset ring-blue-500" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header bar - like Folx */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
        {/* Add button */}
        <button
          onClick={handlePaste}
          className="btn-brand flex h-9 w-9 items-center justify-center rounded-lg"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* URL Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDownload()}
            placeholder="Paste video URL here..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          {previewLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-500" />
            </div>
          )}
        </div>

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left side - Preview or Empty state */}
        <div className="flex-1 flex flex-col border-r border-zinc-800">
          {/* Preview area */}
          <div className="flex-1 flex items-center justify-center p-8">
            {previewData ? (
              /* Video preview like PullTube */
              <div className="text-center max-w-md">
                {/* Large thumbnail */}
                <div className="relative mx-auto mb-6 h-48 w-80 overflow-hidden rounded-xl bg-zinc-800 shadow-2xl">
                  {previewData.thumbnail_url ? (
                    <Image
                      src={previewData.thumbnail_url}
                      alt={previewData.title || "Video"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg className="h-16 w-16 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  {/* Duration badge */}
                  {previewData.duration_seconds && (
                    <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-xs font-medium text-white">
                      {formatDuration(previewData.duration_seconds)}
                    </div>
                  )}
                  {/* Playlist badge */}
                  {previewData.is_playlist && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-blue-600/90 px-2 py-0.5 text-xs font-medium text-white">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 4a1 1 0 011-1h11a1 1 0 110 2H3a1 1 0 01-1-1zm0 4a1 1 0 011-1h11a1 1 0 110 2H3a1 1 0 01-1-1zm0 4a1 1 0 011-1h7a1 1 0 110 2H3a1 1 0 01-1-1z" />
                      </svg>
                      {previewData.playlist_count_hint ?? "?"} videos
                    </div>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                  {previewData.title || "Untitled"}
                </h2>

                {/* Uploader and details */}
                <p className="text-sm text-zinc-400 mb-4">
                  {previewData.uploader}
                  {previewData.filesize_bytes && (
                    <span> · {formatBytes(previewData.filesize_bytes)}</span>
                  )}
                </p>

                {/* Clear button */}
                <button
                  onClick={() => {
                    setUrlInput("");
                    setUrlPreviews(new Map());
                  }}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Clear preview
                </button>
              </div>
            ) : previewError ? (
              /* Error state */
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                  <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Failed to fetch preview</h3>
                <p className="text-sm text-zinc-400 max-w-xs">{previewError}</p>
              </div>
            ) : previewLoading ? (
              /* Loading state */
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-zinc-700 border-t-blue-500" />
                <h3 className="text-lg font-medium text-white mb-2">Fetching preview...</h3>
                <p className="text-sm text-zinc-400">Getting video information</p>
              </div>
            ) : isDragging ? (
              /* Drag overlay state */
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-dashed border-blue-500 bg-blue-500/10">
                  <svg className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-blue-400 mb-2">
                  Drop URL Here
                </h1>
                <p className="text-zinc-400">
                  Release to add video to download
                </p>
              </div>
            ) : (
              /* Empty state - like PullTube */
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-3">
                  Paste or Drop Video URLs Here
                </h1>
                <p className="text-zinc-400 mb-8 max-w-md">
                  Supports YouTube, Vimeo, Facebook, Instagram, Twitter,
                  TikTok, Soundcloud, and 1000+ more sites
                </p>
                <div className="flex items-center justify-center gap-2 text-zinc-500">
                  <kbd className="rounded bg-zinc-800 px-2 py-1 text-xs">⌘V</kbd>
                  <span className="text-sm">to paste from clipboard</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom action bar - like PullTube */}
          {(previewData || urlInput.trim()) && (
            <div className="border-t border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                {/* Quick toggles */}
                <button
                  onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${subtitlesEnabled
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                >
                  CC
                </button>
                <button
                  onClick={() => setSponsorBlockEnabled(!sponsorBlockEnabled)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${sponsorBlockEnabled
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                >
                  SB
                </button>

                {/* Preset selector */}
                <select
                  value={presetId}
                  onChange={(e) => setPresetId(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Download button */}
                <button
                  onClick={handleDownload}
                  disabled={isSubmitting || !urlInput.trim()}
                  className="btn-brand flex-1 max-w-xs rounded-xl py-3 px-6 text-sm"
                >
                  {isSubmitting ? "Adding..." : previewData?.is_playlist ? "Download Playlist" : "Download video"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right side - Download list like Folx */}
        <div className="w-80 flex flex-col bg-zinc-900/50">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setShowHistory(false)}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${!showHistory
                ? "text-white border-b-2 border-blue-500"
                : "text-zinc-400 hover:text-white"
                }`}
            >
              Downloads ({activeCount})
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${showHistory
                ? "text-white border-b-2 border-blue-500"
                : "text-zinc-400 hover:text-white"
                }`}
            >
              History ({completedCount})
            </button>
          </div>

          {/* Download list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!showHistory ? (
              /* Downloads tab */
              downlink.queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <svg className="h-12 w-12 text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <p className="text-sm text-zinc-500">No active downloads</p>
                  <p className="text-xs text-zinc-600 mt-1">Paste a URL to get started</p>
                </div>
              ) : (
                downlink.queue.map((item) => (
                  <DownloadItem
                    key={item.id}
                    item={item}
                    onStop={downlink.stopDownload}
                    onCancel={downlink.cancelDownload}
                    onRetry={downlink.retryDownload}
                    onOpen={downlink.openFile}
                    onOpenFolder={downlink.openFolder}
                  />
                ))
              )
            ) : (
              /* History tab */
              downlink.history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <svg className="h-12 w-12 text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-zinc-500">No history yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Completed downloads appear here</p>
                </div>
              ) : (
                downlink.history.map((item) => (
                  <DownloadItem
                    key={item.id}
                    item={item}
                    onStop={downlink.stopDownload}
                    onCancel={downlink.cancelDownload}
                    onRetry={downlink.retryDownload}
                    onOpen={downlink.openFile}
                    onOpenFolder={downlink.openFolder}
                  />
                ))
              )
            )}
          </div>

          {/* Bottom actions */}
          {((!showHistory && downlink.queue.length > 0) || (showHistory && downlink.history.length > 0)) && (
            <div className="border-t border-zinc-800 p-3">
              <button
                onClick={() => {
                  if (showHistory) {
                    downlink.clearHistory();
                  } else {
                    downlink.clearQueue();
                  }
                }}
                className="w-full rounded-lg bg-zinc-800 py-2 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                {showHistory ? "Clear History" : "Clear Queue"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-4 py-2 text-center text-xs text-zinc-500">
        Downlink v{downlink.appVersion ?? "0.1.9"} · Powered by yt-dlp
      </div>

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
