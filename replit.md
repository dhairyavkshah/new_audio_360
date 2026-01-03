# New Audio 360

## Overview

New Audio 360 is a premium, 100% offline mobile music player application built with Expo React Native. Its core purpose is to provide audio enthusiasts with a full-featured, device-local music experience. Key capabilities include a robust music player ("Listen Mode"), comprehensive music organization ("Library"), professional sound customization ("Sound Lab"), and extensive personalization through 55 themes. The project aims to offer a high-quality, private, and fully self-contained music experience without relying on any external servers, cloud services, or internet connectivity.

## User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. Do not introduce external dependencies or network requests, as the application is strictly offline and device-local. All data must reside on the user's device. I prefer iterative development with clear justifications for each step.

## System Architecture

The application is built using Expo React Native, ensuring a fully offline and device-local experience. There is no backend server, API calls, or cloud integration; all data persists locally via AsyncStorage. The UI/UX adheres to the Microsoft Fluent 2 design system (v5.0), emphasizing clarity, consistency, and adaptability, with a comprehensive theming system offering 55 unique skins.

**Technical Implementations:**
- **Frontend Framework**: Expo SDK with React Navigation 7+.
- **State Management**: React hooks and Context API.
- **Data Persistence**: AsyncStorage for all local data storage (favorites, recently played, settings, playlists).
- **Styling**: React Native StyleSheet, implementing Fluent 2 design tokens for colors, typography, spacing, and component variants.
- **Audio Playback**: `expo-audio` for local device audio file playback.
- **Media Access**: `expo-media-library` for reading audio files from device storage.

**Navigation Structure:**
The app features a 3-tab navigation structure:
- **MainTabNavigator**: Hosts Listen, Library, and Settings tabs, with a persistent MiniPlayer overlay.
    - **ListenTab**: Main music player, Now Playing, Sound Lab, and Queue management.
    - **LibraryTab**: Music organization (Songs, Albums, Artists, Playlists, Liked Songs, Recently Played), and Playlist Management (CRUD).
    - **SettingsTab**: General settings, Sound Lab, Appearance (theme selector), Support Developer (donation), and About.

**Feature Specifications:**
- **Theming**: 55 themes with custom icons (MaterialCommunityIcons), shapes, and component variants.
- **Sound Lab**: Offers mutually exclusive Equalizer presets (Flat, Rock, Pop, etc.) or Immersive modes (Cinema, Music, etc.), integrated into Settings. These are UI selections due to `expo-audio` limitations for native DSP.
- **Donation System**: Replaces subscriptions, allowing users to support development via multi-currency donations (UPI, PayPal.me), unlocking premium features.
- **MiniPlayer**: A persistent, glassmorphism-effect mini-player for quick control and navigation.
- **Media Library Integration**: Onboarding for media access, paginated loading of device audio, and "Hide Song" functionality.
- **Playlist Management**: Full CRUD operations for playlists, stored locally.
- **Playback Features**: Favorites, Recently Played, Most Played, Queue Management, and Sleep Timer.

## External Dependencies

The project relies exclusively on client-side Expo modules and standard React Native libraries for its functionality, maintaining a strict offline-first architecture.

- **Expo SDK**: Core framework for development.
- **React Navigation**: For app navigation flow.
- **AsyncStorage**: For local data persistence.
- **expo-audio**: For audio playback from device storage.
- **expo-media-library**: For accessing and managing local audio files on the device.
- **MaterialCommunityIcons**: For iconography across the application.