# Release Notes

## New Audio 360

**Tagline:** "The top-grade intelligent music experience built for you"

---

## What's New in v32.0

**Architecture & Performance Update** - C++/NDK DSP, 16KB page support, and playback fixes:

- C++/NDK DSP foundation with ARM NEON SIMD for PCM conversion, gain & soft clip operations
- 32-bit float internal processing for studio-grade dynamic range
- 16KB memory page size support for Android 15+ compatibility
- Fixed seek slider lag with isSeeking state guard
- Refined DSP buffer clearing strategy - single clear on track transitions
- ByteBufferPool with 2MB cap for Poweramp-level memory efficiency
- CPU-only neural processing optimised for <10ms real-time latency

---

## v31.0

**Theme & UI Polish Update** - Full theme adaptation and tap feedback:

- Complete theme adaptation across all 70+ files with dynamic Fluent 2 color tokens
- Tap/click feedback (opacity 0.9) on all interactive elements
- All 55 themes now fully adaptive across entire UI

---

## v30.0

**Audio Processing & Stability Update** - Enhanced DSP and improved reliability:

- Audio buffer clearing on all track changes prevents artifacts
- Improved animation cleanup for smoother UI
- Better artwork loading with robust URI handling
- Cleaner transitions between songs
- Reduced processing glitches during seek

---

## Google Play Store Release Note (Under 500 Characters)

```
v32.0 - Architecture & Performance Update

C++/NDK DSP FOUNDATION
ARM NEON SIMD for PCM conversion, gain & soft clip. 32-bit float internal processing.

16KB PAGE SIZE SUPPORT
Android 15+ compatible with proper memory page alignment.

PLAYBACK FIXES
Seek slider lag eliminated. DSP buffer clearing refined for artifact-free transitions.

MEMORY OPTIMISATION
ByteBufferPool, adaptive waveform capture, CPU-only neural processing.

One-time purchase, lifetime access.
```

---

## Version 32.0 (February 2026)

**Architecture & Performance Update**

### 16KB Page Size Support
- Added `-Wl,-z,max-page-size=16384` linker flag to CMakeLists.txt
- Native DSP `.so` binaries now aligned for Android 15+ devices
- Fully backwards compatible with 4KB page size devices

### Seek Lag Fix
- Added `isSeeking` state guard to PlayerContext with 500ms timeout
- ProgressBar accepts `isSeeking` prop to skip position sync during active seeks
- Eliminates slider "jump back then forward" behaviour during seek operations

### DSP Buffer Clearing Strategy
- Single buffer clear on track transitions (no duplicates)
- Proper buffer clearing on explicit DSP value changes
- EQ excluded from clearing (biquad filters transition smoothly)

---

## Version 31.0 (February 2026)

**Theme & UI Polish Update**

### Full Theme Adaptation
- Created `getThemedFluentColors()` utility to map theme colors to Fluent 2 design tokens
- Added `useThemedColors()` hook for dynamic theme adaptation
- Updated all 70+ files to use themed colors
- All 55 themes now fully adaptive across entire UI

### Tap/Click Feedback
- Added opacity 0.9 press feedback to 40+ Pressable components
- FluentCard, FluentListItem, all station cards, track cards, playlist cards updated
- All interactive buttons across all screens now show visual feedback

---

## Version 30.0 (February 2026)

**Audio Processing & Stability Update**

### Event-Driven Playback Architecture
- Native player now pushes updates to the app (like web audio's `ontimeupdate` and `onended`)
- Eliminated all polling for Android playback - events fire naturally
- Progress updates every second with clean integer values
- Single authoritative track-end source via DSP end-of-stream callback

### Repeat Mode Fixes
- Fixed repeat one not playing after track ends
- Proper seek-then-play sequencing eliminates race conditions
- Native Android playback correctly prioritised over TrackPlayer fallback
- Guard logic prevents duplicate event handling

### Progress Bar Improvements
- Slider now reaches full track duration before repeat/advance
- Removed premature progress update stopping
- Accurate position display throughout playback

### Waveform Synchronisation
- Waveform animation syncs with actual native playback state
- Added `onIsPlayingChanged` event listener for accurate state
- Animation only runs when audio is confirmed playing

### Performance Improvements
- Reduced CPU usage by eliminating polling loops
- Lower battery consumption during playback
- Faster response to playback controls

---

## Version 28.1.1 (January 2026)

**Design System Refinement Phase 2**

- 23 design tasks completed
- New design tokens: FluentSpacing.xxxxxxxl, FluentRadius.xxLarge, FluentBlurIntensity
- Typography cleanup: Replaced inline fontWeight with Strong variants
- Component extractions: SoundLabScreen 42% reduction, SoundCloudTabScreen 38%
- Empty state icons increased to 64px

---

## Version 28.1 (January 2026)

**Design Consistency & SoundCloud Features**

- Unified card styling across Radio, Discover, and Settings screens
- SoundCloud search by type (Tracks/Playlists/Albums)
- SoundCloud likes sync to user's account
- Play All/Shuffle for SoundCloud Likes

---

## Version 28.0 (January 2026)

**Open Music Discovery**

- SoundCloud OAuth 2.1 integration with PKCE
- Full SoundCloud track streaming with DSP effects
- Internet Archive public domain/CC music streaming
- Tabbed Discover screen with Archive and SoundCloud tabs
- HRTF Binaural Virtualisation in Spatial Enhancement
- Bass Enhancement with harmonic generation
- Neural AI Audio Upscaling (Kuleshov-style 1D U-Net CNN)

---

## Version 1.0.0 (January 19, 2026)

**Initial Release**

---

### Sound Lab

#### Equalizer
- 10-band parametric equalizer: 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz
- 10 presets: Flat, Rock, Pop, Jazz, Classical, Electronic, Hip-Hop, Acoustic, Bass+, Clarity
- Zero-sum normalisation prevents volume jumps when switching
- Custom 10-band EQ editor for personal tuning

#### Bass & Treble
- Bass control: ±12 dB range
- Treble control: ±12 dB range
- Independent sliders for precise adjustment

#### Spatial Enhancement & Reverb
- Spatial Enhancement: 6 intensity levels (0=Off to 5=Maximum)
- Psychoacoustic processing with ITD (50-700µs), side boost (1.0-2.0x)
- Multi-tap delay reverb with 4 delay lines (23ms, 41ms, 67ms, 89ms)
- Equal-power crossfade wet/dry mixing

#### Distortion Prevention
- Brickwall limiter: -1dB threshold, 20:1 ratio
- No clipping or distortion even with maximum settings

#### Immersive Modes
- **Music** - Spatial level 2 (310µs ITD, 1.4x side boost)
- **360 Reality** - Maximum spatial level 5 (700µs ITD, 2.0x side boost)
- **Gaming** - Spatial level 3 (440µs ITD, 1.6x side boost)
- **Podcast** - Spatial off for speech clarity
- **Movie** - Spatial level 4 (570µs ITD, 1.8x side boost)
- **Sports** - Spatial level 2 (310µs ITD, 1.4x side boost)
- **Off** - Pure, unprocessed audio

---

### Music Library

- Fast scanning of device music
- Folder selection to choose specific locations
- Handles large libraries (10,000+ songs)
- Hide songs feature
- Smart categories: Recently Played, Most Played, Favourites
- Quick access navigation

---

### Playback

- Background playback
- Notification controls
- Lock screen album art
- Queue management with drag-to-reorder
- Shuffle and repeat modes (Off, One, All)
- Playback speed: 0.5x to 2.0x
- Sleep timer

---

### Playlists

- Create, rename, delete playlists
- Add/remove songs
- Drag-to-reorder tracks
- Auto-generated artwork

---

### Radio

#### FM/AM Radio
- Native radio tuning (hardware required)
- Station scanning
- Favourites
- Sound Lab effects on radio

#### Online Radio
- 40,000+ verified stations worldwide
- Quality streams only
- Location-based discovery
- Genre filtering
- Favourites

---

### Themes

**55 Themes** across 6 categories:

| Category | Count | Examples |
|----------|-------|----------|
| System | 5 | Light, Dark, AMOLED, Warm, Cool |
| Winamp | 10 | Classic, Modern, Bento |
| Retro | 10 | VHS, Cassette, Vaporwave |
| Nature | 10 | Forest, Ocean, Sunset |
| Professional | 10 | Midnight, Corporate, Slate |
| Special | 10 | Neon, Holographic, Galaxy |

---

### Privacy

- All data stored locally on device
- No analytics or tracking
- No cloud sync
- Works offline after purchase

---

### Platform Support

| Platform | Distribution | Status |
|----------|--------------|--------|
| Android | Google Play Store | Available |
| iOS | Apple App Store | Planned |
| Windows | Microsoft Store (PWA) | Planned |
| Web | Progressive Web App | Available |

---

### Requirements

- Android 8.0 or higher
- iOS 15.0 or higher (planned)
- Windows 10/11 (PWA)
- Works on all devices

---

## Roadmap

### Version 29.1 (Planned)
- Crossfade between tracks
- Gapless playback improvements
- Enhanced notification controls

### Version 32.0 (Planned)
- Car mode UI
- Home screen widget
- Additional themes

### Future
- Lyrics display
- Apple CarPlay / Android Auto support
- Chromecast integration

---

## Support

**Email:** support@theteam360.com  
**Website:** https://theteam360.com/newaudio360

---

*Last Updated: February 1, 2026*
