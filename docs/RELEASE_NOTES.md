# Release Notes

## New Audio 360

**Tagline:** "The top-grade intelligent music experience built for you"

---

## Google Play Store Release Note (Under 500 Characters)

```
New Audio 360 v1.0 - Premium Music Player

Studio-grade audio experience:
• Pure software DSP with 7-band parametric EQ
• Bass & Treble controls: ±12 dB range
• Intelligent limiter prevents distortion
• 8 EQ presets + 6 immersive audio modes
• 55 stunning themes
• Fast MediaStore scanning
• Online Radio: Hundreds of verified stations

One-time purchase. No ads. No subscriptions. Lifetime access.
```

---

## Version 1.0.0 (January 19, 2026)

**Initial Release**

| Property | Value |
|----------|-------|
| Version Name | 1.0.0 |
| Version Code | 1 |
| Release Date | January 19, 2026 |
| Package | com.theteam360.newaudio360 |

---

### Audio Engine

#### Pure Software DSP (100% Software-Based)

New Audio 360 uses a completely software-based audio processing pipeline with no dependency on Android hardware audio effects.

**Architecture:**
- **Web Platform**: react-native-audio-api with Web Audio API BiquadFilterNode
- **Android Platform**: Custom ExoPlayer AudioProcessor with biquad filter chain
- **Algorithm Source**: Web Audio API cookbook formulas for professional-grade filtering

**Signal Chain:**
```
Source → Gain → 7-Band EQ → Bass Shelf → Treble Shelf → Stereo Widener → Limiter → Output
```

#### 7-Band Parametric Equalizer

| Band | Frequency | Description |
|------|-----------|-------------|
| Sub | 32 Hz | Sub-bass rumble |
| Bass | 64 Hz | Bass punch |
| Low-Mid | 125 Hz | Warmth |
| Mid | 500 Hz | Body/presence |
| High-Mid | 2 kHz | Clarity |
| Treble | 8 kHz | Brilliance |
| Brilliance | 16 kHz | Air/sparkle |

**Presets (8):** Flat, Rock, Pop, Jazz, Classical, Hip-Hop, Electronic, Acoustic

All presets use zero-sum normalization to prevent volume jumps when switching.

#### Bass & Treble Controls

| Control | Filter Type | Frequency | Range |
|---------|-------------|-----------|-------|
| Bass | Lowshelf | 150 Hz | ±12 dB |
| Treble | Highshelf | 6 kHz | ±12 dB |

Slider range: -5 to +5 (2.4 dB per unit)

#### Intelligent Limiter

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Threshold | -1 dB | Catches peaks before clipping |
| Ratio | 20:1 | Hard limiting |
| Attack | 1 ms | Fast transient catching |
| Release | 100 ms | Smooth recovery |

Prevents distortion at any boost level while preserving dynamic range.

#### Immersive Audio Modes

| Mode | Bass | Treble | Spatial | Use Case |
|------|------|--------|---------|----------|
| Music | +4.8 dB | +3.6 dB | 35% | General listening |
| 360 Reality | +1.2 dB | +1.2 dB | 75% | Spatial audio simulation |
| Gaming | -2.4 dB | +6 dB | 50% | Footstep clarity |
| Podcast | -3.6 dB | -1.2 dB | 0% | Voice clarity |
| Movie | +8.4 dB | +4.8 dB | 45% | Cinematic impact |
| Sports | +2.4 dB | -1.2 dB | 40% | Stadium broadcast |
| Off | 0 | 0 | 0% | Unprocessed audio |

---

### Music Library

#### MediaStore Scanner

Fast, efficient library scanning using Android's native MediaStore API:

- Single ContentResolver query for all audio files
- Metadata retrieved: title, artist, album, duration, year, track number
- Album art loaded via system thumbnail cache
- Proper scoped storage handling with content:// URIs
- Much faster than per-file ID3 parsing

#### Library Features

- **Folder Selection**: Choose specific folders to include
- **Paginated Loading**: Handles 10,000+ songs efficiently
- **Hide Songs**: Remove unwanted tracks without deleting
- **Smart Categories**: Recently Played, Most Played, Favorites
- **Quick Access Grid**: Fast navigation shortcuts

---

### Music Playback

| Feature | Description |
|---------|-------------|
| Background Playback | Continues when minimized or screen off |
| Notification Controls | Full controls in notification shade |
| Lock Screen Art | Album artwork on lock screen |
| Queue Management | View, reorder, clear upcoming tracks |
| Shuffle | Random track order |
| Repeat | Off, One, All modes |
| Playback Speed | 0.5x to 2.0x |
| Sleep Timer | Auto-stop after duration |

---

### Playlist Management

- Create, rename, delete playlists
- Add/remove songs
- Drag-to-reorder tracks
- Auto-generated artwork from first track

---

### Radio

#### FM/AM Radio (Hardware Required)

- Native radio tuning on supported devices
- Manual tuning and station scanning
- Favorite stations
- Sound Lab effects on radio audio

#### Online Radio

- **Source**: Radio Browser API
- **Filters**: Working streams only (lastcheckok=1)
- **Codecs**: MP3, OGG, AAC
- **Bitrate**: Minimum 64 kbps
- **Discovery**: Location-based and genre filtering
- **Limit**: 50 stations per country, sorted by popularity

---

### Themes

**55 Themes** across 6 categories:

| Category | Count | Highlights |
|----------|-------|------------|
| System | 5 | Fluent Light, Dark, Night AMOLED |
| Winamp | 10 | Classic, Modern, Bento |
| Retro | 10 | VHS, Cassette, Vaporwave, Cyberpunk |
| Nature | 10 | Forest, Ocean, Sunset, Aurora |
| Professional | 10 | Midnight, Corporate, Slate |
| Special | 10 | Neon, Holographic, Candy, Galaxy |

Design system: Microsoft Fluent 2 with 4px grid and semantic tokens.

---

### Privacy & Security

| Feature | Implementation |
|---------|----------------|
| Data Storage | Local only (AsyncStorage/SecureStore) |
| Analytics | None |
| Tracking | None |
| Cloud Sync | None |
| Network | License verification + online radio only |

---

### License Verification

- Checks installer package name via PackageManager
- Valid installer: `com.android.vending` (Google Play Store)
- Cached locally for offline use
- Development builds auto-licensed for testing

---

### Technical Specifications

| Property | Value |
|----------|-------|
| Framework | React Native + Expo SDK 53.0.0 |
| React Native | 0.79.2 |
| Architecture | Legacy (for react-native-track-player) |
| Min Android | 8.0 (API 26) |
| Target Android | 14 (API 34) |
| Architectures | arm64-v8a, armeabi-v7a, x86_64 |

---

### Known Limitations

1. **FM Radio**: Requires compatible device hardware
2. **Web Platform**: Uses fallback audio engine with limited features
3. **Waveform**: May not render on devices with limited GPU

---

### Pricing

One-time purchase for lifetime access.

| Region | Price |
|--------|-------|
| India | ₹311 INR |
| International | $13.11 USD |

No subscriptions. No ads. No in-app purchases.

---

## Roadmap

### Version 1.1 (Planned)

- Crossfade between tracks
- Car mode UI
- Home screen widget
- Additional EQ presets

### Version 1.2 (Planned)

- Lyrics display
- Enhanced sleep timer options
- Additional theme packs
- Performance optimizations

---

## Support

**Email:** support@theteam360.com  
**Website:** https://theteam360.com/newaudio360

---

*Last Updated: January 19, 2026*
