# New Audio 360

## Overview

New Audio 360 is a premium, 100% offline native Android music player application built with Kotlin and Jetpack Compose. It provides audio enthusiasts with a full-featured, device-local music experience including a robust music player ("Listen Mode"), comprehensive music organization ("Library"), professional sound customization ("Sound Lab"), and extensive personalization. The application is purely native Android - no React Native, Expo, or web technologies. All user data, settings, and media are stored exclusively on the device.

## Project Rules

**CRITICAL: This is a pure native Android project.**
- **NO Expo** - This project does not use Expo SDK
- **NO React Native** - This project does not use React Native
- **NO Metro bundler** - No JavaScript bundling
- **NO Web support** - Android only (primary), iOS future consideration
- **Gradle-based builds only** - APK/AAB built via Gradle
- **GitHub Actions CI/CD** - All builds done through GitHub workflows
- **Fully offline** - No network requests, all data stored locally

## User Preferences

- Concise and direct communication
- Prioritize core functionality and architectural integrity
- Clear explanations for complex decisions
- No external dependencies or network requests - strictly offline
- All data resides on the user's device
- Iterative development with clear justifications

## System Architecture

The application is built with **Kotlin and Jetpack Compose**, ensuring a fully native Android experience with Material Design 3 styling.

### Technology Stack
- **Language**: Kotlin 2.0
- **UI Framework**: Jetpack Compose with Material 3
- **Dependency Injection**: Hilt
- **Database**: Room with DataStore for preferences
- **Audio Playback**: ExoPlayer (Media3)
- **Build System**: Gradle with version catalogs
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 35 (Android 15)

### Project Structure
```
android/
├── app/
│   ├── src/main/java/com/newaudio360/app/
│   │   ├── audio/
│   │   │   ├── playback/      # PlaybackEngine, PlaybackService
│   │   │   ├── effects/       # AudioEffectsManager (EQ, BassBoost, Virtualizer)
│   │   │   ├── waveform/      # WaveformAnalyzer (Visualizer)
│   │   │   └── recording/     # RecordingEngine (Studio mode)
│   │   ├── data/
│   │   │   ├── local/         # Room database, DAOs, DataStore
│   │   │   ├── model/         # Entity classes
│   │   │   └── repository/    # MusicRepository
│   │   ├── di/                # Hilt modules
│   │   ├── ui/
│   │   │   ├── theme/         # Material 3 theming
│   │   │   ├── screens/       # Listen, Library, Studio, Settings, NowPlaying
│   │   │   ├── components/    # SongCard, MiniPlayer, CategoryCard, BottomNavBar
│   │   │   └── navigation/    # NavHost configuration
│   │   └── util/              # Utility classes
│   └── build.gradle.kts
├── gradle/
│   └── libs.versions.toml     # Version catalog
├── build.gradle.kts           # Root build config
├── settings.gradle.kts
└── gradle.properties
```

### Native Audio Architecture

**PlaybackEngine** (ExoPlayer-based):
- Queue management with gapless playback
- Shuffle and repeat modes (off/one/all)
- Playback speed control (0.25x - 3.0x)
- Audio session management for effect attachment
- Progress events via Kotlin Flow at 250ms intervals
- Automatic audio focus handling

**AudioEffectsManager**:
- Equalizer with device presets and custom band levels
- BassBoost with strength control (0-1000)
- Virtualizer for spatial audio enhancement

**WaveformAnalyzer** (Visualizer-based):
- Real-time waveform data at 60Hz
- FFT frequency band analysis
- RMS and peak value calculations

**RecordingEngine**:
- AudioRecord with VOICE_PERFORMANCE audio source
- Real-time effects: AcousticEchoCanceler, NoiseSuppressor, AutomaticGainControl
- 48kHz mono WAV output for maximum clarity

### Navigation Structure
- **Listen**: Main music player, Now Playing, Sound Lab, Queue
- **Library**: Quick Access Category Grid (Liked, Recent, Top, Songs, Albums, Artists, Playlists)
- **Studio**: Voice recording over backing tracks with effects
- **Settings**: General settings, Appearance (themes), About

## Build Configuration

### Building the APK/AAB

**Debug build:**
```bash
cd android
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

**Release build (requires signing):**
```bash
cd android
./gradlew assembleRelease
./gradlew bundleRelease
```
Outputs:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### GitHub Actions Workflow

The project includes a GitHub Actions workflow (`.github/workflows/android-build.yml`) that:
1. Builds debug APK on every push/PR
2. Builds signed release APK and AAB on version tags (v*)
3. Creates GitHub releases with build artifacts

**Required secrets for release builds:**
- `KEYSTORE_BASE64`: Base64-encoded release keystore
- `KEYSTORE_PASSWORD`: Keystore password
- `KEY_ALIAS`: Key alias
- `KEY_PASSWORD`: Key password

### Signing Configuration

For release builds, create a keystore:
```bash
keytool -genkey -v -keystore release.keystore -alias newaudio360 -keyalg RSA -keysize 2048 -validity 10000
```
Place in `android/app/keystore/release.keystore`

## Dependencies

Managed via Gradle version catalog (`gradle/libs.versions.toml`):

**Core:**
- androidx.core:core-ktx
- androidx.lifecycle (runtime, viewmodel, compose)
- androidx.activity:activity-compose

**Compose:**
- androidx.compose.ui
- androidx.compose.material3
- androidx.navigation:navigation-compose

**DI:**
- com.google.dagger:hilt-android
- androidx.hilt:hilt-navigation-compose

**Data:**
- androidx.room
- androidx.datastore:datastore-preferences

**Media:**
- androidx.media3:media3-exoplayer
- androidx.media3:media3-session

**Other:**
- kotlinx.coroutines
- io.coil-kt:coil-compose

## Recent Changes

- **2026-01-08**: Complete architecture migration from React Native/Expo to pure native Android
  - Removed all JavaScript, React Native, Expo, and Metro bundler dependencies
  - Created new Gradle-based Android project structure
  - Implemented Jetpack Compose UI with Material 3 design
  - Converted Expo audio modules to standard Kotlin with Hilt DI
  - Added Room database and DataStore for persistence
  - Created GitHub Actions workflow for APK/AAB builds
