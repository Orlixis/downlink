export type DownlinkEventType =
  | "AppReady"
  | "ClipboardUrlDetected"
  | "MetadataStarted"
  | "MetadataReady"
  | "PlaylistExpanded"
  | "DownloadQueued"
  | "DownloadStarted"
  | "DownloadProgress"
  | "DownloadPostProcessing"
  | "DownloadStopped"
  | "DownloadCanceled"
  | "DownloadCompleted"
  | "DownloadFailed"
  | "ToolUpdateAvailable"
  | "ToolUpdateProgress"
  | "ToolUpdateCompleted"
  | "ToolUpdateFailed"
  | "FetchProgress";

export interface FetchProgressEvent {
  event: "FetchProgress";
  data: {
    url: string;
    hint: string;
  };
}

export interface AppReadyEvent {
  event: "AppReady";
  data: {
    versions: {
      app_version: string;
      yt_dlp_version: string | null;
      ffmpeg_version: string | null;
    };
  };
}

export interface DownloadProgressEvent {
  event: "DownloadProgress";
  data: {
    id: string;
    status: string;
    progress: {
      percent: number | null;
      bytes_downloaded: number | null;
      bytes_total: number | null;
      speed_bps: number | null;
      eta_seconds: number | null;
      phase: {
        name: string;
        detail: string | null;
      } | null;
    };
  };
}

export interface DownloadCompletedEvent {
  event: "DownloadCompleted";
  data: {
    id: string;
    final_path: string;
  };
}

export interface DownloadFailedEvent {
  event: "DownloadFailed";
  data: {
    id: string;
    error_code: string;
    user_message: string;
    actions: Array<{
      kind: string;
      label: string;
    }>;
  };
}

export type DownlinkEvent =
  | AppReadyEvent
  | DownloadProgressEvent
  | DownloadCompletedEvent
  | DownloadFailedEvent
  | FetchProgressEvent
  | { event: DownlinkEventType; data: unknown };
