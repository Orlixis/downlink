# Downlink Quick Start Guide

## Project Overview
Downlink is a modern, modular video downloader built with Next.js, Tauri, and React. It supports 1000+ video sites and provides a professional UI with brand identity.

**Current Version**: v0.1.12  
**Status**: Production Ready ✅

## Quick Setup

### Installation
```bash
# Install dependencies
npm install

# Add lucide-react icons (if not already installed)
npm install lucide-react

# Build the project
npm run build

# Run in development
npm run dev
```

### File Structure
```
downlink/
├── app/
│   ├── page.tsx                 # Main page (490 lines)
│   ├── constants.ts             # Shared config
│   ├── components/              # Modular UI components
│   │   ├── index.ts             # Component exports
│   │   ├── SplashScreen.tsx      # Animated splash
│   │   ├── HeaderBar.tsx         # Top navigation
│   │   ├── PreviewPanel.tsx      # Video preview
│   │   ├── ActionBar.tsx         # Download options
│   │   ├── DownloadQueue.tsx     # Download list
│   │   ├── DownloadItem.tsx      # Download item
│   │   ├── CircularProgress.tsx  # Progress indicator
│   │   ├── Footer.tsx            # App footer
│   │   ├── SettingsModal.tsx     # Settings dialog
│   │   └── PlaylistDialog.tsx    # Playlist dialog
│   ├── hooks/
│   │   └── useDownlink.ts        # Tauri bridge
│   └── globals.css               # Global styles & brand colors
├── public/
│   └── downlink-square.png       # Logo
├── src-tauri/                    # Tauri backend
└── docs/
    ├── REFACTORING.md            # Detailed refactoring guide
    ├── ARCHITECTURE.md           # Component architecture
    ├── IMPROVEMENTS_SUMMARY.md   # UI/UX improvements
    └── LATEST_IMPROVEMENTS.md    # Complete summary
```

## Component Guide

### Using Components
```typescript
// Import from barrel export
import {
  HeaderBar,
  PreviewPanel,
  ActionBar,
  DownloadQueue,
  SplashScreen,
} from "./components";

// Use in your component
<HeaderBar
  urlInput={urlInput}
  onUrlChange={setUrlInput}
  onPaste={handlePaste}
  onSubmit={handleDownload}
  onSettingsClick={() => setSettingsOpen(true)}
  isLoading={previewLoading}
  inputRef={inputRef}
/>
```

### Creating New Components
1. Create file: `app/components/MyComponent.tsx`
2. Add "use client" directive
3. Define props interface
4. Export from `app/components/index.ts`
5. Use lucide-react icons
6. Apply brand colors to buttons

```typescript
// Example component
"use client";

import { MyIcon } from "lucide-react";

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <button className="btn-brand" onClick={onAction}>
      <MyIcon className="h-5 w-5" />
      {title}
    </button>
  );
}
```

## Icon Reference

### Common Icons
```typescript
import {
  Plus,           // Add/paste button
  Settings,       // Settings icon
  Download,       // Download action
  Loader2,        // Loading spinner
  X,              // Close button
  Check,          // Success/completed
  AlertCircle,    // Errors
  Pause,          // Pause action
  Play,           // Play/resume
  Video,          // Video placeholder
  Folder,         // Show in folder
  CloudDownload,  // Download indicator
  ListVideo,      // Playlist badge
  ChevronLeft,    // Back button
  ChevronRight,   // Forward button
  Trash2,         // Delete/clear
  Subtitles,      // CC/captions
  Scissors,       // SponsorBlock
} from "lucide-react";

// Usage
<Plus className="h-5 w-5 text-white" />
```

## Brand Colors

### CSS Variables
```css
:root {
  --brand-blue: #2563eb;
  --brand-blue-light: #3b82f6;
  --brand-cyan: #06b6d4;
  --brand-teal: #0891b2;
  --brand-gradient: linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
}
```

### Using Brand Colors
```typescript
// In components
<button className="btn-brand">Download</button>

// Custom styling
<div style={{ background: 'var(--brand-gradient)' }}>
  Content
</div>
```

## State Management

### Main App State (page.tsx)
```typescript
// Display states
showSplash: boolean          // Splash screen visibility
appReady: boolean            // App initialization
showHistory: boolean         // Downloads vs history tab
isDragging: boolean          // Drag-and-drop indicator

// Form states
urlInput: string             // Current URL
destination: string          // Download folder
presetId: string             // Quality preset
subtitlesEnabled: boolean    // CC toggle
sponsorBlockEnabled: boolean // SponsorBlock toggle

// Data states
urlPreviews: Map             // Cached preview data
playlistVideos: []           // Playlist items
settings: UserSettings       // User configuration
isSubmitting: boolean        // Download submission state
isLoadingPlaylistVideos: boolean // Playlist loading state
```

## Common Tasks

### Add a New Feature
1. Create component in `app/components/`
2. Add state in `page.tsx` if needed
3. Pass state and handlers as props
4. Use lucide-react icons
5. Apply brand colors
6. Export from `components/index.ts`
7. Test in page

### Change Brand Colors
1. Update CSS variables in `app/globals.css`
2. All `.btn-brand` elements update automatically
3. Test light and dark modes
4. Test on different browsers

### Add a New Icon
1. Import from lucide-react
2. Use with className for styling
3. Keep consistent sizes (h-4 to h-6 typical)
4. Match color scheme

### Fix a Bug
1. Identify which component has the issue
2. Check component props and state
3. Add console logs for debugging
4. Check globals.css for style conflicts
5. Test in dev mode with `npm run dev`
6. Run build to verify: `npm run build`

## Testing

### Build
```bash
# Full build
npm run build

# Check for errors
npm run lint
```

### Development
```bash
# Start dev server
npm run dev

# Open http://localhost:3000
```

### Visual Checklist
- [ ] Logo visible in header, splash, footer
- [ ] Download button is blue gradient (not red)
- [ ] All icons render (no broken images)
- [ ] Hover effects work on buttons
- [ ] Splash screen appears on startup
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Dark mode works

## Troubleshooting

### Build Fails
1. Clear cache: `rm -rf .next`
2. Reinstall: `npm install`
3. Check Node version: `node -v` (need 16+)
4. Check TypeScript: `npm run build` for errors

### Icons Not Showing
1. Check import: `import { IconName } from "lucide-react"`
2. Verify icon exists in lucide docs
3. Check spelling (case-sensitive)
4. Rebuild: `npm run build`

### Colors Not Applying
1. Check CSS variables in `globals.css`
2. Use `className="btn-brand"` for buttons
3. Use `var(--brand-blue)` in inline styles
4. Clear browser cache
5. Hard refresh: Cmd+Shift+R

### Styles Not Working
1. Verify Tailwind classes
2. Check dark mode: components need dark: prefix
3. Clear Next.js cache: `rm -rf .next`
4. Restart dev server

## Performance Tips

1. **Use React.memo** for list items that don't change often
2. **Use useMemo** for expensive calculations
3. **Use useCallback** for event handlers
4. **Avoid re-renders** by memoizing props
5. **Tree-shakeable deps** like lucide-react (only used icons included)

## Documentation

### For Details, See:
- **REFACTORING.md** - Comprehensive refactoring guide
- **ARCHITECTURE.md** - Technical architecture & data flow
- **IMPROVEMENTS_SUMMARY.md** - UI/UX improvements checklist
- **LATEST_IMPROVEMENTS.md** - Complete accomplishments summary

### Component Files:
Each component has inline JSDoc comments explaining:
- Component purpose
- Props interface
- Usage examples
- Related components

## Code Style

### TypeScript
```typescript
// Use explicit types
interface ComponentProps {
  title: string;
  onAction: (value: string) => void;
}

// Use const for functions
const MyComponent = ({ title, onAction }: ComponentProps) => {
  // Implementation
};
```

### React Patterns
```typescript
// Use useCallback for handlers
const handleClick = useCallback(() => {
  // Logic
}, [dependencies]);

// Use useMemo for computed values
const computed = useMemo(() => {
  return expensiveCalculation();
}, [dependencies]);

// Use useEffect for side effects
useEffect(() => {
  // Side effect
}, [dependencies]);
```

### Styling
```typescript
// Use Tailwind classes
className="flex items-center gap-2 rounded-lg p-3"

// Use brand colors
className="btn-brand"

// Dark mode support
className="dark:bg-zinc-900 dark:text-white"

// Conditional styling
className={`rounded-lg ${isActive ? 'bg-blue-500' : 'bg-gray-500'}`}
```

## Release Checklist

Before releasing a new version:
- [ ] All tests passing
- [ ] Build completes successfully
- [ ] No console errors or warnings
- [ ] All icons render correctly
- [ ] Brand colors applied
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version number bumped
- [ ] Git tags created

## Environment Setup

### Required
- Node.js 16+
- npm or yarn
- Git

### Optional
- VS Code (recommended)
- Prettier (formatting)
- ESLint (linting)

### Recommended VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- TypeScript Vue Plugin

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run ESLint

# Tauri (if using)
npm run tauri dev        # Run Tauri dev
npm run tauri build      # Build Tauri app

# Cleanup
rm -rf .next             # Clear Next cache
rm -rf node_modules      # Clear dependencies
npm install              # Reinstall dependencies
```

## Next Steps

1. **Review** the ARCHITECTURE.md for detailed component structure
2. **Explore** the components in `app/components/` directory
3. **Check** constants.ts for configurable values
4. **Run** `npm run dev` to start developing
5. **Read** inline JSDoc comments in component files
6. **Join** the development workflow

## Support

For questions or issues:
1. Check relevant markdown documentation
2. Review component JSDoc comments
3. Look at similar components for patterns
4. Check REFACTORING.md for context
5. Review git history for recent changes

---

**Last Updated**: v0.1.12  
**Maintained By**: Downlink Team  
**License**: Check LICENSE file
