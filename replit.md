# New Audio 360

## Overview

New Audio 360 is a premium, 100% offline mobile music player application built with React Native and Expo. It provides audio enthusiasts with a full-featured, device-local music experience including a robust music player ("Listen Mode"), comprehensive music organization ("Library"), professional sound customization ("Sound Lab"), and extensive personalization through 55 themes. The project aims to offer a high-quality, private, and fully self-contained music experience without relying on any external servers, cloud services, or internet connectivity. This app is purely local, with all user data, settings, and media stored exclusively on the device.

## User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. Do not introduce external dependencies or network requests, as the application is strictly offline and device-local. All data must reside on the user's device. I prefer iterative development with clear justifications for each step.

## System Architecture

The application is built with **React Native and Expo**, ensuring cross-platform support while maintaining a fully offline and device-local experience. There is no backend server, API calls, or cloud integration; all data persists locally via AsyncStorage. The UI/UX adheres to **Microsoft Fluent 2** design system with pixel-perfect compliance, featuring a 4px grid system, Fluent typography scale, semantic color tokens, elevation shadows, and motion curves. The app maintains 100% Android safe area compliance for status bar, navigation bar, and keyboard.

**Technical Implementations:**
- **Platform**: React Native with Expo SDK
- **State Management**: React Context API with custom hooks
- **Data Persistence**: AsyncStorage for local storage
- **Design System**: Microsoft Fluent 2 tokens in `client/constants/fluent2/`
- **Audio Playback**: expo-av for local audio file playback
- **Media Access**: expo-media-library for accessing device audio files
- **Animations**: react-native-reanimated with Fluent 2 motion curves
- **Safe Areas**: react-native-safe-area-context with useSafeAreaInsets()

**Navigation Structure:**
The app features a 3-tab navigation structure:
- **MainTabNavigator**: Hosts Listen, Library, and Settings tabs, with a persistent MiniPlayer overlay.
    - **ListenTab**: Main music player, Now Playing, Sound Lab, and Queue management.
    - **LibraryTab**: Music organization with a **Quick Access Category Grid** (7 color-coded cards: Liked, Recent, Top, Songs, Albums, Artists, Playlists) – all categories visible at once without horizontal scrolling.
    - **SettingsTab**: General settings, Sound Lab, Appearance (theme selector), Subscription Plan, and About.
    - **StudioTab**: (Currently hidden) Voice recording over backing tracks with voice-specific effects, code preserved for future re-enablement.

**Native Audio Modules (located in `modules/audio-effects/`):**

*Main Playback Engine (ExoPlayer-based):*
- **PlaybackEngineModule**: Native Android playback using `ExoPlayer` (Media3) with:
  - Queue management with gapless playback
  - Shuffle and repeat modes (off/one/all)
  - Playback speed control (0.25x - 3.0x)
  - Audio session management for effect attachment
  - Progress events at 250ms intervals
  - Automatic audio focus handling

*Native Audio Effects (Session-bound):*
- **EqualizerModule**: Android `Equalizer` API with device presets and custom band levels
- **BassBoostModule**: Android `BassBoost` API with strength control (0-1000)
- **VirtualizerModule**: Android `Virtualizer` API for spatial audio enhancement
- **WaveformAnalyzerModule**: Android `Visualizer` API for real-time waveform and FFT data at 60Hz

*Karaoke Recording Architecture (Real-time Processing):*
- **LiveRecordingModule**: Uses Android `AudioRecord` with `VOICE_PERFORMANCE` audio source (optimized for singing). Applies real-time effects during capture:
  - `AcousticEchoCanceler` - Prevents backing track bleed into voice recording
  - `NoiseSuppressor` - Real-time noise reduction
  - `AutomaticGainControl` - Consistent voice levels
  - Outputs 48kHz mono WAV for maximum clarity
- **BackingTrackModule**: Separate `MediaPlayer` session for backing track playback. Uses independent audio session with `USAGE_MEDIA`/`CONTENT_TYPE_MUSIC` attributes to prevent interference with recording.

*Post-Processing Modules (Export):*
- **ReverbModule**: Uses Android `EnvironmentalReverb` API with 5 presets.
- **NoiseReductionModule**: Uses Android `NoiseSuppressor` and `AutomaticGainControl` APIs with 4 levels.
- **AudioMixerModule**: Mixes backing track and voice recording with effects, exporting 320kbps AAC to device storage using `MediaExtractor`, `MediaCodec`, and `MediaMuxer`.

*StudioAudioEngine*: TypeScript service that bridges native modules on Android with expo-av fallback for web/iOS. Uses `getAudioCapabilities()` to detect device support for AEC/NS/AGC. Manages separate audio sessions for recording and playback.

**Design Language:**
The app uses **Microsoft Fluent 2** design system with comprehensive token-based styling located in `client/constants/fluent2/`:

*Fluent 2 Token System:*
- **Spacing** (`spacing.ts`): 4px base grid with tokens (xxs=2, xs=4, s=8, m=12, l=16, xl=20, xxl=24, xxxl=32, etc.)
- **Typography** (`typography.ts`): Fluent type scale (caption1/2, body1/2, subtitle1/2, title1/2/3, largeTitle, display)
- **Colors** (`colors.ts`): Semantic color tokens (colorNeutralForeground1-4, colorBrandBackground, colorNeutralBackground1-6, etc.) with light/dark mode support
- **Radii** (`radii.ts`): Control radii (button=4, input=4, chip=4, card=8, dialog=12, bottomSheet=16)
- **Shadows** (`shadows.ts`): Elevation system (shadow2, shadow4, shadow8, shadow16, shadow28, shadow64) with platform-specific implementations
- **Motion** (`motion.ts`): Fluent durations (faster=100ms, fast=150ms, normal=200ms, slow=300ms) and easing curves (accelerateMid, decelerateMid, easeMax)

*Safe Area Compliance:*
- All screens use `useSafeAreaInsets()` for proper status bar and navigation bar handling
- ScreenLayout component applies `insets.top` and `insets.bottom` dynamically
- Overlays (BottomSheet, Dialog, ContextMenu) respect safe areas
- MiniPlayer and MainTabNavigator include bottom inset padding
- Keyboard avoidance via KeyboardAvoidingView on all input screens

**Feature Specifications:**
- **Theming**: 55 themes with custom icons, shapes, and component variants.
- **Sound Lab**: Offers mutually exclusive Equalizer presets or Immersive modes.
- **Subscription System**: Two-tier subscription model (Free, Standard, Premium) for feature gating, with mock IAP for development and client-side security for anti-tampering.
- **MiniPlayer**: A persistent, glassmorphism-effect mini-player for quick control.
- **Media Library Integration**: Onboarding for media access, paginated loading of device audio, and "Hide Song" functionality.
- **Playlist Management**: Full CRUD operations for locally stored playlists.
- **Playback Features**: Favorites, Recently Played, Most Played, Queue Management, and Sleep Timer.
- **Studio Mode**: Enables recording voice over backing tracks with specific voice effects (Noise Reduction + Reverb), distinct from Sound Lab's music effects.

## Build Configuration

**Module Resolution:**
- Native audio modules are located in `modules/audio-effects/`
- A symlink at `client/modules/audio-effects` points to the root modules directory for Metro resolution
- babel.config.js uses `@` alias pointing to `./client` for all imports
- metro.config.js adds watch folders and source extensions for platform-specific resolution

**Platform-Specific Files:**
- `modules/audio-effects/index.ts` - Native Android implementation with ExoPlayer and native effects
- `modules/audio-effects/index.web.ts` - Web fallback using expo-av stubs
- `client/services/NativeEffectsManager.ts` - Native effects manager for Android
- `client/services/NativeEffectsManager.web.ts` - Web fallback (no-op)

**Build Requirements:**
- This app requires an **Expo Development Build** for full native module functionality
- Native audio effects (EQ, BassBoost, Virtualizer, Waveform) only work on Android
- Web preview shows UI but uses expo-av fallback for audio playback

## External Dependencies

- **React Native**: Cross-platform mobile framework
- **Expo SDK**: Development and build tooling
- **expo-av**: Audio playback (web fallback, deprecated in SDK 54)
- **expo-audio**: Recommended audio replacement (migration pending)
- **expo-media-library**: Device media access
- **react-native-reanimated**: Smooth animations
- **@react-navigation**: Navigation system
- **MaterialCommunityIcons**: Iconography

## Recent Changes

- **2026-01-09**: **Studio Mode Hidden** - Temporarily hidden Studio/Create tab from navigation:
  - Removed StudioTab from MainTabNavigator (code preserved in CreateStackNavigator for future re-enablement)
  - Updated PlanScreen to show only music player features (removed noise reduction, reverb references)
  - App now shows 3 tabs: Listen, Library, Settings
  - Subscription plan descriptions focus on: Music Player, Playlists, Themes, Equalizer, Immersive Audio

- **2026-01-09**: **Header Space Optimization** - Maximized song list space while maintaining accessibility:
  - TopBar height reduced from 56px to 48px (8px savings)
  - MiniPlayer height reduced from 68px to 64px (4px savings)
  - Horizontal padding reduced from 20px to 16px throughout
  - ListenScreen: Removed song count line, reduced stickyHeader padding
  - LibraryScreen: Compact category chips (36px + hitSlop for 48px effective touch), reduced section padding
  - All interactive elements maintain 44px minimum touch targets via hitSlop properties
  - Net gain: ~40-50px more vertical space for song content display

- **2026-01-09**: **Theme-Specific Icons and Fluent 2 Styling Cleanup** - Icons now change throughout the app based on selected theme:
  - Updated ThemeContext to use `getSkin(themeName)` for proper skin definition retrieval per theme
  - Theme icons now update across PlaybackControls, MainTabNavigator, MiniPlayer, and other components
  - ThemeSelector (Appearance page) now uses consistent Fluent 2 styling with FluentControlRadius.card (8px)
  - Replaced old Spacing imports with FluentSpacing tokens in ThemeSelector
  - Removed unused bevel/glow styling code for cleaner implementation
  - Design choice: Skins are defined per theme name - icons/shapes stay consistent while only colors change with dark mode

- **2026-01-09**: **Multi-Step Permission Onboarding Flow** - Replaced single-screen onboarding with comprehensive step-based permission flow:
  - Created PermissionOnboardingFlow.tsx with visual step indicators (dots) and progress counter
  - Three permission steps: Music & Audio (Media Library), Microphone (for Studio/Karaoke), Notifications (for now-playing controls)
  - Added expo-notifications package with Android notification channel "now-playing" setup
  - Each step shows permission status (pending/granted/denied) with appropriate actions
  - "Open Settings" button for denied permissions, "Skip" option for optional permissions
  - Web platform shows simplified screen with "Get Started" button (permissions work differently on web)
  - Integrated into App.tsx with proper onboarding state transitions
  - All styling uses Fluent 2 design tokens for consistent UI

- **2026-01-09**: **Music Folder Selection Feature** - Users can now select specific device folders to source music from:
  - Added FolderSelectionScreen with multi-select folder browsing
  - Storage functions for folder persistence (getSelectedFolders, setSelectedFolders)
  - MediaLibraryContext filters songs by selected folders
  - Settings menu entry under "Music Folders" for easy access
  - Web platform implementation:
    - Uses File System Access API (showDirectoryPicker) for folder selection
    - Creates blob URLs from File objects for audio playback
    - Session cache (webFolderCache.ts) maintains blob URLs in memory across navigation
    - Blob URLs persist within browser session but not across page refreshes
    - Users need to re-add folders after closing/refreshing the browser tab (browser security limitation)

- **2026-01-09**: **Complete Fluent 2 Design System Migration** - Replaced Material Design 3 with Microsoft Fluent 2 throughout the app:
  - Created comprehensive Fluent 2 token system in `client/constants/fluent2/` (spacing, typography, colors, shadows, radii, motion)
  - Updated ThemeContext to expose Fluent 2 tokens via `useFluentTheme()` hook
  - Refactored all 33+ components to use Fluent 2 specifications (Button, Card, TopBar, MiniPlayer, BottomSheet, Dialog, etc.)
  - Audited and updated all 26 screens for Fluent 2 styling compliance
  - Implemented 100% Android safe area compliance using `useSafeAreaInsets()` throughout
  - Added keyboard avoidance with KeyboardAvoidingView on all input screens
  - Updated navigation components (MainTabNavigator, TopBar, MiniPlayer) with proper safe area padding

- **2026-01-08**: Fixed Metro bundler resolution for native modules by creating symlink at `client/modules/audio-effects`. Updated metro.config.js with platform-specific source extensions and watch folders. Web preview now loads correctly with expo-av fallback.