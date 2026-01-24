# Downlink UI/UX Improvements Roadmap

Based on analysis of PullTube and Folx downloader interfaces, combined with modern macOS design principles.

---

## Design Philosophy

**Goals:**
- Clean, uncluttered interface
- Professional yet approachable
- Native macOS/Windows feel
- Efficient workflow (paste → preview → download in 2-3 clicks)
- Visual feedback at every step

**Inspiration:**
- **PullTube**: Minimalist, centered content, large interactive elements
- **Folx**: List-based, information-dense, tag system
- **Modern macOS apps**: Arc Browser, Linear, Raycast

---

## Current State Analysis

### Strengths ✅
- Functional preset system
- Working playlist detection
- Real-time progress tracking
- Settings modal is comprehensive

### Areas for Improvement 🔄
1. **Input area**: Could be more prominent and inviting
2. **Preview cards**: Need better visual hierarchy
3. **Queue items**: Could show more info at a glance
4. **Empty states**: Need engaging illustrations/copy
5. **Download button**: Should be more prominent
6. **Overall spacing**: Some areas feel cramped

---

## Phase 1: Core UX Flow (High Priority)

### 1.1 Hero Input Area
**Current:** Simple text input at top
**Proposed:** Centered, prominent paste area (like PullTube)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│         Paste or Drop Video URLs Here           │
│   Supports YouTube, Vimeo, Facebook, Instagram, │
│      Dailymotion, Soundcloud, and 1000+ sites   │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔍 https://www.youtube.com/watch?v=...   │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│         [Paste]  [Clear]  [Advanced...]         │
└─────────────────────────────────────────────────┘
```

**Features:**
- Drag-and-drop support for URLs
- Auto-fetch preview on paste
- Show supported platforms with icons
- Keyboard shortcut: `Cmd+V` auto-focuses input
- "Paste" button that reads from clipboard
- Subtle animation on hover

**Implementation:**
- Larger vertical spacing (py-16)
- Centered content when queue is empty
- Gradient background or subtle texture
- Icon hints for supported platforms

---

### 1.2 Preview Cards (Before Download)
**Current:** Side-by-side info display
**Proposed:** Card-based with large thumbnail (like PullTube)

```
┌───────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════╗   │
│  ║                                           ║   │
│  ║         [Thumbnail Image]                 ║   │
│  ║                                           ║   │
│  ╚═══════════════════════════════════════════╝   │
│                                                   │
│  We need to talk about macOS Tahoe               │
│  Linus Tech Tips • 16:40 • 1080p - 122.3 MB      │
│                                                   │
│  ┌─────────────────┐  ┌──────────────┐          │
│  │ Preset: Best ▾  │  │ 1080p - 122MB▾│          │
│  └─────────────────┘  └──────────────┘          │
│                                                   │
│  ☐ Subtitles    ☐ SponsorBlock                   │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │      Download video        →             │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
│  [Trim Video or Cancel it]                       │
└───────────────────────────────────────────────────┘
```

**Features:**
- Large, prominent thumbnail (aspect ratio preserved)
- Clear title with channel name
- Duration and filesize estimate prominently displayed
- Format selector dropdown (inline, not hidden in advanced)
- Quick toggles for subtitles/sponsorblock
- One big "Download video →" button (primary action)
- Secondary "Trim" option (if needed)
- "Cancel it" or X button to clear preview

**Implementation:**
- Card component with shadow
- Skeleton loader during metadata fetch
- Error state with retry option
- Smooth transitions

---

### 1.3 Active Downloads (Queue Tab)
**Current:** List with progress bars
**Proposed:** Card-based with circular progress (like PullTube downloading state)

```
┌─────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════╗  │
│  ║                                       ║  │
│  ║   [Thumbnail with                     ║  │
│  ║    circular progress overlay]         ║  │
│  ║         Downloading...                ║  │
│  ║              45%                      ║  │
│  ╚═══════════════════════════════════════╝  │
│                                             │
│  1080p • We need to talk about macOS Tahoe │
│  25 MB/s • 30s remaining                   │
│                                             │
│  [⏸ Pause]  [✕ Cancel]                     │
└─────────────────────────────────────────────┘
```

**Alternative: Compact List View (for many downloads)**
```
┌───────────────────────────────────────────────────────┐
│ [Img] We need to talk... • 1080p    [===45%===]  ⏸ ✕ │
│ [Img] How Linux works       • 4K     [==12%===]  ⏸ ✕ │
│ [Img] Best VSCode plugins   • 720p   [==98%===]  ⏸ ✕ │
└───────────────────────────────────────────────────────┘
```

**Features:**
- Two view modes: Card (default, <5 items) and Compact List (5+ items)
- Circular/radial progress indicator on thumbnail
- Speed and ETA prominently displayed
- Quick actions: Pause, Cancel, Priority
- Color-coded states:
  - Blue: Downloading
  - Yellow: Queued/Waiting
  - Green: Completed
  - Red: Failed
  - Gray: Stopped

**Implementation:**
- Toggle between view modes
- Smooth progress animations
- Contextual menu (right-click)
- Drag to reorder queue

---

### 1.4 Completed Downloads (History Tab)
**Proposed:** Grid or list with quick actions (inspired by Folx)

```
┌────────────────────────────────────────────────────┐
│ [View: Grid | List]    [Filter: All ▾]    [🔍]     │
├────────────────────────────────────────────────────┤
│                                                     │
│  ╔═════════╗  ╔═════════╗  ╔═════════╗            │
│  ║ [Img]   ║  ║ [Img]   ║  ║ [Img]   ║            │
│  ║  ✓      ║  ║  ✓      ║  ║  ✓      ║            │
│  ╚═════════╝  ╚═════════╝  ╚═════════╝            │
│  Video Title  Video Title  Video Title             │
│  1080p•122MB  720p•89MB    4K•456MB                │
│  [▶ Open] [📁] [▶ Open] [📁] [▶ Open] [📁]        │
│                                                     │
└────────────────────────────────────────────────────┘
```

**Features:**
- Grid view for visual browsing
- List view for details
- Filter by: All, Today, This Week, Failed
- Search by title
- Quick actions: Open file, Show in folder, Re-download
- Bulk actions: Select multiple, Delete, Export list

---

## Phase 2: Visual Polish (Medium Priority)

### 2.1 Color Palette & Theming
**Current:** Basic dark/light mode
**Proposed:** Refined color system

**Light Mode:**
- Background: `#FFFFFF`
- Surface: `#F5F5F7` (light gray)
- Border: `#E5E5EA`
- Text Primary: `#1D1D1F`
- Text Secondary: `#86868B`
- Accent: `#0071E3` (blue) or `#FF3B30` (red for downloads)

**Dark Mode:**
- Background: `#000000`
- Surface: `#1C1C1E`
- Border: `#38383A`
- Text Primary: `#FFFFFF`
- Text Secondary: `#98989D`
- Accent: `#0A84FF`

**Status Colors:**
- Success: `#34C759`
- Warning: `#FF9500`
- Error: `#FF3B30`
- Info: `#0A84FF`

### 2.2 Typography
**System Fonts:**
- macOS: `-apple-system, SF Pro`
- Windows: `Segoe UI`
- Linux: `Ubuntu, Roboto`

**Hierarchy:**
- Hero/Title: 32px, Bold
- Section Header: 20px, Semibold
- Body: 14px, Regular
- Caption: 12px, Regular

### 2.3 Spacing System
**Consistent scale:**
- 4px base unit
- Scale: 4, 8, 12, 16, 20, 24, 32, 48, 64

### 2.4 Icons
**Use consistent icon set:**
- [SF Symbols](https://developer.apple.com/sf-symbols/) for macOS
- [Lucide](https://lucide.dev/) or [Heroicons](https://heroicons.com/) for cross-platform

**Common icons:**
- Download: Arrow down in circle
- Queue: List/stack
- History: Clock/checkmark
- Settings: Gear
- Play: Triangle
- Pause: Two bars
- Cancel: X in circle

---

## Phase 3: Advanced Features (Lower Priority)

### 3.1 Smart Queue Management
- Auto-pause when disk space < 5GB
- Schedule downloads (night mode)
- Speed limiter with quick presets (No limit, 5MB/s, 1MB/s)
- Priority queue (drag to reorder)

### 3.2 Folder Organization
**Like Folx Tags:**
- Tag system: `music`, `tutorials`, `podcasts`
- Auto-organize by tag
- Smart folders: "Downloaded Today", "Large Files (>1GB)", "Failed Downloads"

### 3.3 Batch Operations
- Multi-select with checkboxes
- Bulk actions toolbar appears when items selected
- Actions: Start all, Stop all, Delete, Change quality, Move to folder

### 3.4 Statistics Dashboard
```
┌──────────────────────────────────────┐
│  📊 Statistics                       │
│                                      │
│  Total Downloads:  1,234             │
│  Total Size:       456 GB            │
│  Average Speed:    12.5 MB/s         │
│                                      │
│  [View Detailed Stats →]             │
└──────────────────────────────────────┘
```

---

## Phase 4: Microinteractions & Animations

### 4.1 Smooth Transitions
- Page transitions: 200ms ease-out
- Hover states: 150ms
- Modal open/close: 300ms spring
- Progress bar updates: 100ms linear

### 4.2 Loading States
- Skeleton loaders (not spinners)
- Shimmer effect on loading cards
- Progressive image loading for thumbnails

### 4.3 Success Feedback
- Checkmark animation on completion
- Subtle bounce on button press
- Toast notifications for actions
- Haptic feedback (if available)

### 4.4 Error States
- Shake animation on invalid input
- Red border flash on error
- Clear error messages with actions
- Retry button with loading state

---

## Phase 5: Empty States

### 5.1 No Items in Queue
```
┌─────────────────────────────────────┐
│                                     │
│         📥                           │
│                                     │
│    Your queue is empty              │
│                                     │
│  Paste a video URL above to start  │
│      downloading content            │
│                                     │
│  [Browse Popular Sites →]           │
│                                     │
└─────────────────────────────────────┘
```

### 5.2 No History
```
┌─────────────────────────────────────┐
│                                     │
│         📜                           │
│                                     │
│    No downloads yet                 │
│                                     │
│  Your completed downloads will      │
│        appear here                  │
│                                     │
└─────────────────────────────────────┘
```

### 5.3 Search No Results
```
┌─────────────────────────────────────┐
│                                     │
│         🔍                           │
│                                     │
│  No results for "your search"       │
│                                     │
│     Try different keywords          │
│                                     │
│  [Clear Search]                     │
│                                     │
└─────────────────────────────────────┘
```

---

## Phase 6: Accessibility

### 6.1 Keyboard Navigation
- All actions accessible via keyboard
- Tab order follows visual flow
- Custom shortcuts:
  - `Cmd/Ctrl + V`: Focus input and paste
  - `Cmd/Ctrl + D`: Start download
  - `Cmd/Ctrl + K`: Open quick actions
  - `Cmd/Ctrl + ,`: Open settings
  - `Space`: Play/Pause download

### 6.2 Screen Reader Support
- ARIA labels on all interactive elements
- Live regions for progress updates
- Descriptive button text

### 6.3 Reduced Motion
- Respect `prefers-reduced-motion`
- Disable animations for users who need it
- Instant transitions instead

### 6.4 High Contrast Mode
- Increase border visibility
- Stronger color contrast
- Thicker focus rings

---

## Implementation Priority

### Sprint 1 (Week 1-2): Core UX
- ✅ Fix concurrent downloads bug
- [ ] New hero input area
- [ ] Improved preview cards
- [ ] Better progress indicators

### Sprint 2 (Week 3-4): Visual Polish
- [ ] Color system implementation
- [ ] Icon set consistency
- [ ] Typography refinement
- [ ] Spacing system

### Sprint 3 (Week 5-6): Advanced Features
- [ ] View mode toggles (grid/list)
- [ ] Filter and search
- [ ] Batch operations
- [ ] Smart queue features

### Sprint 4 (Week 7-8): Polish & Refinement
- [ ] Animations and transitions
- [ ] Empty states
- [ ] Accessibility improvements
- [ ] User testing and iteration

---

## Design System Components Needed

### Reusable Components
1. **Button** (primary, secondary, ghost, danger)
2. **Input** (text, search)
3. **Card** (with variants: preview, queue-item, history-item)
4. **Progress** (linear, circular, radial)
5. **Badge** (status indicator)
6. **Dropdown** (preset selector, format picker)
7. **Toggle** (checkbox, switch)
8. **Modal** (settings, playlist dialog)
9. **Toast** (notifications)
10. **Skeleton** (loading states)
11. **EmptyState** (illustration + text)
12. **Thumbnail** (with loading, error, placeholder states)

---

## Inspiration References

### UI Libraries to Study
- [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible components
- [Shadcn UI](https://ui.shadcn.com/) - Beautiful component library
- [Tailwind UI](https://tailwindui.com/) - Professional UI patterns

### Apps with Great UX
- **PullTube** - Minimalist, centered workflow
- **Folx** - Information density, power user features
- **Arc Browser** - Modern macOS design
- **Linear** - Keyboard-first, fast
- **Raycast** - Quick actions, polish

### Design Resources
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io/)
- [Laws of UX](https://lawsofux.com/)

---

## Success Metrics

### User Experience
- Time from paste to download start: **< 5 seconds**
- Number of clicks to download: **2-3 clicks**
- User understands playlist dialog: **90%+ clarity**

### Visual Quality
- Consistent spacing: **100% adherence to 4px grid**
- Responsive at all sizes: **700px - 4K displays**
- Loading states visible: **All async operations**

### Accessibility
- WCAG 2.1 AA compliant: **All text contrast > 4.5:1**
- Keyboard navigable: **100% of features**
- Screen reader compatible: **All interactive elements labeled**

---

## Next Steps

1. **Review this document** with the team
2. **Create Figma mockups** for Sprint 1 components
3. **Set up Storybook** for component development
4. **Start implementation** with hero input area
5. **User testing** after each sprint

---

*Last updated: 2025-01-07*
