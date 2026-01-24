# Downlink Architecture Overview

## Application Structure

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Downlink App                         │
│                  (page.tsx - Main)                      │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────┐         ┌────────┐         ┌─────────┐
   │SplashScr│         │ Header │         │Settings │
   │   een   │         │  Bar   │         │ Modal   │
   └─────────┘         └────────┘         └─────────┘
                            │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌──────────┐    ┌────────────┐    ┌──────────────┐
   │ Preview  │    │  Action    │    │  Download    │
   │  Panel   │    │    Bar     │    │   Queue      │
   └──────────┘    └────────────┘    └──────────────┘
        │                                     │
        │                                     ▼
        │                            ┌──────────────┐
        │                            │ Download     │
        │                            │   Item       │
        │                            └──────────────┘
        │                                     │
        └─────────────────────────┬───────────┘
                                  │
                                  ▼
                            ┌──────────────┐
                            │   Footer     │
                            └──────────────┘
```

## Component Hierarchy Tree

```
App (page.tsx)
├── SplashScreen
│   ├── Logo Image
│   ├── Animated Circle
│   ├── App Name Text
│   ├── Tagline Text
│   └── Loading Dots
│
├── HeaderBar
│   ├── Logo Image
│   ├── Paste Button (btn-brand)
│   ├── URL Input Field
│   │   └── Loading Indicator (Loader2)
│   └── Settings Button (Settings)
│
├── Main Content (flex-row)
│   │
│   ├── Left Panel (flex-col)
│   │   ├── PreviewPanel
│   │   │   ├── Video Preview
│   │   │   │   ├── Thumbnail Image
│   │   │   │   ├── Duration Badge
│   │   │   │   └── Playlist Badge (ListVideo)
│   │   │   ├── Error State (AlertTriangle)
│   │   │   ├── Loading State (Loader2)
│   │   │   ├── Drag Overlay (CloudDownload)
│   │   │   └── Empty State (CloudDownload)
│   │   │
│   │   └── ActionBar
│   │       ├── CC Toggle Button (Subtitles)
│   │       ├── SB Toggle Button (Scissors)
│   │       ├── Preset Selector
│   │       └── Download Button (Download, btn-brand)
│   │
│   └── Right Panel (flex-col)
│       └── DownloadQueue
│           ├── Tab Bar
│           │   ├── Downloads Tab (CloudDownload)
│           │   └── History Tab (Clock)
│           ├── Download List
│           │   └── DownloadItem (repeating)
│           │       ├── Thumbnail
│           │       │   ├── Video Placeholder (Video)
│           │       │   ├── Progress Indicator (CircularProgress)
│           │       │   └── Status Overlay
│           │       │       ├── Check (done)
│           │       │       ├── X (failed)
│           │       │       └── Pause (paused)
│           │       ├── Info Section
│           │       │   ├── Title
│           │       │   ├── Uploader
│           │       │   └── Status (Check, AlertCircle, etc)
│           │       └── Actions
│           │           ├── Pause Button (Pause)
│           │           ├── Resume Button (Play)
│           │           ├── Retry Button (RotateCcw)
│           │           ├── Open Button (PlayCircle)
│           │           ├── Show Folder Button (Folder)
│           │           └── Remove Button (X)
│           │
│           └── Clear Button (Trash2)
│
├── Footer
│   ├── Logo Image
│   ├── Version Text
│   └── Attribution Text
│
├── SettingsModal (conditional)
│   ├── Header
│   │   ├── Title
│   │   └── Close Button (X)
│   ├── Content
│   │   ├── Sidebar Tabs
│   │   │   ├── General (Settings)
│   │   │   ├── Formats (FileVideo)
│   │   │   ├── SponsorBlock (Scissors)
│   │   │   ├── Subtitles (Subtitles)
│   │   │   ├── Updates (RefreshCw)
│   │   │   └── Network (Globe)
│   │   └── Tab Content (various)
│   └── Footer
│       ├── Error Message
│       ├── Cancel Button
│       └── Save Button (Save, Loader2)
│
└── PlaylistDialog (conditional)
    ├── Header
    │   ├── Playlist Thumbnail
    │   ├── Title and Count
    │   └── Close Button (X)
    ├── Content
    │   ├── Choice View
    │   │   ├── Single Video Option (Video, ChevronRight)
    │   │   └── Full Playlist Option (ChevronRight)
    │   └── Selection View
    │       ├── Back Button (ChevronLeft)
    │       ├── Select All Button
    │       └── Video List
    │           └── Video Item (repeating)
    │               ├── Checkbox (Check)
    │               ├── Thumbnail (Video)
    │               ├── Info
    │               └── Duration
    └── Footer
        └── Download Button (Download, btn-brand)
```

## Data Flow

```
User Input
    │
    ├─ Paste URL or Drag & Drop
    │   │
    │   ▼
    │  setUrlInput
    │   │
    │   ▼
    │  Auto-fetch Preview
    │   │
    │   ├─ Success: Display in PreviewPanel
    │   ├─ Error: Show error state
    │   └─ Loading: Show spinner
    │
    └─ Click Download
        │
        ▼
        Is Playlist?
        │
        ├─ Yes: Open PlaylistDialog
        │   │
        │   ├─ Choose Single Video
        │   │   ▼
        │   │   downlink.addUrls()
        │   │
        │   └─ Choose Full Playlist
        │       ▼
        │       Load Video List
        │       │
        │       ▼
        │       Select Videos
        │       │
        │       ▼
        │       downlink.addUrls() (for each)
        │
        └─ No: downlink.addUrls()
            │
            ▼
            Add to Queue
            │
            ▼
            startAllDownloads() (if auto-start enabled)
            │
            ▼
            Update DownloadQueue UI
```

## State Management

### Main Component States (page.tsx)

```typescript
// Display States
showSplash: boolean               // Show/hide splash screen
appReady: boolean                 // App initialization status
showHistory: boolean              // Toggle history tab
isDragging: boolean               // Drag-and-drop overlay
settingsOpen: boolean             // Settings modal visibility
playlistDialogOpen: boolean       // Playlist dialog visibility

// Form States
urlInput: string                  // Current URL input
destination: string               // Download folder path
presetId: string                  // Selected quality preset
subtitlesEnabled: boolean         // CC/subtitle toggle
sponsorBlockEnabled: boolean      // SponsorBlock toggle

// Data States
urlPreviews: Map<url, preview>    // Cached previews
playlistVideos: PlaylistVideo[]   // Videos in playlist
settings: UserSettings | null     // User settings
isSubmitting: boolean             // Download submission state
isLoadingPlaylistVideos: boolean  // Playlist loading state

// Refs
inputRef: React.RefObject        // URL input field reference
```

### Component-Level Props Flow

```
page.tsx
├── SplashScreen
│   └── onComplete: () => void
│
├── HeaderBar
│   ├── urlInput: string
│   ├── onUrlChange: (value: string) => void
│   ├── onPaste: () => void
│   ├── onSubmit: () => void
│   ├── onSettingsClick: () => void
│   ├── isLoading: boolean
│   └── inputRef: React.RefObject
│
├── Main Content
│   ├── PreviewPanel
│   │   ├── previewData: FetchMetadataResult | null
│   │   ├── previewLoading: boolean
│   │   ├── previewError: string | null
│   │   ├── isDragging: boolean
│   │   └── onClearPreview: () => void
│   │
│   ├── ActionBar
│   │   ├── presetId: string
│   │   ├── onPresetChange: (value: string) => void
│   │   ├── presets: PresetWithHint[]
│   │   ├── subtitlesEnabled: boolean
│   │   ├── onSubtitlesToggle: () => void
│   │   ├── sponsorBlockEnabled: boolean
│   │   ├── onSponsorBlockToggle: () => void
│   │   ├── onDownload: () => void
│   │   ├── isSubmitting: boolean
│   │   ├── isPlaylist: boolean
│   │   └── disabled: boolean
│   │
│   └── DownloadQueue
│       ├── queue: QueueItem[]
│       ├── history: QueueItem[]
│       ├── showHistory: boolean
│       ├── onShowHistoryChange: (value: boolean) => void
│       ├── onStop: (id: string) => void
│       ├── onCancel: (id: string) => void
│       ├── onRetry: (id: string) => void
│       ├── onOpen: (path: string) => void
│       ├── onOpenFolder: (path: string) => void
│       ├── onClearQueue: () => void
│       └── onClearHistory: () => void
│           │
│           └── DownloadItem (repeating)
│               ├── item: QueueItem
│               ├── onStop: (id: string) => void
│               ├── onCancel: (id: string) => void
│               ├── onRetry: (id: string) => void
│               ├── onOpen: (path: string) => void
│               └── onOpenFolder: (path: string) => void
│
├── Footer
│   └── appVersion?: string
│
├── SettingsModal
│   ├── isOpen: boolean
│   ├── onClose: () => void
│   ├── settings: UserSettings | null
│   ├── onSave: (settings: UserSettings) => Promise<void>
│   ├── currentVersion: string | null
│   ├── checkAppUpdate: () => Promise<AppUpdateInfo>
│   ├── installAppUpdate: () => Promise<void>
│   └── restartApp: () => Promise<void>
│
└── PlaylistDialog
    ├── isOpen: boolean
    ├── onClose: () => void
    ├── onConfirm: (downloadPlaylist, selectedIds?) => void
    ├── playlistTitle: string
    ├── videoTitle: string
    ├── videoThumbnail?: string
    ├── playlistCount: number
    ├── playlistVideos?: PlaylistVideo[]
    ├── isLoadingVideos?: boolean
    └── onLoadPlaylistVideos?: () => void
```

## Key Dependencies

```
React & Next.js
├── useCallback       // Memoized callbacks
├── useEffect         // Side effects
├── useRef            // DOM references
├── useState          // State management
└── useMemo           // Computed values

External Libraries
├── lucide-react      // Icons (Plus, Settings, Download, etc.)
├── next/image        // Optimized Image component
└── image-loader      // Image optimization

Hooks (Custom)
└── useDownlink()     // Tauri bridge for backend communication

Types
├── UserSettings      // User configuration
├── FetchMetadataResult  // Video metadata
├── QueueItem         // Download queue item
└── PresetWithHint    // Quality preset
```

## Icon Usage by Component

```
SplashScreen
└── Custom SVG gradient circle

HeaderBar
├── Logo (Image)
└── Settings (lucide icon)

PreviewPanel
├── Video (lucide)
├── ListVideo (lucide) - Playlist badge
├── AlertTriangle (lucide) - Errors
└── CloudDownload (lucide) - Drag state

ActionBar
├── Subtitles (lucide) - CC button
├── Scissors (lucide) - SponsorBlock button
└── Download (lucide) - Download button

DownloadQueue
├── CloudDownload (lucide) - Downloads tab
├── Clock (lucide) - History tab
├── Trash2 (lucide) - Clear button

DownloadItem
├── Video (lucide) - Placeholder
├── Check (lucide) - Completed status
├── AlertCircle (lucide) - Error status
├── Pause (lucide) - Paused status
├── Pause (lucide) - Pause action
├── Play (lucide) - Resume action
├── RotateCcw (lucide) - Retry action
├── PlayCircle (lucide) - Open file action
├── Folder (lucide) - Show in folder action
└── X (lucide) - Remove action

Footer
└── Logo (Image)

SettingsModal
├── X (lucide) - Close button
├── Settings (lucide) - General tab
├── FileVideo (lucide) - Formats tab
├── Scissors (lucide) - SponsorBlock tab
├── Subtitles (lucide) - Subtitles tab
├── RefreshCw (lucide) - Updates tab
├── Globe (lucide) - Network tab
├── Save (lucide) - Save button
└── Loader2 (lucide) - Loading spinner

PlaylistDialog
├── X (lucide) - Close button
├── ListVideo (lucide) - Playlist icon
├── Video (lucide) - Video placeholders
├── Play (lucide) - Play indicators
├── ChevronRight (lucide) - Forward navigation
├── ChevronLeft (lucide) - Back button
├── Check (lucide) - Selection checkmarks
├── Loader2 (lucide) - Loading spinner
└── Download (lucide) - Download button
```

## Color System

### Brand Colors (CSS Variables)

```css
--brand-blue: #2563eb           /* Primary brand color */
--brand-blue-light: #3b82f6     /* Light variant for hover */
--brand-cyan: #06b6d4           /* Accent color */
--brand-teal: #0891b2           /* Gradient variant */

--brand-gradient: linear-gradient(135deg, #2563eb 0%, #0891b2 100%)
--brand-gradient-hover: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)
```

### Applied Styles

```
.btn-brand - Primary buttons (Download, Paste, etc.)
├── Background: --brand-gradient
├── Hover: --brand-gradient-hover + shadow
├── Active: Pressed effect with transform
└── Disabled: 50% opacity

Status Colors
├── Success: text-green-400 (Check mark)
├── Error: text-red-400 (X mark)
├── Warning: text-yellow-400 (Pause mark)
└── Info: text-blue-400 (Info colors)
```

## Performance Considerations

### Component Optimization

1. **SplashScreen**: Unmounts after app ready (one-time render)
2. **DownloadItem**: Can use React.memo for list optimization
3. **PreviewPanel**: Uses useMemo for preview data selection
4. **DownloadQueue**: Map renders for list (can optimize with virtualization)

### State Management

- URL previews cached in Map for instant display
- Only refetch preview on URL change
- Playlist videos cached to prevent re-fetching
- Local state for UI to avoid prop drilling

### Asset Loading

- Images use next/image for optimization
- Lucide icons are tree-shakeable (unused icons excluded)
- Logo images are small (PNG, optimized)
- CSS variables for theme (no extra files)

## Error Handling

```
App Level
└── try/catch in effect hooks

Component Level
├── PreviewPanel - Display error state
├── SettingsModal - Show validation errors
└── PlaylistDialog - Handle load failures

User Feedback
├── Error messages in UI
├── Loading states with spinners
├── Toast notifications (via downlink hook)
└── Validation feedback
```

## Testing Strategy

### Unit Tests (Per Component)

```
SplashScreen
├── Renders when showSplash is true
├── Calls onComplete after duration
└── Animations play correctly

HeaderBar
├── Paste button calls onPaste
├── Input field updates on change
└── Settings button opens modal

ActionBar
├── Toggle buttons work correctly
├── Download button calls onDownload
└── Preset selector updates

DownloadQueue
├── Tabs switch correctly
├── Empty states display
└── Clear buttons work

DownloadItem
├── Status icons display correctly
├── Action buttons are hidden/shown based on status
└── Progress bar updates
```

### Integration Tests

```
Main Workflow
├── Paste URL → Display preview → Download → Add to queue
├── Playlist detection → Open dialog → Select videos → Download
└── Settings save → Apply to app

User Interactions
├── Drag and drop URL
├── Keyboard shortcuts (Cmd+V)
├── Tab navigation
└── Modal open/close
```

## Deployment Checklist

- [ ] Build completes without errors
- [ ] No console warnings in production
- [ ] Splash screen displays correctly
- [ ] All icons render (no missing lucide icons)
- [ ] Logo images load from public folder
- [ ] Brand colors apply to all buttons
- [ ] Responsive design tested on mobile
- [ ] Dark mode works correctly
- [ ] Tauri integration functional
- [ ] Settings persist correctly
