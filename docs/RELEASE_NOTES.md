# Release Notes

## New Audio 360

---

## Google Play Store Release Note (Under 500 Characters)

```
New Audio 360 v1.0 - Premium Music Player

Your music, your way:
- Sound Lab with 8 EQ presets & slider-based audio effects
- 55 stunning themes to personalize your experience
- Online Radio: Hundreds of verified music streams worldwide
- Background playback with notification controls
- Custom 5-band equalizer with save/load
- FM/AM radio support (hardware required)

One-time purchase. No ads. No subscriptions. Lifetime access.
```

---

## Version 1.0 (January 17, 2026)

**Initial Release - Version Code 1**

### Features

#### Music Playback
- Full-featured music player with background playback support
- Queue management with drag-to-reorder
- Shuffle and repeat modes (Off, One, All)
- Playback speed control (0.5x to 2.0x)
- Sleep timer functionality
- Gapless playback (when supported)
- Android notification controls with album art

#### Music Library
- Device music library integration
- Music folder selection for custom sourcing
- Paginated loading for large libraries
- "Hide Song" feature for unwanted tracks
- Recently Played tracking
- Most Played statistics
- Favorites with quick access

#### Playlist Management
- Create, edit, and delete playlists
- Add/remove songs from playlists
- Reorder playlist tracks
- Quick Access category grid

#### Sound Lab
- **8 Equalizer Presets:** Flat, Rock, Pop, Jazz, Classical, Hip-Hop, Electronic, Acoustic
- **6 Immersive Audio Modes:** Music, 360 Reality, Gaming, Podcast, Movie, Custom
- **Slider-Based Audio Effects Controls:**
  - Bass Control with slider (-3 to +3 range) using native BassBoost module
  - Treble Control with slider (-3 to +3 range) for precise tuning
  - Virtualizer with slider (-3 to +3 range) for spatial audio
  - All effects apply immediately when changed
  - Effects automatically apply when presets are loaded
  - Module availability checks for native audio effects
- All effects stack additively on top of selected EQ preset
- Real-time 64-bar waveform visualization
- Custom 5-band EQ with save/load presets (up to 5 custom presets)

#### Radio
- **FM/AM Radio:** Native Android radio tuning (device hardware required)
- **Online Radio:** Hundreds of internet radio stations via Radio Browser API
  - Only verified working streams (lastcheckok=1)
  - Quality codecs only: MP3, OGG, AAC
  - Bitrate >64kbps for clear audio
  - Max 50 stations per country, sorted by popularity
- Country-based station discovery with location detection
- Genre filtering
- Favorite stations
- Sound Lab effects on radio audio

#### Themes & Appearance
- **55 Unique Themes** across 6 categories:
  - System (5): Fluent Light, Fluent Dark, Night AMOLED, Warm Neutral, Cool Blue
  - Winamp (10): Classic, Modern, Bento, Foxpro, and more
  - Retro (10): VHS, Cassette, Vaporwave, Cyberpunk, and more
  - Nature (10): Forest, Ocean, Sunset, Aurora, and more
  - Professional (10): Midnight, Corporate, Slate, Graphite, and more
  - Special (10): Neon, Holographic, Candy, Galaxy, and more
- Theme-specific visual effects (glass, beveled, aero, etc.)
- Microsoft Fluent 2 design system

#### Accessibility
- Full screen reader support
- Touch target compliance (minimum 44x44dp)
- High contrast theme options
- System font scaling support

### Technical Details

- **Version Name:** 1.0
- **Version Code:** 1
- **Platform:** React Native with Expo SDK 53.0.0
- **Minimum Android Version:** Android 8.0 (API 26)
- **Target Android Version:** Android 14 (API 34)
- **Architecture:** ARM64, ARM32, x86_64
- **Package Name:** com.theteam360.newaudio360

### Known Issues

- FM Radio requires compatible device hardware (not available on all devices)
- Web platform uses fallback audio engine (some features limited)
- Some waveform visualizations may not render on older devices

### Pricing

- **India:** ₹311 INR (one-time purchase)
- **International:** $13.11 USD (one-time purchase)
- Lifetime access with no subscription or expiration

---

## Upcoming Features (Roadmap)

### Version 1.1 (Planned)
- Crossfade playback
- Car mode UI
- Widget support
- More equalizer presets

### Version 1.2 (Planned)
- Lyrics display (online fetch)
- Sleep mode improvements
- Additional theme packs
- Performance optimizations

---

*For support or feedback, contact support@theteam360.com*
