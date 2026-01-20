# New Audio 360

## Overview
New Audio 360 is a premium mobile music player application built with React Native and Expo, targeting audio enthusiasts. It delivers studio-quality audio processing through pure software-based DSP, 55 stunning themes, and comprehensive music organization. The app requires a one-time purchase for lifetime access, with all data stored locally and no backend required. Its vision is to be "The top-grade intelligent music experience built for you," aiming to be the market leader in mobile audio experiences.

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
- **React Native**: 0.79.2 (Legacy Architecture for `react-native-track-player` compatibility)
- **State Management**: React Context API with custom hooks
- **Design System**: Microsoft Fluent 2 (4px grid, semantic tokens, elevation shadows)
- **Data Persistence**: AsyncStorage/SecureStorage (all local, no backend)

### Audio Effects Architecture (Pure Software DSP)
The app employs a **pure software-based DSP** across all platforms, ensuring a consistent audio experience.

**Dual-DSP Architecture Overview**:
The system routes audio from various sources (Music Player, Online Radio) through a `SoundLabContext` for settings management (EQ Presets, Bass/Treble Boost, Virtualizer, Immersive Modes). These settings are then passed to a `WebAudioEffectsEngine` (a single control interface) which routes them to platform-specific DSP engines: `WebAudioEffectsEngine` (Web Audio API) for web and `SoftwareDSPAudioProcessor` for Android. Both engines apply effects and output to the respective audio renderers (HTMLAudioElement or ExoPlayer).

**Key Architecture Principles**:
1.  **Two DSPs, Same Settings**: Web uses `react-native-audio-api` (Web Audio API), Android uses `SoftwareDSPAudioProcessor`. Both have identical preset values defined independently.
2.  **Independent Platform Control**: `SoundLabContext` calls platform-specific modules directly - `WebAudioEffectsEngine` for Web, `EqualizerModule`/`ImmersiveModeEngineModule` for Android. No cross-platform syncing.
3.  **No Double Processing**: Each platform uses exactly ONE DSP engine.
4.  **All Sources Processed**: Music, Online Radio, and FM/AM Radio all route through the same DSP chain.

**Audio Signal Chain**:
`Source → 10-Band EQ → Bass Boost → Treble Boost → LFE Processing (optional) → Safety Gain → Stereo Width → Reverb → Limiter → Output`

**Key Components**:
-   **10-Band Parametric EQ**: Frequencies at 60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000 Hz. Features 10 zero-sum presets (e.g., Flat, Rock, Pop) and a custom editor. Flat is always active by default.
-   **Bass Boost & Treble Boost**: Separate low-shelf (150Hz) and high-shelf (6kHz) filters, ±12 dB range.
-   **LFE Channel (Subwoofer Mode)**: Optional feature with low-pass crossover (default 80Hz) and adjustable gain, providing extra headroom for sub-bass.
-   **Volume Safety System**: Automatic gain reduction to prevent clipping, with extra headroom for low frequencies when LFE is active.
-   **Intelligent Limiter**: Configured as a brickwall limiter (Threshold: -1 dB, Ratio: 20:1).
-   **Stereo Width/Virtualizer**: Mid-side processing for stereo width control (-100% mono to +200% wide).
-   **Immersive Modes**: 6 distinct modes (Music, 360 Reality, Gaming, Podcast, Movie, Sports), each with independent EQ, bass/treble boost, and virtualizer settings for specific listening experiences.

### Navigation Structure
A 4-tab system with a persistent MiniPlayer:
-   **ListenTab**: Main player, Now Playing, Sound Lab, Queue
-   **LibraryTab**: Music organization, Quick Access Category Grid
-   **RadioTab**: FM/AM native radio, Online streaming radio
-   **SettingsTab**: General, Sound Lab, Appearance, License, About

### Native Modules (Android-specific)
-   **Audio Processing**: `SoftwareDSPAudioProcessor`, `BiquadFilter`, `Limiter`.
-   **Audio Control**: `EqualizerModule`, `BassBoostModule`, `VirtualizerModule`, `ImmersiveModeEngineModule` (all delegate to `SoftwareDSPAudioProcessor`).
-   **Playback Engine**: `PlaybackEngineModule` (ExoPlayer wrapper with DSP integration for music and online radio).
-   **System Modules**: `AudioSessionBridgeModule`, `WaveformAnalyzerModule`, `FMRadioModule`, `LicenseVerificationModule`, `MediaStoreScannerModule`, `MetadataExtractorModule`. No Android hardware audio effects are used.

### Key DSP Implementation Files
| File | Purpose |
|------|---------|
| `client/contexts/SoundLabContext.tsx` | Manages all DSP settings (presets, modes, bass/treble) |
| `client/services/WebAudioEffectsEngine.ts` | Single DSP control interface - applies to Web, syncs to Android |
| `client/contexts/PlayerContext.tsx` | Music playback + EqualizerModule attachment on Android |
| `client/contexts/OnlineRadioContext.tsx` | Online radio via PlaybackEngineModule with full DSP |
| `client/contexts/RadioContext.tsx` | FM/AM radio with DSP attachment |
| `modules/audio-effects/.../SoftwareDSPAudioProcessor.kt` | Core Android DSP engine |
| `modules/audio-effects/.../EqualizerModule.kt` | Android EQ/bass/treble bridge |
| `modules/audio-effects/.../VirtualizerModule.kt` | Android stereo width bridge (singleton) |
| `modules/audio-effects/.../PlaybackEngineModule.kt` | ExoPlayer wrapper with DSP integration |

**DSP Control Flow**:
- **Web**: `SoundLabContext` → `WebAudioEffectsEngine.applyEQ()` / `applyImmersiveMode()` → Web Audio API
- **Android**: `SoundLabContext` → `EqualizerModule.usePreset()` / `ImmersiveModeEngineModule.setMode()` → `SoftwareDSPAudioProcessor`

**DSP Module Attachment (Android)**:
- `EqualizerModule.attach(audioSessionId)`: Called in PlayerContext after PlaybackEngineModule initializes
- `VirtualizerModule`: Uses singleton pattern - no explicit attach required
- **Unit Scaling**: UI values (gain units) passed to native code, which internally multiplies by DB_PER_UNIT (2.4)

**Preset Definitions**:
- **Web**: Defined in `WebAudioEffectsEngine.ts` (IMMERSIVE_MODES) and `SoundLabContext.tsx` (EQ_PRESETS)
- **Android**: Defined in `EqualizerModule.kt` (usePreset function) and `ImmersiveModeEngineModule.kt` (applyMode* functions)
- Both platforms have matching preset values for consistent audio experience

### Feature Specifications
-   **Sound Lab**: Comprehensive audio customization including EQ presets, custom EQ, immersive modes, bass/treble control, and volume safety.
-   **Theming**: 55 themes across 6 categories.
-   **Radio**: Native FM/AM radio (hardware detection) and online streaming radio via Radio Browser API. Online radio streams benefit from full DSP processing.
-   **Playback Features**: Background playback, notification controls, queue management, shuffle/repeat, playback speed, sleep timer, favorites, recently/most played.
-   **Library Management**: Music folder selection, paginated loading, "Hide Song", full playlist CRUD.

### Build Configuration
-   **EAS Build Profiles**: `development`, `preview`, `production`, `production-apk`.
-   **Requirements**: Minimum Android 8.0 (API 26), Target Android 14 (API 34), ARM64, ARM32, x86_64 architectures.
-   **Package Name**: `com.theteam360.newaudio360`.

## External Dependencies

### Core
-   `react-native`, `expo` (SDK 53.0.0)
-   `react-native-track-player` (background playback)
-   `expo-av` (web fallback)
-   `expo-media-library` (device media access)

### Audio Processing
-   `react-native-audio-api` (Web Audio API for software DSP)

### UI & Navigation
-   `@react-navigation` (navigation system)
-   `react-native-reanimated` (simple animations)
-   `MaterialCommunityIcons` (iconography)

### Platform Services
-   `expo-notifications` (playback controls)
-   `expo-local-authentication` (biometric auth)
-   `expo-location` (online radio location)
-   `react-native-iap` (Google Play Billing for license verification)