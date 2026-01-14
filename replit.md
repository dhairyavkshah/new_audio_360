# New Audio 360

## Overview
New Audio 360 is a premium hybrid mobile music player application built with React Native and Expo, targeting audio enthusiasts. It offers robust playback, extensive music organization, professional sound customization, and deep personalization through 55 themes. The application uses a hybrid architecture with a backend for authentication and subscriptions, while music data, settings, and preferences are stored locally on the device.

## User Preferences
I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. I prefer iterative development with clear justifications for each step.

## System Architecture
The application leverages React Native and Expo for the frontend and Express.js with PostgreSQL for the backend. The UI/UX strictly adheres to the Microsoft Fluent 2 design system, implementing a 4px grid, Fluent typography, semantic color tokens, elevation shadows, and motion curves, ensuring 100% Android safe area compliance.

### Hybrid Architecture
**Frontend (React Native/Expo):**
- Device-local music playback and media library access.
- User settings, playlists, and preferences stored in AsyncStorage.
- Local caching of authentication state with intelligent refresh strategies.

**Backend (Express.js + PostgreSQL):**
- Handles Google OAuth, subscription verification, and user management.
- Implements JWT-based authentication with refresh tokens.

### Authentication Flow
1.  **Initial Login**: Google Sign-In via `expo-auth-session`.
2.  **Token Management**: Access tokens (7-day expiry) cached locally, refresh tokens (30-day expiry) for silent re-authentication.
3.  **Biometric Re-authentication**: Native Android PIN/biometric re-authentication for 24 hours.
4.  **Subscription Verification**: Server-side validation using the Google Play Developer API.

### Technical Implementations
-   **Platform**: React Native with Expo SDK.
-   **State Management**: React Context API with custom hooks.
-   **Data Persistence**: AsyncStorage for local storage.
-   **Design System**: Microsoft Fluent 2 tokens.
-   **Audio Playback**: `expo-av` (with native Android modules for advanced features).
-   **Media Access**: `expo-media-library` for device audio files.
-   **Animations**: `react-native-reanimated` integrating Fluent 2 motion curves.

### Navigation Structure
A 4-tab navigation system (`MainTabNavigator`) includes Listen, Library, Radio, and Settings tabs, with a persistent MiniPlayer.
-   **ListenTab**: Main player, Now Playing, Sound Lab, Queue.
-   **LibraryTab**: Music organization with Quick Access Category Grid.
-   **RadioTab**: FM/AM native radio and Online streaming radio with location-based channel discovery.
-   **SettingsTab**: General settings, Sound Lab, Appearance, Subscription Plan, About.

### Native Audio Modules (Android-specific)
-   **PlaybackEngineModule**: ExoPlayer-based playback with queue, shuffle, repeat, speed control, and audio session management.
-   **Native Audio Effects**: Equalizer, BassBoost, Virtualizer (spatial audio), Treble, and WaveformAnalyzer.
-   **ImmersiveModeEngineModule**: Manages 7 immersive audio modes using native audio APIs with gain staging.
-   **NativeWaveformVisualizer**: Real-time 64-bar waveform visualization.
-   **FMRadioModule**: FM/AM radio tuning using RadioManager/RadioTuner APIs with AudioRecord→AudioTrack pipeline for Sound Lab effects integration.
-   **StudioAudioEngine**: TypeScript service bridging native modules on Android with `expo-av` fallback.

### Design Language (Microsoft Fluent 2)
-   **Token System**: Comprehensive tokens for Spacing (4px grid), Typography, Semantic Colors (light/dark mode), Radii, Elevation Shadows, and Motion.
-   **UI Components**: Custom Fluent 2 primitive components like `FluentText`, `FluentSurface`, `FluentStack`, `FluentButton`, `FluentCard`, `FluentIconButton`, `FluentDivider`, `FluentChip`, and `FluentScreenLayout` are used.

### Feature Specifications
-   **Theming**: 55 themes with custom icons, shapes, and component variants, applying unique visual effects (glass, beveled, aero, etc.).
-   **Sound Lab**: Offers mutually exclusive Equalizer presets or Immersive modes with zero-sum balanced audio.
-   **FM/AM Radio**: Native Android radio with scanning, tuning, favorite stations, and Sound Lab effects on live radio audio.
-   **Online Radio Streaming**: Location-based internet radio with country detection, genre filtering, 48,000+ stations via Radio Browser API, and streaming playback.
-   **Subscription System**: Two-tier model (Free, Premium) with server-side normalization and regional pricing via Google Play.
-   **MiniPlayer**: Persistent, glassmorphism-effect mini-player.
-   **Media Library Integration**: Onboarding for access, paginated loading, "Hide Song" feature.
-   **Playlist Management**: Full CRUD for local playlists.
-   **Playback Features**: Favorites, Recently Played, Most Played, Queue Management, Sleep Timer.
-   **Music Folder Selection**: Users can select specific device folders for music sourcing.
-   **Multi-Step Permission Onboarding**: Guides users through necessary permissions.

### Build Configuration
-   Native audio modules are in `modules/audio-effects/` with platform-specific implementations.
-   Requires an **Expo Development Build** for full native module functionality.
-   Native audio effects are Android-only.

## External Dependencies

-   **React Native**: Core cross-platform mobile framework.
-   **Expo SDK**: Development and build tooling.
-   **expo-av**: Audio playback (primarily web fallback).
-   **expo-media-library**: Device media access.
-   **react-native-reanimated**: Smooth animations.
-   **@react-navigation**: Navigation system.
-   **MaterialCommunityIcons**: Iconography.
-   **expo-notifications**: For now-playing controls and permission flow.
-   **Express.js**: Backend web framework.
-   **PostgreSQL**: Database for backend.
-   **Drizzle ORM**: TypeScript ORM for PostgreSQL.
-   **expo-auth-session**: Google Sign-In.
-   **expo-local-authentication**: Biometric/PIN authentication.
-   **expo-location**: Location detection for online radio country discovery.