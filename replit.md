# New Audio 360

## Overview

New Audio 360 is a premium, 100% offline mobile music player application for audio enthusiasts. Built with React Native and Expo, it offers a full-featured, device-local music experience including a robust music player, comprehensive music organization, professional sound customization, and extensive personalization through 55 themes. The project's vision is to provide a high-quality, private, and fully self-contained music experience without relying on external servers, cloud services, or internet connectivity. All user data, settings, and media are stored exclusively on the device.

## User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. Do not introduce external dependencies or network requests, as the application is strictly offline and device-local. All data must reside on the user's device. I prefer iterative development with clear justifications for each step.

## System Architecture

The application is built with **React Native and Expo**, ensuring cross-platform support while maintaining a fully offline and device-local experience. There is no backend server, API calls, or cloud integration; all data persists locally via AsyncStorage. The UI/UX adheres to **Microsoft Fluent 2** design system with pixel-perfect compliance, featuring a 4px grid system, Fluent typography scale, semantic color tokens, elevation shadows, and motion curves. The app maintains 100% Android safe area compliance for status bar, navigation bar, and keyboard.

**Technical Implementations:**
- **Platform**: React Native with Expo SDK
- **State Management**: React Context API with custom hooks
- **Data Persistence**: AsyncStorage for local storage
- **Design System**: Microsoft Fluent 2 tokens in `client/constants/fluent2/`
- **Audio Playback**: expo-av for local audio file playback (with native Android modules for advanced features)
- **Media Access**: expo-media-library for accessing device audio files
- **Animations**: react-native-reanimated with Fluent 2 motion curves
- **Safe Areas**: react-native-safe-area-context with useSafeAreaInsets()

**Navigation Structure:**
The app features a 3-tab navigation structure:
- **MainTabNavigator**: Hosts Listen, Library, and Settings tabs, with a persistent MiniPlayer overlay.
    - **ListenTab**: Main music player, Now Playing, Sound Lab, and Queue management.
    - **LibraryTab**: Music organization with a **Quick Access Category Grid** (7 color-coded cards: Liked, Recent, Top, Songs, Albums, Artists, Playlists).
    - **SettingsTab**: General settings, Sound Lab, Appearance (theme selector), Subscription Plan, and About.
    - **StudioTab**: (Currently hidden) Voice recording over backing tracks with voice-specific effects, code preserved for future re-enablement.

**Native Audio Modules (Android-specific):**
- **PlaybackEngineModule**: ExoPlayer-based playback with queue, shuffle, repeat, speed control, audio session management, and progress events.
- **Native Audio Effects**: Equalizer, BassBoost, Virtualizer (for spatial audio), and WaveformAnalyzer (for real-time waveform/FFT data).
- **LiveRecordingModule**: Uses Android `AudioRecord` with `VOICE_PERFORMANCE` source for real-time vocal recording, applying AcousticEchoCanceler, NoiseSuppressor, and AutomaticGainControl.
- **BackingTrackModule**: Separate `MediaPlayer` session for backing track playback during recording.
- **Post-Processing Modules**: Reverb, NoiseReduction, and AudioMixer (to mix backing track and voice recording with effects and export AAC).
- **StudioAudioEngine**: TypeScript service bridging native modules on Android with `expo-av` fallback for web/iOS, managing audio capabilities and sessions.

**Design Language (Microsoft Fluent 2):**
- **Token System**: Comprehensive tokens for Spacing (4px grid), Typography, Semantic Colors (with light/dark mode), Radii, Elevation Shadows, and Motion (durations and easing curves).
- **Safe Area Compliance**: Utilizes `useSafeAreaInsets()` and `KeyboardAvoidingView` for adaptive UI across devices and keyboard presence.

**Feature Specifications:**
- **Theming**: 55 themes with custom icons, shapes, and component variants.
- **Sound Lab**: Offers mutually exclusive Equalizer presets or Immersive modes.
- **Subscription System**: Two-tier subscription model (Standard, Premium) for feature gating, with client-side security for anti-tampering.
- **MiniPlayer**: Persistent, glassmorphism-effect mini-player for quick control.
- **Media Library Integration**: Onboarding for media access, paginated loading of device audio, and "Hide Song" functionality.
- **Playlist Management**: Full CRUD operations for locally stored playlists.
- **Playback Features**: Favorites, Recently Played, Most Played, Queue Management, and Sleep Timer.
- **Music Folder Selection**: Users can select specific device folders to source music from.
- **Multi-Step Permission Onboarding**: Guides users through necessary permissions (Music & Audio, Notifications).

**Build Configuration:**
- Native audio modules are located in `modules/audio-effects/` with platform-specific implementations (`index.ts` for Android, `index.web.ts` for web fallback).
- Requires an **Expo Development Build** for full native module functionality.
- Native audio effects only work on Android.

## External Dependencies

- **React Native**: Core cross-platform mobile framework
- **Expo SDK**: Development and build tooling
- **expo-av**: Audio playback (primarily web fallback)
- **expo-media-library**: Device media access
- **react-native-reanimated**: Smooth animations
- **@react-navigation**: Navigation system
- **MaterialCommunityIcons**: Iconography
- **expo-notifications**: For now-playing controls and permission flow

## Recent Changes

- **2026-01-09**: **Comprehensive Fluent 2 UI Component Library & Screen Migration**:
  - **New Fluent 2 Primitive Components** (in `client/components/fluent/`):
    - FluentText: 14 typography variants with 10 color options
    - FluentSurface: Container with elevation levels and background variants
    - FluentStack: Flexible layout with gap/padding tokens
    - FluentButton: 5 variants (primary, secondary, outline, subtle, transparent)
    - FluentCard: Card with header/content/footer slots
    - FluentIconButton: Icon-only button with variants
    - FluentDivider: Horizontal/vertical separators
    - FluentChip: Selectable/dismissible chips
    - FluentScreenLayout: SafeAreaView wrapper with KeyboardAvoidingView
  - **Screen Migrations to Fluent 2**:
    - ListenScreen: Uses FluentScreenLayout, FluentText, Fluent 2 tokens
    - LibraryScreen: Full Fluent 2 colors, spacing, radii
    - SettingsScreen: MenuItem uses Fluent 2 patterns
    - NowPlayingScreen: Fluent 2 typography and color tokens
  - **Design Token System** (`client/constants/fluent2/`):
    - FluentLightColors/FluentDarkColors: Complete semantic color tokens
    - FluentSpacing: 4px grid system (none, xxs, xs, s, m, l, xl, xxl, xxxl)
    - FluentTypography: 14 type scale variants
    - FluentRadius: Border radius tokens
    - FluentShadows: Elevation shadows for light/dark

- **2026-01-09**: **Unified FluentTopBar Header Component** - Created consistent Microsoft Fluent 2 header across all main screens:
  - New FluentTopBar component with support for title, search bar, sort dropdown, and category dropdown
  - ListenScreen: "Listen" title with search and sort facilities
  - LibraryScreen: "Library" title with category dropdown (7 options), search, and sort
  - SettingsScreen: "Settings" title only
  - All overlays use absolute positioning with backdrop dismiss
  - Mutual exclusivity between dropdowns (opening one closes the other)

- **2026-01-09**: **Library Category Dropdown** - Replaced category grid with dropdown selector:
  - Converted 7 category cards (Liked, Recent, Top, Songs, Albums, Artists, Playlists) to single dropdown
  - Dropdown shows current category with icon, label, and item count
  - Overlay dropdown menu with all categories for selection
  - Saves vertical space for more content visibility

- **2026-01-09**: **Privacy Policy & Attribution** - Added comprehensive privacy policy and app attribution:
  - Created PrivacyPolicyScreen with 10 policy sections covering offline-first data practices
  - Added "By: Dhairya Shah (The Team 360)" attribution to SplashScreen, SettingsScreen, and AboutScreen footers
  - Privacy Policy accessible from About screen under Legal section
  - Updated PermissionOnboardingFlow: replaced microphone with Photos & Videos permission (Studio hidden)
  - Permission steps now: Music & Audio, Photos & Videos, Notifications