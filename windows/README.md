# Windows Store Build

This directory contains all configuration and assets for building the Windows Store (Microsoft Store) version of New Audio 360.

## Overview

New Audio 360 for Windows is built using **Electron**, creating a standalone desktop application. This approach:

- Works 100% offline without any URL required
- Full native Windows integration (file associations, Start menu, taskbar)
- Direct access to local music files via native file system
- Supports Windows 10 and Windows 11
- Can be distributed via Microsoft Store (APPX) or direct download (NSIS installer)

## Directory Structure

```
windows/
├── README.md                    # This file
├── Package.appxmanifest         # Windows app manifest (legacy PWA)
├── assets/                      # Windows-specific assets
│   └── icons/                   # Windows Store icons
├── store/                       # Store submission assets
│   └── screenshots/             # Store screenshots
└── scripts/
    └── generate-icons.js        # Icon generation script

electron/
├── main.js                      # Electron main process
├── preload.js                   # Preload script for IPC
└── electron-builder.yml         # Build configuration
```

## Building the Windows Package

### Option 1: GitHub Actions (Recommended)

1. Push code to GitHub
2. Go to **Actions** > **Build Windows Electron App**
3. Click **Run workflow**
4. Enter version number (e.g., `26.0.0`)
5. Select build type:
   - **appx** - For Microsoft Store submission
   - **nsis** - For direct download installer (.exe)
   - **both** - Build both formats
6. Download the artifact when complete

### Option 2: Build Locally

1. **Install dependencies:**
   ```bash
   npm ci
   ```

2. **Build APPX for Microsoft Store:**
   ```bash
   npm run electron:build:appx
   ```

3. **Or build NSIS installer (.exe):**
   ```bash
   npm run electron:build:win
   ```

4. **Find output in `electron-dist/` folder**

### Build Outputs

| Build Type | Output | Use Case |
|------------|--------|----------|
| APPX | `.appx` file | Microsoft Store submission |
| NSIS | `.exe` installer | Direct download from website |

## Generating Icons

### Prerequisites

```bash
npm install sharp
```

### Generate All Icons

```bash
cd windows/scripts
node generate-icons.js ../../assets/images/icon.png
```

This creates:
- PWA icons in `public/icons/`
- Windows Store icons in `windows/assets/icons/`

### Alternative: Online Tools

- [PWABuilder Image Generator](https://www.pwabuilder.com/imageGenerator)
- [App Icon Generator](https://appicon.co/)

## Windows Features

### File Associations

The app registers for common audio file types:
- .mp3, .m4a, .aac, .flac, .wav, .ogg, .wma, .opus

Users can set New Audio 360 as default for these file types.

### Music Library Access

The app can access the Windows Music folder via the File System Access API:

```typescript
import { windowsFolderScanner } from '@/services/WindowsFolderScanner';

// Request access to Music folder
const hasAccess = await windowsFolderScanner.requestMusicFolderAccess();

// Scan for audio files
const files = await windowsFolderScanner.scanMusicFolder((progress) => {
  console.log(`Scanned: ${progress.scanned} files`);
});
```

### Offline Support

The service worker (`public/sw.js`) provides:
- Static asset caching
- Network-first strategy for API calls
- Stale-while-revalidate for dynamic content

## Store Submission

See [MICROSOFT_STORE_SUBMISSION.md](../docs/MICROSOFT_STORE_SUBMISSION.md) for detailed submission instructions.

### Quick Checklist

1. [ ] Generate Windows icons
2. [ ] Capture screenshots at 1920x1080
3. [ ] Build MSIX package via GitHub Actions
4. [ ] Create Partner Center account
5. [ ] Reserve app name
6. [ ] Upload package
7. [ ] Fill store listing
8. [ ] Submit for certification

## Testing

### Local Testing (Sideload)

1. Build with `sideload` option in GitHub Actions
2. Download the package artifact
3. Enable Developer Mode in Windows Settings
4. Right-click the MSIX file > Install

### Testing PWA Locally

1. Build web app: `npx expo export --platform web`
2. Serve locally: `npx serve dist`
3. Open in Edge/Chrome
4. Install as PWA from browser menu

## Troubleshooting

### Package Won't Install

- Ensure Developer Mode is enabled
- Check Windows version (requires 1809+)
- Verify package isn't already installed

### File Access Not Working

- The File System Access API requires user gesture
- Ensure app is running in standalone mode (not browser tab)
- Check for HTTPS (required for API access)

### Icons Not Showing

- Run `generate-icons.js` script
- Verify icons are in correct locations
- Check manifest.json icon paths

## Version History

| Version | Changes |
|---------|---------|
| 27.0 | Lossless DSP improvements, limiter threshold optimization |
| 26.0 | Initial Windows Store release |

## Support

- Developer: Dhairya Shah
- Publisher: The Team 360
- Support: support@theteam360.com
