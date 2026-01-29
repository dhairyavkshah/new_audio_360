# New Audio 360

## Overview
New Audio 360 is a premium mobile music player built with React Native and Expo, offering studio-quality audio processing through software-based DSP and neural AI upscaling. It features 55 customizable themes and comprehensive music organization. The app operates on a one-time purchase model with local data storage, aiming to provide a top-grade, intelligent music experience tailored for the user. It supports Android, iOS, Web, and Windows platforms, with the Windows version distributed as a PWA via the Microsoft Store.

## User Preferences
- Concise and direct communication
- Prioritize core functionality and architectural integrity
- Clear explanations for complex decisions
- Iterative development with justifications
- No complex animations - use simple dissolve/appear effects only
- **Git Workflow**: Replit is always the source of truth. Never merge changes from GitHub to Replit. Use `git push --force` if needed.

## System Architecture

### Platform & Framework
- **Framework**: React Native with Expo SDK 53.0.0 (using React Native 0.79.2 for compatibility).
- **State Management**: React Context API with custom hooks.
- **Design System**: Microsoft Fluent 2 (4px grid, semantic tokens, elevation shadows).
- **Data Persistence**: Local storage using AsyncStorage/SecureStorage.

### Platform Modes
Supports Android, iOS (iPhone Mode with feature fallbacks), Web, and Windows. The Windows version is a PWA with native integration via PWABuilder, including folder scanning and MSIX packaging.

### Audio Effects Architecture (Pure Software DSP + Neural AI)
The application employs pure software-based DSP and optional neural AI upscaling for studio-quality audio. All enhancements are additive within ±12dB Android headroom.

**Signal Chain Order**: AI Audio Upscaling (Neural) → 10-Band EQ → Bass Shelf → Bass Enhancement → Treble Shelf → Spatial (with HRTF) → Reverb → Limiter → Output.

**Key DSP Components**:
- **10-Band Parametric EQ**: With zero-sum normalization and 10 presets.
- **Bass/Treble Boost Filters**: Shelf filters.
- **Multi-Tap Delay Reverb**: 4 delay lines.
- **Intelligent Limiter**: Brickwall limiting.
- **Spatial Enhancement**: Psychoacoustic stereo widening with HRTF pinna filters and 6 levels.
- **Immersive Modes**: 6 distinct modes with predefined DSP parameters.
- **Smart Enhancements**:
    - **HRTF Binaural Virtualization**: Integrated into Spatial Enhancement slider (levels 2-5) with peaking filters for pinna simulation.
    - **Bass Enhancement**: Psychoacoustic harmonic generation via soft-clipping (75Hz crossover, generates 2nd/3rd/4th harmonics, max +4dB).
    - **AI Upscaling (Audio Super-Resolution)**: Neural audio enhancement using a Kuleshov-style 1D U-Net CNN.
        - **Web**: TensorFlow.js with runtime model building.
        - **Android**: TensorFlow Lite with GPU delegate.
        - **Architecture**: Encoder-decoder with skip connections, processing 8192-sample chunks at 44.1kHz.
        - **Intensity Levels**: Low (30% blend), Medium (60% blend), High (100% blend).
        - **Real-time Safety**: 10ms time budget per chunk, automatic bypass on timeout.

**DSP Architecture Details**:
- **Internal Processing**: 32-bit float for precision.
- **Processing**: True stereo for most effects, linked stereo for limiter.
- **Android DSP**: Custom ExoPlayer `AudioProcessor` with biquad filters and TensorFlow Lite.
- **Web DSP**: `WebAudioEffectsEngine` leveraging Web Audio API and TensorFlow.js.
- **Unified DSP for Streaming**: All Android audio playback (local, streaming, radio) routes through a single DSP chain via `PlaybackEngineModule`. Web streaming uses Web Audio API for CORS-enabled streams.

### Navigation Structure
A 5-tab system with a persistent MiniPlayer:
- **ListenTab**: Main player, Now Playing, Sound Lab, Queue.
- **LibraryTab**: Music organization, Quick Access Category Grid.
- **RadioTab**: FM/AM native radio, Online streaming radio with Intelligent Radio Discovery.
- **DiscoverTab**: Open Music Discovery (Internet Archive, SoundCloud).
- **SettingsTab**: General, Sound Lab, Appearance, License, About.

### Android Playback Architecture
All Android audio playback is managed by `PlaybackEngineModule`, which interfaces with `PlaybackService`, a foreground `MediaSessionService`. This provides a persistent notification player, lock screen controls, external media controls, background playback, and DSP integration.

### License Verification (Android)
A two-check system (initial Google Play Billing validation and daily re-validation) uses `AppContextModule` for orchestration, `RuntimeIntegrity` for signature verification, and `SecureStateManager` for encrypted, device-bound storage with anti-rollback protection. An invalid license gracefully degrades audio effect quality.

### Feature Specifications
- **Sound Lab**: 10 EQ presets, custom 10-band EQ, 6 immersive modes, bass/treble control, Smart Enhancements (Bass Enhancement, AI Upscaling).
- **Theming**: 55 themes across 6 categories.
- **Radio**: Native FM/AM and online streaming with Intelligent Radio Discovery (automatic station scanning via Radio Browser API, quality filtering, curated fallback).
- **Playback**: Background playback, notification controls, queue, shuffle/repeat, playback speed, sleep timer, favorites.
- **Library Management**: Music folder selection, paginated loading, "Hide Song", playlist CRUD.
- **Open Music Discovery**: Tabbed screen with Internet Archive (public domain/CC) and SoundCloud (full track streaming with user authentication via OAuth 2.1 Authorization Code flow with PKCE). DSP/AI upscaling is fully supported on Archive via web, and on SoundCloud via Android. SoundCloud web playback uses the Widget API to bypass CORS. Online favorites use encrypted URL storage and regenerate stream URLs at playback.

## External Dependencies

### Core
- `react-native`, `expo` (SDK 53.0.0)
- `react-native-track-player`
- `expo-av`
- `expo-media-library`

### Audio Processing
- `react-native-audio-api`
- `@tensorflow/tfjs` (Web/PWA)
- `@tensorflow/tfjs-node` (Node.js)

### UI & Navigation
- `@react-navigation`
- `react-native-reanimated`
- `MaterialCommunityIcons`

### Platform Services
- `expo-notifications`
- `expo-local-authentication`
- `expo-location`
- `com.android.billingclient:billing-ktx`
- `androidx.security:security-crypto`