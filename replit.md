# New Audio 360 v33.0

## Overview
New Audio 360 is a premium mobile music player built with React Native and Expo, offering studio-quality audio processing through software-based DSP and neural AI upscaling. It provides 55 customizable themes and extensive music organization features. The application operates on a one-time purchase model with local data storage, aiming to deliver a high-quality, intelligent music experience across Android, iOS, Web, and Windows platforms. Its vision is to provide an intelligent, high-fidelity music experience.

## User Preferences
- Concise and direct communication
- Prioritize core functionality and architectural integrity
- Clear explanations for complex decisions
- Iterative development with justifications
- No complex animations - use simple dissolve/appear effects only
- **Git Workflow**: Replit is always the source of truth. Never merge changes from GitHub to Replit. Use `git push --force` if needed.

## System Architecture

### Platform & Framework
The application is built with React Native (SDK 53.0.0, React Native 0.79.2) and Expo. State management uses the React Context API with custom hooks. The design system is based on Microsoft Fluent 2, adhering to a 4px grid, semantic tokens, and elevation shadows. Data persistence is handled via local storage mechanisms like AsyncStorage and SecureStorage. It supports Android, iOS, Web, and Windows (PWA with native integration).

### Core Technical Architecture
The app utilizes a deeply nested Context Provider hierarchy for global state. `PlayerContext` dynamically selects playback engines: a custom Android native ExoPlayer module with integrated DSP (`PlaybackEngineModule`), `react-native-track-player` as a fallback, and Web Audio API (`WebAudioEffectsEngine`) for web platforms. Custom Expo modules developed in Kotlin expose native functionalities for audio processing (e.g., `SoftwareDSPAudioProcessor`, `NeuralAudioProcessorTFLite`) and utilities (e.g., `WaveformAnalyzerModule`, `MediaStoreScannerModule`). For web, `WebAudioEffectsEngine` utilizes the Web Audio API for effects and `@tensorflow/tfjs` for AI upscaling. Key services include `NativeEffectsManager`, `TrackPlayerService`, `AudioCoordinator`, `SoundCloudService`, `ArchiveOrgService`, and `OnlineRadioService`.

### Navigation
The application uses `@react-navigation` with a `RootStackNavigator` containing a `MainTabNavigator` (Listen, Library, Radio, Discover, Settings) and a persistent MiniPlayer. Each tab has its own stack navigator.

### Audio Effects (Pure Software DSP + Neural AI)
The application employs pure software DSP and neural AI upscaling. The signal chain order is: AI Audio Upscaling → 10-Band EQ → Bass Shelf → Bass Enhancement → Treble Shelf → Spatial (with HRTF) → Reverb → Limiter → Output.
**Key DSP Components**: 10-Band Parametric EQ, Bass/Treble Boost Filters, Multi-Tap Delay Reverb, Intelligent Brickwall Limiter, Psychoacoustic Spatial Enhancement with HRTF, 6 Immersive Modes, Smart Enhancements (HRTF Binaural Virtualization, Psychoacoustic Bass Enhancement, AI Upscaling). Internal processing is 32-bit float for maximum dynamic range, with Android DSP using a custom ExoPlayer `AudioProcessor` and Web DSP using `WebAudioEffectsEngine`.

### Theme System Architecture
The application features a two-layer color system with full dynamic theme adaptation: Theme Colors (55 themes with semantic colors) and Fluent Color Mapping (`useThemedColors()`) that dynamically maps theme colors to Fluent 2 design tokens. All components utilize `useThemedColors()` for consistent theme application.

### Feature Specifications
- **Sound Lab**: 10 EQ presets, custom 10-band EQ, 6 immersive modes, bass/treble control, Smart Enhancements.
- **Theming**: 55 fully adaptive themes with dynamic Fluent color token mapping.
- **Radio**: Native FM/AM and online streaming with Intelligent Radio Discovery.
- **Playback**: Background playback, notification controls, queue, shuffle/repeat, playback speed, sleep timer, favorites.
- **Library Management**: Music folder selection, paginated loading, playlist CRUD.
- **Open Music Discovery**: Integration with Internet Archive and SoundCloud (full track streaming via OAuth 2.1), supporting DSP/AI upscaling.

### Performance Architecture
- **No polling**: SoundLabContext uses AppState-driven refresh (on mount + app focus) instead of interval polling, preventing constant state churn and GC pressure
- **Debounced DSP updates**: `applyEffectsToEngine` uses 50ms debounce to coalesce rapid state changes into single native DSP reconfigurations
- **Platform-gated WebAudioEffectsEngine**: All WebAudioEffectsEngine initialization, calls, and cleanup are gated to `Platform.OS === 'web'` only, eliminating dead code execution on Android

## External Dependencies

### Core
- `react-native`, `expo` (SDK 53.0.0)
- `react-native-track-player`
- `expo-av`
- `expo-media-library`

### Audio Processing
- `react-native-audio-api`
- `@tensorflow/tfjs` (Web/PWA)

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