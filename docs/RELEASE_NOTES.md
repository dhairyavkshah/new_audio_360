# Release Notes

## New Audio 360

**Tagline:** "The top-grade intelligent music experience built for you"

---

## Google Play Store Release Note (Under 500 Characters)

```
New Audio 360 v26.0 - Premium Music Player

What's New:
• Cross-platform DSP: EQ, Bass, Treble, Virtualizer work identically on all devices
• Flat EQ always active by default for pure sound
• Floating MiniPlayer: drag anywhere on screen
• Real-time library sync: auto-updates when songs change
• 10 zero-sum EQ presets for maximum headroom
• 6 immersive modes with spatial audio

One-time purchase. No ads. Lifetime access.
```

---

## Version 26.0 (January 20, 2026)

### Major DSP Architecture Refactor
- **Independent Platform DSP**: Web and Android now have fully independent DSP configurations
- **Web DSP**: Uses `react-native-audio-api` (Web Audio API) via `WebAudioEffectsEngine`
- **Android DSP**: Uses `SoftwareDSPAudioProcessor` with ExoPlayer integration
- **No Cross-Platform Syncing**: Each platform operates autonomously with identical preset values
- **Flat EQ Always Active**: Flat preset is always active by default and cannot be turned off

### EQ Presets (10-Band: 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz)
All presets are zero-sum for maximum headroom. Values are in gain units (multiply by 2.4 for dB).

| Preset | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz | Description |
|--------|------|-------|-------|-------|------|------|------|-------|-------|-------|-------------|
| Flat | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | Reference |
| Rock | +0.4 | +0.4 | -0.3 | -1.1 | -1.1 | -0.1 | +0.9 | +1.6 | +0.7 | -0.7 | Balanced Punch |
| Pop | +0.3 | +0.3 | -0.4 | -0.5 | -0.4 | +0.7 | +0.8 | +0.7 | -0.4 | -0.7 | Clean Vocals |
| Jazz | -0.3 | -0.3 | -1.1 | +1.0 | +1.0 | +0.3 | -0.7 | -0.3 | -0.3 | -0.9 | Warm & Natural |
| Classical | -0.8 | -0.8 | -0.4 | -0.4 | -0.2 | +0.2 | +0.5 | +1.0 | +0.9 | +0.4 | Wide & Open |
| Electronic | +1.3 | +1.3 | +0.5 | -1.4 | -1.4 | -0.5 | +0.5 | +1.3 | +0.5 | -1.2 | Controlled Energy |
| Hip-Hop | +2.4 | +2.4 | +0.7 | -1.2 | -0.6 | 0.0 | +0.4 | -0.6 | -1.4 | -2.0 | Deep Bass, Clear Mids |
| Acoustic | -0.6 | -0.6 | -1.2 | +0.7 | +1.5 | +1.5 | +0.7 | -0.3 | -0.3 | -1.3 | Natural & Intimate |
| Bass+ | +3.5 | +2.5 | +1.5 | -0.6 | -1.2 | -1.2 | -1.2 | -1.2 | -0.5 | -1.4 | Party Mode |
| Clarity | -1.9 | -1.9 | -0.9 | -0.8 | +0.3 | +0.6 | +1.3 | +1.3 | +1.9 | +0.1 | Podcasts & Movies |

### Immersive Modes (Full Settings)
Each mode includes EQ curve, spatial width, reverb, and bass/treble boost. All EQ values are zero-sum.

| Mode | 60Hz | 170Hz | 310Hz | 600Hz | 1kHz | 3kHz | 6kHz | 12kHz | 14kHz | 16kHz | Spatial | Reverb | Bass | Treble |
|------|------|-------|-------|-------|------|------|------|-------|-------|-------|---------|--------|------|--------|
| Music | +0.3 | +0.3 | -0.4 | -1.0 | -1.0 | 0.0 | +1.0 | +1.5 | +0.4 | -1.1 | 25% | 8% | +1.2dB | +1.3dB |
| 360 Reality | 0.0 | 0.0 | -0.6 | -0.6 | -0.6 | 0.0 | +1.0 | +1.2 | +0.3 | -0.7 | 55% | 18% | +0.8dB | +1.5dB |
| Gaming | +0.8 | +0.8 | +0.4 | -1.1 | -1.1 | 0.0 | +1.0 | +1.7 | +0.8 | -1.9 | 57% | 8% | +1.2dB | +2.1dB |
| Podcast | -1.9 | -1.9 | -0.9 | -0.7 | +0.4 | +1.0 | +1.0 | +1.4 | +1.8 | -0.2 | 0% | 0% | -1.0dB | +2.3dB |
| Movie | -0.8 | -0.8 | -0.4 | +0.7 | +1.1 | +1.0 | +1.0 | -0.3 | -0.5 | -1.7 | 45% | 12% | +1.8dB | +1.5dB |
| Sports | +1.2 | +1.2 | +0.5 | -0.7 | -0.7 | 0.0 | +1.0 | +1.2 | -0.9 | -2.5 | 47% | 10% | +2.2dB | +0.8dB |

### DSP Signal Chain Configuration

| Component | Web | Android |
|-----------|-----|---------|
| 10-Band EQ Frequencies | 60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000 Hz | Same |
| Bass Boost Filter | Low-shelf @ 150Hz, +/-12dB | Same |
| Treble Boost Filter | High-shelf @ 6kHz, +/-12dB | Same |
| LFE Crossover | N/A | 80Hz default, 20-200Hz adjustable |
| LFE Headroom | N/A | +6dB (up to 18dB for bass) |
| Limiter | Web Audio DynamicsCompressor | -1dB threshold, 20:1 ratio, 1ms attack, 100ms release |
| Stereo Width | -100% (mono) to +200% (wide) | -100% (mono) to +100% (wide) |
| Unit Scaling | DB_PER_UNIT = 2.4 | Same |

### User Interface
- **Floating/Draggable MiniPlayer**: MiniPlayer can now be dragged and repositioned anywhere on screen using pan gestures with smooth spring animations
- **Audio Enhancement Tip**: Updated notification message displays in exactly 3 lines for better readability

### Library
- **Real-time Library Sync**: Player automatically updates when songs are added or removed from local storage without requiring a reload

---

## Version 1.0.0 (January 19, 2026)

**Initial Release**

---

### Sound Lab

#### Equalizer
- 7-band equalizer: Sub, Bass, Low-Mid, Mid, High-Mid, Treble, Brilliance
- 8 presets: Flat, Rock, Pop, Jazz, Classical, Hip-Hop, Electronic, Acoustic
- Custom preset editor with save/load (up to 5 custom presets)
- Balanced presets prevent volume jumps when switching

#### Bass & Treble
- Bass control: ±12 dB range
- Treble control: ±12 dB range
- Independent sliders for precise adjustment

#### Distortion Prevention
- Intelligent limiting keeps audio clean at any boost level
- No clipping or distortion even with maximum settings

#### Immersive Modes
- **Music** - Enhanced listening experience
- **360 Reality** - Spatial audio effect
- **Gaming** - Clear directional audio
- **Podcast** - Voice clarity optimization
- **Movie** - Cinematic sound
- **Sports** - Stadium broadcast feel
- **Off** - Pure, unprocessed audio

---

### Music Library

- Fast scanning of device music
- Folder selection to choose specific locations
- Handles large libraries (10,000+ songs)
- Hide songs feature
- Smart categories: Recently Played, Most Played, Favorites
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
- Favorites
- Sound Lab effects on radio

#### Online Radio
- Hundreds of verified stations
- Quality streams only
- Location-based discovery
- Genre filtering
- Favorites

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

### Requirements

- Android 8.0 or higher
- Works on all Android devices

---

## Roadmap

### Version 1.1 (Planned)
- Crossfade between tracks
- Car mode UI
- Home screen widget

### Version 1.2 (Planned)
- Lyrics display
- Enhanced sleep timer
- Additional themes

---

## Support

**Email:** support@theteam360.com  
**Website:** https://theteam360.com/newaudio360

---

*Last Updated: January 20, 2026*
