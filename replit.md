# New Audio 360

## Overview

New Audio 360 is a premium, 100% offline mobile music player application built with **React Native and Expo**. Its core purpose is to provide audio enthusiasts with a full-featured, device-local music experience. Key capabilities include a robust music player ("Listen Mode"), comprehensive music organization ("Library"), professional sound customization ("Sound Lab"), and extensive personalization through 55 themes. The project aims to offer a high-quality, private, and fully self-contained music experience without relying on any external servers, cloud services, or internet connectivity.

## Project Rules

### CRITICAL - 100% LOCAL-DEVICE ONLY (MANDATORY)

**This app is PURELY LOCAL - NO SERVER, NO CLOUD, NO NETWORK:**
- **NO Server/Backend** - Absolutely no server-side logic, no backend, no API endpoints
- **NO Cloud Services** - No Firebase, no AWS, no any cloud database or storage
- **NO Network Requests** - No HTTP calls, no WebSockets, no internet connectivity required
- **ALL Data Stays on Device** - All user data, settings, and media stored locally only

## User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. Do not introduce external dependencies or network requests, as the application is strictly offline and device-local. All data must reside on the user's device. I prefer iterative development with clear justifications for each step.

## System Architecture

The application is built with **React Native and Expo**, ensuring cross-platform support while maintaining a fully offline and device-local experience. There is no backend server, API calls, or cloud integration; all data persists locally via AsyncStorage. The UI/UX adheres to **Material Design 3 (Material You)** guidelines with Android 16 design patterns, emphasizing dynamic color, clarity, and adaptability, with a comprehensive theming system offering 55 unique skins.

**Technical Implementations:**
- **Platform**: React Native with Expo SDK
- **State Management**: React Context API with custom hooks
- **Data Persistence**: AsyncStorage for local storage
- **Styling**: Material Design 3 tokens and components
- **Audio Playback**: expo-av for local audio file playback
- **Media Access**: expo-media-library for accessing device audio files
- **Animations**: react-native-reanimated with M3 motion curves

**Navigation Structure:**
The app features a 4-tab navigation structure:
- **MainTabNavigator**: Hosts Listen, Library, Studio, and Settings tabs, with a persistent MiniPlayer overlay
    - **ListenTab**: Main music player, Now Playing, Sound Lab, and Queue management
    - **LibraryTab**: Music organization with **Quick Access Category Grid** (7 color-coded cards: Liked, Recent, Top, Songs, Albums, Artists, Playlists) - all categories visible at once without horizontal scrolling
    - **StudioTab**: Voice recording over backing tracks with voice-specific effects (Noise Reduction + Reverb presets)
    - **SettingsTab**: General settings, Sound Lab, Appearance (theme selector), Subscription Plan, and About

## Recent Changes (2026-01-07)
- **Web Dialog Compatibility**: Replaced all Alert.alert calls in RecordingScreen with Dialog component
  - Alert.alert doesn't work on React Native web - custom Dialog component provides cross-platform support
  - Separate dialog states for headphone warning, stop confirmation, close confirmation, and error messages
  - Handler functions properly manage recording state and navigation
- **LiveAudioWaveform Improvements**: Enhanced real-time waveform animation responsiveness
  - Uses ref to track latest audio level, runs animation on continuous 60ms interval when active
  - Lowered threshold for detecting real audio from -150 to -120 dB for better sensitivity
  - More dynamic animation in both real audio and simulated modes with improved spring physics
- **Recording Pause/Resume Enhancement**: StudioAudioEngine now properly tracks elapsed time with pause/resume support
  - RecordButton toggles between record/pause/resume states with appropriate icons
  - Separate Stop button with confirmation dialog before navigating to Mix screen
  - Engine tracks accumulated recording time across pause/resume cycles
  - Timer correctly freezes on pause and continues from same value on resume
  - MixingScreen displays both Music and Voice channels with animated waveforms
  - Trim Audio shows "coming soon" dialog for Premium users
  - Layout fixes: proper padding to prevent content hidden behind tab bar
- **Client-Side Security System**: Implemented multi-layer anti-tampering protections for subscription enforcement
  - `IntegrityService`: Runtime integrity checks including environment hook detection (Frida/Xposed), timing anomaly detection, storage integrity verification, function modification checks, subscription data checksum validation
  - `SecureStorage`: Per-device encryption keys stored in SecureStore (native) with XOR obfuscation, dual-key HMAC integrity verification, timestamp validation
  - Violation tracking persisted in both SecureStore and AsyncStorage for redundancy
  - 7-day lockout mechanism after 3 integrity violations with countdown timer
  - `LockoutScreen`: Dedicated UI when app is locked due to integrity violations
  - Integration at app root via `LockoutGuard` component that blocks access when compromised
  - Periodic integrity checks every 5 minutes and forced checks before purchases
  - Checksums tied to device fingerprint to prevent cross-device subscription transfer
- **Studio Audio Engine**: Implemented real audio recording and playback for Studio mode
  - Created `StudioAudioEngine` service with expo-av for simultaneous playback and recording
  - RecordingScreen: Backing track preview, record voice while music plays, recording progress
  - MixingScreen: Real-time dual-track playback (music + voice), live volume balance, sync offset adjustment (-200ms to +200ms in 10ms increments)
  - EffectsScreen: Audio preview playback with effect selection
  - Platform-aware audio loading: file:// URIs for device music, web-only demo audio with clear error messaging
  - Warning UI when demo audio unavailable on native builds
- **Subscription System**: Replaced donation model with two-tier subscription (one-time purchase via Google Play Billing)
  - **Free**: Basic playback, limited themes (fluent only), Equalizer only, Off/Light noise + None/Small reverb
  - **Standard** (₹100/INR, $10/USD): 5 themes, all Equalizer presets, Light noise + Small Studio reverb
  - **Premium** (₹299/INR, $30/USD): All 55 themes, Immersive modes, full Studio effects
  - Mock IAP for development; real billing requires Play Store publication
  - Feature gating: ThemeSelector shows locks, SoundLabScreen shows Premium badge, EffectsScreen shows lock icons
  - Plan enforcement: locked features auto-reset when plan changes or on load
- **Studio Mode**: Added 4th tab for voice recording over karaoke/backing tracks
  - New StudioContext for project management and voice-specific effects
  - Voice effects (separate from Sound Lab): Noise Reduction (Off/Light/Medium/Strong) + Reverb presets (Small/Medium/Large Studio, Open Theatre, Auditorium)
  - Full recording flow: Select backing track → Record voice → Mix volumes → Apply effects → Save
  - Effects gated by subscription tier
- **Real audio test songs**: Added "O Maahi" (Arijit Singh) and "Dhurandhar Title Track" with 320kbps audio
- **Safe tab bar height hook**: Created `useSafeTabBarHeight` hook to fix "Invalid hook call" errors when useBottomTabBarHeight was called in try/catch blocks - now all screens use this safe wrapper
- **Audio playback improvements**: Fixed audio source handling to properly load device songs (expo-media-library) and show clear error messages for demo content without audio files
- **AlbumDetailScreen**: Added album detail view with song list and proper navigation integration
- **Previous changes**: Expo SDK update, MiniPlayer navigation fix, FlatList performance optimization, LibraryScreen redesign

## Design Language

**See `client/constants/DESIGN_LANGUAGE.md` for the complete design specification.**

The app uses **Material Design 3** (Material You) design language with:
- **Typography**: M3 type scale (displayLarge 57px, headlineLarge 32px, titleLarge 22px, bodyLarge 16px, labelLarge 14px)
- **Color System**: M3 tonal palette with primaryContainer, secondaryContainer, tertiaryContainer, and on-color variants
- **Spacing**: 4px base unit with named tokens (xs, s, m, l, xl, xxl, xxxl)
- **Shape**: M3 corner radii (cornerExtraSmall 4px, cornerSmall 8px, cornerMedium 12px, cornerLarge 16px)
- **Elevation**: M3 elevation levels (level0-5) with tonal surface colors
- **Motion**: M3 duration tokens (durationShort1-4, durationMedium1-4) and easing curves (easingStandard, easingEmphasized)
- **Touch Targets**: Minimum 48dp for all interactive elements
- **Navigation Bar**: M3 pattern with pill-style active indicators using secondaryContainer

### Quick Reference
| Element | Height/Size |
|---------|-------------|
| TopBar | 56px |
| BottomNav | 64px |
| MiniPlayer | 68px |
| List Item (standard) | 56px |
| Button (standard) | 44px |
| Input Field | 48px |
| Touch Target Min | 48px |

### Token Files
- `client/constants/theme.ts` - All design tokens (M3Motion, M3Shape, M3Elevation, Spacing, etc.)
- `client/constants/DESIGN_LANGUAGE.md` - Usage guidelines
- `client/components/ThemedText.tsx` - Typography component

### Reusable UI Components
- `client/components/SearchBar.tsx` - M3 styled search input with clear button
- `client/components/SortButton.tsx` - Dropdown sort menu with M3 styling
- `client/components/EmptyState.tsx` - Consistent empty state with icon, title, description
- `client/components/LoadingState.tsx` - Loading indicator with optional progress bar
- `client/components/TopBar.tsx` - App header with M3 IconButton and TopBarAction
- `client/components/MiniPlayer.tsx` - Glassmorphism persistent player
- `client/components/SongCard.tsx` - M3 styled song list item with actions
- `client/components/AnimatedCard.tsx` - Base pressable card with M3 animations
- `client/components/Button.tsx` - M3 styled button variants
- `client/components/Card.tsx` - M3 elevation-based card with ElevatedCard, OutlinedCard, FilledCard variants
- `client/components/HorizontalChips.tsx` - Bar 2 category chips with horizontal scrolling
- `client/components/BottomSheet.tsx` - M3 styled bottom sheet modal with gesture support
- `client/components/Dialog.tsx` - M3 styled centered dialog modal
- `client/components/ContextMenu.tsx` - M3 styled context/action menu

**Feature Specifications:**
- **Theming**: 55 themes with custom icons (MaterialCommunityIcons), shapes, and component variants
- **Sound Lab**: Offers mutually exclusive Equalizer presets (Flat, Rock, Pop, etc.) or Immersive modes (Cinema, Music, etc.)
- **Donation System**: Replaces subscriptions, allowing users to support development via multi-currency donations
- **MiniPlayer**: A persistent, glassmorphism-effect mini-player for quick control and navigation
- **Media Library Integration**: Onboarding for media access, paginated loading of device audio, and "Hide Song" functionality
- **Playlist Management**: Full CRUD operations for playlists, stored locally
- **Playback Features**: Favorites, Recently Played, Most Played, Queue Management, and Sleep Timer
- **Studio Mode**: Record voice over backing tracks with voice-specific effects (Noise Reduction + Reverb), separate from Sound Lab music effects

## External Dependencies

- **React Native**: Cross-platform mobile framework
- **Expo SDK**: Development and build tooling
- **expo-av**: Audio playback
- **expo-media-library**: Device media access
- **react-native-reanimated**: Smooth animations
- **@react-navigation**: Navigation system
- **MaterialCommunityIcons**: Iconography