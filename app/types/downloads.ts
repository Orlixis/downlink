export type DownloadStatus =
  | "queued"
  | "fetching"
  | "ready"
  | "downloading"
  | "postprocessing"
  | "stopped"
  | "done"
  | "failed"
  | "canceled";

export type SourceKind = "single" | "playlist_parent" | "playlist_item";

export interface QueueItem {
  id: string;
  source_url: string;
  title: string | null;
  uploader: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: DownloadStatus;
  phase: string | null;
  progress_percent: number | null;
  bytes_downloaded: number | null;
  bytes_total: number | null;
  speed_bps: number | null;
  eta_seconds: number | null;
  preset_id: string;
  output_dir: string;
  final_path: string | null;
  error_message: string | null;
}

export interface PresetInfo {
  id: string;
  name: string;
}

export interface PresetWithHint extends PresetInfo {
  hint: string;
}

export interface AddUrlsOptions {
  preset_id: string;
  output_dir: string;
  parent_id: string | null;
  source_kind: SourceKind;
  title?: string | null;
  uploader?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  stream_url?: string | null;
  referer_url?: string | null;
  subtitles_enabled?: boolean;
  sponsorblock_enabled?: boolean;
}

export interface AddUrlsResult {
  ids: string[];
  urls: string[];
}

export interface FetchMetadataOptions {
  preset_id: string;
  output_dir: string;
}

export interface VideoQualityOption {
  height: number | null;
  label: string;
  filesize_approx: number | null;
  format_string: string;
  is_audio_only: boolean;
}

export interface FetchMetadataResult {
  id: string;
  url: string;
  stream_url?: string | null;
  is_playlist: boolean;
  title: string | null;
  uploader: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  filesize_bytes: number | null;
  playlist_title: string | null;
  playlist_count_hint: number | null;
  available_qualities: VideoQualityOption[];
}

export interface ExpandPlaylistOptions {
  preset_id: string;
  output_dir: string;
}

export interface ExpandPlaylistResult {
  parent_id: string;
  item_ids: string[];
  count: number;
}

export interface PlaylistVideoPreview {
  id: string;
  url: string;
  title: string | null;
  uploader: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
}

export interface PreviewPlaylistResult {
  playlist_title: string | null;
  videos: PlaylistVideoPreview[];
  count: number;
}

export interface UrlPreviewItem {
  url: string;
  loading: boolean;
  data: FetchMetadataResult | null;
  error: string | null;
  qualitiesLoading?: boolean;
  fetchHint?: string;
}

export interface PreviewState {
  loading: boolean;
  url: string | null;
  metadata: FetchMetadataResult | null;
  error: string | null;
}

export interface RawOEmbed {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  duration?: number;
}
