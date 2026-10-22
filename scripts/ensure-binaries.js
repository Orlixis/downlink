#!/usr/bin/env node

/**
 * ensure-binaries.js
 *
 * Automatically verifies and updates local sidecar binaries (yt-dlp, ffmpeg, ffprobe)
 * before dev and build. Uses the exact official release URLs configured in GitHub workflows.
 *
 * Runs automatically via `predev` and `prebuild` in package.json.
 * Can be run manually with `--force` to force an immediate re-check & update:
 *   node scripts/ensure-binaries.js --force
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const BINARIES_DIR = path.join(ROOT_DIR, "src-tauri", "binaries");
const DEBUG_DIR = path.join(ROOT_DIR, "src-tauri", "target", "debug");
const STATE_FILE = path.join(BINARIES_DIR, ".state.json");

// Check interval in milliseconds (default: check for new releases at most once every 12 hours)
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

const FORCE = process.argv.includes("--force") || process.argv.includes("-f");

function getTargetTriple() {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === "darwin") {
    return arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
  } else if (platform === "win32") {
    return "x86_64-pc-windows-msvc";
  } else if (platform === "linux") {
    return arch === "arm64" ? "aarch64-unknown-linux-gnu" : "x86_64-unknown-linux-gnu";
  }
  throw new Error(`Unsupported platform: ${platform} (${arch})`);
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch {}
  return { lastChecked: 0, versions: {} };
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.warn("[binaries] Failed to save state file:", err.message);
  }
}

async function getLatestReleaseTag(repoUrl, timeoutMs = 4000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${repoUrl}/releases/latest`, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
    });
    clearTimeout(timer);

    const location = res.headers.get("location");
    if (location) {
      const match = location.match(/\/tag\/([^/?#]+)$/);
      if (match) return match[1];
    }
  } catch (err) {
    // Non-fatal (offline, network timeout, rate limit)
  }
  return null;
}

async function downloadFile(url, destPath) {
  console.log(`[binaries] Downloading: ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} fetching ${url}`);
  }
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
  if (process.platform !== "win32") {
    fs.chmodSync(destPath, 0o755);
  }
  console.log(`[binaries] Saved to: ${destPath}`);
}

async function ensureYtDlp(targetTriple, state) {
  const isWin = process.platform === "win32";
  const ext = isWin ? ".exe" : "";
  const binaryFileName = `yt-dlp-${targetTriple}${ext}`;
  const binaryPath = path.join(BINARIES_DIR, binaryFileName);

  const exists = fs.existsSync(binaryPath);
  const now = Date.now();
  const shouldCheck = FORCE || !exists || (now - (state.lastChecked || 0) > CHECK_INTERVAL_MS);

  let latestTag = null;
  if (shouldCheck) {
    latestTag = await getLatestReleaseTag("https://github.com/yt-dlp/yt-dlp");
  }

  const currentVersion = state.versions["yt-dlp"];
  const needsUpdate = !exists || (latestTag && latestTag !== currentVersion);

  if (needsUpdate) {
    console.log(`[binaries] Updating yt-dlp ${currentVersion || "none"} -> ${latestTag || "latest"}...`);
    let downloadUrl = "";
    if (process.platform === "darwin") {
      downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";
    } else if (process.platform === "win32") {
      downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
    } else if (process.platform === "linux") {
      downloadUrl = os.arch() === "arm64"
        ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64"
        : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";
    }

    const tempFile = path.join(BINARIES_DIR, `.tmp-${binaryFileName}`);
    try {
      await downloadFile(downloadUrl, tempFile);
      fs.renameSync(tempFile, binaryPath);
      state.versions["yt-dlp"] = latestTag || "latest";
    } catch (err) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      if (!exists) throw err;
      console.warn(`[binaries] Could not update yt-dlp: ${err.message}. Using existing binary.`);
    }
  }

  // Sync to debug folder if it exists
  const debugTarget = path.join(DEBUG_DIR, `yt-dlp${ext}`);
  syncToDebug(binaryPath, debugTarget);
}

async function ensureFfmpegAndProbe(targetTriple, state) {
  const isWin = process.platform === "win32";
  const ext = isWin ? ".exe" : "";
  const ffmpegName = `ffmpeg-${targetTriple}${ext}`;
  const ffprobeName = `ffprobe-${targetTriple}${ext}`;
  const ffmpegPath = path.join(BINARIES_DIR, ffmpegName);
  const ffprobePath = path.join(BINARIES_DIR, ffprobeName);

  const missing = !fs.existsSync(ffmpegPath) || !fs.existsSync(ffprobePath);
  if (!missing && !FORCE) {
    syncToDebug(ffmpegPath, path.join(DEBUG_DIR, `ffmpeg${ext}`));
    syncToDebug(ffprobePath, path.join(DEBUG_DIR, `ffprobe${ext}`));
    return;
  }

  console.log(`[binaries] Ensuring ffmpeg & ffprobe for ${targetTriple}...`);

  if (process.platform === "darwin") {
    const arch = os.arch() === "arm64" ? "arm64" : "x64";
    const url = `https://github.com/vanloctech/ffmpeg-macos/releases/latest/download/ffmpeg-macos-${arch}.tar.gz`;
    const tempArchive = path.join(BINARIES_DIR, `.tmp-ffmpeg-${arch}.tar.gz`);
    const tempExtractDir = path.join(BINARIES_DIR, `.tmp-ffmpeg-extract-${arch}`);

    try {
      await downloadFile(url, tempArchive);
      fs.mkdirSync(tempExtractDir, { recursive: true });
      execSync(`tar -xzf "${tempArchive}" -C "${tempExtractDir}"`);

      // Find extracted ffmpeg and ffprobe
      const findBin = (name) => {
        const out = execSync(`find "${tempExtractDir}" -type f -name "${name}" -perm -u+x`).toString().trim();
        return out.split("\n")[0];
      };

      const extractedFfmpeg = findBin("ffmpeg");
      const extractedFfprobe = findBin("ffprobe");

      if (extractedFfmpeg && fs.existsSync(extractedFfmpeg)) {
        fs.copyFileSync(extractedFfmpeg, ffmpegPath);
        fs.chmodSync(ffmpegPath, 0o755);
      }
      if (extractedFfprobe && fs.existsSync(extractedFfprobe)) {
        fs.copyFileSync(extractedFfprobe, ffprobePath);
        fs.chmodSync(ffprobePath, 0o755);
      }

      state.versions["ffmpeg"] = "latest";
    } finally {
      if (fs.existsSync(tempArchive)) fs.unlinkSync(tempArchive);
      if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
  }

  syncToDebug(ffmpegPath, path.join(DEBUG_DIR, `ffmpeg${ext}`));
  syncToDebug(ffprobePath, path.join(DEBUG_DIR, `ffprobe${ext}`));
}

function syncToDebug(sourcePath, debugPath) {
  try {
    if (!fs.existsSync(sourcePath)) return;
    if (fs.existsSync(DEBUG_DIR)) {
      const srcStat = fs.statSync(sourcePath);
      let needsCopy = true;
      if (fs.existsSync(debugPath)) {
        const dstStat = fs.statSync(debugPath);
        if (dstStat.size === srcStat.size && dstStat.mtimeMs >= srcStat.mtimeMs) {
          needsCopy = false;
        }
      }
      if (needsCopy) {
        fs.copyFileSync(sourcePath, debugPath);
        if (process.platform !== "win32") {
          fs.chmodSync(debugPath, 0o755);
        }
      }
    }
  } catch (err) {
    // Non-fatal
  }
}

async function main() {
  fs.mkdirSync(BINARIES_DIR, { recursive: true });
  const targetTriple = getTargetTriple();
  const state = loadState();

  try {
    await ensureYtDlp(targetTriple, state);
    await ensureFfmpegAndProbe(targetTriple, state);
    state.lastChecked = Date.now();
    saveState(state);
    console.log(`[binaries] Local dev sidecars verified for ${targetTriple}`);
  } catch (err) {
    console.error(`[binaries] Error ensuring binaries: ${err.message}`);
  }
}

main();
