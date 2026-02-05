# New Audio 360 v31.0

## Overview
New Audio 360 is a premium mobile music player built with React Native and Expo, offering studio-quality audio processing through software-based DSP and neural AI upscaling. It provides 55 customizable themes and extensive music organization features. The application operates on a one-time purchase model with local data storage, aiming to deliver a high-quality, intelligent music experience across Android, iOS, Web, and Windows platforms.

## Recent Changes (v31.0 - February 2026)
- **Full Theme Adaptation**: Created `getThemedFluentColors()` utility and `useThemedColors()` hook for dynamic Fluent 2 color token mapping across all 70+ files
- **Tap/Click Feedback**: Added opacity 0.9 press feedback to 40+ Pressable components (FluentCard, FluentListItem, all cards, buttons)
- **Version Bump**: Updated version to 31.0 across package.json, screens, gradle, and documentation
- **CPU-Only Neural Audio Processing**: Removed GPU delegation from NeuralAudioProcessorTFLite (industry standard for real-time audio - GPU adds memory transfer overhead incompatible with <10ms latency requirements)
- **AI Upscaling Async Initialization**: Neural model now preloads on PlaybackService startup in background thread (prevents audio stall when enabling AI upscaling)
- **Spatial Enhancement Debounced Buffer Clear**: Buffer clearing is now debounced to 200ms after slider drag ends (prevents ripple/click artifacts during rapid slider movement)
- **Track End Cooldown**: Added 300ms cooldown to handleTrackEnd to prevent jittery auto-advance from duplicate track end events
- **Disable Android Ripple Effects**: Added `android_ripple={null}` to all Pressable components in modals (FluentModal, SoundLabScreen) and FluentListItem to prevent RippleDrawable log spam in software-rendered contexts
- **Resource Leak Fixes**: Fixed MediaMetadataRetriever and ByteArrayOutputStream leaks in MediaStoreScannerModule with proper try-finally cleanup
- **WaveformAnalyzerModule Memory Fix**: Fixed resource cleanup in release() - now properly nulls captureHandler/captureRunnable and always releases Visualizer resources regardless of capture state

### Poweramp-Level Memory Optimizations (v31.0.1)
- **DeviceCapabilities Utility** (`client/lib/deviceCapabilities.ts`): RAM detection with 3-tier classification (Low <3GB, Medium 3-6GB, High >6GB)
- **LazyImage Component** (`client/components/LazyImage.tsx`): Visibility-based image loading with LRU cache (50 items max)
- **FlatList Optimizations**: Adaptive windowSize (3-10), maxToRenderPerBatch (5-15), removeClippedSubviews, getItemLayout for fixed-height items
- **Context Memoization**: Wrapped PlayerContext and SoundLabContext values in useMemo/useCallback to prevent unnecessary re-renders
- **Adaptive Waveform Capture**: 20Hz (low-RAM), 30Hz (medium), 60Hz (high-memory) via NativeAudioService
- **Memory-Aware AI Upscaling**: Neural processing auto-disabled on devices <4GB RAM via WebAudioEffectsEngine device capability check
- **Android onTrimMemory Handler** (`DeviceInfoModule.kt`): Responds to memory pressure by clearing delay buffers and releasing neural model
- **ByteBufferPool** (`ByteBufferPool.kt`): Thread-safe buffer pooling with 2MB cap, integrated into SoftwareDSPAudioProcessor
- **C++/NDK DSP Foundation**: NEON SIMD implementation for PCM conversion, gain, soft clip operations (`NativeDSPModule.kt`, `simd_processor.cpp`)

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
The app utilizes a deeply nested Context Provider hierarchy to manage global state, including `PlatformModeProvider`, `ThemeProvider`, `AuthProvider`, `PlayerProvider`, and `DiscoverFavoritesProvider`. The `PlayerContext` dynamically selects playback engines: a custom Android native ExoPlayer module with integrated DSP (`PlaybackEngineModule`), `react-native-track-player` as a fallback, and Web Audio API (`WebAudioEffectsEngine`) for web platforms.

#### Android Native Modules
Custom Expo modules developed in Kotlin expose native functionalities:
- **Audio Processing**: `PlaybackEngineModule` (ExoPlayer with DSP), `SoftwareDSPAudioProcessor` (biquad filters, limiter, spatial processing), `NeuralAudioProcessorTFLite` (TensorFlow Lite AI upscaling), `EqualizerModule`, `BassBoostModule`, `SpatialEnhancementModule`, `ImmersiveModeEngineModule`.
- **Utilities**: `WaveformAnalyzerModule` (real-time FFT), `MediaStoreScannerModule` (audio scanning), `AppContextModule` (license validation), `SecureStateManager` (encrypted storage), `RuntimeIntegrity` (signature verification).

#### Web Audio Architecture
For web, `WebAudioEffectsEngine` utilizes the Web Audio API for effects, and `@tensorflow/tfjs` for `NeuralAudioProcessor` (AI upscaling). SoundCloud streaming is handled via `SoundCloudWidgetPlayer` to bypass CORS.

#### Key Services
- **Audio Management**: `NativeEffectsManager` (bridges PlayerContext to Android DSP), `TrackPlayerService` (react-native-track-player wrapper), `AudioCoordinator` (manages audio sources).
- **Content Discovery**: `SoundCloudService` (OAuth 2.1 PKCE, API calls), `ArchiveOrgService` (Internet Archive metadata), `OnlineRadioService` (Radio Browser API).

### Navigation
The application uses `@react-navigation` with a `RootStackNavigator` containing a `MainTabNavigator` (Listen, Library, Radio, Discover, Settings) and a persistent MiniPlayer. Each tab has its own stack navigator.

### Audio Effects (Pure Software DSP + Neural AI)
The application employs pure software DSP and neural AI upscaling, with all enhancements additive within ±12dB Android headroom. The signal chain order is: AI Audio Upscaling → 10-Band EQ → Bass Shelf → Bass Enhancement → Treble Shelf → Spatial (with HRTF) → Reverb → Limiter → Output.

**Key DSP Components**:
- 10-Band Parametric EQ with presets.
- Bass/Treble Boost Filters.
- Multi-Tap Delay Reverb.
- Intelligent Brickwall Limiter.
- Psychoacoustic Spatial Enhancement with HRTF.
- 6 Immersive Modes.
- Smart Enhancements: HRTF Binaural Virtualization, Psychoacoustic Bass Enhancement, AI Upscaling (Kuleshov-style 1D U-Net CNN via TensorFlow.js/TensorFlow Lite).

**DSP Architecture Details**:
- Internal processing is 32-bit float.
- Android DSP uses a custom ExoPlayer `AudioProcessor` with biquad filters and TensorFlow Lite.
- Web DSP uses `WebAudioEffectsEngine` with Web Audio API and TensorFlow.js.
- All Android audio routes through a single DSP chain via `PlaybackEngineModule`.

### Theme System Architecture
The application features a two-layer color system with full dynamic theme adaptation:
- **Theme Colors** (`tokens.colors`): 55 themes with semantic colors (primary, secondary, surface, text, etc.)
- **Fluent Color Mapping** (`useThemedColors()`): Maps theme colors to Fluent 2 design tokens dynamically
- **Key Files**: `client/lib/themeUtils.ts` (getThemedFluentColors), `client/contexts/ThemeContext.tsx` (useThemedColors hook)
- All components use `useThemedColors()` for consistent theme adaptation
- Tap/click effects on cards use opacity feedback (0.9 when pressed) - NO animations except waveform

### Feature Specifications
- **Sound Lab**: 10 EQ presets, custom 10-band EQ, 6 immersive modes, bass/treble control, Smart Enhancements.
- **Theming**: 55 fully adaptive themes with dynamic Fluent color token mapping across all UI components.
- **Radio**: Native FM/AM and online streaming with Intelligent Radio Discovery.
- **Playback**: Background playback, notification controls, queue, shuffle/repeat, playback speed, sleep timer, favorites.
- **Library Management**: Music folder selection, paginated loading, playlist CRUD.
- **Open Music Discovery**: Integration with Internet Archive (public domain/CC) and SoundCloud (full track streaming via OAuth 2.1), supporting DSP/AI upscaling.

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