# New Audio 360 v28.0

## Overview
New Audio 360 is a premium mobile music player application designed for audio enthusiasts, built with React Native and Expo. It offers studio-quality audio processing through pure software-based DSP, 55 customizable themes, and comprehensive music organization features. The app operates on a one-time purchase model for lifetime access, storing all user data locally without requiring a backend. Its core vision is to provide a top-grade intelligent music experience tailored for the user.

## User Preferences
- Concise and direct communication
- Prioritize core functionality and architectural integrity
- Clear explanations for complex decisions
- Iterative development with justifications
- No complex animations - use simple dissolve/appear effects only

**Git Workflow**: Replit is always the source of truth. Never merge changes from GitHub to Replit. Use `git push --force` if needed.

## System Architecture

### Platform & Framework
- **Framework**: React Native with Expo SDK 53.0.0 (using React Native 0.79.2 for `react-native-track-player` compatibility).
- **State Management**: React Context API with custom hooks.
- **Design System**: Microsoft Fluent 2 (4px grid, semantic tokens, elevation shadows).
- **Data Persistence**: Local storage using AsyncStorage/SecureStorage.

### Platform Modes
The application supports four platform modes: Android, iOS (iPhone Mode), Web, and Windows (Microsoft Store). iPhone Mode includes specific fallbacks for audio effects and feature availability.

### Windows Store Application
The Windows version is packaged as a PWA using PWABuilder, providing:
- Native Windows integration (file associations, Start menu, taskbar)
- Windows Music folder scanning via File System Access API
- Offline support via service worker
- MSIX packaging for Microsoft Store distribution

**Windows Build Files**:
- `windows/` - Windows-specific configuration and assets
- `windows/Package.appxmanifest` - Windows app manifest
- `windows/pwabuilder-config.json` - PWABuilder configuration
- `public/manifest.json` - PWA manifest
- `public/sw.js` - Service worker for offline support
- `.github/workflows/windows-store-build.yml` - GitHub Actions workflow

**Windows-Specific Services**:
- `client/services/WindowsFolderScanner.ts` - Scans Windows Music folder
- `client/hooks/useWindowsFolderScanner.ts` - React hook for folder scanning

### Audio Effects Architecture (Pure Software DSP + Neural AI) - v29.0
The app utilizes pure software-based DSP across all platforms for a consistent audio experience, with optional neural AI upscaling for enhanced audio quality. All enhancements are **purely additive** within ±12dB Android headroom—no signal attenuation.

**Signal Chain Order**:
AI Audio Upscaling (Neural) → 10-Band EQ → Bass Shelf → Bass Enhancement → Treble Shelf → Spatial (with HRTF) → Reverb → Limiter → Output

**Key DSP Components**:
- **10-Band Parametric EQ**: With zero-sum normalization and 10 presets.
- **Bass/Treble Boost Filters**: Shelf filters for frequency emphasis.
- **Multi-Tap Delay Reverb**: With 4 delay lines.
- **Intelligent Limiter**: Brickwall limiting for distortion prevention.
- **Spatial Enhancement**: Psychoacoustic stereo widening with HRTF pinna filters, safety caps, and 6 adjustable levels.
- **Immersive Modes**: 6 distinct modes (e.g., Music, 360 Reality, Gaming) each with predefined EQ, boost, reverb, and spatial parameters.

**Smart Enhancements (v29.0)**:
- **HRTF Binaural Virtualization**: Integrated into Spatial Enhancement slider (levels 2-5). Peaking filters at 2.7kHz (Q=2.0, +0-5dB) and 8kHz (Q=1.5, +0-3dB) for pinna simulation.
- **Bass Enhancement**: Psychoacoustic harmonic generation via soft-clipping. 75Hz crossover, generates 2nd/3rd/4th harmonics, max +4dB boost. Adds warmth without increasing bass volume.
- **AI Upscaling (Audio Super-Resolution)**: Neural audio enhancement using Kuleshov-style 1D U-Net CNN architecture for full-bandwidth audio super-resolution.
  - **Web**: TensorFlow.js with runtime model building (~4.4M parameters)
  - **Android**: TensorFlow Lite with GPU delegate (CPU fallback), 17.67 MB model file
  - **Architecture**: Encoder-decoder with skip connections and residual learning, processes 8192-sample chunks at 44.1kHz
  - **Intensity Levels**: Low (30% blend), Medium (60% blend), High (100% blend)
  - **Real-time Safety**: 10ms time budget per chunk, automatic bypass on timeout, thread-safe processing with proper resource lifecycle management

**DSP Architecture Details**:
- **Internal Processing**: 32-bit float for precision, 64-bit for filter coefficients.
- **Processing**: True stereo processing for most effects, linked stereo for limiter.
- **Android DSP**: Custom ExoPlayer `AudioProcessor` with biquad filter algorithms + TensorFlow Lite neural processing.
- **Web DSP**: `WebAudioEffectsEngine` leveraging Web Audio API + TensorFlow.js neural processing.

**Unified DSP for Streaming (v29.0)**:
- **Android**: All playback (local files AND streaming) routes through `PlaybackEngineModule` which has `SoftwareDSPAudioProcessor` integrated
- **Streaming DSP**: SoundCloud, Internet Archive, and other HTTP streams are processed through the same DSP chain as local files
- **Architecture**: `PlayerContext.tsx` detects platform and uses `PlaybackEngineModule.loadTrack()` for all Android audio playback
- **SoundCloud OAuth**: Stream URLs include `oauth_token` query parameter for ExoPlayer to handle authentication
- **Web Streaming**: Uses Web Audio API with DSP for CORS-enabled streams (cors.archive.org), Widget API for SoundCloud (no DSP)

### Navigation Structure
A 5-tab system with a persistent MiniPlayer:
- **ListenTab**: Main player, Now Playing, Sound Lab, Queue.
- **LibraryTab**: Music organization, Quick Access Category Grid.
- **RadioTab**: FM/AM native radio, Online streaming radio with Intelligent Radio Discovery.
- **DiscoverTab**: Open Music Discovery - search and play free Creative Commons/Public Domain music.
- **SettingsTab**: General, Sound Lab, Appearance, License, About.

### Native Modules (Android-specific)
Core audio processing is handled by `SoftwareDSPAudioProcessor`. Other modules include `AudioSessionBridgeModule`, `WaveformAnalyzerModule`, `FMRadioModule`, `LicenseVerificationModule`, `MediaStoreScannerModule`, and `MetadataExtractorModule`. No Android hardware audio effects are used for audio processing.

### License Verification (Android)
A two-check system: initial Google Play Billing validation and daily re-validation. It uses `AppContextModule` for orchestration, `RuntimeIntegrity` for signature verification, and `SecureStateManager` for encrypted, device-bound storage with anti-rollback protection. An invalid license gracefully degrades audio effect quality without crashing the app.

**Architecture**:
- `AppContextModule.kt` - Main license orchestration with daily validation
- `RuntimeIntegrity.kt` - Signature verification, device fingerprint, HMAC validation
- `SecureStateManager.kt` - Encrypted device-bound storage with anti-rollback protection

**Security Features**:
- APK signing certificate verification against known SHA-256 fingerprints
- Device-bound state using ANDROID_ID + signing certificate hash
- Anti-rollback version checks prevent downgrade attacks
- AndroidX Security Crypto (AES-256-GCM) for encrypted storage
- HMAC integrity checking on all cached state
- Probabilistic billing re-anchor (near expiry, environment change, or random interval)

**Soft-Fail Strategy**: Invalid license degrades audio effect quality via scaling factors (gqf/gmf) rather than showing errors or crashing.

**Pre-Release Setup**: Update `_vc` array in `RuntimeIntegrity.kt` with actual signing certificate SHA-256 fingerprints (64-char hex, uppercase, no colons). Get fingerprint with: `keytool -list -v -keystore your.keystore -alias your_alias | grep SHA256`

### Feature Specifications
- **Sound Lab**: 10 EQ presets, custom 10-band EQ editor, 6 immersive modes, bass/treble control, Smart Enhancements (Bass Enhancement, AI Upscaling).
- **Smart Enhancements** (v28.0): Bass Enhancement slider (0-100%), AI Upscaling toggle with intensity slider. Licensed feature.
- **Theming**: 55 themes across 6 categories.
- **Radio**: Native FM/AM and online streaming radio with Intelligent Radio Discovery.
- **Intelligent Radio Discovery**: Automatic station scanning via Radio Browser API with 30-day cache refresh cycle, up to 1000 stations per country, quality filtering (lastcheckok=1, sorted by votes+clickcount), curated station fallback, and manual re-scan button that updates cache immediately.
- **Playback**: Background playback, notification controls, queue, shuffle/repeat, playback speed, sleep timer, favorites.
- **Library Management**: Music folder selection, paginated loading, "Hide Song" feature, playlist CRUD.
- **Open Music Discovery**: Tabbed Discover screen with separate access to Internet Archive (public domain) and SoundCloud (user login for full tracks).

### Open Music Discovery Architecture (v29.0)
The Discover tab features a tabbed interface for streaming music from multiple sources:

**Tabbed Structure**:
- **Archive Tab**: Internet Archive public domain/CC content (no login required)
  - Shows all qualities by default (no filter tabs)
  - First-time consent modal for legal acknowledgment
  - Up to 25 results per search
  - DSP/AI upscaling fully supported on web (uses cors.archive.org for CORS)
- **SoundCloud Tab**: Full track streaming with user authentication
  - OAuth 2.1 Authorization Code flow with PKCE for secure login
  - Users sign in with their own SoundCloud account
  - Full track playback (not just 30-second previews)
  - DSP/neural audio processing on Android only (web uses Widget API)
  - Up to 15 results per search

**Screen Files**:
- `client/screens/DiscoverScreen.tsx` - Tabbed container with Archive/SoundCloud tabs
- `client/screens/ArchiveTabScreen.tsx` - Internet Archive search and playback
- `client/screens/SoundCloudTabScreen.tsx` - SoundCloud login UI and authenticated search

**Client Services**: 
- `client/services/ArchiveOrgService.ts` - Searches Internet Archive for MP3s
- `client/services/SoundCloudService.ts` - OAuth 2.1 user auth + client credentials fallback
- `client/services/SoundCloudWidgetPlayer.ts` - Web Widget API player for CORS-free playback

**Web Playback (Widget API)**:
- Uses official SoundCloud Widget API via hidden iframe to bypass CORS restrictions
- Widget runs in SoundCloud's domain, eliminating cross-origin stream URL issues
- PlayerContext detects SoundCloud tracks (`source: 'soundcloud'` or `id.startsWith('sc_')`)
- Supports play/pause/seek/progress tracking through widget postMessage API
- Web platform skips stream URL resolution - uses `widget:{trackId}` placeholder

**SoundCloud Authentication**:
- **User Auth**: OAuth 2.1 Authorization Code + PKCE for full track access
- **Android/iOS Login**: Uses `expo-web-browser.openAuthSessionAsync()` for proper deep link handling
- **Web Login**: Uses popup window with localStorage callback mechanism
- **Token Management**: 6-hour expiry with automatic refresh token renewal
- **Storage**: Tokens stored securely in AsyncStorage
- **Redirect URIs**: `newaudio360://auth/soundcloud` (native), `/soundcloud-callback.html` (web)
- **Fallback**: WebView modal as backup if expo-web-browser fails

**User Library Access**:
- **Liked Tracks**: `/me/likes/tracks` endpoint for user's favorited songs
- **Playlists**: `/me/playlists` endpoint with `/playlists/{id}` for track details
- **Sub-Tabs**: Search / Likes / Playlists tabs within SoundCloud section

**UI Components**:
- `OAuthWebViewModal.tsx` - In-app OAuth authentication (WebView on native, iframe on web)
- `SoundCloudPlaylistScreen.tsx` - Playlist detail screen with track list and Play All

**Favorites**: Online songs can be added to favorites with encrypted URL storage
**URL Encryption**: Simple XOR cipher with app-specific key to obfuscate stored URLs
**Fresh Stream URLs**: Favorites regenerate stream URLs at playback time using current auth token
**Streaming Indicator**: "Web" badge on Now Playing screen indicates internet streaming songs

**Required Secrets (SoundCloud)**:
- `SOUNDCLOUD_CLIENT_ID` - OAuth client ID
- `SOUNDCLOUD_CLIENT_SECRET` - OAuth client secret

**EAS Build Setup (Required for Android/iOS)**:
For native builds to access SoundCloud credentials, you must add EAS secrets:
```bash
eas secret:create --scope project --name SOUNDCLOUD_CLIENT_ID --value <your_client_id>
eas secret:create --scope project --name SOUNDCLOUD_CLIENT_SECRET --value <your_client_secret>
```
These are referenced in `eas.json` via `@SOUNDCLOUD_CLIENT_ID` and `@SOUNDCLOUD_CLIENT_SECRET`.

**Important Limitations**:
- Not all SoundCloud tracks allow off-platform streaming (some have `access: blocked`)
- SoundCloud is migrating to AAC HLS format (`hls_aac_160_url`) by Dec 31, 2025

**Security Note**: For production web builds, consider implementing a backend proxy for SoundCloud token exchange to avoid exposing client_secret in browser code. Native mobile builds are acceptable.

## External Dependencies

### Core
- `react-native`, `expo` (SDK 53.0.0)
- `react-native-track-player`
- `expo-av`
- `expo-media-library`

### Audio Processing
- `react-native-audio-api`
- `@tensorflow/tfjs` - Neural audio processing (Web/PWA)
- `@tensorflow/tfjs-node` - Neural audio processing (Node.js)

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