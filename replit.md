# New Audio 360

## Overview
New Audio 360 is a premium mobile music player application built with React Native and Expo, targeting audio enthusiasts. It delivers studio-quality audio processing through pure software-based DSP, 55 stunning themes, and comprehensive music organization. The app requires a one-time purchase for lifetime access, with all data stored locally and no backend required. Its vision is to be "The top-grade intelligent music experience built for you."

## Recent Changes (v26.0)
- **Real-time Library Sync**: When songs are added or removed from local storage, the player automatically updates without requiring a reload. If the current song is deleted, playback stops and the queue is filtered to remove unavailable songs.
- **Flat EQ Always Active**: The Flat preset is now always active by default and cannot be turned off. Tapping another preset and tapping it again returns to Flat instead of disabling EQ entirely.
- **Updated Sound Lab Text**: Changed instruction text to "Flat is always active by default. Tap a preset to apply. Only one mode can be active at a time."
- **Floating/Draggable MiniPlayer**: The MiniPlayer (both expanded and minimized versions) can now be dragged and repositioned anywhere on the screen. Uses pan gestures with smooth spring animations. A subtle drag handle icon indicates the feature.
- **Cross-Platform DSP Consistency**: All audio effects (EQ presets, Bass Boost, Treble Boost, Virtualizer/Stereo Width, Custom EQ) now work identically on both Android and Web platforms.
- **Web Virtualizer/Stereo Width**: Implemented proper stereo width control for Web DSP. Virtualizer level (-5 to +5) maps to stereo width (-1.0 to +1.0).
- **Audio Enhancement Tip**: Updated notification message to display in exactly 3 lines: "For the best experience, please disable / your device's built-in audio effects / to enjoy our world-class sound engine."
- **Android Progress Bar Fix**: Fixed track progress bar not updating on Android by properly setting playback source when music starts/resumes.
- **Radio Stream Error Handling**: Added event listener for PlaybackEngineModule errors during radio playback. When a stream fails, the error is displayed and the "now playing" card is cleared.
- **Online Radio DSP Processing**: Online radio streams now go through the full DSP chain on both Android (PlaybackEngineModule) and Web (WebAudioEffectsEngine). EQ presets, Bass/Treble Boost, and Immersive Modes now apply to radio streams.
- **Version Update**: Updated version to 26.0 across app.config.js, AboutScreen, and documentation.

## User Preferences
- Concise and direct communication
- Prioritize core functionality and architectural integrity
- Clear explanations for complex decisions
- Iterative development with justifications
- No complex animations - use simple dissolve/appear effects only

**Git Workflow**: Replit is always the source of truth. Never merge changes from GitHub to Replit. Use `git push --force` if needed.

**Version Updates Rule**: When updating the version number, ALWAYS update ALL of these files to ensure EAS builds with the correct version:
1. `app.config.js` - `version` field (e.g., '26.0')
2. `app.config.js` - `android.versionCode` field (e.g., 26)
3. `package.json` - `version` field (e.g., '26.0.0')
4. `android/app/build.gradle` - `versionCode` and `versionName` in defaultConfig (CRITICAL for bare workflow!)
5. `client/screens/AboutScreen.tsx` - version display text
6. `client/screens/SettingsScreen.tsx` - footer version text
7. `client/screens/SplashScreen.tsx` - splash screen version text

## System Architecture

### Platform & Framework
- **Framework**: React Native with Expo SDK 53.0.0
- **React Native**: 0.79.2 (Legacy Architecture for react-native-track-player compatibility)
- **State Management**: React Context API with custom hooks
- **Design System**: Microsoft Fluent 2 (4px grid, semantic tokens, elevation shadows)
- **Data Persistence**: AsyncStorage/SecureStorage (all local, no backend)

### Audio Effects Architecture (Pure Software DSP)
The app uses **pure software-based DSP** across all platforms, ensuring a consistent audio experience without relying on hardware audio effects.

**Platform Implementations**:
- **Web**: `react-native-audio-api` (Web Audio API with BiquadFilterNode, DynamicsCompressorNode)
- **Android**: Custom ExoPlayer `AudioProcessor` with biquad filter algorithms (same formulas as Web Audio API)

**Audio Signal Chain**:
```
Source → 10-Band EQ → Bass Boost (150Hz low-shelf) → Treble Boost (6kHz high-shelf) → LFE Processing (optional) → Safety Gain → Stereo Width → Reverb → Limiter → Output
```

**Key Components**:
- **10-Band Parametric EQ**: Frequencies at 60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000 Hz. Zero-sum presets provide maximum headroom by balancing positive and negative gains.
- **Bass Boost**: Separate low-shelf filter at 150Hz, ±12 dB range.
- **Treble Boost**: Separate high-shelf filter at 6kHz, ±12 dB range.
- **LFE Channel (Subwoofer Mode)**: Optional feature (disabled by default) that provides extra headroom for bass frequencies. Uses low-pass crossover filter (default 80Hz) to extract sub-bass content. When enabled, low frequencies can boost up to 18dB (vs 12dB for mid/high) before safety gain kicks in. Adjustable LFE gain for boosting sub-bass content. Does not affect sound when disabled.
- **Volume Safety System**: Automatic gain reduction when combined EQ + bass + treble exceeds limits. Low frequencies get extra headroom (18dB) when LFE is enabled; mid/high frequencies always capped at ±12 dB.
- **Intelligent Limiter**: DynamicsCompressorNode configured as a brickwall limiter (Threshold: -1 dB, Ratio: 20:1, Attack: 1ms, Release: 100ms).
- **Stereo Width/Virtualizer**: Mid-side processing for stereo width control (-100% mono to +200% wide)
- **EQ Presets**: 10 zero-sum presets (Flat, Rock, Pop, Jazz, Classical, Electronic, Hip-Hop, Acoustic, Bass+, Clarity). Flat is always active by default and cannot be turned off. Zero-sum design provides maximum headroom while shaping sound. Bass+ is a party mode preset, Clarity is optimized for podcasts & movies.

**Zero-Sum EQ Preset Values** (10-band: 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz):
| Preset | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz |
|--------|------|-------|-------|-------|------|------|------|-------|-------|-------|
| Flat | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Rock | +0.4 | +0.4 | −0.3 | −1.1 | −1.1 | −0.1 | +0.9 | +1.6 | +0.7 | −0.7 |
| Pop | +0.3 | +0.3 | −0.4 | −0.5 | −0.4 | +0.7 | +0.8 | +0.7 | −0.4 | −0.7 |
| Jazz | −0.3 | −0.3 | −1.1 | +1.0 | +1.0 | +0.3 | −0.7 | −0.3 | −0.3 | −0.9 |
| Classical | −0.8 | −0.8 | −0.4 | −0.4 | −0.2 | +0.2 | +0.5 | +1.0 | +0.9 | +0.4 |
| Electronic | +1.3 | +1.3 | +0.5 | −1.4 | −1.4 | −0.5 | +0.5 | +1.3 | +0.5 | −1.2 |
| Hip-Hop | +2.4 | +2.4 | +0.7 | −1.2 | −0.6 | 0.0 | +0.4 | −0.6 | −1.4 | −2.0 |
| Acoustic | −0.6 | −0.6 | −1.2 | +0.7 | +1.5 | +1.5 | +0.7 | −0.3 | −0.3 | −1.3 |
| Bass+ | +3.5 | +2.5 | +1.5 | −0.6 | −1.2 | −1.2 | −1.2 | −1.2 | −0.5 | −1.4 |
| Clarity | −1.9 | −1.9 | −0.9 | −0.8 | +0.3 | +0.6 | +1.3 | +1.3 | +1.9 | +0.1 |
- **Immersive Modes**: 6 total (Music, 360 Reality, Gaming, Podcast, Movie, Sports) each with independent EQ, bass/treble boost, and virtualizer settings, designed for specific listening experiences.

**Immersive Mode Settings** (10-band EQ: 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz):
| Mode | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz | Spatial | Reverb | Bass | Treble |
|------|------|-------|-------|-------|------|------|------|-------|-------|-------|---------|--------|------|--------|
| Music | +0.3 | +0.3 | −0.4 | −1.0 | −1.0 | 0.0 | +1.0 | +1.5 | +0.4 | −1.1 | 25% | 8% | +1.2dB | +1.3dB |
| 360 Reality | 0.0 | 0.0 | −0.6 | −0.6 | −0.6 | 0.0 | +1.0 | +1.2 | +0.3 | −0.7 | 55% | 18% | +0.8dB | +1.5dB |
| Movies | −0.8 | −0.8 | −0.4 | +0.7 | +1.1 | +1.0 | +1.0 | −0.3 | −0.5 | −1.7 | 45% | 12% | +1.8dB | +1.5dB |
| Sports | +1.2 | +1.2 | +0.5 | −0.7 | −0.7 | 0.0 | +1.0 | +1.2 | −0.9 | −2.5 | 47% | 10% | +2.2dB | +0.8dB |
| Podcast | −1.9 | −1.9 | −0.9 | −0.7 | +0.4 | +1.0 | +1.0 | +1.4 | +1.8 | −0.2 | 0% | 0% | −1.0dB | +2.3dB |
| Gaming | +0.8 | +0.8 | +0.4 | −1.1 | −1.1 | 0.0 | +1.0 | +1.7 | +0.8 | −1.9 | 57% | 8% | +1.2dB | +2.1dB |

### Navigation Structure
A 4-tab system with a persistent MiniPlayer:
- **ListenTab**: Main player, Now Playing, Sound Lab, Queue
- **LibraryTab**: Music organization, Quick Access Category Grid
- **RadioTab**: FM/AM native radio, Online streaming radio
- **SettingsTab**: General, Sound Lab, Appearance, License, About

### Native Modules (Android-specific)
- **Audio Processing**: `SoftwareDSPAudioProcessor` (core DSP engine), `BiquadFilter`, `Limiter`.
- **Audio Control**: `EqualizerModule`, `BassBoostModule`, `VirtualizerModule`, `ImmersiveModeEngineModule` (all delegate to `SoftwareDSPAudioProcessor`).
- **System Modules**: `AudioSessionBridgeModule`, `WaveformAnalyzerModule` (for read-only FFT), `FMRadioModule`, `LicenseVerificationModule`, `MediaStoreScannerModule` (efficient audio file scanning), `MetadataExtractorModule` (ID3 fallback).
- No Android hardware audio effects are used for audio processing.

### License Verification
Checks for Google Play installation. Licensed users get full access; unlicensed users are prompted to purchase. License state is cached locally. Production uses `react-native-iap` with product ID `new_audio_360_lifetime`.

### Feature Specifications

- **Sound Lab**: 10 EQ presets (Flat always active by default), custom 5-band EQ editor, 6 immersive modes, bass/treble control, intelligent volume safety system.
- **Theming**: 55 themes across 6 categories (System, Winamp, Retro, Nature, Professional, Special).
- **Radio**: Native FM/AM radio and online streaming radio (Radio Browser API with quality filters). On Android, online radio streams go through PlaybackEngineModule/SoftwareDSPAudioProcessor for full DSP effects; web uses expo-av fallback.
- **Playback Features**: Background playback, notification controls, queue management, shuffle/repeat, playback speed, sleep timer, favorites, recently/most played.
- **Library Management**: Music folder selection, paginated loading, "Hide Song" feature, full playlist CRUD.

### Build Configuration
- **EAS Build Profiles**: `development`, `preview`, `production`, `production-apk`.
- **Requirements**: Minimum Android 8.0 (API 26), Target Android 14 (API 34), ARM64, ARM32, x86_64 architectures.
- **Package Name**: `com.theteam360.newaudio360`.

## External Dependencies

### Core
- `react-native`, `expo` (SDK 53.0.0)
- `react-native-track-player` (background playback)
- `expo-av` (web fallback)
- `expo-media-library` (device media access)

### Audio Processing
- `react-native-audio-api` (Web Audio API for software DSP)

### UI & Navigation
- `@react-navigation` (navigation system)
- `react-native-reanimated` (simple animations)
- `MaterialCommunityIcons` (iconography)

### Platform Services
- `expo-notifications` (playback controls)
- `expo-local-authentication` (biometric auth)
- `expo-location` (online radio location)
- `react-native-iap` (Google Play Billing)