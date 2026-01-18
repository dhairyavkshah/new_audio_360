# New Audio 360

## Overview
New Audio 360 is a premium mobile music player application built with React Native and Expo, targeting audio enthusiasts. It delivers studio-quality audio processing through pure software-based DSP, 55 stunning themes, and comprehensive music organization. The app requires a one-time purchase for lifetime access, with all data stored locally and no backend required.

**Tagline**: "The top-grade intelligent music experience built for you"

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

The app uses **pure software-based DSP** across all platforms. No Android hardware audio effects (android.media.audiofx.*) are used.

**Platform Implementations**:
- **Web**: `react-native-audio-api` (Web Audio API with BiquadFilterNode, DynamicsCompressorNode)
- **Android**: Custom ExoPlayer `AudioProcessor` with biquad filter algorithms (same formulas as Web Audio API)

**Audio Signal Chain**:
```
Source → Gain → 7-Band EQ → Bass Shelf Filter → Treble Shelf Filter → Stereo Widener → Limiter → Output
```

**Key Components**:
- **7-Band Parametric EQ**: Sub, Bass, Low-Mid, Mid, High-Mid, Treble, Brilliance
- **Zero-Sum Normalization**: EQ presets automatically balanced to prevent overall volume change
- **Bass Boost Filter**: Lowshelf at 150Hz, affects all frequencies below
- **Treble Boost Filter**: Highshelf at 6kHz, affects all frequencies above
- **Bass/Treble Range**: ±12 dB (slider range -5 to +5, DB_PER_UNIT = 2.4)
- **Intelligent Limiter**: DynamicsCompressorNode configured as brickwall limiter
  - Threshold: -1 dB (catches peaks before clipping)
  - Ratio: 20:1 (hard limiting)
  - Attack: 1ms (catches transients)
  - Release: 100ms (smooth recovery)

**EQ Presets** (8 total):
Flat, Rock, Pop, Jazz, Classical, Hip-Hop, Electronic, Acoustic
- Zero-sum normalization applied to prevent volume jumps

**Immersive Modes** (6 total, plus Off to disable):
Music, 360 Reality, Gaming, Podcast, Movie, Sports
- Each mode has its own independent EQ curve, bass boost, treble boost, and virtualizer (spatial width)
- NO zero-sum normalization (creative curves applied directly)
- Limiter remains active for distortion prevention

**Immersive Mode Settings** (Professional-grade, based on Samsung Dolby Atmos/Sony 360 Reality Audio standards):

| Mode | Bass | Treble | Spatial Width | Design Philosophy |
|------|------|--------|---------------|-------------------|
| Music | +4.8 dB | +3.6 dB | 35% | Warm "smile curve" - Samsung Music mode inspired |
| 360 Reality | 0 dB | +1.2 dB | 75% | Flat/neutral EQ - Sony 360 Reality Audio & Samsung 360 Audio |
| Gaming | -2.4 dB | +6 dB | 50% | Footstep clarity (2-6kHz boost) - Pro gaming standards |
| Podcast | -3.6 dB | -1.2 dB | 0% | Voice clarity, reduced rumble/sibilance |
| Movie | +8.4 dB | +4.8 dB | 45% | THX-inspired cinematic impact |
| Sports | +2.4 dB | -1.2 dB | 40% | Stadium broadcast clarity - enhanced commentary |

### Navigation Structure
4-tab system with persistent MiniPlayer:
- **ListenTab**: Main player, Now Playing, Sound Lab, Queue
- **LibraryTab**: Music organization, Quick Access Category Grid
- **RadioTab**: FM/AM native radio, Online streaming radio
- **SettingsTab**: General, Sound Lab, Appearance, License, About

### Native Modules (Android-specific)

**Audio Processing (100% Software DSP)**:
- **SoftwareDSPAudioProcessor**: Core DSP engine implementing biquad filter chain
  - 7-band parametric EQ (32Hz, 64Hz, 125Hz, 500Hz, 2kHz, 8kHz, 16kHz)
  - Bass shelf filter (150Hz, Q=0.707)
  - Treble shelf filter (6kHz, Q=0.707)
  - Brickwall limiter (threshold -1dB, ratio 20:1, attack 1ms, release 100ms)
- **BiquadFilter**: Implements peaking and shelf filter algorithms using Web Audio API cookbook formulas
- **Limiter**: Brickwall limiter with envelope follower for distortion prevention
- **PlaybackEngineModule**: ExoPlayer with custom AudioProcessor injection via DefaultAudioSink

**Audio Control Modules (All delegate to SoftwareDSPAudioProcessor)**:
- **EqualizerModule**: 7-band EQ control, preset management
- **BassBoostModule**: Bass shelf filter control (converts 0-1000 strength to ±5 gain units)
- **VirtualizerModule**: Stereo width control (stub - spatial processing planned)
- **ImmersiveModeEngineModule**: Preset modes (Music, 360 Reality, Gaming, Podcast, Movie)

**System Modules**:
- **AudioSessionBridgeModule**: Audio session ID management
- **WaveformAnalyzerModule**: Real-time waveform/FFT visualization (uses android.media.audiofx.Visualizer for read-only audio data)
- **FMRadioModule**: FM/AM radio tuning (device hardware required)
- **LicenseVerificationModule**: Google Play Store license verification

**Note**: No Android hardware audio effects (android.media.audiofx.Equalizer, BassBoost, Virtualizer) are used for audio processing. Only the Visualizer class is used for read-only waveform analysis.

### License Verification
- Checks if installed from Google Play (com.android.vending)
- Licensed: Full access granted
- Unlicensed: Prompt to purchase from Play Store
- License state cached locally for offline use
- Production uses `react-native-iap` with product ID `new_audio_360_lifetime`

## Feature Specifications

### Sound Lab
- **Equalizer Mode**: 8 presets with custom 5-band EQ editor (up to 5 saved presets)
- **Immersive Mode**: 5 audio enhancement modes (plus Off)
- **Bass Control**: Slider -5 to +5 (±12 dB via lowshelf filter at 150Hz)
- **Treble Control**: Slider -5 to +5 (±12 dB via highshelf filter at 6kHz)
- **Distortion Prevention**: Intelligent brickwall limiter (no fixed gain reduction)

### Theming
55 themes across 6 categories:
- System (5): Fluent Light, Dark, Night AMOLED, Warm Neutral, Cool Blue
- Winamp (10): Classic, Modern, Bento, Foxpro, and more
- Retro (10): VHS, Cassette, Vaporwave, Cyberpunk, and more
- Nature (10): Forest, Ocean, Sunset, Aurora, and more
- Professional (10): Midnight, Corporate, Slate, Graphite, and more
- Special (10): Neon, Holographic, Candy, Galaxy, and more

### Radio
- **FM/AM**: Native Android radio (device hardware required)
- **Online Radio**: Radio Browser API with quality filters
  - Only verified working streams (lastcheckok=1)
  - Quality codecs: MP3, OGG, AAC
  - Bitrate >64kbps
  - Max 50 stations per country, sorted by popularity

### Playback Features
- Background playback with notification controls
- Queue management with drag-to-reorder
- Shuffle and repeat modes
- Playback speed (0.5x to 2.0x)
- Sleep timer
- Favorites, Recently Played, Most Played

### Library Management
- Music folder selection
- Paginated loading for large libraries
- "Hide Song" feature
- Full playlist CRUD

## Build Configuration

### EAS Build Profiles
- `development`: Development build with debugging
- `preview`: Internal testing build
- `production`: Production AAB for Play Store
- `production-apk`: Production APK for direct distribution

### Requirements
- Minimum Android: 8.0 (API 26)
- Target Android: 14 (API 34)
- Architectures: ARM64, ARM32, x86_64
- Package Name: com.theteam360.newaudio360

## External Dependencies

### Core
- react-native, expo (SDK 53.0.0)
- react-native-track-player (background playback)
- expo-av (web fallback)
- expo-media-library (device media access)

### Audio Processing
- react-native-audio-api (Web Audio API for software DSP)

### UI & Navigation
- @react-navigation (navigation system)
- react-native-reanimated (simple animations)
- MaterialCommunityIcons (iconography)

### Platform Services
- expo-notifications (playback controls)
- expo-local-authentication (biometric auth)
- expo-location (online radio location)
- react-native-iap (Google Play Billing)

## Recent Changes

### January 18, 2026 - MAJOR: 100% Pure Software DSP Architecture
- **Achieved 100% software-based audio processing on Android**
  - ALL audio effects now use custom biquad filter algorithms
  - NO Android hardware audio effects (android.media.audiofx.*) used for processing
  - Same DSP algorithms on Android and Web for consistent audio experience
- **Created SoftwareDSPAudioProcessor.kt** - Core DSP engine:
  - ExoPlayer AudioProcessor with biquad filter chain
  - 7-band parametric EQ at: 32Hz, 64Hz, 125Hz, 500Hz, 2kHz, 8kHz, 16kHz
  - Bass shelf filter at 150Hz (Q=0.707)
  - Treble shelf filter at 6kHz (Q=0.707)
  - Brickwall limiter for distortion prevention
- **Created BiquadFilter.kt** - Filter implementation:
  - Supports peaking, lowshelf, highshelf filter types
  - Uses Web Audio API cookbook formulas for coefficient calculation
  - Per-channel state for stereo processing
- **Created Limiter.kt** - Brickwall limiter:
  - Threshold: -1dB, Ratio: 20:1, Attack: 1ms, Release: 100ms
  - Envelope follower with peak detection
- **Converted all native modules to software DSP**:
  - EqualizerModule.kt - Delegates to SoftwareDSPAudioProcessor
  - BassBoostModule.kt - Removed android.media.audiofx.BassBoost
  - VirtualizerModule.kt - Removed android.media.audiofx.Virtualizer
  - ImmersiveModeEngineModule.kt - Removed all hardware effects
- **Integrated with ExoPlayer via custom AudioProcessor injection**:
  - PlaybackEngineModule.kt uses DefaultRenderersFactory override
  - Custom DefaultAudioSink with SoftwareDSPAudioProcessor chain

### January 17, 2026
- Implemented pure software-based DSP using react-native-audio-api for Web
- Added dedicated shelf filters for Bass (150Hz) and Treble (6kHz)
- Implemented zero-sum normalization for EQ presets
- Created 7-band EQ architecture with proper frequency distribution
