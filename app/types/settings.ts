export type TranscriptionProvider = "groq" | "open_a_i" | "gemini";

export const TRANSCRIPTION_PROVIDERS: {
  id: TranscriptionProvider;
  label: string;
  note: string;
  keyLabel: string;
  keyLink: string;
}[] = [
  {
    id: "groq",
    label: "Groq (Free)",
    note: "Fast, free tier · Whisper large-v3",
    keyLabel: "console.groq.com → API Keys",
    keyLink: "https://console.groq.com/keys",
  },
  {
    id: "open_a_i",
    label: "OpenAI",
    note: "Paid · whisper-1 · $0.006/min",
    keyLabel: "platform.openai.com → API Keys",
    keyLink: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    note: "Free tier · Gemini 1.5 Flash",
    keyLabel: "aistudio.google.com → Get API key",
    keyLink: "https://aistudio.google.com/app/apikey",
  },
];

export interface TranscriptionSettings {
  provider: TranscriptionProvider;
  api_key: string;
}

export interface GeneralSettings {
  download_folder: string;
  default_preset: string;
  concurrency: number;
  auto_start: boolean;
  notify_on_complete: boolean;
  minimize_to_tray: boolean;
  start_minimized: boolean;
  remember_window_state: boolean;
  show_advanced_by_default: boolean;
}

export interface FormatSettings {
  prefer_mp4: boolean;
  max_video_height: number;
  preferred_video_codec: string;
  preferred_audio_codec: string;
  embed_metadata: boolean;
  embed_thumbnail: boolean;
  write_info_json: boolean;
  filename_template: string;
}

export interface SponsorBlockSettings {
  enabled_by_default: boolean;
  mode: string;
  categories: string[];
}

export interface SubtitleSettings {
  enabled_by_default: boolean;
  default_language: string;
  include_auto_captions: boolean;
  embed_subtitles: boolean;
  preferred_format: string;
}

export interface UpdateSettings {
  auto_update_app: boolean;
  auto_update_ytdlp: boolean;
  auto_update_ffmpeg: boolean;
  check_interval_hours: number;
  last_checked: string | null;
}

export interface PrivacySettings {
  cookie_mode: string;
  cookies_path: string | null;
  clear_cookies_on_exit: boolean;
  keep_history: boolean;
  max_history_entries: number;
}

export interface NetworkSettings {
  use_proxy: boolean;
  proxy_url: string;
  rate_limit_bps: number;
  retries: number;
  concurrent_fragments: number;
  socket_timeout: number;
}

export interface UserSettings {
  general: GeneralSettings;
  formats: FormatSettings;
  sponsorblock: SponsorBlockSettings;
  subtitles: SubtitleSettings;
  updates: UpdateSettings;
  privacy: PrivacySettings;
  network: NetworkSettings;
  transcription: TranscriptionSettings;
}

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  is_maximized: boolean;
}

export interface SettingsModalState {
  isOpen: boolean;
  activeTab:
    | "general"
    | "formats"
    | "sponsorblock"
    | "subtitles"
    | "updates"
    | "privacy"
    | "network";
}
