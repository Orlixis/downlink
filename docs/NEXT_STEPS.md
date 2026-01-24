# Downlink - Next Steps

## ✅ Completed in This Session

### Bug Fixes
- [x] **Concurrent downloads setting not respected** - Fixed race condition in both frontend and backend
- [x] **Windows console window popup** - Added `CREATE_NO_WINDOW` flag to all process spawning
- [x] **App updater not installing updates** - Added `tauri-plugin-process` and proper `relaunch()` API

### UI Improvements
- [x] **Playlist dialog redesign** - Modern card-based UI with better visual hierarchy

---

## 🔄 Immediate Actions Required

### 1. Test the Fixes
```bash
# Build and test the app
cd downlink
npm run tauri build

# Or for development
npm run tauri dev
```

**Test Cases:**
- [ ] Set concurrency to 1, paste 3 URLs, verify only 1 downloads at a time
- [ ] On Windows: verify no console popups during paste/download
- [ ] Check for updates, install, restart → verify new version loads

### 2. Commit the Changes
```bash
git add -A
git commit -m "fix: concurrent downloads, Windows console popup, app updater

- Fix concurrent downloads ignoring settings limit
- Add CREATE_NO_WINDOW flag for Windows process spawning  
- Use official Tauri process plugin for proper restart after update
- Redesign playlist dialog with better UX"
```

### 3. Version Bump & Release
```bash
# Update version in:
# - src-tauri/Cargo.toml
# - src-tauri/tauri.conf.json
# - package.json (if applicable)

git add -A
git commit -m "chore: bump version to 0.1.10"
git tag v0.1.10
git push && git push --tags
```

---

## 📋 Short-Term Roadmap (Next 2 Weeks)

### Week 1: Core UX Polish
- [ ] **Hero input area** - Larger, more prominent paste zone
- [ ] **Preview cards** - Show thumbnail, title, duration, quality selector
- [ ] **Progress indicators** - Circular progress on thumbnails during download
- [ ] **Empty states** - Friendly illustrations when queue is empty

### Week 2: Queue Improvements
- [ ] **Compact list view** - For when there are 5+ downloads
- [ ] **Drag to reorder** - Prioritize downloads
- [ ] **Batch actions** - Select multiple, cancel all, etc.
- [ ] **History improvements** - Grid view, search, filters

---

## 🎯 Medium-Term Goals (Next Month)

### Smart Features
- [ ] Schedule downloads (download at night)
- [ ] Speed limiter with presets
- [ ] Auto-pause when disk space low
- [ ] Tag/folder organization (like Folx)

### Browser Integration
- [ ] Chrome extension - "Download with Downlink"
- [ ] Firefox extension
- [ ] URL scheme handler (`downlink://`)

### Platform Polish
- [ ] Native notifications for completed downloads
- [ ] Menu bar icon (macOS)
- [ ] System tray (Windows/Linux)
- [ ] Keyboard shortcuts

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `UI_IMPROVEMENTS.md` | Comprehensive UI/UX roadmap with mockups |
| `FIXES_SUMMARY.md` | Details of bugs fixed in this session |
| `downlink_docs.md` | Full technical design document |

---

## 🔗 Quick Commands

```bash
# Development
npm run tauri dev

# Build release
npm run tauri build

# Check Rust compilation
cd src-tauri && cargo check

# Check TypeScript
npx tsc --noEmit

# Run tests (if available)
cd src-tauri && cargo test
```

---

## 📞 Support

If issues persist after these fixes:
1. Check the logs: Settings → General → Copy Debug Info
2. Open GitHub issue with logs attached
3. Include: OS version, Downlink version, steps to reproduce

---

*Last updated: January 7, 2025*
