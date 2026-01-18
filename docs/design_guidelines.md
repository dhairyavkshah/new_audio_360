# New Audio 360 — Design Guidelines v7.0
**Premium Music Player | Microsoft Fluent 2 Design System**

---

## Table of Contents
1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Navigation Structure](#navigation-structure)
4. [Screen Specifications](#screen-specifications)
5. [Component Library](#component-library)
6. [Visual Design System](#visual-design-system)
7. [Theme System](#theme-system)
8. [Motion & Animation](#motion--animation)
9. [Accessibility](#accessibility)
10. [Platform Guidelines](#platform-guidelines)

---

## Overview

New Audio 360 is a premium mobile music player targeting audio enthusiasts. The app requires a one-time purchase (₹299 India / $29 International) with no free tier. All data is stored locally on the device.

**Key Features:**
- 5 Immersive Audio Modes
- 8 Equalizer Presets with Waveform Visualization
- Bass/Treble Controls & Virtualizer
- 55 Themes across 6 Categories
- Dual Radio (FM/AM Native + Online Streaming)
- Music Folder Selection
- Background Playback with Notification Controls

---

## Design Principles

### Microsoft Fluent 2 Core Principles

1. **Clarity** — Clean layouts prioritizing album art and content
2. **Efficiency** — One-tap access to playback controls
3. **Consistency** — Unified spacing, typography, and touch targets
4. **Subtlety** — Refined shadows, smooth transitions
5. **Accessibility** — WCAG AA compliance, motion preferences respected

### App-Specific Principles

1. **Audio First** — Visual design supports audio experience
2. **Local First** — All data stored on device, works offline
3. **Premium Feel** — High-quality animations and polish
4. **Android Native** — Optimized for Android with native audio modules

---

## Navigation Structure

### 4-Tab Root Navigation

| Tab | Icon | Description |
|-----|------|-------------|
| **Listen** | `headphones` | Main player, Now Playing, Queue |
| **Library** | `folder-music` | Songs, Albums, Artists, Playlists |
| **Radio** | `radio` | FM/AM Native + Online Streaming |
| **Settings** | `cog` | Preferences, Sound Lab, Themes |

### Tab Bar Specifications

```
Height: 56px
Background: colorNeutralBackground2
Border: 1px top stroke (colorNeutralStroke1)
Icon Size: 24x24
Label: Caption (12px Medium)
Active Color: colorBrandForeground1
Inactive Color: colorNeutralForeground3
```

### Persistent MiniPlayer

**Position:** Fixed above tab bar, full width

```
Height: 64px
Margin: 16px horizontal, 8px above tab bar
Background: Glassmorphism (BlurView intensity 80)
Border Radius: radius-lg (12px)
Shadow: Level 3 elevation
```

**Layout:**
- Album Art: 48x48, radius-sm (4px), 8px left margin
- Song Info: Flexible width (title + artist)
- Play/Pause: 44x44 touch target
- Next Track: 44x44 touch target

**Behavior:**
- Tap anywhere to expand Now Playing
- NO close/dismiss button
- Shows only when track loaded

### Screen Header Patterns

**Main Screens (Listen, Library, Radio, Settings):**
- Use `FluentTopBar` component
- Transparent background
- Title left-aligned (Title Large)
- Optional action icons right (44x44)

**Sub-Screens (Details, Settings pages):**
- Use native stack header
- Back arrow navigation
- Centered or left title
- Optional action buttons

### Safe Area Guidelines

```
Top: insets.top + Spacing.size4 (16px)
Bottom (with MiniPlayer): 64px + 56px + Spacing.size4
Bottom (without MiniPlayer): 56px + Spacing.size4
Horizontal: 16px padding
```

---

## Screen Specifications

### 1. Login Screen

**Purpose:** License verification via Google Sign-In

```
Layout:
├── Logo Container (80x80, Brand background 15% opacity)
│   └── Music icon (80px)
├── App Name: "New Audio 360" (Title1)
├── Subtitle: "Premium Music Experience" (Body1, secondary)
├── Sign in with Google button
│   ├── Height: 56px
│   ├── Border Radius: radius-lg
│   └── Google icon + text
├── Skip for Testing (dev mode only)
└── Footer: Terms + Privacy links
```

### 2. Listen Screen (Home)

**Purpose:** Main playback hub and discovery

```
Layout:
├── FluentTopBar
│   ├── Title: "Listen" (left)
│   └── Search icon (right, 44x44)
├── Currently Playing Card (if active)
│   ├── Album art background blur
│   ├── Track info overlay
│   └── Quick controls
├── Recently Played Section
│   ├── Section header with "See All"
│   └── Horizontal scroll (120x120 cards)
├── Most Played Section
│   └── Horizontal scroll
└── Favorites Section
    └── Horizontal scroll
```

**Card Specifications:**
```
Size: 120x120
Border Radius: radius-md (8px)
Shadow: Level 2
Label: Caption, centered below
```

### 3. Library Screen

**Purpose:** Music organization and browsing

```
Layout:
├── FluentTopBar
│   ├── Title: "Library"
│   └── Sort + Search icons
├── Quick Access Category Grid
│   ├── Songs, Albums, Artists, Playlists
│   ├── Recently Added, Favorites
│   └── Most Played, Folders
├── Song List (paginated)
│   └── Song rows with album art
└── Bottom padding for MiniPlayer
```

**Category Grid:**
```
Columns: 2
Gap: 12px
Card Height: 80px
Icon: 32x32, centered
Label: Body2, below icon
Background: colorNeutralBackground3
```

**Song Row:**
```
Height: 72px
Album Art: 56x56, radius-sm
Title: Body Large (16px)
Artist: Caption (12px), secondary color
Duration: Caption, right-aligned
More Button: 44x44, icon-only
Divider: 1px, inset 72px from left
```

### 4. Radio Screen

**Purpose:** FM/AM and Online radio streaming

```
Layout:
├── FluentTopBar
│   ├── Title: "Radio"
│   └── Favorite/Search icons
├── Now Playing Card (when active)
│   ├── Station logo
│   ├── Station name + frequency
│   └── Stop button
├── FM/AM Radio Section
│   ├── Tuning dial visualization
│   ├── Frequency display
│   └── Scan/Seek controls
├── Online Radio Section
│   ├── Country selector (auto-detected)
│   ├── Genre filter chips
│   ├── Curated stations
│   └── Browse all stations
└── Favorite Stations
    └── Horizontal scroll
```

**Radio Station Card:**
```
Size: 140x100
Logo: 48x48, centered
Name: Body2, max 2 lines
Frequency/Genre: Caption
Background: colorNeutralBackground3
Border Radius: radius-md
```

### 5. Settings Screen

**Purpose:** App preferences and configuration

```
Layout:
├── FluentTopBar: "Settings"
├── Grouped Settings Cards
│   ├── Sound Lab → SoundLabScreen
│   ├── Appearance → AppearanceScreen
│   ├── General Settings
│   │   ├── Music Folders
│   │   ├── Sleep Timer
│   │   └── Notifications
│   ├── License → LicenseScreen
│   └── About → AboutScreen
└── Version info footer
```

**Settings Row:**
```
Height: 56px
Icon: 24x24, with 40x40 halo background
Title: Body1
Subtitle: Caption (optional)
Accessory: Toggle, Chevron, or Value
Touch Target: Full row (min 44px height)
```

### 6. Sound Lab Screen

**Purpose:** Audio customization and effects

```
Layout:
├── Native Stack Header: "Sound Lab"
├── Waveform Visualization
│   ├── 64 bars
│   ├── Height: 120px
│   └── Animated on playback
├── Mode Selector
│   ├── Equalizer Tab
│   └── Immersive Tab
├── Equalizer Section (when active)
│   ├── Preset chips (8 presets)
│   └── Custom EQ sliders (5-band)
├── Immersive Section (when active)
│   └── Mode cards (6 modes)
├── Bass/Treble Controls
│   ├── Bass slider (-12 to +12 dB)
│   └── Treble slider (-12 to +12 dB)
└── Virtualizer Toggle
```

**Equalizer Presets:**
1. Flat
2. Bass Boost
3. Treble Boost
4. Vocal
5. Electronic
6. Rock
7. Classical
8. Jazz

**Immersive Modes:**
1. Concert Hall
2. Studio
3. Jazz Club
4. Arena
5. Intimate
6. Cathedral

**Note:** Equalizer and Immersive modes are mutually exclusive.

### 7. Appearance Screen

**Purpose:** Theme selection

```
Layout:
├── Native Stack Header: "Appearance"
├── Scrollable Theme List (no card wrapper)
│   ├── System Themes (5)
│   ├── Winamp Themes (10)
│   ├── Retro Themes (10)
│   ├── Nature Themes (10)
│   ├── Professional Themes (10)
│   └── Special Themes (10)
└── Theme preview on selection
```

**Theme Card:**
```
Height: 72px
Preview: Color dots (3-4 colors)
Name: Body1
Checkmark: On selected theme
Background: colorNeutralBackground2
```

### 8. Now Playing Screen

**Purpose:** Full-screen playback control

```
Layout:
├── Dismiss Handle (36x4, centered)
├── Album Art
│   ├── Width: 85% screen width
│   ├── Aspect: 1:1
│   ├── Border Radius: radius-lg
│   └── Shadow: Level 4
├── Track Info (centered)
│   ├── Song Title: Title Large
│   └── Artist: Body1, secondary
├── Progress Bar
│   ├── Track: 4px height
│   ├── Fill: Brand primary
│   └── Time labels: Caption
├── Primary Controls
│   ├── Previous: 48x48
│   ├── Play/Pause: 64x64, filled
│   └── Next: 48x48
├── Secondary Controls
│   ├── Shuffle: 44x44
│   ├── Repeat: 44x44
│   ├── Speed: 44x44
│   └── Queue: 44x44
└── Effects Quick Access
```

### 9. Queue Screen

**Purpose:** Playback queue management

```
Layout:
├── Native Stack Header: "Queue"
├── Now Playing Item (highlighted)
├── Up Next Section
│   └── Draggable song rows
├── Queue Actions
│   ├── Clear Queue
│   ├── Save as Playlist
│   └── Shuffle Queue
└── Queue stats (X songs, X:XX total)
```

---

## Component Library

### Fluent Primitives

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `FluentText` | Typography | variant, color, align |
| `FluentSurface` | Container with elevation | elevation, radius |
| `FluentStack` | Flex layout | direction, spacing, align |
| `FluentButton` | Action buttons | variant, size, icon |
| `FluentCard` | Content cards | elevation, onPress |
| `FluentIconButton` | Icon-only buttons | icon, size, variant |
| `FluentDivider` | Section separators | - |
| `FluentChip` | Selectable chips | selected, onPress |
| `FluentScreenLayout` | Screen wrapper | edges, hasBottomNavigation |
| `FluentTopBar` | Screen headers | title, actions |

### Component Sizes

```
Button Heights:
- Small: 32px
- Medium: 40px
- Large: 48px

Icon Sizes:
- XS: 16px
- SM: 20px
- MD: 24px
- LG: 32px
- XL: 48px

Touch Targets:
- Minimum: 44x44
- Comfortable: 48x48
```

---

## Visual Design System

### Spacing Scale (4px Grid)

```typescript
FluentSpacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48
}
```

### Border Radius

```typescript
FluentControlRadius = {
  none: 0,
  small: 4,
  medium: 8,
  large: 12,
  xLarge: 16,
  circular: 9999
}
```

### Elevation (Shadows)

```typescript
Level 1: { shadowOffset: {0, 1}, shadowOpacity: 0.05, shadowRadius: 2 }
Level 2: { shadowOffset: {0, 2}, shadowOpacity: 0.08, shadowRadius: 4 }
Level 3: { shadowOffset: {0, 4}, shadowOpacity: 0.10, shadowRadius: 8 }
Level 4: { shadowOffset: {0, 8}, shadowOpacity: 0.12, shadowRadius: 16 }
```

### Typography

```typescript
FluentTypography = {
  display: { fontSize: 48, fontWeight: '700', lineHeight: 56 },
  title1: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  title2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  title3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  subtitle1: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  subtitle2: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body1: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption1: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  caption2: { fontSize: 10, fontWeight: '400', lineHeight: 14 }
}
```

### Color Tokens

**Light Mode (FluentLightColors):**
```
Background:
- colorNeutralBackground1: #FFFFFF
- colorNeutralBackground2: #FAFAFA
- colorNeutralBackground3: #F5F5F5

Foreground:
- colorNeutralForeground1: #242424
- colorNeutralForeground2: #616161
- colorNeutralForeground3: #9E9E9E

Brand:
- colorBrandBackground: #0078D4
- colorBrandForeground1: #0078D4
- colorBrandBackgroundHover: #106EBE

Semantic:
- colorPaletteRedForeground1: #D13438
- colorPaletteGreenForeground1: #107C10
- colorPaletteYellowForeground1: #FFB900
```

**Dark Mode (FluentDarkColors):**
```
Background:
- colorNeutralBackground1: #1F1F1F
- colorNeutralBackground2: #2D2D2D
- colorNeutralBackground3: #3D3D3D

Foreground:
- colorNeutralForeground1: #FFFFFF
- colorNeutralForeground2: #D6D6D6
- colorNeutralForeground3: #ADADAD

Brand:
- colorBrandBackground: #2899F5
- colorBrandForeground1: #2899F5
```

---

## Theme System

### 55 Themes Across 6 Categories

**1. System (5 themes)**
- Fluent Light
- Fluent Dark
- Night AMOLED
- Warm Neutral
- Cool Blue

**2. Winamp (10 themes)**
- Classic
- Modern
- Bento
- MMD3
- Nucleo
- Komet
- Swoosh
- CleanAMP
- Fox
- Base

**3. Retro (10 themes)**
- VHS
- Cassette
- Vaporwave
- Synthwave
- Y2K
- Windows 95
- Mac Classic
- Pixel Art
- CRT
- Arcade

**4. Nature (10 themes)**
- Forest
- Ocean
- Sunset
- Desert
- Mountain
- Aurora
- Cherry Blossom
- Autumn
- Tropical
- Arctic

**5. Professional (10 themes)**
- Midnight
- Corporate
- Minimal
- Slate
- Carbon
- Executive
- Titanium
- Graphite
- Navy
- Charcoal

**6. Special (10 themes)**
- Neon
- Holographic
- Galaxy
- Lava
- Crystal
- Cyberpunk
- Steampunk
- Art Deco
- Origami
- Mosaic

### Theme Structure

```typescript
interface Theme {
  id: string;
  name: string;
  category: ThemeCategory;
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
  };
  overrides?: {
    borderRadius?: number;
    elevation?: ShadowStyle;
  };
}
```

---

## Motion & Animation

### Fluent 2 Motion Curves

```typescript
FluentMotion = {
  curves: {
    accelerate: [0.9, 0.1, 1, 0.2],
    decelerate: [0.1, 0.9, 0.2, 1],
    standard: [0.8, 0, 0.2, 1]
  },
  durations: {
    ultraFast: 50,
    faster: 100,
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 500
  }
}
```

### Animation Guidelines

| Animation | Duration | Curve |
|-----------|----------|-------|
| Button press | 100ms | decelerate |
| Screen transition | 300ms | standard |
| Modal present | 300ms | decelerate |
| Modal dismiss | 250ms | accelerate |
| Tab switch | 200ms | standard |
| MiniPlayer expand | 300ms | decelerate |
| Waveform bars | 50ms | linear |
| Theme change | 200ms | standard |

### Reduced Motion

When `prefers-reduced-motion` is enabled:
- Disable waveform animations
- Use instant transitions
- Remove parallax effects
- Keep essential feedback animations

---

## Accessibility

### Touch Targets

```
Minimum: 44x44 dp
Recommended: 48x48 dp
Spacing between targets: 8dp minimum
```

### Color Contrast

```
Text on background: 4.5:1 minimum (AA)
Large text: 3:1 minimum
UI components: 3:1 minimum
Focus indicators: 3:1 minimum
```

### Screen Reader Support

- All interactive elements have `accessibilityLabel`
- Icon-only buttons have descriptive labels
- Images have alt text
- State changes announced (playing, paused)
- Custom actions for complex controls

### Focus Management

```
Focus ring: 2px Brand primary
Focus visible: Keyboard navigation only
Tab order: Logical reading order
Skip links: For long lists
```

---

## Platform Guidelines

### Android Specific

**Navigation:**
- Hardware back button support
- Predictive back gesture (Android 13+)
- Material bottom sheet for modals

**Notifications:**
- MediaStyle notification
- Play/Pause, Previous, Next, Stop actions
- Album art in notification
- Lock screen controls

**Audio:**
- ExoPlayer for playback
- Native audio effects (EQ, Bass, Virtualizer)
- Audio focus management
- Bluetooth/headphone controls

**System Integration:**
- Media session for system UI
- Audio becoming noisy handling
- Phone call interruption

### Web Fallbacks

When running on web platform:
- Use `expo-av` instead of native modules
- Disable FM/AM radio
- Limited background playback
- No notification controls
- Simplified audio effects

---

## File Structure

```
client/
├── components/
│   └── fluent/           # Fluent 2 primitives
├── constants/
│   └── fluent2.ts        # Design tokens
├── contexts/
│   └── ThemeContext.tsx  # Theme management
├── hooks/
│   └── useFluentStyles.ts
├── navigation/
│   ├── MainTabNavigator.tsx
│   └── RadioStackNavigator.tsx
├── screens/
│   ├── ListenScreen.tsx
│   ├── LibraryScreen.tsx
│   ├── RadioScreen.tsx
│   ├── SettingsScreen.tsx
│   └── ...
└── services/
    ├── AudioCoordinator.ts
    └── StudioAudioEngine.ts
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 7.0 | Jan 2026 | Complete rewrite with 4-tab nav, 55 themes, Radio |
| 6.0 | Dec 2025 | Fluent 2 adoption, 3-tab layout |
| 5.0 | Nov 2025 | Initial design system |

---

**New Audio 360 Design Guidelines v7.0**
*Microsoft Fluent 2 Design System*
