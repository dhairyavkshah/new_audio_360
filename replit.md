# New Audio 360

## Overview
New Audio 360 is a premium mobile music player built with React Native and Expo, providing studio-quality audio processing through software-based DSP and neural AI upscaling. It offers 55 customizable themes and extensive music organization features. The application operates on a one-time purchase model with local data storage, aiming to deliver a high-quality, intelligent music experience. It supports Android, iOS, Web, and Windows platforms, with the Windows version distributed as a PWA via the Microsoft Store.

## User Preferences
- Concise and direct communication
- Prioritize core functionality and architectural integrity
- Clear explanations for complex decisions
- Iterative development with justifications
- No complex animations - use simple dissolve/appear effects only
- **Git Workflow**: Replit is always the source of truth. Never merge changes from GitHub to Replit. Use `git push --force` if needed.

## System Architecture

### Platform & Framework
- **Framework**: React Native with Expo SDK 53.0.0 (using React Native 0.79.2).
- **State Management**: React Context API with custom hooks.
- **Design System**: Microsoft Fluent 2 (4px grid, semantic tokens, elevation shadows).
- **Data Persistence**: Local storage using AsyncStorage/SecureStorage.

### Platform Modes
Supports Android, iOS, Web, and Windows (PWA with native integration via PWABuilder).

### Detailed Technical Architecture

#### Context Provider Hierarchy
The app uses a deeply nested provider architecture to share state, including `PlatformModeProvider`, `ThemeProvider`, `AuthProvider`, `PlayerProvider`, and `DiscoverFavoritesProvider`, leading to `AppContent (Navigation)`.

#### Playback Engine Selection
PlayerContext dynamically selects the playback engine:
1. **Android Native** (`PlaybackEngineModule`): Custom ExoPlayer with integrated DSP.
2. **TrackPlayer** (`TrackPlayerService`): Fallback for native builds without custom module.
3. **Web Audio**: HTML5 `<audio>` element with `WebAudioEffectsEngine`.

#### Android Native Modules
Expo modules built with Kotlin and exposed via `expo-modules-core`:
- `PlaybackEngineModule`: ExoPlayer integration with DSP, MediaSession, queue.
- `SoftwareDSPAudioProcessor`: Biquad filters, limiter, spatial processing.
- `NeuralAudioProcessorTFLite`: TensorFlow Lite AI upscaling.
- `EqualizerModule`, `BassBoostModule`, `SpatialEnhancementModule`, `ImmersiveModeEngineModule`.
- `WaveformAnalyzerModule`: Real-time FFT and waveform data.
- `MediaStoreScannerModule`: Android MediaStore audio scanning.
- `AppContextModule`: License validation.
- `SecureStateManager`: Encrypted storage.
- `RuntimeIntegrity`: Signature verification.

#### Web Audio Architecture
- `WebAudioEffectsEngine`: Web Audio API node graph for effects.
- `NeuralAudioProcessor`: TensorFlow.js model for AI upscaling.
- `SoundCloudWidgetPlayer`: SoundCloud Widget API for CORS-bypassed streaming.

#### Key Services
- `NativeEffectsManager` (Android): Bridges PlayerContext to native DSP modules.
- `TrackPlayerService` (iOS/Android): `react-native-track-player` wrapper.
- `SoundCloudService`: OAuth 2.1 PKCE, API calls, token management.
- `ArchiveOrgService`: Internet Archive metadata and streaming.
- `OnlineRadioService`: Radio Browser API integration.
- `AudioCoordinator`: Manages conflicting audio sources.

#### Navigation Structure
A `RootStackNavigator` contains a `MainTabNavigator` with five tabs (`Listen`, `Library`, `Radio`, `Discover`, `Settings`) and a persistent MiniPlayer overlay. Each tab has its own stack navigator.

### Audio Effects Architecture (Pure Software DSP + Neural AI)
The application uses pure software DSP and neural AI upscaling, with all enhancements additive within ±12dB Android headroom.

**Signal Chain Order**: AI Audio Upscaling → 10-Band EQ → Bass Shelf → Bass Enhancement → Treble Shelf → Spatial (with HRTF) → Reverb → Limiter → Output.

**Key DSP Components**:
- **10-Band Parametric EQ**: With 10 presets.
- **Bass/Treble Boost Filters**: Shelf filters.
- **Multi-Tap Delay Reverb**: 4 delay lines.
- **Intelligent Limiter**: Brickwall limiting.
- **Spatial Enhancement**: Psychoacoustic stereo widening with HRTF.
- **Immersive Modes**: 6 distinct modes.
- **Smart Enhancements**:
    - **HRTF Binaural Virtualization**: Integrated into Spatial Enhancement.
    - **Bass Enhancement**: Psychoacoustic harmonic generation.
    - **AI Upscaling (Audio Super-Resolution)**: Neural audio enhancement using a Kuleshov-style 1D U-Net CNN. Implemented with TensorFlow.js on Web and TensorFlow Lite on Android.

**DSP Architecture Details**:
- **Internal Processing**: 32-bit float.
- **Android DSP**: Custom ExoPlayer `AudioProcessor` with biquad filters and TensorFlow Lite.
- **Web DSP**: `WebAudioEffectsEngine` leveraging Web Audio API and TensorFlow.js.
- **Unified DSP for Streaming**: All Android audio routes through a single DSP chain via `PlaybackEngineModule`. Web streaming uses Web Audio API.

### Feature Specifications
- **Sound Lab**: 10 EQ presets, custom 10-band EQ, 6 immersive modes, bass/treble control, Smart Enhancements (Bass Enhancement, AI Upscaling).
- **Theming**: 55 themes.
- **Radio**: Native FM/AM and online streaming with Intelligent Radio Discovery.
- **Playback**: Background playback, notification controls, queue, shuffle/repeat, playback speed, sleep timer, favorites.
- **Library Management**: Music folder selection, paginated loading, playlist CRUD.
- **Open Music Discovery**: Internet Archive (public domain/CC) and SoundCloud (full track streaming with user authentication via OAuth 2.1). DSP/AI upscaling supported on Archive via web, and on SoundCloud via Android. SoundCloud web playback uses the Widget API.

## Code Health

### Dead Code Removed (v29.0 Audit - January 2026)
The following unused files were removed during the codebase audit:
- **`client/services/MicTestService.ts`**: Microphone testing service - never imported
- **`client/services/AudioDeviceService.ts`**: Audio device enumeration - never imported
- **`client/screens/BiometricLockScreen.tsx`**: Biometric lock screen - never imported
- **`client/hooks/useWindowsFolderScanner.ts`**: Windows folder scanner hook - never imported
- **`client/hooks/useMediaLibrary.ts`**: Media library hook - superseded by MediaLibraryContext

### Architecture Notes
- **PlayerContext** (~2200 lines) uses multiple playback engines with ref-based guards. The complexity is intentional to support Android native DSP, TrackPlayer fallback, and web audio.
- **Auto-advance pattern**: Uses `loadAndPlaySongRef` to break circular dependency between `handleTrackEnd` (stable callback with empty deps) and `loadAndPlaySong` (defined later). The ref is updated via useEffect when `loadAndPlaySong` changes.
- **SmartEnhancementsModule** is exported from `modules/audio-effects/index.ts` and used in SoundLabScreen for bass enhancement and HF restoration settings.
- **NativeAudioService** is still used by SoundLabScreen for session management and live audio analysis.

### Performance Optimizations (v29.1 - January 2026)
- **MediaLibraryContext**: Parallelized initialization using `Promise.all` for `loadHiddenSongs`, `loadOnboardingStatus`, `loadSelectedFolders`, and `loadCachedSongs`. Also parallelized `checkPermission` and `validateOnboardingStatus`. This reduces sequential awaits and improves startup time.
- **loadHiddenSongs**: Now returns the hidden IDs array to avoid stale state issues during parallel initialization.

### Duration Normalization (v29.1 - January 2026)
All song durations are normalized to **seconds** throughout the app:
- **normalizeDuration/normalizeDurationToSeconds helpers**: Convert values > 36000 from milliseconds to seconds (heuristic: > 10 hours indicates ms)
- **MediaLibraryContext**: expo-media-library returns seconds (no longer multiplied by 1000), MediaStoreScannerModule returns ms (divided by 1000), cached songs normalized on load
- **PlayerContext**: Durations normalized at playback start and state restoration
- **SoundCloudService**: New favorites stored in seconds, legacy favorites normalized on load
- **ProgressBar**: Guard shows "0:00" for invalid/garbage values (null, NaN, negative, > 10 hours)

### Metadata & Playback Fixes (v29.2 - January 2026)
- **MediaStoreScannerModule**: Added fallback duration fetching using `MediaMetadataRetriever` when MediaStore returns 0. This handles cases where MediaStore hasn't fully indexed newly added files.
- **PlayerContext progress callback**: Removed overly strict guard (`position <= duration`) that was resetting currentTime to 0 at end of tracks. Now uses industry-standard approach: allow position to reach duration without artificial capping, using `Math.min(position, duration)` for UI display.

### Event-Based Progress & Track End (v29.3 - February 2026)
- **Event-driven like web**: Android now works like web - native player PUSHES updates to the app (not app polling the player).
- **onProgress event**: Native fires every 1 second with position and duration in SECONDS (like web's `ontimeupdate`).
- **onTrackEnded event**: When position reaches duration, native fires track ended event (like web's `onended`).
- **onIsPlayingChanged event**: Native fires when playback state changes, syncing isPlaying state with actual audio playback.
- **No more polling**: Removed all setInterval polling from PlayerContext for Android playback.
- **Seconds not milliseconds**: All progress values are now in clean integer seconds.
- **Seek race condition fix**: Uses `setPendingSamplePosition()` BEFORE calling `player.seekTo()` to preserve sample counter.
- **Notification tap to open app**: MediaSession includes `setSessionActivity()` with PendingIntent to launch app.
- **Repeat one fix**: Properly awaits `seekTo(0)` before calling `play()` to avoid race conditions. Waveform only animates when native player confirms audio is playing.
- **Single trackEnded source**: DSP end-of-stream callback is the ONLY source of trackEnded events. Removed duplicate firing from progress runnable and playback state listener to prevent guard conflicts.

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