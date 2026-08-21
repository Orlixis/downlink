import type { DownloadStatus } from "./downloads";

export function normalizeBareUrls(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part)) return part;
      if (/^https?:\/\//i.test(part) || /^magnet:\?/i.test(part)) return part;
      if (
        /^[a-zA-Z0-9][a-zA-Z0-9\-]*(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}(?:\/[^\s]*)?$/.test(
          part
        ) &&
        !part.includes(":")
      ) {
        return `https://${part}`;
      }
      return part;
    })
    .join("");
}

export function expandUrlPattern(url: string): string[] {
  const match = /\[(\d+)-(\d+)\]/.exec(url);
  if (!match) return [url];

  const raw1 = match[1];
  const raw2 = match[2];
  const start = parseInt(raw1, 10);
  const end = parseInt(raw2, 10);

  if (isNaN(start) || isNaN(end) || start > end || end - start >= 500) {
    return [url];
  }

  const padLen =
    raw1.startsWith("0") ? raw1.length
      : raw2.startsWith("0") ? raw2.length
        : 0;

  return Array.from({ length: end - start + 1 }, (_, k) => {
    const i = start + k;
    const num = padLen > 0 ? String(i).padStart(padLen, "0") : String(i);
    return url.replace(/\[\d+-\d+\]/, num);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatSpeed(bps: number): string {
  return `${formatBytes(bps)}/s`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s left`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m left`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m left`;
}

export function getStatusColor(status: DownloadStatus): string {
  switch (status) {
    case "queued":
    case "ready":
      return "text-zinc-500";
    case "fetching":
    case "downloading":
    case "postprocessing":
      return "text-blue-500";
    case "stopped":
      return "text-yellow-500";
    case "done":
      return "text-green-500";
    case "failed":
      return "text-red-500";
    case "canceled":
      return "text-zinc-400";
    default:
      return "text-zinc-500";
  }
}

export function getStatusLabel(status: DownloadStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "fetching":
      return "Fetching info…";
    case "ready":
      return "Ready";
    case "downloading":
      return "Downloading";
    case "postprocessing":
      return "Processing…";
    case "stopped":
      return "Stopped";
    case "done":
      return "Completed";
    case "failed":
      return "Failed";
    case "canceled":
      return "Canceled";
    default:
      return status;
  }
}
