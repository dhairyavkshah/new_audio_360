# New Audio 360

## Overview

New Audio 360 is a premium, 100% offline mobile music player application built with Expo React Native. It provides audio enthusiasts with a full-featured, device-local music experience including a robust music player ("Listen Mode"), comprehensive music organization ("Library"), professional sound customization ("Sound Lab"), and voice recording studio. The application works across Android and iOS via Expo, with web preview support for development.

## Project Rules

- **Expo React Native** - Cross-platform mobile development
- **Fully offline** - No network requests required for core functionality
- **All data on device** - Local storage for settings, playlists, and preferences
- **GitHub Actions CI/CD** - APK/AAB builds for production distribution

## User Preferences

- Concise and direct communication
- Prioritize core functionality and architectural integrity
- Clear explanations for complex decisions
- No external API dependencies - strictly offline capable
- All user data resides on the device
- Iterative development with clear justifications

## System Architecture

### Technology Stack
- **Framework**: Expo SDK 52
- **Language**: TypeScript
- **UI**: React Native with custom components
- **Navigation**: React Navigation (Bottom Tabs)
- **Audio**: expo-av for playback and recording
- **Storage**: AsyncStorage for preferences
- **State Management**: React Context API

### Project Structure
```
/
├── App.tsx                 # Main app entry with navigation
├── src/
│   ├── screens/           # Screen components
│   │   ├── ListenScreen.tsx
│   │   ├── LibraryScreen.tsx
│   │   ├── StudioScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/        # Reusable components
│   │   ├── SongCard.tsx
│   │   ├── MiniPlayer.tsx
│   │   ├── CategoryCard.tsx
│   │   └── NowPlayingModal.tsx
│   ├── context/           # React contexts
│   │   ├── AudioContext.tsx
│   │   └── MessageContext.tsx
│   ├── hooks/             # Custom hooks
│   └── utils/             # Utility functions
├── assets/                # App icons and images
├── package.json
├── app.json               # Expo configuration
└── tsconfig.json
```

### Features

**Listen Screen:**
- Song list with search and sort
- Compact header with integrated controls
- Mini player for quick access
- Full Now Playing modal

**Library Screen:**
- Category grid (Liked, Recent, Top, Songs, Albums, Artists, Playlists)
- Dropdown filter in header
- Search functionality

**Studio Screen:**
- Voice recording with waveform visualization
- Voice effects (Echo, Reverb, Pitch Shift, Noise Cancel)
- Backing track selection

**Settings Screen:**
- Appearance (Dark mode)
- Audio settings (Equalizer, Quality, Sleep Timer)
- Storage management
- About section

### Navigation Structure
- **Listen**: Main music player with Now Playing
- **Library**: Quick Access Category Grid
- **Studio**: Voice recording with effects
- **Settings**: App configuration

## Development

### Running the App

```bash
npm install
npm start
```

The app will open in web preview mode on port 5000.

### Building for Mobile

Push to GitHub to trigger the build workflow, or use Expo EAS:

```bash
npx eas build --platform android
npx eas build --platform ios
```

## Dependencies

- expo ~52.0.0
- react-native 0.76.5
- @react-navigation/native ^7.0.0
- @react-navigation/bottom-tabs ^7.0.0
- expo-av ~15.0.0
- expo-file-system ~18.0.0
- react-native-safe-area-context ~4.14.0
- @react-native-async-storage/async-storage ~2.1.0

## Recent Changes

- **2026-01-08**: Converted back to Expo React Native for Replit preview support
  - Created TypeScript-based Expo project
  - Built all screens (Listen, Library, Studio, Settings)
  - Created reusable components (SongCard, MiniPlayer, CategoryCard)
  - Added AudioContext for state management
  - Added MessageContext for toast notifications above mini player
  - Compact header design with integrated search and filters
