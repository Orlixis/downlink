import type { PresetWithHint } from "./types";

export const PRESETS: PresetWithHint[] = [
  { id: "recommended_best", name: "Best Quality", hint: "Highest quality available" },
  { id: "mp4_1080p", name: "1080p MP4", hint: "Full HD, compatible" },
  { id: "mp4_best", name: "Best MP4", hint: "Best quality in MP4" },
  { id: "audio_m4a", name: "Audio Only", hint: "M4A format" },
  { id: "audio_mp3_320", name: "MP3 320kbps", hint: "High quality audio" },
];

export const DEFAULT_PRESET_ID = "recommended_best";

export const SUPPORTED_SITES = [
  "YouTube",
  "Vimeo",
  "Facebook",
  "Instagram",
  "Twitter",
  "TikTok",
  "Soundcloud",
  "and 1000+ more",
];
