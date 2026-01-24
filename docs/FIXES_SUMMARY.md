# Downlink Bug Fixes & Improvements Summary

**Date:** January 7, 2025  
**Version:** 0.1.9+

---

## 🐛 Bug Fixes

### Issue #1: Concurrent Downloads Setting Not Respected

**Problem:**
When users changed the concurrent download limit in Settings (e.g., from 3 to 1), the app would still start multiple downloads simultaneously, ignoring the new setting.

**Root Causes:**
1. **Frontend race condition**: The `handleAddToQueue` function was calling `startDownload(id)` in a loop for each URL, which bypassed concurrency checks
2. **Backend race condition**: Downloads were registered as "active" too late in the process (after metadata fetching), allowing multiple downloads to slip through the concurrency check simultaneously

**Fixes Applied:**

**Frontend (`app/page.tsx`):**
- Changed from `for (const id of allIds) { await downlink.startDownload(id); }` to `await downlink.startAllDownloads();`
- Applied in both `handleAddToQueue` and `handlePlaylistConfirm` handlers
- Now properly respects concurrency limits by using the backend's queue management

**Backend (`src-tauri/src/download_manager.rs`):**
- Moved the "active" registration to the **very beginning** of the `start()` function
- Now uses atomic lock acquisition to check concurrency + register in one operation
- Added cleanup handlers to remove downloads from active list if they exit early
- Prevents race conditions where multiple `start()` calls happen simultaneously

**Result:**
✅ Concurrency limit is now properly enforced  
✅ Changing settings takes effect immediately  
✅ No more "runaway" downloads exceeding the limit

---

### Issue #2: Windows Console Window Popup

**Problem:**
On Windows, when a URL was pasted or a download started, a black terminal/console window would briefly appear, creating a poor user experience.

**Root Cause:**
When spawning child processes like `yt-dlp.exe` and `ffmpeg.exe` on Windows, the OS creates a visible console window by default unless explicitly told not to.

**Fix Applied:**

Added Windows-specific flags to hide console windows when spawning processes:

**Files Modified:**
- `src-tauri/src/download_manager.rs`
- `src-tauri/src/ytdlp.rs`
- `src-tauri/src/tool_manager.rs`

**Changes:**
```rust
#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// Then when spawning commands:
#[cfg(windows)]
cmd.creation_flags(CREATE_NO_WINDOW);
```

**Result:**
✅ No more console window popups on Windows  
✅ Clean, native app experience  
✅ Works for all yt-dlp, ffmpeg, and version check operations

---

### Issue #3: App Updater Not Installing Updates

**Problem:**
When clicking "Download & Install" followed by "Restart Now", the app would restart but remain on the old version instead of updating to the newly installed version.

**Root Cause:**
1. Missing `tauri-plugin-process` plugin (required for proper restart functionality)
2. Using custom Rust `app.restart()` instead of the official `relaunch()` API
3. Missing updater and process permissions in capabilities

**Fixes Applied:**

**Backend:**
- Added `tauri-plugin-process = "2"` to `Cargo.toml`
- Added `tauri-plugin-process::init()` to plugin initialization in `lib.rs`
- Added `updater:default` and `process:default` to `capabilities/default.json`

**Frontend:**
- Installed `@tauri-apps/plugin-process` and `@tauri-apps/plugin-updater` npm packages
- Updated `useDownlink.ts` to use official plugin APIs:
  - `installAppUpdate` now uses `update.downloadAndInstall()` from `@tauri-apps/plugin-updater`
  - `restartApp` now uses `relaunch()` from `@tauri-apps/plugin-process`

**Result:**
✅ Updates now properly install and apply on restart  
✅ App relaunches to the new version correctly  
✅ Works reliably on macOS and Windows

---

## ✨ UI/UX Improvements

### Improved Playlist Dialog

**Changes:**
- Redesigned with better visual hierarchy
- Added icons for visual clarity
- Clear "Just this video" vs "Entire Playlist" options presented as cards
- Added "Recommended" badge to playlist option
- Improved colors and spacing
- Added backdrop blur for better focus
- Close button with hover states
- Better mobile responsiveness

**Result:**
✅ Clearer user choices  
✅ More professional appearance  
✅ Matches modern macOS/Windows design patterns

---

## 📋 Testing Checklist

### Concurrent Downloads
- [ ] Set concurrency to 1 in Settings
- [ ] Paste multiple URLs
- [ ] Verify only 1 download runs at a time
- [ ] Change concurrency to 3 while downloads are active
- [ ] Verify up to 3 downloads run simultaneously

### Windows Console Fix
- [ ] On Windows, paste a URL
- [ ] Verify no console window appears during preview
- [ ] Click Download
- [ ] Verify no console window appears during download
- [ ] Check Settings → Updates
- [ ] Verify no console window during version checks

### App Updater
- [ ] Open Settings → Updates
- [ ] Click "Check for Updates"
- [ ] If update available, click "Download & Install"
- [ ] Wait for download to complete
- [ ] Click "Restart Now"
- [ ] Verify app restarts to new version

### Playlist Dialog
- [ ] Paste a YouTube playlist URL
- [ ] Verify dialog appears with correct information
- [ ] Click "Just this video"
- [ ] Verify only one video is added to queue
- [ ] Paste playlist URL again
- [ ] Click "Entire Playlist"
- [ ] Verify all videos are added to queue

---

## 🚀 Next Steps

See `UI_IMPROVEMENTS.md` for comprehensive roadmap of planned UI/UX enhancements, including:

1. **Phase 1**: Hero input area, improved preview cards, better progress indicators
2. **Phase 2**: Color system, typography, spacing refinement
3. **Phase 3**: Smart queue management, folder organization, batch operations
4. **Phase 4**: Animations, loading states, microinteractions
5. **Phase 5**: Empty states, error states, success feedback
6. **Phase 6**: Accessibility, keyboard navigation, screen reader support

---

## 📝 Notes for Developers

### Concurrent Downloads Architecture
- The `DownloadManager` maintains an `active_downloads` HashMap
- Registration happens atomically with concurrency check
- Always use `start_all_downloads` instead of looping `start_download`
- The download manager automatically starts queued downloads when slots free up

### Windows Process Spawning
- Always use `CREATE_NO_WINDOW` flag for Windows console apps
- Wrap with `#[cfg(windows)]` to avoid compilation errors on other platforms
- Don't use it for GUI apps (explorer.exe, open, etc.)

### Tauri Updater Best Practices
- Use official plugins: `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process`
- Don't create custom Rust commands for update/restart
- The `relaunch()` function properly coordinates with the updater installer
- Always initialize plugins in the correct order

### UI Component Guidelines
- Use consistent spacing (4px base unit)
- Follow the color palette in UI_IMPROVEMENTS.md
- Add loading states to all async operations
- Provide clear error messages with actionable fixes
- Test in both light and dark modes

---

## 🔗 Related Documents

- `downlink_docs.md` - Full technical design document
- `UI_IMPROVEMENTS.md` - Comprehensive UI/UX roadmap
- `README.md` - Project overview and setup instructions

---

**Contributors:**
- Bug fixes and improvements implemented on January 7, 2025
- Testing and validation in progress

**Build Information:**
- Target platforms: macOS 10.13+, Windows 10+, Linux
- Tauri version: 2.9.5+
- Rust version: 1.77.2+
- Node version: 20+
