# New Audio 360

## Overview

New Audio 360 is a premium, 100% offline mobile music player application. Its core purpose is to provide audio enthusiasts with a full-featured, device-local music experience. Key capabilities include a robust music player ("Listen Mode"), comprehensive music organization ("Library"), professional sound customization ("Sound Lab"), and extensive personalization through 55 themes. The project aims to offer a high-quality, private, and fully self-contained music experience without relying on any external servers, cloud services, or internet connectivity.

## Project Rules

### CRITICAL - 100% LOCAL-DEVICE ONLY (MANDATORY)

**This app is PURELY LOCAL - NO SERVER, NO CLOUD, NO NETWORK:**
- **NO Server/Backend** - Absolutely no server-side logic, no backend, no API endpoints
- **NO Cloud Services** - No Firebase, no AWS, no any cloud database or storage
- **NO Network Requests** - No HTTP calls, no WebSockets, no internet connectivity required
- **ALL Data Stays on Device** - All user data, settings, and media stored locally only

**Technology Stack (Vite + Capacitor):**
- **NO Expo** - Do not use Expo SDK or any Expo modules
- **NO Metro Bundler** - Do not use React Native's Metro bundler
- **Vite for Development** - Use Vite dev server for web preview in Replit
- **Capacitor for Native** - Use Capacitor to build Android/iOS apps
- **GitHub Actions for Build** - Native Android/iOS builds via GitHub workflow
- Build and distribute via GitHub releases/Actions for APK/IPA generation

## User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. Do not introduce external dependencies or network requests, as the application is strictly offline and device-local. All data must reside on the user's device. I prefer iterative development with clear justifications for each step.

## System Architecture

The application uses a **Vite + Capacitor** architecture:
- **Web Preview**: React + Vite for development preview in Replit
- **Native Apps**: Capacitor wraps the web app for Android/iOS distribution
- **Offline-First**: No backend, API calls, or cloud integration
- **Local Storage**: IndexedDB and Capacitor Preferences for data persistence

**Technical Implementations:**
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **Native Bridge**: Capacitor 7
- **State Management**: Zustand + React Query
- **Data Persistence**: Capacitor Preferences, Capacitor Filesystem
- **Audio Playback**: Web Audio API / Capacitor plugins for native audio
- **Media Access**: Capacitor Filesystem for reading audio files from device storage

**Project Structure:**
```
/client          - React application source
  /index.html    - Vite entry point
  /main.tsx      - React entry point
  /App.tsx       - Main application component
  /index.css     - Global styles with Tailwind
/android         - Android native project (Capacitor)
/assets          - Static assets (icons, images)
/dist            - Production build output
```

**Navigation Structure:**
The app features a 3-tab navigation structure:
- **Listen**: Main music player, Now Playing, Sound Lab, and Queue management
- **Library**: Music organization (Songs, Albums, Artists, Playlists, Liked Songs, Recently Played)
- **Settings**: General settings, Sound Lab, Appearance (theme selector), Support Developer, About

**Feature Specifications:**
- **Theming**: 55 themes with custom styling and component variants
- **Sound Lab**: Equalizer presets (Flat, Rock, Pop, etc.) and Immersive modes
- **Donation System**: Multi-currency donations (UPI, PayPal.me) for premium features
- **MiniPlayer**: Persistent glassmorphism-effect mini-player for quick control
- **Media Library**: Device audio access, paginated loading, and "Hide Song" functionality
- **Playlist Management**: Full CRUD operations for playlists, stored locally
- **Playback Features**: Favorites, Recently Played, Most Played, Queue Management, Sleep Timer

## Development Workflow

**Local Development (Replit):**
```bash
npm run dev      # Start Vite dev server on port 5000
```

**Production Build:**
```bash
npm run build    # Build for production
npx cap sync     # Sync with native projects
```

**Native Builds (via GitHub Actions):**
- Android APK generation via workflow
- iOS IPA generation via workflow

## External Dependencies

The project uses web-standard libraries with Capacitor for native access:

- **React 18**: UI framework
- **Vite 5**: Build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Capacitor 7**: Native bridge for Android/iOS
- **@capacitor/filesystem**: Local file access
- **@capacitor/preferences**: Local key-value storage
- **Zustand**: State management
- **React Router**: Client-side routing
- **Framer Motion**: Animations
- **Lucide React**: Icons
