# New Audio 360

## Overview
New Audio 360 is a premium hybrid mobile music player application built with React Native and Expo, targeting audio enthusiasts. It delivers a comprehensive music experience featuring robust playback, extensive music organization, professional sound customization, and deep personalization through 55 themes. The application employs a hybrid architecture, utilizing a backend server for authentication and subscription management via Google Play, while keeping music data, settings, and preferences stored locally on the device.

## User Preferences
I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. I prefer iterative development with clear justifications for each step.

## System Architecture
The application leverages **React Native and Expo** for the frontend and **Express.js with PostgreSQL** for the backend. The UI/UX strictly adheres to the **Microsoft Fluent 2** design system, implementing a 4px grid, Fluent typography, semantic color tokens, elevation shadows, and motion curves, ensuring 100% Android safe area compliance.

### Hybrid Architecture
**Frontend (React Native/Expo):**
- Device-local music playback and media library access.
- User settings, playlists, and preferences stored in AsyncStorage.
- Local caching of authentication state with intelligent refresh strategies.

**Backend (Express.js + PostgreSQL):**
- Located in the `server/` directory.
- Uses PostgreSQL with Drizzle ORM (`server/schema.ts`).
- Handles Google OAuth, subscription verification, and user management.
- Implements JWT-based authentication with refresh tokens.

### Authentication Flow
1.  **Initial Login**: Google Sign-In via `expo-auth-session`.
2.  **Token Management**: Access tokens (7-day expiry) are cached locally, and refresh tokens (30-day expiry) enable silent re-authentication.
3.  **Biometric Re-authentication**: Native Android PIN/biometric re-authentication for 24 hours, falling back to Google Sign-In afterward.
4.  **Subscription Verification**: Server-side validation using the Google Play Developer API.

### Technical Implementations
-   **Platform**: React Native with Expo SDK.
-   **State Management**: React Context API with custom hooks.
-   **Data Persistence**: AsyncStorage for local storage.
-   **Design System**: Microsoft Fluent 2 tokens (`client/constants/fluent2/`).
-   **Audio Playback**: `expo-av` for local audio (with native Android modules for advanced features).
-   **Media Access**: `expo-media-library` for device audio files.
-   **Animations**: `react-native-reanimated` integrating Fluent 2 motion curves.
-   **Safe Areas**: `react-native-safe-area-context`.

### Navigation Structure
A 3-tab navigation system (`MainTabNavigator`) includes Listen, Library, and Settings tabs, with a persistent MiniPlayer.
-   **ListenTab**: Main player, Now Playing, Sound Lab, Queue.
-   **LibraryTab**: Music organization with a Quick Access Category Grid.
-   **SettingsTab**: General settings, Sound Lab, Appearance, Subscription Plan, About.

### Native Audio Modules (Android-specific)
-   **PlaybackEngineModule**: ExoPlayer-based playback with queue, shuffle, repeat, speed control, and audio session management.
-   **Native Audio Effects**: Equalizer, BassBoost, Virtualizer (spatial audio), and WaveformAnalyzer.
-   **ImmersiveModeEngineModule**: Manages 7 immersive audio modes (e.g., Music, 360 Reality, Gaming) using native audio APIs with gain staging to prevent clipping.
-   **NativeWaveformVisualizer**: Real-time 64-bar waveform visualization using `WaveformAnalyzerModule`.
-   **StudioAudioEngine**: TypeScript service bridging native modules on Android with `expo-av` fallback.

### Design Language (Microsoft Fluent 2)
-   **Token System**: Comprehensive tokens for Spacing (4px grid), Typography, Semantic Colors (light/dark mode), Radii, Elevation Shadows, and Motion.
-   **UI Components**: Custom Fluent 2 primitive components like `FluentText`, `FluentSurface`, `FluentStack`, `FluentButton`, `FluentCard`, `FluentIconButton`, `FluentDivider`, `FluentChip`, and `FluentScreenLayout` have been created and applied across all screens.

### Feature Specifications
-   **Theming**: 55 themes with custom icons, shapes, and component variants.
-   **Sound Lab**: Offers mutually exclusive Equalizer presets or Immersive modes.
-   **Subscription System**: Two-tier model (Standard, Premium) with client-side security.
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

## Recent Changes

- **2026-01-09**: **Zero-Sum Balanced Audio System**:
  - **EQ Presets**: All 8 presets redesigned so band values sum to zero - positive boosts balanced by negative cuts
  - **Immersive Modes**: All 6 native modes (Music, 360 Reality, Signature 360, Gaming, Podcast, Movie) use zero-sum EQ bands
  - **Auto-Balancing**: NativeEffectsManager subtracts mean offset from 5-band mapping to maintain zero-sum after 7→5 conversion
  - **Pure Zero-Sum**: No conversion factors, no gain staging - raw balanced values applied directly
  - **EQ Preset Examples**: Rock [+3,+2,-2,-3,+1,+3,-4], Electronic [+4,+3,-2,-3,+1,+3,-6], Hip-Hop [+4,+3,-2,-3,+1,+1,-4]
  - **Immersive Mode EQ (mB)**: Music [60,10,-60,10,-20], Gaming [-14,-94,16,56,36], Movie [58,-12,-62,-12,28]
  - **Web Fallback**: Added immersive mode simulation with zero-sum EQ bands for web testing
  - Files updated: SoundLabContext.tsx, NativeEffectsManager.ts, NativeEffectsManager.web.ts, ImmersiveModeEngineModule.kt