# New Audio 360

## Overview
New Audio 360 is a premium mobile music player application built with React Native and Expo, targeting audio enthusiasts. It offers robust playback, extensive music organization, professional sound customization, and deep personalization through 55 themes. The app requires a one-time purchase to function (no free tier). All data is stored locally on the device, with client-side license verification via Google Play.

## User Preferences
I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. I prefer iterative development with clear justifications for each step. No complex animations - use simple dissolve/appear effects only.

**Git Workflow**: Replit is always the source of truth. Never merge changes from GitHub to Replit. When pushing to GitHub, use `git push --force` if needed to overwrite remote changes.

## System Architecture
The application leverages React Native and Expo for the frontend. The UI/UX strictly adheres to the Microsoft Fluent 2 design system, implementing a 4px grid, Fluent typography, semantic color tokens, elevation shadows, and motion curves, ensuring 100% Android safe area compliance.

### Client-Side Architecture
**All data is stored locally on the device:**
- Device-local music playback and media library access
- User settings, playlists, and preferences stored in AsyncStorage/SecureStorage
- License state cached locally after initial Google Play verification

**No backend required:**
- No Google Sign-In required - simple one-time purchase model
- License verification via Play Store installation check (expo-application)
- No server infrastructure, database, or admin panel needed

### License Verification Flow (Simplified)
1.  **Google Play Purchase**: User purchases app on Google Play Store (paid app, one-time)
2.  **App Download**: User downloads and installs from Play Store
3.  **Installation Verification**: App checks it was installed from Play Store (com.android.vending)
4.  **License Status**: If installed from Play Store, app is licensed. Otherwise, user is prompted to get it from Play Store.
5.  **Offline Access**: License state is cached in SecureStorage for offline use

### Audio Tip Notification
On app launch, a dismissible notification card appears encouraging users to disable their phone's native EQ, Dolby, or audio effects from system settings for the purest audio experience with the app's built-in Sound Lab. The notification auto-dismisses after 5 seconds and can be swiped up to dismiss manually.

### Technical Implementations
-   **Platform**: React Native with Expo SDK.
-   **State Management**: React Context API with custom hooks.
-   **Data Persistence**: AsyncStorage for local storage.
-   **Design System**: Microsoft Fluent 2 tokens.
-   **Audio Playback**: `react-native-track-player` for background playback with notification controls (Android), `expo-av` fallback for web.
-   **Media Access**: `expo-media-library` for device audio files.
-   **Animations**: Simple dissolve/appear effects only (no complex animations).

### Navigation Structure
A 4-tab navigation system (`MainTabNavigator`) includes Listen, Library, Radio, and Settings tabs, with a persistent MiniPlayer.
-   **ListenTab**: Main player, Now Playing, Sound Lab, Queue.
-   **LibraryTab**: Music organization with Quick Access Category Grid.
-   **RadioTab**: FM/AM native radio and Online streaming radio with location-based channel discovery.
-   **SettingsTab**: General settings, Sound Lab, Appearance, License, About.

### Native Audio Modules (Android-specific)
-   **PlaybackEngineModule**: ExoPlayer-based playback with queue, shuffle, repeat, speed control, and audio session management.
-   **Native Audio Effects**: Equalizer (5-band) with headroom-safe normalization (max boost = 0 to prevent clipping), BassBoost, Virtualizer, and WaveformAnalyzer. Audio processing uses headroom-safe EQ plus conservative BassBoost/Virtualizer effects per immersive mode.
-   **ImmersiveModeEngineModule**: Manages 6 immersive audio modes (Music, 360 Reality, Gaming, Podcast, Movie, Off) using native audio APIs with BassBoost and Virtualizer at conservative strengths.
-   **NativeWaveformVisualizer**: Real-time 64-bar waveform visualization.
-   **FMRadioModule**: FM/AM radio tuning using RadioManager/RadioTuner APIs with AudioRecord→AudioTrack pipeline for Sound Lab effects integration.
-   **LicenseVerificationModule**: Native Kotlin module for Play Store license verification using PackageManager.getInstallerPackageName(). Only accepts "com.android.vending" as valid installer; sideloaded APKs are rejected.
-   **StudioAudioEngine**: TypeScript service bridging native modules on Android with `expo-av` fallback.

### Design Language (Microsoft Fluent 2)
-   **Token System**: Comprehensive tokens for Spacing (4px grid), Typography, Semantic Colors (light/dark mode), Radii, Elevation Shadows, and Motion.
-   **UI Components**: Custom Fluent 2 primitive components like `FluentText`, `FluentSurface`, `FluentStack`, `FluentButton`, `FluentCard`, `FluentIconButton`, `FluentDivider`, `FluentChip`, and `FluentScreenLayout` are used.

### Feature Specifications
-   **Theming**: 55 themes with custom icons, shapes, and component variants, applying unique visual effects (glass, beveled, aero, etc.).
-   **Sound Lab**: Offers mutually exclusive Equalizer presets or Immersive modes. Uses headroom-safe EQ normalization (no frequency boosted above original level) plus conservative BassBoost/Virtualizer effects per immersive mode.
-   **FM/AM Radio**: Native Android radio with scanning, tuning, favorite stations, and Sound Lab effects on live radio audio.
-   **Online Radio Streaming**: 48,000+ internet radio stations via Radio Browser API with quality filters:
    - Only verified working streams (lastcheckok=1)
    - Quality codecs only: MP3, OGG, AAC
    - Bitrate >64kbps
    - Max 50 stations per country, sorted by popularity
    - Uses 3 API servers (de1, nl1, at1) with rotation for reliability
-   **One-Time Purchase**: License model with ₹311 INR (India) / $13.11 USD (International) pricing. Lifetime access with no expiration.
-   **MiniPlayer**: Persistent glassmorphism mini-player with prominent dismiss handle (tab-shaped with chevron icon).
-   **Media Library Integration**: Onboarding for access, paginated loading, "Hide Song" feature.
-   **Playlist Management**: Full CRUD for local playlists with modal-based delete confirmations.
-   **Playback Features**: Favorites, Recently Played, Most Played, Queue Management, Sleep Timer.
-   **Background Playback**: Music and radio continue playing when the app is closed, with Android notification controls (play/pause, next/previous, stop).
-   **Music Folder Selection**: Users can select specific device folders for music sourcing.
-   **Multi-Step Permission Onboarding**: Guides users through necessary permissions.

### Build Configuration
-   **Expo SDK**: 53.0.0 with React Native 0.79.2
-   **Architecture**: Legacy (Old) Architecture - New Architecture disabled for react-native-track-player compatibility.
-   **Reanimated**: Version 3.17.x (compatible with Old Architecture and RN 0.79).
-   Native audio modules are in `modules/audio-effects/` with platform-specific implementations.
-   Requires an **Expo Development Build** for full native module functionality.
-   Native audio effects are Android-only.

### App Version
-   **Version Name**: 1.0
-   **Version Code**: 1 (Android)
-   **Release Date**: January 17, 2026
-   **Package Name**: com.theteam360.newaudio360

### Environment Configuration
Four build profiles are available via EAS Build:
-   **development**: Debug APK with development client (`APP_ENV=development`)
-   **preview**: Internal APK for testing (`APP_ENV=preview`)
-   **production**: Play Store AAB with auto-increment (`APP_ENV=production`)
-   **production-apk**: Production APK for direct distribution (`APP_ENV=production`)

Bundle identifiers:
-   Development: `com.theteam360.newaudio360.dev`
-   Preview: `com.theteam360.newaudio360.preview`
-   Production: `com.theteam360.newaudio360`

### CI/CD Pipeline
GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Output |
|----------|---------|--------|
| `build-dev-apk.yml` | Push to `develop` or manual | Development APK |
| `build-prod-aab.yml` | Manual dispatch | Production AAB (Play Store) |
| `build-prod-apk.yml` | Manual dispatch | Production APK (direct distribution) |

Required secrets in GitHub:
-   `EXPO_TOKEN`: EAS Build authentication token

### Documentation
All documentation is in the `docs/` folder:
-   `PRIVACY_POLICY.md`: Privacy policy for app stores
-   `RELEASE_NOTES.md`: Version history, changelog, and Google Play release note
-   `TEST_PLAN.md`: Testing strategy and acceptance criteria
-   `TEST_CASES.md`: Comprehensive 1000 test cases
-   `TEST_REPORT.md`: Latest test execution report
-   `APP_STORE_DESCRIPTIONS.md`: Play Store listing content with pricing
-   `design_guidelines.md`: UI/UX design specifications

### Production License Verification
For production release, implement in `client/lib/payment.ts`:

1. **Install react-native-iap**: `npm install react-native-iap`
2. **Replace stubs with real calls**:
   - `checkPurchaseStatus()` → Use `RNIap.getAvailablePurchases()` to check for existing purchase
   - `purchaseApp()` → Use `RNIap.requestPurchase(PRODUCT_ID)` to open Play Store billing
   - `restorePurchases()` → Use `RNIap.getAvailablePurchases()` to restore from Play Store
3. **Set up product in Google Play Console** with ID: `new_audio_360_lifetime`
4. **Configure EAS Build** with proper app signing for Play Store

Current implementation uses development stubs for testing. Web platform uses localStorage; Android mocks responses.

## External Dependencies

-   **React Native**: Core cross-platform mobile framework
-   **Expo SDK**: Development and build tooling
-   **expo-av**: Audio playback (primarily web fallback)
-   **expo-media-library**: Device media access
-   **react-native-reanimated**: Simple animations
-   **@react-navigation**: Navigation system
-   **MaterialCommunityIcons**: Iconography
-   **expo-notifications**: For now-playing controls and permission flow
-   **expo-local-authentication**: Biometric/PIN authentication
-   **expo-location**: Location detection for online radio country discovery
-   **react-native-track-player**: Background audio playback with notification controls
-   **react-native-iap** (production): Google Play Billing integration for license verification

## Recent Changes (January 17, 2026)
- Fixed top gap spacing on settings screens (Sound Lab, Appearance, License, About)
- UI sounds now disabled when music/radio is playing to prevent audio interruption
- Updated Android adaptive icon config to use proper foreground image with branded blue (#1565C0) background
- Splash screen uses branded blue background for both light (#1565C0) and dark (#0D47A1) modes
- Global playback state tracker implemented in client/lib/playbackState.ts
- Enhanced MiniPlayer dismiss handle with tab-shaped design and chevron icon
- Online Radio uses Radio Browser API with quality filters (lastcheckok=1, MP3/OGG/AAC, >64kbps)
- Modal-based delete confirmations for EQ presets and playlists
- Updated pricing to ₹311 INR / $13.11 USD
- GitHub Actions workflows ready for signed APK and AAB builds
