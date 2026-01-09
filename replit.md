# New Audio 360

## Overview

New Audio 360 is a premium hybrid mobile music player application for audio enthusiasts. Built with React Native and Expo, it offers a full-featured music experience including a robust music player, comprehensive music organization, professional sound customization, and extensive personalization through 55 themes. The app uses a hybrid architecture with a backend server for authentication and subscription management via Google Play, while maintaining device-local storage for music data, settings, and preferences.

## User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. I prefer iterative development with clear justifications for each step.

## System Architecture

The application is built with **React Native and Expo** (frontend) and **Express.js with PostgreSQL** (backend). The UI/UX adheres to **Microsoft Fluent 2** design system with pixel-perfect compliance, featuring a 4px grid system, Fluent typography scale, semantic color tokens, elevation shadows, and motion curves. The app maintains 100% Android safe area compliance for status bar, navigation bar, and keyboard.

### Hybrid Architecture

**Frontend (React Native/Expo):**
- Music playback and media library access remain fully device-local
- User settings, playlists, and preferences stored in AsyncStorage
- Authentication state cached locally with intelligent refresh strategies

**Backend (Express.js + PostgreSQL):**
- Located in `server/` directory
- PostgreSQL database with Drizzle ORM (`server/schema.ts`)
- Endpoints: Google OAuth, subscription verification, user management
- JWT-based authentication with refresh tokens
- Port: 3001

### Authentication Flow
1. **Initial Login**: Google Sign-In via expo-auth-session
2. **Token Management**: 
   - Access tokens (7-day expiry) cached locally
   - Refresh tokens (30-day expiry) for silent re-authentication
3. **Biometric Re-authentication**: 
   - Native Android PIN/biometric for subsequent app access (24-hour window)
   - Falls back to Google Sign-In after biometric window expires
4. **Subscription Verification**: Server-side validation with Google Play Developer API

### Key Backend Endpoints
- `POST /api/auth/google` - Exchange Google auth code for tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile and subscription status
- `POST /api/subscription/verify` - Verify Google Play subscription

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

- **2026-01-09**: **Audio Engineering - Clipping Prevention & Gain Staging**:
  - **Immersive Mode Presets Redesigned**: All 7 modes (Music, 360 Reality, Signature 360, Gaming, Podcast, Movie, Off) use proper gain staging to prevent audio clipping and distortion
  - **Gain Staging Implementation**: Negative LoudnessEnhancer pre-gain (-300 to -600 mB) creates headroom before applying EQ boosts
  - **Effect Parameter Safety Caps**: EQ bands capped at +150 mB (was +400 mB), BassBoost max 300 (was 900), Virtualizer max 400 (was 1000)
  - **EqualizerModule Safety Limits**: Added `coerceIn(-1500, 150)` to `setBandLevel` and `setCustomBands` functions
  - **Preset Headroom Values**: Music (-300 mB), 360 Reality (-400 mB), Signature 360 (-500 mB), Gaming (-400 mB), Podcast (-200 mB), Movie (-600 mB)
  - **ErrorFallback Resilience**: Replaced ThemeContext dependency with React Native's useColorScheme to prevent errors when rendered outside ThemeProvider
  - **Files Updated**: ImmersiveModeEngineModule.kt, EqualizerModule.kt, ErrorFallback.tsx

- **2026-01-09**: **Hybrid Architecture Implementation - Backend & Authentication**:
  - **Backend Server**: Express.js + PostgreSQL + Drizzle ORM in `server/` directory
  - **Database Schema**: Users and subscriptions tables with JWT refresh tokens (`server/schema.ts`)
  - **Google OAuth**: expo-auth-session integration for Google Sign-In
  - **JWT Authentication**: 7-day access tokens, 30-day refresh tokens with intelligent caching
  - **Biometric/PIN Auth**: expo-local-authentication for 24-hour re-authentication window
  - **Subscription Verification**: Google Play Developer API integration
  - **AuthContext**: Complete authentication state management with subscription sync
  - **New Screens**: LoginScreen, BiometricLockScreen, SubscriptionRequiredScreen
  - **Metro Config**: Enabled unstable_enablePackageExports for expo-auth-session module resolution
  - **Permission Bugfix**: Reset isOnboardingComplete when permissions are denied/revoked

- **2026-01-09**: **Complete Fluent 2 Migration - All Screens & Components**:
  - **Navigation Infrastructure**: useScreenOptions.ts and HeaderTitle.tsx now use Fluent 2 tokens
  - **All 27 Screens Migrated**: Listen, Library, Settings, System/Utility, and Studio stacks fully use Fluent 2 design tokens
  - **All 24+ Components Migrated**: Core UI, music player, audio visualization, and form/input components
  - **Legacy Components Deprecated**: ThemedText, ThemedView, ScreenLayout, TopBar, Spacer marked as @deprecated with migration guidance to FluentText, FluentSurface, FluentScreenLayout
  - **Consistent Pattern Applied**: `const colors = isDark ? FluentDarkColors : FluentLightColors` across all files
  - **Color Token Mappings**: theme.text → colorNeutralForeground1, theme.primary → colorBrandForeground1, etc.
  - **Spacing Migration**: Spacing.* → FluentSpacing.* (4px grid)
  - **Radius Migration**: BorderRadius.* → FluentRadius.* / FluentControlRadius.*
  - **Typography Migration**: ThemedText type variants → FluentText variant props

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

- **2026-01-09**: **Native Immersive Modes & Waveform Visualization**:
  - **ImmersiveModeEngineModule** (Kotlin): Native Android module managing 7 immersive audio modes (off, music, 360_reality, signature_360, gaming, podcast, movie) using Equalizer, BassBoost, Virtualizer, and LoudnessEnhancer APIs
  - **Immersive Mode Presets**: Gaming mode (enhanced bass, spatial audio, loud clarity), Signature 360 (balanced 360 reality for music), plus Movie, Podcast, and Music modes
  - **NativeAudioService**: Unified TypeScript bridge for PlaybackEngine, WaveformAnalyzer, and ImmersiveModeEngine native modules with auto-initialization
  - **SoundLabScreen/Context Updates**: Integrated ImmersiveModeEngineModule with proper error handling - UI only updates after native calls succeed, failures surfaced to user
  - **NativeWaveformVisualizer**: Real-time 64-bar waveform visualization using WaveformAnalyzerModule with FFT support, RMS/peak levels, and smooth react-native-reanimated animations
  - **Audio Effects Module Index**: Updated with immersive mode exports, type definitions, and IMMERSIVE_MODE_INFO constants
  - **TypeScript Path Mapping**: Added audio-effects module alias in tsconfig.json