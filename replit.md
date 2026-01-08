# New Audio 360

## Overview

New Audio 360 is a premium, 100% offline mobile music player application built with React Native and Expo. It provides audio enthusiasts with a full-featured, device-local music experience including a robust music player ("Listen Mode"), comprehensive music organization ("Library"), professional sound customization ("Sound Lab"), and extensive personalization through 55 themes. The project aims to offer a high-quality, private, and fully self-contained music experience without relying on any external servers, cloud services, or internet connectivity. This app is purely local, with all user data, settings, and media stored exclusively on the device.

## User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. I value clear explanations for complex decisions. Do not introduce external dependencies or network requests, as the application is strictly offline and device-local. All data must reside on the user's device. I prefer iterative development with clear justifications for each step.

## System Architecture

The application is built with **React Native and Expo**, ensuring cross-platform support while maintaining a fully offline and device-local experience. There is no backend server, API calls, or cloud integration; all data persists locally via AsyncStorage. The UI/UX adheres to **Material Design 3 (Material You)** guidelines with Android 16 design patterns, emphasizing dynamic color, clarity, and adaptability, with a comprehensive theming system offering 55 unique skins.

**Technical Implementations:**
- **Platform**: React Native with Expo SDK
- **State Management**: React Context API with custom hooks
- **Data Persistence**: AsyncStorage for local storage
- **Styling**: Material Design 3 tokens and components
- **Audio Playback**: expo-av for local audio file playback
- **Media Access**: expo-media-library for accessing device audio files
- **Animations**: react-native-reanimated with M3 motion curves

**Navigation Structure:**
The app features a 4-tab navigation structure:
- **MainTabNavigator**: Hosts Listen, Library, Studio, and Settings tabs, with a persistent MiniPlayer overlay.
    - **ListenTab**: Main music player, Now Playing, Sound Lab, and Queue management.
    - **LibraryTab**: Music organization with a **Quick Access Category Grid** (7 color-coded cards: Liked, Recent, Top, Songs, Albums, Artists, Playlists) – all categories visible at once without horizontal scrolling.
    - **StudioTab**: Voice recording over backing tracks with voice-specific effects (Noise Reduction + Reverb presets) and mixing capabilities, utilizing native Android audio modules.
    - **SettingsTab**: General settings, Sound Lab, Appearance (theme selector), Subscription Plan, and About.

**Native Audio Modules (located in `modules/audio-effects/`):**

*Main Playback Engine (ExoPlayer-based):*
- **PlaybackEngineModule**: Native Android playback using `ExoPlayer` (Media3) with:
  - Queue management with gapless playback
  - Shuffle and repeat modes (off/one/all)
  - Playback speed control (0.25x - 3.0x)
  - Audio session management for effect attachment
  - Progress events at 250ms intervals
  - Automatic audio focus handling

*Native Audio Effects (Session-bound):*
- **EqualizerModule**: Android `Equalizer` API with device presets and custom band levels
- **BassBoostModule**: Android `BassBoost` API with strength control (0-1000)
- **VirtualizerModule**: Android `Virtualizer` API for spatial audio enhancement
- **WaveformAnalyzerModule**: Android `Visualizer` API for real-time waveform and FFT data at 60Hz

*Karaoke Recording Architecture (Real-time Processing):*
- **LiveRecordingModule**: Uses Android `AudioRecord` with `VOICE_PERFORMANCE` audio source (optimized for singing). Applies real-time effects during capture:
  - `AcousticEchoCanceler` - Prevents backing track bleed into voice recording
  - `NoiseSuppressor` - Real-time noise reduction
  - `AutomaticGainControl` - Consistent voice levels
  - Outputs 48kHz mono WAV for maximum clarity
- **BackingTrackModule**: Separate `MediaPlayer` session for backing track playback. Uses independent audio session with `USAGE_MEDIA`/`CONTENT_TYPE_MUSIC` attributes to prevent interference with recording.

*Post-Processing Modules (Export):*
- **ReverbModule**: Uses Android `EnvironmentalReverb` API with 5 presets.
- **NoiseReductionModule**: Uses Android `NoiseSuppressor` and `AutomaticGainControl` APIs with 4 levels.
- **AudioMixerModule**: Mixes backing track and voice recording with effects, exporting 320kbps AAC to device storage using `MediaExtractor`, `MediaCodec`, and `MediaMuxer`.

*StudioAudioEngine*: TypeScript service that bridges native modules on Android with expo-av fallback for web/iOS. Uses `getAudioCapabilities()` to detect device support for AEC/NS/AGC. Manages separate audio sessions for recording and playback.

**Design Language:**
The app uses **Material Design 3** (Material You) design language with M3 type scale, color system, spacing, shape (corner radii), elevation, motion, and touch targets. Key UI components include an M3-styled search input, sort menu, empty/loading states, app header, glassmorphism MiniPlayer, M3-styled song list items, animated cards, buttons, various card types, horizontal chips, and M3-styled bottom sheet and dialog modals.

**Feature Specifications:**
- **Theming**: 55 themes with custom icons, shapes, and component variants.
- **Sound Lab**: Offers mutually exclusive Equalizer presets or Immersive modes.
- **Subscription System**: Two-tier subscription model (Free, Standard, Premium) for feature gating, with mock IAP for development and client-side security for anti-tampering.
- **MiniPlayer**: A persistent, glassmorphism-effect mini-player for quick control.
- **Media Library Integration**: Onboarding for media access, paginated loading of device audio, and "Hide Song" functionality.
- **Playlist Management**: Full CRUD operations for locally stored playlists.
- **Playback Features**: Favorites, Recently Played, Most Played, Queue Management, and Sleep Timer.
- **Studio Mode**: Enables recording voice over backing tracks with specific voice effects (Noise Reduction + Reverb), distinct from Sound Lab's music effects.

## External Dependencies

- **React Native**: Cross-platform mobile framework
- **Expo SDK**: Development and build tooling
- **expo-av**: Audio playback
- **expo-media-library**: Device media access
- **react-native-reanimated**: Smooth animations
- **@react-navigation**: Navigation system
- **MaterialCommunityIcons**: Iconography