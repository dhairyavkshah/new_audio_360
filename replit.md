# New Audio 360

## Overview
New Audio 360 is a premium mobile music player application built with React Native and Expo, targeting audio enthusiasts. It delivers studio-quality audio processing through pure software-based DSP, 55 stunning themes, and comprehensive music organization. The app requires a one-time purchase (₹311 India / $13.11 International) for lifetime access, with all data stored locally and no backend required.

**Tagline**: "The top-grade intelligent music experience designed for you"

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

The app uses **pure software-based DSP** via `react-native-audio-api` (Web Audio API implementation) across all platforms (Android, iOS, Web). No hardware audio effects are used.

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

**Immersive Modes** (6 total):
Music, 360 Reality, Gaming, Podcast, Movie, Off
- Each mode has its own independent EQ curve, bass boost, treble boost, and virtualizer (spatial width)
- NO zero-sum normalization (creative curves applied directly)
- Limiter remains active for distortion prevention

**Immersive Mode Settings**:
| Mode | Bass | Treble | Spatial Width |
|------|------|--------|---------------|
| Music | +2 | +1 | 30% |
| 360 Reality | +1 | +2 | 60% |
| Gaming | +3 | +2 | 50% |
| Podcast | -1 | 0 | 0% |
| Movie | +3 | +2 | 40% |

### Navigation Structure
4-tab system with persistent MiniPlayer:
- **ListenTab**: Main player, Now Playing, Sound Lab, Queue
- **LibraryTab**: Music organization, Quick Access Category Grid
- **RadioTab**: FM/AM native radio, Online streaming radio
- **SettingsTab**: General, Sound Lab, Appearance, License, About

### Native Modules (Android-specific)
- **PlaybackEngineModule**: ExoPlayer-based playback
- **ImmersiveModeEngineModule**: Immersive audio mode management
- **AudioSessionBridgeModule**: Audio session bridging
- **NativeWaveformVisualizer**: 64-bar real-time visualization
- **FMRadioModule**: FM/AM radio tuning
- **LicenseVerificationModule**: Play Store verification

### License Verification
- Checks if installed from Google Play (com.android.vending)
- Licensed: Full access granted
- Unlicensed: Prompt to purchase from Play Store
- License state cached locally for offline use
- Production uses `react-native-iap` with product ID `new_audio_360_lifetime`

## Feature Specifications

### Sound Lab
- **Equalizer Mode**: 8 presets with custom 5-band EQ editor (up to 5 saved presets)
- **Immersive Mode**: 6 audio enhancement modes
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

### January 18, 2026
- Implemented intelligent brickwall limiter for distortion prevention
- Replaced fixed 50% gain compensation with dynamic limiting
- Connected Bass/Treble UI sliders to audio engine
- Extended bass/treble sync to preset loading and editing flows

### January 17, 2026
- Implemented pure software-based DSP using react-native-audio-api
- Added dedicated shelf filters for Bass (150Hz) and Treble (6kHz)
- Implemented zero-sum normalization for EQ presets
- Created 7-band EQ architecture with proper frequency distribution
