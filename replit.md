# New Audio 360

## Overview

New Audio 360 is a premium, 100% offline mobile music player application built with **Expo/React Native** for cross-platform support. Its core purpose is to provide audio enthusiasts with a full-featured, device-local music experience. Key capabilities include a robust music player ("Listen Mode"), comprehensive music organization ("Library"), professional sound customization ("Sound Lab"), and extensive personalization through themes. The project aims to offer a high-quality, private, and fully self-contained music experience without relying on any external servers, cloud services, or internet connectivity.

## Project Rules

### CRITICAL - 100% LOCAL-DEVICE ONLY (MANDATORY)

**This app is PURELY LOCAL - NO SERVER, NO CLOUD, NO NETWORK:**
- **NO Server/Backend** - Absolutely no server-side logic, no backend, no API endpoints
- **NO Cloud Services** - No Firebase, no AWS, no any cloud database or storage
- **NO Network Requests** - No HTTP calls, no WebSockets, no internet connectivity required
- **ALL Data Stays on Device** - All user data, settings, and media stored locally only using AsyncStorage

## Recent Changes

### Fluent 2 Design System Migration - Phase 2 (January 2026)
- Migrated main screens to Fluent 2: ListenScreen, LibraryScreen, SettingsScreen
- Updated TopBar component with solid backgrounds and proper z-indexing
- Migrated playback components: PlaybackControls, MiniPlayer, AudioWaveform
- Updated ScreenLayout to use Fluent2 tokens for spacing
- Fixed header transparency issues with position:absolute and solid backgrounds
- Replaced all ThemedText with FluentText in migrated components
- All components use useFluent2Theme hook instead of legacy useThemeContext

### Fluent 2 Design System Implementation - Phase 1 (January 2026)
- Implemented complete Microsoft Fluent 2 design system for Android
- Created comprehensive design tokens: colors, typography, spacing, elevation, radius, icon sizes, durations
- Built 14 Fluent 2 components: Button, Card, Text, ListItem, Toggle, Chip, TextField, AppBar, TabBar, BottomSheet, Icon, Avatar, ProgressBar, Slider
- Created Fluent2ThemeContext for theme management with light/dark mode support
- Updated SplashScreen, LoadingScreen, and PermissionOnboardingScreen with new Fluent 2 components
- Implemented compatibility layer in ThemeContext to support legacy screens during migration

## User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. Do not introduce external dependencies or network requests, as the application is strictly offline and device-local. All data must reside on the user's device. I prefer iterative development with clear justifications for each step.

## System Architecture

The application is built with **Expo/React Native** (TypeScript), ensuring a fully offline and device-local experience. There is no backend server, API calls, or cloud integration; all data persists locally via AsyncStorage. The UI/UX adheres to the **Microsoft Fluent 2 design system**, emphasizing clarity, consistency, and adaptability.

**Technical Stack:**
- **Framework**: Expo SDK 54 with React Native
- **Language**: TypeScript
- **State Management**: React Context + Hooks
- **Data Persistence**: AsyncStorage for local storage
- **Styling**: Fluent 2 design tokens with React Native StyleSheet
- **Audio Playback**: expo-audio for local audio file playback
- **Media Access**: expo-media-library for reading audio files from device storage

**Key Directories:**
- `client/` - Main application code
  - `components/fluent2/` - Fluent 2 design system components
  - `constants/fluent2.ts` - Fluent 2 design tokens
  - `contexts/` - React Context providers (Fluent2ThemeContext, ThemeContext, PlayerContext, etc.)
  - `screens/` - Application screens
  - `navigation/` - React Navigation setup

**Navigation Structure:**
The app features a 3-tab navigation structure:
- **MainTabNavigator**: Hosts Listen, Library, and Settings tabs, with a persistent MiniPlayer overlay.
    - **ListenTab**: Main music player, Now Playing, Sound Lab, and Queue management.
    - **LibraryTab**: Music organization (Songs, Albums, Artists, Playlists, Liked Songs, Recently Played), and Playlist Management.
    - **SettingsTab**: General settings, Sound Lab, Appearance (theme selector), Support Developer, and About.

**Fluent 2 Design System:**
- Design tokens in `client/constants/fluent2.ts`
- Theme provider in `client/contexts/Fluent2ThemeContext.tsx`
- Components in `client/components/fluent2/`
- Compatibility wrapper in `client/contexts/ThemeContext.tsx` for legacy screens

## External Dependencies

The project relies on Expo and React Native libraries, maintaining a strict offline-first architecture with no external network dependencies.

- **expo**: Core Expo SDK
- **react-native**: Cross-platform mobile framework
- **@react-navigation/native**: Navigation framework
- **@react-native-async-storage/async-storage**: Local data persistence
- **expo-audio**: Audio playback
- **expo-media-library**: Device media access
- **expo-haptics**: Haptic feedback
- **expo-image**: Image display
- **react-native-gesture-handler**: Touch gesture handling
- **react-native-reanimated**: Advanced animations
