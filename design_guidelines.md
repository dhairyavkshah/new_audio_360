# New Audio 360 — Design Guidelines v6.0 COMPACT
**Premium Music Player | Microsoft Fluent 2 Design**

---

## Core Architecture

**Authentication:** None required (local-first app)

**Profile Requirements:**
- User avatar (3 presets: vinyl record, headphones, waveform)
- Display name field
- Settings access via Settings tab

---

## Navigation Structure

### 3-Tab Root Navigation
1. **Listen** (Home) - Discovery & recent plays
2. **Library** - All songs, playlists, albums, artists
3. **Settings** - Preferences, equalizer, theme

**Tab Bar:** 56px height, Background 2 with 1px top stroke, 24x24 Feather icons, Caption Small labels (11px Medium), Brand primary (active) / Foreground 3 (inactive)

### Persistent Mini Player
- **Position:** Fixed above tab bar, full width
- **Height:** 64px, Level 3 shadow, Background 3, radius-lg
- **Margins:** 16px horizontal, 8px above tab bar
- **Layout:** Album art (48x48, radius-sm, 8px left margin) → Song info (flexible) → Play/Pause (44x44) → Next (44x44)
- **Interaction:** Tap to expand to Now Playing modal
- **NO close/dismiss button**

### Safe Area Guidelines
- **Top:** insets.top + Spacing.size4
- **Bottom:** 64px (mini player) + 56px (tab bar) + Spacing.size4 (Library/Listen) OR insets.bottom + Spacing.size4 (Settings)

---

## Screen Specifications

### Listen (Home Feed)
- **Header:** Transparent, App logo (Title Large) left, Search icon (44x44) right
- **Sections:** Recently Played carousel (120x120 cards) → Quick Playlists → Continue Listening
- **Song rows:** 56x56 thumbnails
- **Section spacing:** Spacing.size6

### Library
- **Header:** "Library" (Title Large), Sort + Search icons right
- **Segmented Control:** All Songs | Playlists | Albums | Artists (40px height, radius-md)
- **Song Rows:** 72px height, 56x56 album art (radius-sm), Song title (Body Large) + Artist (Caption, Foreground 2), Duration + More (44x44 right), 1px Stroke 1 divider (inset 72px left)
- **Interactions:** Long press = action sheet (Add/Delete/Share), Swipe left = quick delete

### Settings
- **Header:** "Settings" (Title Large)
- **Grouped Cards (radius-lg):**
  1. Profile: Avatar (64x64, radius-full), Display name (Body Large, editable)
  2. Playback: Equalizer (nav arrow), Crossfade (toggle), Gapless (toggle)
  3. Appearance: Theme selector (Auto/Light/Dark), Lock screen art (toggle)
  4. About: Version, Privacy Policy
- **List Items:** 56px height, 40x40 icon halo, Spacing.size3 gap, 44x44 min touch target

### Now Playing (Modal)
- **Presentation:** Native modal, swipe down to dismiss
- **Background:** Background 1 + 10% opacity gradient from album art dominant color
- **Layout (top to bottom):**
  - Dismiss handle: 4px × 36px, Stroke 2
  - Album art: 85% screen width, radius-lg, Level 4 shadow
  - Song title (Title Large, centered) + Artist (Body, Foreground 2, centered) — Spacing.size6 margin
  - Progress bar: 4px track (Background 3, radius-full), Brand primary fill, Caption time labels — Spacing.size5 margin
  - Playback controls: Previous (48x48, 28x28 icon) | Play/Pause (56x56, 32x32 icon, filled Brand circle) | Next (48x48, 28x28 icon), Spacing.size5 gap — Spacing.size6 margin
  - Secondary controls: Shuffle | Repeat | Queue | More (44x44 ghost buttons, Brand primary active) — Spacing.size4 margin

### Search (Modal)
- **Header:** Integrated search bar (40px, auto-focus), Cancel button right
- **States:** Empty (recent searches) → Searching (spinner) → Results (song list) → No results (empty state)
- **Results:** Same row specs as Library

### Equalizer (Pushed from Settings)
- **Header:** "Equalizer" with back button
- **Preset Cards:** Horizontal scroll, 120x120, 6 presets (Bass Boost, Rock, Jazz, Classical, Flat, Custom), active = 2px Brand primary border
- **Custom Controls:** 5-band sliders (60Hz, 230Hz, 910Hz, 4kHz, 14kHz), 4px track (Background 3), 24x24 thumb (Brand primary, Level 2 shadow), Caption labels

---

## Visual Design System

### Colors
**Use Fluent 2 tokens + music-specific semantics:**
- Playing state: Success green (#107C10)
- Paused state: Warning amber (#FFB900)
- Album art fallback: Brand primary → Brand hover gradient

### Typography
**Fluent 2 type ramp + music applications:**
- Song titles: Body Large (16px Regular)
- Artist names: Caption (12px Medium), Foreground 2
- Time stamps: Caption Small (11px Medium)
- Playlist counts: Caption, Foreground 3

### Icons (Feather from @expo/vector-icons)
**Sizes:** Tab bar 24x24, Header 20x20, List items 20x20, Playback 28-32x32

**Required:** home, music, settings, search, sliders, play-circle, pause-circle, skip-back, skip-forward, shuffle, repeat, list, more-horizontal, heart, heart-filled

### Shadows
- **Level 2:** Settings list item icons
- **Level 3:** Mini player, Now Playing secondary elements
- **Level 4:** Now Playing album art
- **Specs:** shadowOffset {width: 0, height: 2}, shadowOpacity 0.10, shadowRadius 2

### Album Art Assets
**Generate 8 placeholders (500x500 JPG):**
Electronic/Synthwave, Jazz, Classical, Rock, Hip-Hop, Indie/Folk, Pop, Ambient
**Include:** Dominant color metadata for gradients, soft Brand gradient fallback

---

## Accessibility & Touch

- **Min touch target:** 44x44 all interactive elements
- **Color contrast:** 4.5:1 text, 3:1 UI components
- **Focus indicators:** 2px Brand primary ring
- **Reduced motion:** Disable album art animations, instant transitions
- **Screen readers:** accessibilityLabel on all icon-only buttons

---

## Motion & Transitions

**Fluent 2 timing tokens + music-specific:**
- Mini player expand: 300ms ease-in-out scale
- Now Playing modal: Native modal slide
- Album art cross-fade: 200ms ease
- Play/pause morph: 100ms ease-out
- Progress scrubbing: Real-time, no delay

---

## Platform-Specific

**iOS:** Native modal for Now Playing, Media Player framework, Control Center widget, respect Silent Mode

**Android:** Material bottom sheet for Now Playing, MediaStyle notifications, lock screen controls

---

## Design Principles

1. **Clarity:** Clean album art, minimal chrome
2. **Efficiency:** One-tap playback via mini player
3. **Consistency:** Unified cards, spacing, touch targets
4. **Subtlety:** Refined shadows/transitions
5. **Accessibility:** WCAG AA, respect motion preferences

---

**v6.0 COMPACT — New Audio 360 | Fluent 2 Design**