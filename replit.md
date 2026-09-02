# New Audio 360 v37.0

## Running on Replit

Install dependencies with `npm ci`, then use the configured **Start App** workflow. It exports the Expo web app and serves `dist` on port 5000:

```bash
npm run web:build && npm run server:prod
```

For Expo development mode with live bundling, use `npm run dev`.

SoundCloud features additionally require `SOUNDCLOUD_CLIENT_ID` and `SOUNDCLOUD_CLIENT_SECRET` environment secrets.

## Overview
New Audio 360 is a premium mobile music player built with React Native and Expo, offering studio-quality audio processing through software-based DSP and neural AI upscaling. It provides 55 customizable themes and extensive music organization features. The application operates on a one-time purchase model with local data storage, aiming to deliver a high-quality, intelligent music experience across Android, iOS, Web, and Windows platforms. Its vision is to provide an intelligent, high-fidelity music experience.

## User Preferences
- Concise and direct communication
- Prioritize core functionality and architectural integrity
- Clear explanations for complex decisions
- Iterative development with justifications
- No complex animations - use simple dissolve/appear effects only
- **Git Workflow**: Replit is always the source of truth. Never merge changes from GitHub to Replit. Use `git push --force` if needed.
- **Version Updates**: When bumping the app version, ALWAYS update ALL of these locations:
  1. `package.json` → `"version"`
  2. `package-lock.json` → `"version"` (top-level and packages[""])
  3. `app.config.js` → `version`, `ios.buildNumber`, `android.versionCode`
  4. **`android/app/build.gradle`** → `defaultConfig.versionCode` and `defaultConfig.versionName` (THIS IS WHERE EXPO/EAS PICKS THE ACTUAL ANDROID BUILD VERSION FROM)
  5. `client/screens/SplashScreen.tsx`, `AboutScreen.tsx`, `SettingsScreen.tsx`, `LicenseScreen.tsx`
  6. `docs/RELEASE_NOTES.md`, `docs/APP_STORE_DESCRIPTIONS.md`
  7. `replit.md` title
  8. Kotlin comments in `SoftwareDSPAudioProcessor.kt`, `CustomMusicService.kt`

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

### Neural AI Upscaling Model
- **Architecture**: Kuleshov-style 1D U-Net CNN for audio super-resolution (v1.3.0)
- **Model file**: `modules/audio-effects/android/src/main/assets/audio_sr_model.tflite`
- **Input**: 8192 samples per chunk, single channel, normalized [-1.0, 1.0]
- **Processing**: Residual learning with configurable blend (Low 0.3, Medium 0.6, High 1.0)
- **Stereo handling**: Deinterleaves L/R, processes independently, reinterleaves
- **Safety**: 10ms time budget per chunk, automatic bypass on timeout/error
- **CPU-only**: Correct for real-time audio (GPU would add memory transfer latency)
- **Verified (Feb 2026)**: Original Kuleshov repo (github.com/kuleshov/audio-super-res, 2017 ICLR) provides NO pretrained weights. No official TFLite audio super-resolution models exist from Google/TF Hub. Modern alternatives (AudioSR, ClearerVoice-Studio, VM-ASR 2025) are all PyTorch-based, not TFLite-ready, and too large for real-time mobile processing. Current custom-trained v1.3.0 TFLite model is the appropriate production choice.
- **Preloading**: Neural model is preloaded asynchronously during PlaybackService.onCreate() on a separate executor. This is correct — does not block audio or main thread, ensures model is ready when user enables AI upscaling.

### Recent Fixes (Feb 2026)
- **OnlineRadioContext TrackPlayer guard**: Added `useNativePlaybackRef` guard to skip TrackPlayer initialization on Android when PlaybackEngineModule is available, preventing dual ExoPlayer instances
- **Duplicate initialize() fix**: `ensurePlaybackEngineInitialized()` in PlayerContext now properly captures audioSessionId from `alreadyInitialized` results, preventing redundant 5-second timeout re-initialization
- **Background/foreground state sync**: Added PlaybackEngineModule state save on background transition and state restore on foreground return in PlayerContext
- **Visualizer guard**: Deferred WaveformAnalyzerModule.attach() to capture-time (lazy), added playing state check before starting capture to prevent errors on pause

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