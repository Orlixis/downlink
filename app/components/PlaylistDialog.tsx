"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  X,
  Play,
  ListVideo,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Download,
  Video,
} from "lucide-react";

interface PlaylistVideo {
  id: string;
  title: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  uploader?: string;
}

interface PlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (downloadPlaylist: boolean, selectedVideoIds?: string[]) => void;
  playlistTitle: string;
  videoTitle: string;
  videoThumbnail?: string;
  playlistCount: number;
  playlistVideos?: PlaylistVideo[];
  isLoadingVideos?: boolean;
  onLoadPlaylistVideos?: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

type ViewMode = "choice" | "select";

export function PlaylistDialog({
  isOpen,
  onClose,
  onConfirm,
  playlistTitle,
  videoTitle,
  videoThumbnail,
  playlistCount,
  playlistVideos = [],
  isLoadingVideos = false,
  onLoadPlaylistVideos,
}: PlaylistDialogProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("choice");
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setViewMode("choice");
      setSelectedVideos(new Set());
      setSelectAll(true);
    }
  }, [isOpen]);

  // Select all videos when playlist is loaded
  useEffect(() => {
    if (playlistVideos.length > 0 && selectAll) {
      setSelectedVideos(new Set(playlistVideos.map((v) => v.id)));
    }
  }, [playlistVideos, selectAll]);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedVideos(new Set());
      setSelectAll(false);
    } else {
      setSelectedVideos(new Set(playlistVideos.map((v) => v.id)));
      setSelectAll(true);
    }
  }, [selectAll, playlistVideos]);

  const handleToggleVideo = useCallback((videoId: string) => {
    setSelectedVideos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
    setSelectAll(false);
  }, []);

  const handleChoosePlaylist = useCallback(() => {
    setViewMode("select");
    if (onLoadPlaylistVideos && playlistVideos.length === 0) {
      onLoadPlaylistVideos();
    }
  }, [onLoadPlaylistVideos, playlistVideos.length]);

  const handleDownloadSelected = useCallback(() => {
    if (selectedVideos.size === playlistVideos.length) {
      // All selected, download entire playlist
      onConfirm(true);
    } else {
      // Partial selection
      onConfirm(true, Array.from(selectedVideos));
    }
  }, [selectedVideos, playlistVideos.length, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="border-b border-zinc-800 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Playlist thumbnail */}
              <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                {videoThumbnail ? (
                  <Image
                    src={videoThumbnail}
                    alt={playlistTitle}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ListVideo className="h-8 w-8 text-zinc-600" />
                  </div>
                )}
                {/* Playlist badge */}
                <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  <ListVideo className="h-3 w-3" />
                  {playlistCount}
                </div>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">
                  {playlistTitle}
                </h2>
                <p className="text-sm text-zinc-400">
                  {playlistCount} videos in playlist
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === "choice" ? (
          /* Initial choice view */
          <div className="p-6 flex-1 overflow-y-auto">
            <p className="text-sm text-zinc-400 mb-6 text-center">
              This video is part of a playlist. What would you like to download?
            </p>

            <div className="space-y-3">
              {/* Single Video Option */}
              <button
                type="button"
                onClick={() => onConfirm(false)}
                className="w-full group rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 text-left transition-all hover:border-zinc-600 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center gap-4">
                  {/* Video thumbnail */}
                  <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
                    {videoThumbnail ? (
                      <Image
                        src={videoThumbnail}
                        alt={videoTitle}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Video className="h-8 w-8 text-zinc-500" />
                      </div>
                    )}
                    {/* Single video indicator */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-8 w-8 text-white" fill="currentColor" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                        Single Video
                      </span>
                    </div>
                    <div className="font-medium text-white truncate">
                      {videoTitle}
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                      Download only this video
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-white transition-colors" />
                </div>
              </button>

              {/* Entire Playlist Option */}
              <button
                type="button"
                onClick={handleChoosePlaylist}
                className="w-full group rounded-xl border-2 border-blue-500/50 bg-blue-500/10 p-4 text-left transition-all hover:border-blue-500 hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center gap-4">
                  {/* Stacked thumbnails effect */}
                  <div className="relative h-16 w-28 flex-shrink-0">
                    <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-zinc-700/50" />
                    <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-lg bg-zinc-700/70" />
                    <div className="relative h-full w-full overflow-hidden rounded-lg bg-zinc-700">
                      {videoThumbnail ? (
                        <Image
                          src={videoThumbnail}
                          alt={playlistTitle}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ListVideo className="h-8 w-8 text-zinc-500" />
                        </div>
                      )}
                      {/* Playlist count overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-xl font-bold text-white">{playlistCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                        Full Playlist
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400 uppercase">
                        Recommended
                      </span>
                    </div>
                    <div className="font-medium text-white">
                      Download all {playlistCount} videos
                    </div>
                    <div className="text-sm text-blue-400/80 mt-1">
                      Choose which videos to include →
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-blue-400 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Video selection view */
          <>
            <div className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between flex-shrink-0 bg-zinc-900/80">
              <button
                type="button"
                onClick={() => setViewMode("choice")}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400">
                  {selectedVideos.size} of {playlistVideos.length} selected
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {selectAll ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingVideos ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="mt-4 text-sm text-zinc-400">Loading playlist videos...</p>
                </div>
              ) : playlistVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ListVideo className="h-12 w-12 text-zinc-700" />
                  <p className="mt-4 text-sm text-zinc-400">No videos found in playlist</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {playlistVideos.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => handleToggleVideo(video.id)}
                      className={`w-full flex items-center gap-3 rounded-lg p-2 text-left transition-all ${selectedVideos.has(video.id)
                          ? "bg-blue-500/20 border border-blue-500/50"
                          : "bg-zinc-800/50 border border-transparent hover:bg-zinc-800"
                        }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${selectedVideos.has(video.id)
                            ? "border-blue-500 bg-blue-500"
                            : "border-zinc-600 bg-transparent"
                          }`}
                      >
                        {selectedVideos.has(video.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>

                      {/* Thumbnail */}
                      <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded bg-zinc-700">
                        {video.thumbnail_url ? (
                          <Image
                            src={video.thumbnail_url}
                            alt={video.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Video className="h-5 w-5 text-zinc-500" />
                          </div>
                        )}
                        {video.duration_seconds && (
                          <div className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[10px] text-white">
                            {formatDuration(video.duration_seconds)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm truncate">
                          {video.title}
                        </div>
                        {video.uploader && (
                          <div className="text-xs text-zinc-400 truncate">
                            {video.uploader}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with download button */}
            <div className="border-t border-zinc-800 px-6 py-4 flex-shrink-0 bg-zinc-900/80">
              <button
                type="button"
                onClick={handleDownloadSelected}
                disabled={selectedVideos.size === 0}
                className="btn-brand w-full rounded-xl py-3 px-4 flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                Download {selectedVideos.size} {selectedVideos.size === 1 ? "Video" : "Videos"}
              </button>
            </div>
          </>
        )}

        {/* Footer for choice view */}
        {viewMode === "choice" && (
          <div className="border-t border-zinc-800 px-6 py-3 flex-shrink-0">
            <p className="text-xs text-zinc-500 text-center">
              You can pause or cancel downloads from the queue at any time
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
