# Release Notes

## New Audio 360

**Tagline:** "The top-grade intelligent music experience built for you"

---

## Google Play Store Release Note (Under 500 Characters)

```
New Audio 360 v1.0 - Premium Music Player

Studio-grade audio experience:
- Pure software DSP with 7-band parametric EQ
- Bass & Treble controls: ±12 dB range
- Intelligent limiter prevents distortion
- 8 EQ presets + 6 immersive audio modes
- 55 stunning themes
- Online Radio: Hundreds of verified stations

One-time purchase. No ads. No subscriptions. Lifetime access.
```

---

## Version 1.0 (January 18, 2026)

**Initial Release - Version Code 1**

### Core Audio Engine

#### Pure Software DSP (100% Software-Based)
- **Platform-Independent Processing**: Identical biquad filter algorithms on Web and Android
- **Web Platform**: Uses react-native-audio-api (Web Audio API with BiquadFilterNode)
- **Android Platform**: Custom ExoPlayer AudioProcessor with biquad filter chain
- **No Hardware Dependencies**: No android.media.audiofx.* hardware effects used
- **Consistent Experience**: Same DSP algorithms deliver identical sound on all devices
- **Real-Time Processing**: All effects apply instantly with no perceptible latency

#### Audio Signal Chain
```
Source → Gain → 7-Band EQ → Bass Shelf Filter → Treble Shelf Filter → Stereo Widener → Limiter → Output
```

#### 7-Band Parametric Equalizer
- **Frequency Bands**: Sub (32Hz), Bass (64Hz), Low-Mid (125Hz), Mid (500Hz), High-Mid (2kHz), Treble (8kHz), Brilliance (16kHz)
- **8 Presets**: Flat, Rock, Pop, Jazz, Classical, Hip-Hop, Electronic, Acoustic
- **Zero-Sum Normalization**: Presets automatically balanced to prevent volume jumps
- **Custom EQ Editor**: 5-band editor with save/load (up to 5 custom presets)

#### Bass & Treble Controls
- **Bass Boost**: Lowshelf filter at 150Hz, affects all frequencies below
- **Treble Boost**: Highshelf filter at 6kHz, affects all frequencies above
- **Range**: ±12 dB (slider range -5 to +5, 2.4 dB per unit)
- **Independent Operation**: Separate from EQ presets, effects stack additively

#### Intelligent Limiter
- **Brickwall Limiting**: DynamicsCompressorNode with 20:1 ratio
- **Threshold**: -1 dB (catches peaks just before clipping)
- **Fast Attack**: 1ms to catch transients
- **Smooth Release**: 100ms for natural recovery
- **Distortion Prevention**: Preserves loudness while eliminating clipping

#### Immersive Audio Modes
6 preset modes optimized for different content, each with independent settings:

| Mode | Description | Bass | Treble | Spatial |
|------|-------------|------|--------|---------|
| **Music** | Balanced enhancement for general listening | +2 | +1 | 30% |
| **360 Reality** | Spatial audio simulation | +1 | +2 | 60% |
| **Gaming** | Enhanced directional cues and bass impact | +3 | +2 | 50% |
| **Podcast** | Voice clarity optimization | -1 | 0 | 0% |
| **Movie** | Cinematic surround simulation | +3 | +2 | 40% |
| **Off** | Pure, unprocessed audio | 0 | 0 | 0% |

Each immersive mode has its own dedicated EQ curve, bass boost, treble boost, and virtualizer settings applied directly without zero-sum normalization. The intelligent limiter remains active to prevent distortion.

### Music Playback

- **Background Playback**: Music continues when app is minimized or screen is off
- **Notification Controls**: Full playback controls in notification shade
- **Lock Screen Art**: Album artwork displayed on lock screen
- **Queue Management**: View, reorder, and manage upcoming tracks
- **Shuffle & Repeat**: Off, Repeat One, Repeat All modes
- **Playback Speed**: 0.5x to 2.0x speed control
- **Sleep Timer**: Auto-stop playback after set duration
- **Gapless Playback**: Seamless transitions between tracks

### Music Library

- **Device Integration**: Automatic scanning of device music
- **Folder Selection**: Choose specific folders to include
- **Paginated Loading**: Efficient handling of large libraries (10,000+ songs)
- **Hide Songs**: Remove unwanted tracks from view without deleting
- **Smart Categories**: Recently Played, Most Played, Favorites
- **Quick Access Grid**: Fast navigation to common views

### Playlist Management

- **Full CRUD**: Create, edit, rename, delete playlists
- **Drag Reorder**: Rearrange tracks within playlists
- **Add/Remove Songs**: Easy song management
- **Playlist Artwork**: Auto-generated from first track

### Radio

#### FM/AM Radio (Android, Hardware Required)
- Native radio tuning on supported devices
- Station scanning and manual tuning
- Favorite stations
- Sound Lab effects on radio audio

#### Online Radio
- **Radio Browser API Integration**: Hundreds of verified stations
- **Quality Filters**: Only working streams (lastcheckok=1)
- **Audio Codecs**: MP3, OGG, AAC only
- **Bitrate**: Minimum 64kbps for clear audio
- **Location Discovery**: Find local stations by country
- **Genre Filtering**: Browse by music category
- **Favorites**: Save preferred stations

### Themes & Appearance

**55 Themes** across 6 categories:

| Category | Count | Examples |
|----------|-------|----------|
| System | 5 | Fluent Light, Dark, Night AMOLED, Warm Neutral, Cool Blue |
| Winamp | 10 | Classic, Modern, Bento, Foxpro |
| Retro | 10 | VHS, Cassette, Vaporwave, Cyberpunk |
| Nature | 10 | Forest, Ocean, Sunset, Aurora |
| Professional | 10 | Midnight, Corporate, Slate, Graphite |
| Special | 10 | Neon, Holographic, Candy, Galaxy |

- **Theme Effects**: Glass, beveled, aero, and unique visual styles
- **Microsoft Fluent 2**: Modern design system with 4px grid
- **Consistent Styling**: All themes follow design language standards

### Accessibility

- Full screen reader support
- Touch target compliance (minimum 44x44dp)
- High contrast theme options
- System font scaling support
- Clear visual hierarchy

### Privacy & Security

- **Offline-First**: All data stored locally on device
- **No Analytics**: Zero tracking or data collection
- **No Cloud**: No server communication after license check
- **Encrypted Storage**: Sensitive data protected with SecureStore
- **License Caching**: Verified purchases work offline

### Technical Details

| Property | Value |
|----------|-------|
| Version Name | 1.0 |
| Version Code | 1 |
| Platform | React Native + Expo SDK 53.0.0 |
| Min Android | 8.0 (API 26) |
| Target Android | 14 (API 34) |
| Architectures | ARM64, ARM32, x86_64 |
| Package Name | com.theteam360.newaudio360 |

### Known Limitations

- FM Radio requires compatible device hardware (not all devices support this)
- Web platform uses fallback audio engine (some native features unavailable)
- Waveform visualization may not render on devices with limited GPU

### Pricing

One-time purchase for lifetime access. No subscriptions. No ads. No expiration.

---

## Upcoming Features (Roadmap)

### Version 1.1 (Planned)
- Crossfade playback between tracks
- Car mode UI for driving
- Home screen widget support
- Additional equalizer presets

### Version 1.2 (Planned)
- Lyrics display (online fetch)
- Enhanced sleep mode options
- Additional theme packs
- Performance optimizations

---

*For support or feedback, contact support@theteam360.com*
