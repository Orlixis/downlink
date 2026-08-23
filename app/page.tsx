"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDownlink } from "./hooks/useDownlink";
import { useUrlPreviews } from "./hooks/useUrlPreviews";
import { useClipboardWatcher } from "./hooks/useClipboardWatcher";
import { useDropOrbit } from "./hooks/useDropOrbit";
import { usePlaylistDialog } from "./hooks/usePlaylistDialog";
import { SettingsModal } from "./components/SettingsModal";
import { PlaylistDialog } from "./components/PlaylistDialog";
import { HeaderBar } from "./components/HeaderBar";
import { PreviewPanel } from "./components/PreviewPanel";
import { ActionBar } from "./components/ActionBar";
import { DownloadQueue } from "./components/DownloadQueue";
import { Footer } from "./components/Footer";
import { ResizableDivider } from "./components/ResizableDivider";
import { UpdateModal } from "./components/UpdateModal";
import { TrimModal } from "./components/TrimModal";
import { BlackHoleOverlay } from "./components/BlackHoleOverlay";
import { EditTaskModal } from "./components/downloads";
import { toast } from "./components/Toast";
import { PRESETS, DEFAULT_PRESET_ID } from "./constants";
import type { QueueItem, UserSettings } from "./types";

export default function Home() {
  const downlink = useDownlink();

  const [urlInput, setUrlInput] = useState("");
  const [destination, setDestination] = useState("");
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET_ID);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [sponsorBlockEnabled, setSponsorBlockEnabled] = useState(false);
  const [trimEnabled, setTrimEnabled] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isTrimModalOpen, setIsTrimModalOpen] = useState(false);
  const [embedMetaEnabled, setEmbedMetaEnabled] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingTaskItem, setEditingTaskItem] = useState<QueueItem | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>(undefined);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [queueWidth, setQueueWidth] = useState(300);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    extractedUrls,
    rangeGroups,
    allPreviews,
    previewData,
    previewError,
    previewLoading,
    selectedQualityPerUrl,
    setSelectedQualityPerUrl,
    clearPreviews,
  } = useUrlPreviews({
    urlInput,
    presetId,
    destination,
    fetchMetadata: downlink.fetchMetadata,
    fastFetchMetadata: downlink.fastFetchMetadata,
  });

  const { clipboardUrl, dismissClipboardUrl } = useClipboardWatcher({
    isTauri: downlink.isTauri,
  });

  const {
    isDragging,
    orbitingUrls,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    addOrbitingUrls,
    removeOrbitingUrl,
    clearOrbitingUrls,
  } = useDropOrbit();

  const playlist = usePlaylistDialog({
    previewPlaylist: downlink.previewPlaylist,
    addUrls: downlink.addUrls,
    expandPlaylist: downlink.expandPlaylist,
    startAllDownloads: downlink.startAllDownloads,
    presetId,
    destination,
    autoStart: settings?.general.auto_start !== false,
    onSuccess: () => {
      setUrlInput("");
      clearPreviews();
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem("downlink:queue-width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 260 && parsed <= 480) {
        setQueueWidth(parsed);
      }
    }
  }, []);

  const previewDuration = previewData?.duration_seconds ?? 0;

  useEffect(() => {
    if (previewDuration > 0) {
      setTrimStart(0);
      setTrimEnd(previewDuration);
    }
  }, [previewDuration]);

  useEffect(() => {
    if (downlink.updateAvailable.readyToInstall) {
      setIsUpdateModalOpen(true);
    }
  }, [downlink.updateAvailable.readyToInstall]);

  useEffect(() => {
    if (!downlink.isTauri) return;
    downlink.getSettings().then((s) => {
      setSettings(s);
      setDestination(s.general.download_folder);
      setPresetId(s.general.default_preset);
    }).catch(console.error);
  }, [downlink.isTauri, downlink.getSettings]);

  const handlePaste = useCallback(async () => {
    try {
      let text = "";
      if (downlink.isTauri) {
        const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
        text = (await readText()) || "";
      } else {
        text = await navigator.clipboard.readText();
      }
      setUrlInput(text);
      inputRef.current?.focus();
    } catch {
      inputRef.current?.focus();
    }
  }, [downlink.isTauri]);

  const handleDownload = useCallback(async () => {
    if (extractedUrls.length === 0 || isSubmitting) return;

    if (previewData?.is_playlist && allPreviews.length === 1 && rangeGroups.length === 0) {
      playlist.openDialog(allPreviews[0].url, previewData);
      return;
    }

    setIsSubmitting(true);
    setIsAnimatingOut(true);

    const staggerMs = Math.max(0, extractedUrls.length - 1) * 100;
    await new Promise((resolve) => setTimeout(resolve, 1100 + staggerMs));

    try {
      const nonRangeUrlSet = new Set(allPreviews.map((p) => p.url));
      const qualityGroups = new Map<string, string[]>();

      for (const url of extractedUrls) {
        const isNonRange = nonRangeUrlSet.has(url);
        const quality = isNonRange ? selectedQualityPerUrl.get(url) : undefined;
        const groupPreset = quality && quality !== "default" ? `custom:${quality}` : presetId;

        if (!qualityGroups.has(groupPreset)) qualityGroups.set(groupPreset, []);
        qualityGroups.get(groupPreset)!.push(url);
      }

      let hasAnyIds = false;
      const previewMap = new Map(allPreviews.map((p) => [p.url, p.data]));

      for (const [groupPreset, groupUrls] of qualityGroups) {
        let effectivePreset = groupPreset;
        if (trimEnabled && previewDuration > 0 && !previewData?.is_playlist) {
          effectivePreset += `+trim:${trimStart.toFixed(1)}-${trimEnd.toFixed(1)}`;
        }
        if (embedMetaEnabled) {
          effectivePreset += "+meta";
        }

        for (const singleUrl of groupUrls) {
          const itemMeta = previewMap.get(singleUrl) || (allPreviews.length === 1 ? previewData : null);
          const result = await downlink.addUrls(singleUrl, {
            preset_id: effectivePreset,
            output_dir: destination,
            parent_id: null,
            source_kind: "single",
            title: itemMeta?.title ?? null,
            uploader: itemMeta?.uploader ?? null,
            thumbnail_url: itemMeta?.thumbnail_url ?? null,
            duration_seconds: itemMeta?.duration_seconds ?? null,
            stream_url: itemMeta?.stream_url ?? null,
            subtitles_enabled: subtitlesEnabled,
            sponsorblock_enabled: sponsorBlockEnabled,
          });
          if (result.ids.length > 0) hasAnyIds = true;
        }
      }

      if (settings?.general.auto_start !== false && hasAnyIds) {
        await downlink.startAllDownloads();
      }

      setUrlInput("");
      clearPreviews();
      setIsAnimatingOut(false);
      setIsSubmitting(false);

      const count = extractedUrls.length;
      toast.success(count === 1 ? "Added to queue" : `${count} URLs added to queue`);
    } catch (e) {
      console.error("Failed to add download:", e);
      toast.error("Failed to add download");
      setIsSubmitting(false);
      setIsAnimatingOut(false);
    }
  }, [
    extractedUrls,
    isSubmitting,
    previewData,
    allPreviews,
    rangeGroups,
    downlink,
    presetId,
    destination,
    settings,
    selectedQualityPerUrl,
    trimEnabled,
    trimStart,
    trimEnd,
    embedMetaEnabled,
    previewDuration,
    subtitlesEnabled,
    sponsorBlockEnabled,
    clearPreviews,
    playlist,
  ]);

  return (
    <div
      className="relative flex h-screen flex-col bg-transparent text-white"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {(isDragging || (clipboardUrl && (!urlInput.trim() || !urlInput.includes(clipboardUrl))) || orbitingUrls.length > 0) && (
        <BlackHoleOverlay
          mode={isDragging ? "drag" : "clipboard"}
          clipboardUrl={clipboardUrl}
          orbitingUrls={orbitingUrls}
          onDropPackage={(x, y, urls) => {
            addOrbitingUrls(urls, x, y);
            if (clipboardUrl) dismissClipboardUrl(clipboardUrl, false);
          }}
          onAbsorb={(url) => {
            const absorbed = url || clipboardUrl;
            if (absorbed) {
              setUrlInput((prev) => {
                if (!prev) return absorbed;
                if (prev.includes(absorbed)) return prev;
                return `${prev.trim()}\n${absorbed}`;
              });
              dismissClipboardUrl(absorbed, true);
              removeOrbitingUrl(absorbed);
            }
            inputRef.current?.focus();
          }}
          onDismiss={() => {
            if (clipboardUrl) dismissClipboardUrl(clipboardUrl, false);
          }}
        />
      )}

      <HeaderBar
        urlInput={urlInput}
        onUrlChange={(val) => {
          setUrlInput(val);
          if (!val.trim()) clearPreviews();
        }}
        onPaste={handlePaste}
        onSubmit={handleDownload}
        onSettingsClick={() => setSettingsOpen(true)}
        isLoading={previewLoading}
        inputRef={inputRef}
        urlCount={extractedUrls.length}
        updateState={downlink.updateAvailable}
        onUpdateClick={() => setIsUpdateModalOpen(true)}
      />

      <div className={`flex flex-1 ${isAnimatingOut ? "overflow-visible" : "overflow-hidden"}`}>
        <div className="flex-1 flex flex-col">
          <div className={`flex-1 ${isAnimatingOut ? "overflow-visible" : "overflow-y-auto"}`}>
            <div className="flex min-h-full items-center justify-center p-6">
              <PreviewPanel
                previewData={previewData}
                previewLoading={previewLoading}
                previewError={previewError}
                isDragging={isDragging}
                isExiting={isAnimatingOut}
                onClearPreview={() => {
                  setUrlInput("");
                  clearPreviews();
                }}
                allPreviews={allPreviews}
                rangeGroups={rangeGroups}
                selectedQualitiesMap={selectedQualityPerUrl}
                trimEnabled={trimEnabled}
                trimStart={trimStart}
                trimEnd={trimEnd}
                onTrimChange={(s, e) => {
                  setTrimStart(s);
                  setTrimEnd(e);
                }}
                onSelectQuality={(url, q) =>
                  setSelectedQualityPerUrl((prev) => {
                    const next = new Map(prev);
                    if (q === "default") next.delete(url);
                    else next.set(url, q);
                    return next;
                  })
                }
                onSelectQualityForAll={(fmt) =>
                  setSelectedQualityPerUrl((prev) => {
                    const next = new Map(prev);
                    for (const p of allPreviews) {
                      if (fmt === "default") next.delete(p.url);
                      else next.set(p.url, fmt);
                    }
                    return next;
                  })
                }
              />
            </div>
          </div>

          <div id="action-bar-container">
            <ActionBar
              presetId={presetId}
              onPresetChange={setPresetId}
              presets={PRESETS}
              subtitlesEnabled={subtitlesEnabled}
              onSubtitlesToggle={() => setSubtitlesEnabled(!subtitlesEnabled)}
              sponsorBlockEnabled={sponsorBlockEnabled}
              onSponsorBlockToggle={() => setSponsorBlockEnabled(!sponsorBlockEnabled)}
              trimEnabled={trimEnabled}
              onTrimToggle={() => (trimEnabled ? setTrimEnabled(false) : setIsTrimModalOpen(true))}
              trimStart={trimStart}
              trimEnd={trimEnd}
              onTrimChange={(s, e) => {
                setTrimStart(s);
                setTrimEnd(e);
              }}
              duration={previewDuration}
              embedMetaEnabled={embedMetaEnabled}
              onEmbedMetaToggle={() => setEmbedMetaEnabled(!embedMetaEnabled)}
              onDownload={handleDownload}
              isSubmitting={isSubmitting}
              isPlaylist={previewData?.is_playlist ?? false}
              disabled={!urlInput.trim()}
              previewLoading={previewLoading}
            />
          </div>
        </div>

        <ResizableDivider
          width={queueWidth}
          onWidthChange={(w) => {
            setQueueWidth(w);
            localStorage.setItem("downlink:queue-width", String(w));
          }}
          minWidth={260}
          maxWidth={480}
        />
        <div
          id="download-queue-container"
          suppressHydrationWarning
          style={{ width: queueWidth, minWidth: queueWidth, maxWidth: queueWidth }}
          className="flex-shrink-0"
        >
          <DownloadQueue
            queue={downlink.queue}
            history={downlink.history}
            onStop={downlink.stopDownload}
            onCancel={downlink.cancelDownload}
            onRemove={downlink.removeDownload}
            onRetry={downlink.retryDownload}
            onOpen={downlink.openFile}
            onOpenFolder={downlink.openFolder}
            onEdit={setEditingTaskItem}
            onCleanMissing={downlink.cleanMissingDownloads}
            onClearQueue={downlink.clearQueue}
            onClearHistory={downlink.clearHistory}
            onTranscribe={downlink.transcribeFile}
          />
        </div>
      </div>

      <Footer
        appVersion={downlink.appVersion ?? undefined}
        ytDlpVersion={downlink.ytDlpVersion}
        ffmpegVersion={downlink.ffmpegVersion}
        onOpenSettings={(tab) => {
          setSettingsInitialTab(tab);
          setSettingsOpen(true);
        }}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={async (newSettings) => {
          await downlink.saveSettings(newSettings);
          setSettings(newSettings);
          setDestination(newSettings.general.download_folder);
        }}
        currentVersion={downlink.appVersion}
        checkAppUpdate={downlink.checkAppUpdate}
        installAppUpdate={downlink.installAppUpdate}
        restartApp={downlink.restartApp}
        initialTab={settingsInitialTab as Parameters<typeof SettingsModal>[0]["initialTab"]}
      />

      {editingTaskItem && (
        <EditTaskModal
          isOpen={!!editingTaskItem}
          item={editingTaskItem}
          onClose={() => setEditingTaskItem(null)}
          onSave={async (opts) => {
            await downlink.updateDownloadTask(opts);
            if (opts.startImmediately) {
              downlink.retryDownload(opts.id);
            }
          }}
        />
      )}

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateState={downlink.updateAvailable}
        installAppUpdate={downlink.installAppUpdate}
        restartApp={downlink.restartApp}
      />

      <TrimModal
        isOpen={isTrimModalOpen}
        onClose={() => setIsTrimModalOpen(false)}
        previewUrl={allPreviews[0]?.url || previewData?.url || ""}
        streamUrl={previewData?.stream_url || previewData?.url || ""}
        thumbnailUrl={previewData?.thumbnail_url ?? undefined}
        duration={previewDuration}
        initialStart={trimStart}
        initialEnd={trimEnd}
        onSave={(start, end) => {
          setTrimStart(start);
          setTrimEnd(end);
          setTrimEnabled(true);
        }}
      />

      {playlist.playlistDialogData && (
        <PlaylistDialog
          isOpen={playlist.playlistDialogOpen}
          isExiting={playlist.isAnimatingOut}
          onClose={playlist.closeDialog}
          onConfirm={playlist.confirm}
          playlistTitle={playlist.playlistDialogData.metadata.playlist_title ?? "Playlist"}
          videoTitle={playlist.playlistDialogData.metadata.title ?? "Video"}
          videoThumbnail={playlist.playlistDialogData.metadata.thumbnail_url ?? undefined}
          playlistCount={playlist.playlistDialogData.metadata.playlist_count_hint ?? 0}
          playlistVideos={playlist.playlistVideos}
          isLoadingVideos={playlist.isLoadingVideos}
          onLoadPlaylistVideos={playlist.loadVideos}
        />
      )}
    </div>
  );
}
