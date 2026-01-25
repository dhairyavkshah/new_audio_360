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
Source → Gain → 10-Band EQ → Bass Shelf Filter → Treble Shelf Filter → Stereo Widener → Spatial Enhancement → Reverb → Limiter → Output
```

**Key Components**:
- **10-Band Parametric EQ**: 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz with zero-sum normalization.
- **Bass Boost Filter**: Lowshelf at 150Hz (±12 dB range).
- **Treble Boost Filter**: Highshelf at 6kHz (±12 dB range).
- **Multi-Tap Delay Reverb**: 4 delay lines (23ms, 41ms, 67ms, 89ms) with equal-power crossfade wet/dry mixing.
- **Intelligent Limiter**: DynamicsCompressorNode configured as a brickwall limiter (Threshold: -1 dB, Ratio: 20:1, Attack: 1ms, Release: 100ms).
- **Stereo Width/Virtualizer**: Mid-side processing for stereo width control (-100% mono to +200% wide). VirtualizerModule and ImmersiveModeEngineModule delegate to SoftwareDSPAudioProcessor.
- **Spatial Enhancement**: Psychoacoustic stereo enhancement with frequency-dependent M/S processing. Features: bass mono enforcement (below 150Hz), ITD micro-delay (0.3ms on Side channel), all-pass decorrelation (3kHz/5kHz), correlation monitor with 0.3 threshold guard. Side boost: 50% (capped at 100% Android, 120% Web).
- **EQ Presets**: 10 total (Flat, Rock, Pop, Jazz, Classical, Electronic, Hip-Hop, Acoustic, Bass+, Clarity) with zero-sum normalization.
- **Immersive Modes**: 6 total (Music, 360 Reality, Gaming, Podcast, Movie, Sports) each with independent EQ, bass/treble boost, stereo width, and reverb settings. Reverb levels: Music 8%, 360 Reality 18%, Gaming 8%, Podcast 0%, Movie 12%, Sports 10%.

## DSP Architecture

### Audio Processing Standards

| Platform | Internal Processing | Input/Output Format | Sample Rate |
|----------|---------------------|---------------------|-------------|
| **Android** | 32-bit float | PCM16/PCM24 | Input rate (typically 48 kHz) |
| **Web** | 32-bit float | Web Audio API native | Device native rate |

**Processing Chain**:
- All audio processing uses 32-bit float internally for maximum precision
- 64-bit double precision for filter coefficients and envelope detection
- Filters configured at input sample rate for accurate frequency response
- True stereo processing (independent L/R channel states) for EQ, Bass, Treble, Stereo Width, and Reverb
- Linked stereo for limiter (industry standard to prevent stereo image shift)
- No resampling performed - operates at source sample rate

### Platform Overview

| Platform | DSP Engine | Technology |
|----------|------------|------------|
| **Android** | `SoftwareDSPAudioProcessor` | Custom ExoPlayer AudioProcessor with biquad filter algorithms |
| **Web** | `WebAudioEffectsEngine` | Web Audio API (BiquadFilterNode, DynamicsCompressorNode) |

Both platforms use identical filter algorithms (Robert Bristow-Johnson's Audio EQ Cookbook) ensuring consistent audio across all devices.

### Signal Chain Diagram

```
Audio Source
     ↓
  Gain Stage
     ↓
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  10-Band Parametric EQ                                                      │
 │  60Hz → 170Hz → 310Hz → 600Hz → 1kHz → 3kHz → 6kHz → 12kHz → 14kHz → 16kHz │
 └─────────────────────────────────────────────────────────────────────────────┘
     ↓
 Bass Shelf Filter (150Hz, ±12dB)
     ↓
 Treble Shelf Filter (6kHz, ±12dB)
     ↓
 Stereo Width (Mid-Side Processing, -100% to +200%)
     ↓
 Spatial Enhancement (Psychoacoustic: bass mono, ITD 0.3ms, all-pass decorrelation)
     ↓
 Multi-Tap Reverb (23ms, 41ms, 67ms, 89ms delay lines)
     ↓
 Brickwall Limiter (-1dB threshold, 20:1 ratio)
     ↓
  Audio Output
```

### EQ Presets (10-Band Values)

| Preset | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz |
|--------|------|-------|-------|-------|------|------|------|-------|-------|-------|
| **Flat** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Rock** | 3 | 3 | 2 | 1 | -1 | 0 | 2 | 2 | 3 | 3 |
| **Pop** | 2 | 2 | 1 | 2 | 2 | 3 | 3 | 2 | 2 | 2 |
| **Jazz** | 2 | 2 | 3 | 2 | 1 | 0 | -1 | -1 | 0 | 0 |
| **Classical** | 1 | 1 | 1 | 0 | 0 | 1 | 2 | 2 | 3 | 3 |
| **Electronic** | 4 | 4 | 3 | 1 | -1 | 0 | 2 | 3 | 4 | 4 |
| **Hip-Hop** | 5 | 5 | 3 | 2 | 1 | 2 | 2 | 1 | 1 | 1 |
| **Acoustic** | 1 | 1 | 2 | 2 | 2 | 2 | 1 | 1 | 1 | 1 |
| **Bass+** | 5 | 5 | 3 | 1 | 0 | -1 | -1 | -1 | -1 | -1 |
| **Clarity** | -2 | -2 | -1 | 0 | 1 | 2 | 2 | 3 | 3 | 3 |

### Immersive Modes Settings

| Mode | EQ Preset | Bass Boost | Treble Boost | Stereo Width | Reverb |
|------|-----------|------------|--------------|--------------|--------|
| **Music** | Flat | 0 | 0 | +20% | 8% |
| **360 Reality** | Custom (spatial) | +2 | +1 | +100% | 18% |
| **Gaming** | Rock | +3 | +2 | +50% | 8% |
| **Podcast** | Clarity | -2 | +1 | 0% | 0% |
| **Movie** | Classical | +2 | +1 | +80% | 12% |
| **Sports** | Pop | +1 | +2 | +40% | 10% |

### Key Files Reference

| File | Description |
|------|-------------|
| `modules/audio-effects/android/src/main/java/expo/modules/audioeffects/SoftwareDSPAudioProcessor.kt` | Core Android DSP engine with biquad filters |
| `modules/audio-effects/android/src/main/java/expo/modules/audioeffects/BiquadFilter.kt` | Biquad filter implementation (peaking, shelf, lowpass, highpass, allpass) |
| `modules/audio-effects/android/src/main/java/expo/modules/audioeffects/Limiter.kt` | Brickwall limiter implementation |
| `modules/audio-effects/android/src/main/java/expo/modules/audioeffects/SpatialEnhancementModule.kt` | Spatial Enhancement native module bridge |
| `modules/audio-effects/android/src/main/java/expo/modules/audioeffects/ImmersiveModeEngineModule.kt` | Immersive mode coordination |
| `client/services/WebAudioEffectsEngine.ts` | Web platform DSP engine using Web Audio API |
| `client/screens/SoundLabScreen.tsx` | Sound Lab UI with EQ presets and custom editor |
| `client/contexts/SoundLabContext.tsx` | State management for audio effects |

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

- **Sound Lab**: 10 EQ presets, custom 10-band EQ editor, 6 immersive modes, bass/treble control, distortion prevention.
- **Theming**: 55 themes across 6 categories (System, Winamp, Retro, Nature, Professional, Special).
- **Radio**: Native FM/AM radio and online streaming radio (Radio Browser API with quality filters).
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