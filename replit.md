# New Audio 360

## Overview
New Audio 360 is a premium mobile music player application built with React Native and Expo, targeting audio enthusiasts. It delivers studio-quality audio processing through pure software-based DSP, 55 stunning themes, and comprehensive music organization. The app requires a one-time purchase for lifetime access, with all data stored locally and no backend required. Its vision is to be "The top-grade intelligent music experience built for you."

## User Preferences
- Concise and direct communication
- Prioritize core functionality and architectural integrity
- Clear explanations for complex decisions
- Iterative development with justifications
- No complex animations - use simple dissolve/appear effects only

**Git Workflow**: Replit is always the source of truth. Never merge changes from GitHub to Replit. Use `git push --force` if needed.

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
Source → Gain → 10-Band EQ (with bass/treble applied to bands) → Stereo Widener → Reverb → Limiter → Output
```

**Key Components**:
- **10-Band Parametric EQ**: Frequencies at 60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000 Hz. All presets are inherently zero-sum (values sum to 0, no runtime normalization needed).
- **Bass Boost**: Separate low-shelf filter at 150Hz, ±12 dB range.
- **Treble Boost**: Separate high-shelf filter at 6kHz, ±12 dB range.
- **Intelligent Limiter**: DynamicsCompressorNode configured as a brickwall limiter (Threshold: -1 dB, Ratio: 20:1, Attack: 1ms, Release: 100ms).
- **Stereo Width/Virtualizer**: Mid-side processing for stereo width control (-100% mono to +200% wide)
- **EQ Presets**: 8 total (Flat, Rock, Pop, Jazz, Classical, Hip-Hop, Electronic, Acoustic) with zero-sum normalization.
- **Immersive Modes**: 6 total (Music, 360 Reality, Gaming, Podcast, Movie, Sports) each with independent EQ, bass/treble boost, and virtualizer settings, designed for specific listening experiences.

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

- **Sound Lab**: 8 EQ presets, custom 5-band EQ editor, 5 immersive modes, bass/treble control, distortion prevention.
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