# New Audio 360

## Overview

New Audio 360 is a premium, 100% offline mobile music player application built as a **pure native Android app**. Its core purpose is to provide audio enthusiasts with a full-featured, device-local music experience. Key capabilities include a robust music player ("Listen Mode"), comprehensive music organization ("Library"), professional sound customization ("Sound Lab"), and extensive personalization through 55 themes. The project aims to offer a high-quality, private, and fully self-contained music experience without relying on any external servers, cloud services, or internet connectivity.

## Project Rules

### CRITICAL - 100% LOCAL-DEVICE ONLY (MANDATORY)

**This app is PURELY LOCAL - NO SERVER, NO CLOUD, NO NETWORK:**
- **NO Server/Backend** - Absolutely no server-side logic, no backend, no API endpoints
- **NO Cloud Services** - No Firebase, no AWS, no any cloud database or storage
- **NO Network Requests** - No HTTP calls, no WebSockets, no internet connectivity required
- **NO Web App** - This is NOT a web application; do not create web endpoints or web UI
- **ALL Data Stays on Device** - All user data, settings, and media stored locally only

**Native Android Implementation:**
- This is a **pure native Android app** (Kotlin)
- **NO Expo** - Do not use Expo SDK or any Expo modules
- **NO Metro Bundler** - Do not use React Native's Metro bundler
- **NO React Native** - Do not use React Native at all
- **NO npm/node runtime** - No JavaScript runtime needed for the app
- **Traditional GitHub workflow** - Use standard Android development practices with Gradle builds
- Build and distribute via GitHub releases/Actions for APK generation
- Use native Android components (Kotlin/Java) with Android SDK

**Build Process:**
- This project is built via GitHub Actions, not locally in Replit
- APKs are generated through the GitHub workflow defined in `github-workflow-build-android.yml`
- No local development server or workflow is needed

## User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. Do not introduce external dependencies or network requests, as the application is strictly offline and device-local. All data must reside on the user's device. I prefer iterative development with clear justifications for each step.

## System Architecture

The application is built as a **pure native Android app** (Kotlin), ensuring a fully offline and device-local experience. There is no backend server, API calls, or cloud integration; all data persists locally via SharedPreferences/Room database. The UI/UX adheres to the Microsoft Fluent 2 design system (v5.0), emphasizing clarity, consistency, and adaptability, with a comprehensive theming system offering 55 unique skins.

**Technical Implementations:**
- **Platform**: Native Android (Kotlin)
- **Build System**: Gradle with Android Gradle Plugin
- **State Management**: ViewModel + LiveData/StateFlow
- **Data Persistence**: Room database and SharedPreferences for local storage
- **Styling**: Material Design 3 components customized for Fluent 2 design tokens
- **Audio Playback**: Android MediaPlayer/ExoPlayer for local audio file playback
- **Media Access**: MediaStore API for reading audio files from device storage

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

The project relies exclusively on native Android libraries, maintaining a strict offline-first architecture with no external network dependencies.

- **Android SDK**: Core platform for development (minSdk 24+, targetSdk 34)
- **Kotlin**: Primary programming language
- **Jetpack Libraries**: Navigation, ViewModel, LiveData, Room
- **Material Design 3**: For UI components (customized for Fluent 2)
- **ExoPlayer/MediaPlayer**: For audio playback from device storage
- **MediaStore API**: For accessing and managing local audio files on the device
- **Material Icons**: For iconography across the application