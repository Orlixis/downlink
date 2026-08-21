export type ToolStatus = "ok" | "outdated" | "missing" | "broken";

export interface ToolInfo {
  tool: string;
  path: string;
  version: string | null;
  status: ToolStatus;
  is_bundled: boolean;
  last_checked: string | null;
}

export interface ToolchainStatus {
  yt_dlp: ToolInfo | null;
  ffmpeg: ToolInfo | null;
  ffprobe: ToolInfo | null;
  overall_status: ToolStatus;
}

export interface AppUpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string | null;
  release_notes: string | null;
  download_url: string | null;
}

export type WhisperModel = "tiny" | "base" | "small" | "medium" | "large_v3";

export interface TranscriptionSegment {
  start_seconds: number;
  end_seconds: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  language?: string | null;
  segments: TranscriptionSegment[];
  duration_seconds?: number | null;
}
