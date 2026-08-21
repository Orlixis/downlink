export interface AdvancedOptionsState {
  formatId: string;
  preferredQuality: string;
  preferredFormat: string;
  filenameTemplate: string;
  subtitlesEnabled: boolean;
  subtitlesLanguage: string;
  subtitlesEmbed: boolean;
  subtitlesAutoCaptions: boolean;
  sponsorBlockEnabled: boolean;
  sponsorBlockMode: "remove" | "mark";
  sponsorBlockCategories: string[];
  embedMetadata: boolean;
  embedThumbnail: boolean;
  writeInfoJson: boolean;
  useProxy: boolean;
  proxyUrl: string;
  rateLimit: string;
  retries: number;
  remuxVideo: boolean;
  preferredRemuxFormat: string;
}

export const DEFAULT_OPTIONS: AdvancedOptionsState = {
  formatId: "",
  preferredQuality: "best",
  preferredFormat: "mp4",
  filenameTemplate: "%(title)s [%(id)s].%(ext)s",
  subtitlesEnabled: false,
  subtitlesLanguage: "en",
  subtitlesEmbed: false,
  subtitlesAutoCaptions: false,
  sponsorBlockEnabled: false,
  sponsorBlockMode: "remove",
  sponsorBlockCategories: ["sponsor"],
  embedMetadata: true,
  embedThumbnail: true,
  writeInfoJson: false,
  useProxy: false,
  proxyUrl: "",
  rateLimit: "",
  retries: 3,
  remuxVideo: false,
  preferredRemuxFormat: "mp4",
};

export const QUALITY_OPTIONS = [
  { value: "best", label: "Best available" },
  { value: "2160", label: "4K (2160p)" },
  { value: "1440", label: "1440p" },
  { value: "1080", label: "1080p" },
  { value: "720", label: "720p" },
  { value: "480", label: "480p" },
  { value: "360", label: "360p" },
  { value: "audio", label: "Audio only" },
];

export const FORMAT_OPTIONS = [
  { value: "mp4", label: "MP4" },
  { value: "mkv", label: "MKV" },
  { value: "webm", label: "WebM" },
  { value: "m4a", label: "M4A (audio)" },
  { value: "mp3", label: "MP3 (audio)" },
  { value: "opus", label: "Opus (audio)" },
];

export const SPONSORBLOCK_CATEGORIES = [
  { id: "sponsor", label: "Sponsor", description: "Paid promotion" },
  { id: "intro", label: "Intro", description: "Intro animation/sequence" },
  { id: "outro", label: "Outro", description: "Outro/end cards" },
  { id: "selfpromo", label: "Self-promo", description: "Self-promotion" },
  { id: "interaction", label: "Interaction", description: "Subscribe reminders" },
  { id: "music_offtopic", label: "Non-music", description: "Non-music in music videos" },
  { id: "preview", label: "Preview", description: "Preview/recap" },
  { id: "filler", label: "Filler", description: "Filler content" },
];

export const SUBTITLE_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ru", label: "Russian" },
];
