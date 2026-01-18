# New Audio 360

## Overview
New Audio 360 is a premium mobile music player application built with React Native and Expo, targeting audio enthusiasts. It offers robust playback, extensive music organization, professional sound customization, and deep personalization through 55 themes. The app requires a one-time purchase to function, with local data storage and client-side license verification via Google Play. Its business vision is to provide a high-quality, ad-free, and privacy-focused audio experience for users who value superior sound and extensive customization.

## User Preferences
I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. I prefer iterative development with clear justifications for each step. No complex animations - use simple dissolve/appear effects only.

**Git Workflow**: Replit is always the source of truth. Never merge changes from GitHub to Replit. When pushing to GitHub, use `git push --force` if needed to overwrite remote changes.

## System Architecture
The application leverages React Native and Expo for the frontend, strictly adhering to the Microsoft Fluent 2 design system (4px grid, Fluent typography, semantic color tokens, elevation shadows, motion curves, 100% Android safe area compliance). All data is stored locally on the device (music library, user settings, playlists, preferences) using AsyncStorage/SecureStorage, requiring no backend. License verification is performed client-side via Google Play installation checks.

### Client-Side Architecture
-   **Local Data Storage**: Device-local music playback, media library access, user settings, playlists, and preferences.
-   **No Backend**: No server infrastructure, database, or admin panel needed. License verification is solely via Play Store installation.

### License Verification Flow
The app checks if it was installed from Google Play (com.android.vending). If so, it's licensed; otherwise, the user is prompted to acquire it from the Play Store. The license state is cached locally for offline use.

### Audio Tip Notification
On launch, a dismissible notification card advises users to disable native phone audio effects for optimal sound with the app's Sound Lab.

### Technical Implementations
-   **Platform**: React Native with Expo SDK (Legacy Architecture for `react-native-track-player` compatibility).
-   **State Management**: React Context API with custom hooks.
-   **Data Persistence**: AsyncStorage for local storage.
-   **Design System**: Microsoft Fluent 2 tokens.
-   **Audio Playback**: `react-native-track-player` for background playback (Android), `expo-av` for web fallback.
-   **Media Access**: `expo-media-library` for device audio files.
-   **Animations**: Simple dissolve/appear effects only.

### Navigation Structure
A 4-tab system (`MainTabNavigator`) with a persistent MiniPlayer:
-   **ListenTab**: Main player, Now Playing, Sound Lab, Queue.
-   **LibraryTab**: Music organization with Quick Access Category Grid.
-   **RadioTab**: FM/AM native radio and Online streaming radio.
-   **SettingsTab**: General settings, Sound Lab, Appearance, License, About.

### Audio Effects Architecture (Hybrid Approach)
-   **Android Platform**: Uses native `android.media.audiofx.Equalizer` with 2.5x effect strength (100 millibels per unit) for noticeable EQ changes. Native effects attached via priority 1000 for global audio session support.
-   **Web/iOS Platform**: Uses `react-native-audio-api` (Web Audio API implementation) with BiquadFilter-based 10-band EQ. WebAudioEffectsEngine provides consistent effects across platforms.
-   **Immersive Modes**: 6 preset modes (Music, 360 Reality, Gaming, Podcast, Movie, Off) with custom EQ curves applied via platform-appropriate engine.

### Native Audio Modules (Android-specific)
-   **PlaybackEngineModule**: ExoPlayer-based playback with queue, shuffle, repeat, speed, and audio session management.
-   **Native Audio Effects**: 5-band Equalizer with 100mb/unit strength for noticeable effect. Headroom-safe processing with priority 1000.
-   **ImmersiveModeEngineModule**: Manages 6 immersive audio modes (Music, 360 Reality, Gaming, Podcast, Movie, Off).
-   **AudioSessionBridgeModule**: Bridges audio session IDs between react-native-track-player and native effects.
-   **NativeWaveformVisualizer**: Real-time 64-bar waveform visualization.
-   **FMRadioModule**: FM/AM radio tuning with Sound Lab effects integration.
-   **LicenseVerificationModule**: Native Kotlin module for Play Store license verification.
-   **NativeEffectsManager**: TypeScript service for Android native EQ with zero-sum balancing.
-   **WebAudioEffectsEngine**: TypeScript service using react-native-audio-api for Web/iOS EQ processing.

### Design Language (Microsoft Fluent 2)
Adheres to Fluent 2 token system for Spacing (4px grid), Typography, Semantic Colors, Radii, Elevation Shadows, and Motion. Utilizes custom Fluent 2 primitive UI components.

### Feature Specifications
-   **Theming**: 55 themes with custom icons, shapes, and component variants (glass, beveled, aero effects).
-   **Sound Lab**: Mutually exclusive Equalizer presets or Immersive modes with headroom-safe normalization.
-   **FM/AM Radio**: Native Android radio with scanning, tuning, favorite stations, and Sound Lab effects.
-   **Online Radio Streaming**: Hundreds of verified internet radio stations via Radio Browser API, with quality filters (verified working, MP3/OGG/AAC, >64kbps bitrate).
-   **One-Time Purchase**: Lifetime access.
-   **MiniPlayer**: Persistent glassmorphism mini-player.
-   **Media Library Integration**: Onboarding, paginated loading, "Hide Song."
-   **Playlist Management**: Full CRUD for local playlists.
-   **Playback Features**: Favorites, Recently Played, Most Played, Queue Management, Sleep Timer.
-   **Background Playback**: Music and radio continue playing when app is closed, with Android notification controls.
-   **Music Folder Selection**: Users can select specific device folders for music.
-   **Multi-Step Permission Onboarding**: Guides users through necessary permissions.

### Build Configuration
-   **Expo SDK**: 53.0.0 with React Native 0.79.2.
-   **Reanimated**: Version 3.17.x.
-   Requires an **Expo Development Build** for full native module functionality.
-   Native audio effects are Android-only.
-   Four EAS Build profiles: `development`, `preview`, `production`, `production-apk`.

### CI/CD Pipeline
GitHub Actions workflows (`.github/workflows/`) for building development APKs and production AAB/APKs. Requires `EXPO_TOKEN` secret.

### Production License Verification
Uses `react-native-iap` for Google Play Billing integration to check and request purchases with product ID `new_audio_360_lifetime`.

## External Dependencies

-   **React Native**: Core cross-platform mobile framework.
-   **Expo SDK**: Development and build tooling.
-   **expo-av**: Audio playback (web fallback).
-   **expo-media-library**: Device media access.
-   **react-native-reanimated**: Simple animations.
-   **@react-navigation**: Navigation system.
-   **MaterialCommunityIcons**: Iconography.
-   **expo-notifications**: For now-playing controls and permission flow.
-   **expo-local-authentication**: Biometric/PIN authentication.
-   **expo-location**: Location detection for online radio.
-   **react-native-track-player**: Background audio playback with notification controls.
-   **react-native-iap** (production): Google Play Billing integration.