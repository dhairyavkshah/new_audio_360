# New Audio 360 - Comprehensive Fluent 2 Design Audit

**Audit Date:** January 19, 2026  
**Design System Target:** Microsoft Fluent 2  
**Objective:** Achieve "poem-like rhythm" - visual harmony, symmetry, and consistent flow

---

## EXECUTIVE SUMMARY

### Overall Assessment: **Significant Design Debt**

The app has Fluent 2 tokens defined but **inconsistently applied**. Many screens use ad-hoc styling rather than the established token system, resulting in:

- **Broken visual rhythm** - Spacing varies arbitrarily between screens
- **Inconsistent hierarchy** - Typography weights and sizes don't follow a clear pattern
- **Mixed component styles** - Legacy and Fluent components coexist on same screens
- **Asymmetric layouts** - Elements don't align to consistent grid
- **Elevation confusion** - Shadows and layering applied inconsistently

### Global Fluent 2 Compliance Score: **4.5/10**

---

# PART 1: SCREEN-BY-SCREEN ANALYSIS

---

## TAB 1: LISTEN

---

### 1.1 LISTEN SCREEN (Home)

**Current State:** The main home screen with Recently Played, Quick Access grid, and Most Played sections.

#### Layout Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Section headers lack consistent spacing above/below | All sections | High |
| Quick Access grid cards have uneven gaps | Grid container | High |
| Recently Played horizontal scroll lacks edge fade | ScrollView | Medium |
| Mixed card radii between sections | Cards | High |
| Top bar title left padding doesn't match content padding | TopBar | Medium |

#### Symmetry Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Section "See All" links not baseline-aligned with headers | Section headers | High |
| Quick Access icons not centered in cards | Grid cards | Medium |
| Card content padding inconsistent between card types | All cards | High |

#### Spacing Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Section gap varies (16px, 20px, 24px used arbitrarily) | Between sections | Critical |
| Card internal padding inconsistent (12px, 16px mixed) | Inside cards | High |
| Bottom padding doesn't account for MiniPlayer properly | Content bottom | Medium |

#### Typography Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Section headers use different font weights | Headers | High |
| "See All" link text size inconsistent with Fluent label | Links | Medium |
| Song titles in cards use body instead of titleSmall | Song cards | Medium |

#### Recommended Fixes
1. Standardize section gap to 24px (`FluentSpacing.xxl`)
2. Unify card padding to 16px (`FluentSpacing.l`)
3. Apply consistent card radius of 12px (`FluentControlRadius.large`)
4. Align "See All" links to baseline with titleMedium headers
5. Use FluentText consistently for all typography

**Fluent 2 Compliance Score: 4/10**

---

### 1.2 NOW PLAYING SCREEN

**Current State:** Full-screen player with album art, controls, progress bar, waveform visualization.

#### Layout Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Album artwork size not responsive to screen | Artwork container | High |
| Progress bar positioned too close to controls | Playback section | High |
| Waveform height varies unpredictably | Visualization area | Medium |
| Back button touch target overlaps with artwork | Header area | Critical |
| Song info text too close to progress bar | Text section | High |

#### Symmetry Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Playback controls not horizontally centered | Control row | Critical |
| Previous/Next buttons different visual weight than Play | Control icons | High |
| Volume/Sound Lab icons asymmetric placement | Secondary controls | Medium |
| Song title and artist not center-aligned as unit | Song info | High |

#### Spacing Issues
| Issue | Location | Severity |
|-------|----------|----------|
| No consistent vertical rhythm from top to bottom | Full screen | Critical |
| Artwork has inconsistent margin on different screen sizes | Artwork | High |
| Controls cramped together without proper breathing room | Control section | High |
| Progress bar labels (time) too close to track | Progress area | Medium |

#### Typography Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Song title too large relative to screen | Title text | Medium |
| Artist name appears as afterthought | Artist text | High |
| Current time / total time font inconsistent | Time labels | Low |

#### Elevation Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Background blur effect inconsistent | Backdrop | Medium |
| Control buttons lack proper elevation | Buttons | High |
| Play button doesn't stand out as primary action | Play button | High |

#### Recommended Fixes
1. Create strict vertical rhythm: Top safe area → 16px → Artwork → 24px → Song Info → 16px → Progress → 24px → Controls → 24px → Secondary
2. Center align all content on vertical axis
3. Make Play button 64px with elevation shadow (primary action)
4. Make Prev/Next 48px (secondary actions)
5. Add 32px breathing room around artwork
6. Use display typography for song title (24px), title for artist (16px)

**Fluent 2 Compliance Score: 3/10**

---

### 1.3 SOUND LAB SCREEN

**Current State:** Audio effects control panel with EQ presets, Bass/Treble sliders, Immersive Mode cards.

#### Layout Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Sections stacked without clear visual separation | Full screen | High |
| EQ preset chips wrap awkwardly on smaller screens | Chip container | High |
| Slider labels not aligned with slider tracks | Slider section | Critical |
| Immersive Mode cards too dense | Mode cards | High |
| Custom EQ editor feels disconnected from presets | Editor section | Medium |

#### Symmetry Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Bass and Treble sliders not symmetrically positioned | Slider row | Critical |
| Mode card icons not centered in cards | Mode cards | High |
| Section headers don't align with content start | Headers | Medium |

#### Spacing Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Chip gaps inconsistent (8px, 12px mixed) | EQ chips | High |
| Slider value display too close to slider thumb | Sliders | Medium |
| Mode cards have cramped internal spacing | Mode cards | High |
| Section margins vary throughout screen | All sections | High |

#### Typography Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Section headers inconsistent weight | Headers | Medium |
| Slider value labels too small | Value displays | Medium |
| Mode names and descriptions hierarchy unclear | Mode cards | High |

#### Recommended Fixes
1. Divide screen into clear sections with FluentDivider or 32px gaps
2. Create 2-column grid for Bass/Treble sliders with symmetric spacing
3. Use horizontal scroll for EQ chips with consistent 8px gaps
4. Redesign Mode cards as 2x3 grid with 48px height, consistent padding
5. Add subtle surface elevation to active mode card
6. Use Fluent slider component with proper value display positioning

**Fluent 2 Compliance Score: 3.5/10**

---

### 1.4 QUEUE SCREEN

**Current State:** List of upcoming songs with reorder handles.

#### Layout Issues
| Issue | Location | Severity |
|-------|----------|----------|
| List items too dense, lack breathing room | Song list | High |
| Reorder handles not aligned with item centers | Handle icons | High |
| Clear Queue button placement awkward | Header/footer | Medium |
| No visual distinction between current and upcoming | Song items | High |

#### Symmetry Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Artwork, text, and handle not properly aligned | List items | High |
| Header controls asymmetric | Top bar | Medium |

#### Spacing Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Item height too short (should be 72px for rich items) | List items | Critical |
| Artwork-to-text gap inconsistent with standard | Items | High |
| Bottom padding missing for last item | List bottom | Medium |

#### Recommended Fixes
1. Increase item height to 72px (`FluentLayoutSize.listItemRich`)
2. Add FluentDivider between items
3. Highlight currently playing with surface color change
4. Position reorder handle at center-right with 48px touch target
5. Add "Now Playing" indicator with accent color

**Fluent 2 Compliance Score: 4/10**

---

## TAB 2: LIBRARY

---

### 2.1 LIBRARY SCREEN (Home)

**Current State:** Tabbed view with Songs, Albums, Artists, Playlists, Favorites sub-views.

#### Layout Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Tab/chip bar inconsistent with Fluent patterns | Filter bar | High |
| Search bar height varies from standard | Search input | Medium |
| Grid/list toggle not properly positioned | Header | Medium |
| Album grid columns inconsistent across screen sizes | Grid | High |

#### Symmetry Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Filter chips don't center in their container | Chip bar | High |
| Sort button not aligned with search bar | Action row | Medium |
| Grid items not properly aligned to edges | Album grid | High |

#### Spacing Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Search bar to chip bar gap inconsistent | Bar stack | High |
| Grid gap too small for visual breathing | Grid | Medium |
| List item padding inconsistent | Song list | High |

#### Sub-View Specific Issues

**Songs View:**
- Song list items cramped (56px height, should be 72px with artwork)
- Missing dividers between items
- Search results don't highlight matches

**Albums View:**
- Album card corners inconsistent with global radius
- Album title truncation ugly
- Grid gaps uneven

**Artists View:**
- Artist avatars not circular (should be for people)
- List lacks section headers for alphabetical grouping

**Playlists View:**
- Playlist cards different style from other cards
- Create playlist button disconnected from list

**Favorites View:**
- No empty state when favorites empty
- Unfavorite action not obvious

#### Recommended Fixes
1. Unify tab bar to use FluentChip with consistent 8px gaps
2. Standardize search bar height to 48px
3. Use consistent 12px grid gap for album grid
4. Apply 72px height for all list items with artwork
5. Add alphabetical section headers for Artists
6. Make artist avatars circular (50% radius)

**Fluent 2 Compliance Score: 4/10**

---

### 2.2 ALBUM DETAIL SCREEN

**Current State:** Album header with artwork, track list below.

#### Layout Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Header artwork crops inconsistently | Hero section | High |
| Metadata (artist, year, tracks) poorly organized | Info section | High |
| Play All button placement inconsistent | Action area | Medium |
| Track list starts too abruptly | Content transition | High |

#### Symmetry Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Album info text not aligned with track list | Content sections | High |
| Action buttons asymmetric | Button row | Medium |

#### Recommended Fixes
1. Create hero section with blurred backdrop + centered artwork
2. Stack album title, artist, year/tracks vertically centered
3. Add Play All and Shuffle buttons as symmetric pair
4. Use FluentDivider before track list
5. Apply consistent 20px horizontal padding throughout

**Fluent 2 Compliance Score: 4/10**

---

### 2.3 ARTIST DETAIL SCREEN

**Current State:** Artist header, albums section, songs section.

#### Issues (Similar to Album Detail)
- Hero section lacks polish
- Section transitions abrupt
- Albums horizontal scroll doesn't align with content edges
- Songs list inconsistent with Library screen song list

**Fluent 2 Compliance Score: 4/10**

---

### 2.4 PLAYLIST DETAIL SCREEN

**Current State:** Playlist header with cover, editable song list.

#### Issues
- Playlist artwork generation inconsistent
- Edit/Delete actions not properly surfaced
- Drag-to-reorder handles inconsistent with Queue screen
- Empty state when playlist empty not designed

**Fluent 2 Compliance Score: 4.5/10**

---

### 2.5 PLAYLIST MANAGEMENT SCREEN

**Current State:** List of playlists with CRUD modals.

#### Modal Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Create playlist modal not following Fluent dialog specs | Modal | Critical |
| Input field styling inconsistent | Text inputs | High |
| Modal backdrop opacity incorrect | Overlay | Medium |
| Button placement in modals inconsistent | Modal footer | High |
| Delete confirmation too basic | Delete modal | Medium |

#### Recommended Fixes
1. Apply 16px border radius to modals
2. Use 24px internal padding
3. Position action buttons at bottom-right, Cancel then Primary
4. Add proper handle bar for bottom sheet modals
5. Use FluentButton for all modal actions

**Fluent 2 Compliance Score: 3.5/10**

---

### 2.6 RECORDINGS SCREEN

**Current State:** List of recorded audio files.

#### Issues
- Minimal styling applied
- Action buttons not properly styled
- Empty state generic

**Fluent 2 Compliance Score: 4/10**

---

## TAB 3: RADIO

---

### 3.1 RADIO SCREEN (Home)

**Current State:** FM/AM radio card, Online Radio card, favorites section.

#### Layout Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Radio type cards different heights | Mode cards | High |
| Favorites section disconnected from main content | Section | Medium |
| Card internal layouts inconsistent | All cards | High |

#### Symmetry Issues
| Issue | Location | Severity |
|-------|----------|----------|
| FM/AM vs Online cards not symmetric | Card pair | High |
| Icons and text not aligned within cards | Card internals | Medium |

#### Recommended Fixes
1. Make FM/AM and Online cards identical dimensions (equal height)
2. Use consistent internal layout: Icon left, title + description right
3. Add proper elevation to indicate interactivity
4. Create symmetric 2-column layout for radio type selection

**Fluent 2 Compliance Score: 4/10**

---

### 3.2 RADIO STATIONS SCREEN

**Current State:** Station list with filtering by country/genre.

#### Issues
- Station cards inconsistent style
- Search bar styling different from Library search
- Country selector not Fluent-compliant
- Loading states generic

**Fluent 2 Compliance Score: 4/10**

---

## TAB 4: SETTINGS

---

### 4.1 SETTINGS SCREEN (Home)

**Current State:** Grouped list of settings with section headers.

#### Layout Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Section headers not using Fluent styling | Headers | High |
| Setting items inconsistent heights | List items | High |
| Icons sizes vary | Item icons | Medium |
| Toggle positions inconsistent | Toggles | Medium |

#### Symmetry Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Icon + label + accessory not aligned | List items | High |
| Section group cards not consistent width | Cards | Medium |

#### Recommended Fixes
1. Use 56px height for all standard settings items
2. Apply consistent 24px left icon, 12px gap to text
3. Right-align all accessory views (toggles, chevrons)
4. Use FluentCard for section groups with consistent padding
5. Apply section headers with uppercase, labelSmall typography

**Fluent 2 Compliance Score: 5/10**

---

### 4.2 APPEARANCE SCREEN

**Current State:** Theme grid with category tabs.

#### Issues
- Theme cards inconsistent preview sizes
- Category tabs don't match Fluent chip pattern
- Selected theme indicator subtle
- Grid gaps uneven

**Fluent 2 Compliance Score: 4.5/10**

---

### 4.3 ABOUT SCREEN

**Current State:** App info, version, developer links.

#### Issues
- Information cards inconsistent
- Link buttons styling varies
- Version info typography weak
- Logo/branding not properly centered

**Fluent 2 Compliance Score: 5/10**

---

### 4.4 LICENSE SCREEN, PRIVACY POLICY SCREEN, OPEN SOURCE LICENSES SCREEN

**Current State:** Text-heavy informational screens.

#### Issues
- Typography creates walls of text
- No visual breaks or section markers
- Links not styled as interactive elements
- Scroll position indicator missing

**Fluent 2 Compliance Score: 5/10**

---

### 4.5 FOLDER SELECTION SCREEN

**Current State:** Folder tree with checkboxes.

#### Issues
- Tree indentation inconsistent
- Checkboxes not Fluent-styled
- Folder icons generic
- Selection feedback unclear

**Fluent 2 Compliance Score: 3.5/10**

---

### 4.6 SUPPORT DEVELOPER SCREEN

**Current State:** Donation/support options.

#### Issues
- Cards inconsistent with app card style
- CTA buttons inconsistent styling
- Heart/donation imagery generic

**Fluent 2 Compliance Score: 4/10**

---

## ONBOARDING & SYSTEM SCREENS

---

### SPLASH SCREEN

**Current State:** App logo with loading indicator.

#### Issues
- Logo not centered precisely
- Background lacks Fluent surface treatment
- Loading indicator generic
- No Fluent motion for entry

**Fluent 2 Compliance Score: 4/10**

---

### LOADING SCREEN

**Current State:** Full-screen loading indicator.

#### Issues
- Bare indicator with no surface container
- Missing branded messaging
- No Fluent styling

**Fluent 2 Compliance Score: 3/10**

---

### PERMISSION ONBOARDING SCREEN / FLOW

**Current State:** Permission request screens with icons and explanations.

#### Issues
- Icon + text blocks cramped
- Steps spacing inconsistent
- Button styling varies between steps
- Progress indicator non-Fluent

**Fluent 2 Compliance Score: 4/10**

---

### SUBSCRIPTION REQUIRED SCREEN

**Current State:** Paywall/license prompt.

#### Issues
- Layout not centered properly
- CTA button not prominent enough
- Benefit list styling weak

**Fluent 2 Compliance Score: 3.5/10**

---

### BIOMETRIC LOCK SCREEN, LOGIN SCREEN, EXIT SCREEN

**Current State:** Authentication and exit screens.

#### Issues
- Center alignment off
- Icon sizing inconsistent with system
- Button placement not following Fluent modal pattern

**Fluent 2 Compliance Score: 4/10**

---

## MODAL & OVERLAY ANALYSIS

---

### SONG CONTEXT MENU (Bottom Sheet)

**Current State:** Bottom sheet with song info, action list, playlist selection sub-view.

#### Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Handle bar missing or undersized | Sheet top | High |
| Item heights inconsistent | Action list | High |
| Sub-views (playlist selection) transition jarring | Navigation | High |
| Create playlist form styling inconsistent | Form | High |
| Backdrop blur inconsistent with platform | Overlay | Medium |

#### Recommended Fixes
1. Add 40x4px handle bar with 16px top padding
2. Use 56px height for all action items
3. Add slide transition for sub-view navigation
4. Apply consistent 20px horizontal padding
5. Use proper Fluent input field styling

**Fluent 2 Compliance Score: 3.5/10**

---

### CONTEXT MENU (Popup)

**Current State:** Floating menu for contextual actions.

#### Issues
- Border radius inconsistent
- Shadow doesn't match Fluent elevation
- Item padding cramped
- Animation curves not Fluent

**Fluent 2 Compliance Score: 4/10**

---

### AUDIO TIP NOTIFICATION (Modal)

**Current State:** First-launch tip modal.

#### Issues
- Modal styling not matching Fluent dialog
- Icon sizing arbitrary
- Button positioning non-standard

**Fluent 2 Compliance Score: 4/10**

---

### TOAST

**Current State:** Top notification overlay.

#### Issues
- Colors not using semantic tokens
- Shadow insufficient for visibility
- Icon + text alignment off
- Dismiss animation non-Fluent

**Fluent 2 Compliance Score: 4/10**

---

### PLAYLIST MANAGEMENT MODALS

**Current State:** Create, edit, delete playlist modals.

#### Issues (detailed in Playlist Management Screen section)
- Non-standard modal dimensions
- Input styling inconsistent
- Button order non-standard

**Fluent 2 Compliance Score: 3.5/10**

---

## GLOBAL COMPONENT ANALYSIS

---

### MINI PLAYER

**Current State:** Persistent floating player bar.

#### Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Border radius inconsistent with design spec | Container | High |
| Shadow doesn't use Fluent elevation tokens | Container | High |
| Artwork size varies | Album art | Medium |
| Button touch targets too small | Controls | High |
| Text truncation ellipsis inconsistent | Song info | Low |

**Fluent 2 Compliance Score: 4.5/10**

---

### SONG CARD

**Current State:** Reusable song list item component.

#### Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Height not matching FluentLayoutSize.listItemRich | Container | High |
| Artwork radius varies by usage | Artwork | High |
| Text colors not using semantic tokens | Text | Medium |
| Touch feedback not Fluent-styled | Pressable | Medium |

**Fluent 2 Compliance Score: 4/10**

---

### FLUENT BUTTON / ICON BUTTON / CHIP

**Current State:** Core interactive components.

#### Issues
- Animation curves ad-hoc, not FluentCurve/FluentDuration
- Touch targets not always meeting 44px minimum
- Pressed states inconsistent
- Focus states missing for accessibility

**Fluent 2 Compliance Score: 5/10**

---

### TOP BAR / FLUENT TOP BAR

**Current State:** Header bar component.

#### Issues
- Home vs sub-page styling not consistently different
- Back button hit area too small
- Title centering not precise on all screens
- Shadow application inconsistent

**Fluent 2 Compliance Score: 5/10**

---

### TAB BAR NAVIGATION

**Current State:** Bottom navigation tabs.

#### Issues
- Icon sizes slightly off from spec
- Active/inactive color contrast could be stronger
- Label text size smaller than spec

**Fluent 2 Compliance Score: 6/10**

---

# PART 2: DESIGN HARMONY FRAMEWORK

---

## THE "POEM RHYTHM" PHILOSOPHY

A well-designed app should flow like a poem:
- **Consistent Meter** = Uniform spacing rhythm
- **Clear Stanzas** = Distinct sections with breathing room
- **Emphasis on Key Words** = Visual hierarchy for important elements
- **Natural Flow** = Smooth transitions and navigation
- **Unified Voice** = Consistent style throughout

---

## 1. VISUAL RHYTHM RULES (Spacing Cadence)

### The 4-8-16-24-32 Scale

All spacing must use these Fluent values:

| Token | Value | Usage |
|-------|-------|-------|
| `FluentSpacing.xs` | 4px | Icon-to-text inline gap |
| `FluentSpacing.s` | 8px | Component internal spacing, chip gaps |
| `FluentSpacing.m` | 12px | List item internal padding, card gaps |
| `FluentSpacing.l` | 16px | Standard content padding, section internal |
| `FluentSpacing.xl` | 20px | Screen horizontal padding |
| `FluentSpacing.xxl` | 24px | Section gaps, major component separation |
| `FluentSpacing.xxxl` | 32px | Major section breaks, hero areas |

### Vertical Rhythm Pattern

Every screen follows this vertical rhythm:

```
[Safe Area Top]
[16px]
[Top Bar - 56px]
[Optional: Search Bar - 48px + 16px padding = 64px]
[Optional: Tab/Chip Bar - 48px]
[16px top content padding]
[Content Section 1]
[24px section gap]
[Content Section 2]
[24px section gap]
[Content Section N]
[Bottom padding: 16px + MiniPlayer height + Tab bar + Safe Area]
```

### Horizontal Rhythm Pattern

```
[20px edge padding]
[Content - full width minus 40px]
[20px edge padding]
```

For grids:
```
[20px] [Card] [12px gap] [Card] [12px gap] [Card] [20px]
```

---

## 2. SYMMETRY GUIDELINES

### When to Use SYMMETRY (Centered Balance)

| Use Case | Implementation |
|----------|----------------|
| Modal dialogs | Center both horizontally and vertically |
| Splash/Loading screens | Perfect center alignment |
| Now Playing controls | Horizontally centered control row |
| Empty states | Centered icon + message + action |
| Authentication screens | Vertically centered form |
| Full-screen confirmations | Centered content block |

### When to Use ASYMMETRY (Left-Aligned Balance)

| Use Case | Implementation |
|----------|----------------|
| List items | Left-aligned content with right accessories |
| Cards with content | Left-aligned text with optional right chevron |
| Headers | Left-aligned title, right-aligned actions |
| Form fields | Left-aligned labels and inputs |
| Navigation bars | Left: back/title, Right: actions |

### Visual Weight Balancing

```
Heavy ←───────────────────→ Light

Icon (24px)  Title (16px)   Caption (12px)   Chevron (12px)
████████     ██████         ████             ►
```

Each row should balance: Heavy left → Light right OR Centered for modals.

---

## 3. HIERARCHY PATTERN

### The 3-Level Hierarchy

Every screen should have exactly 3 levels of visual hierarchy:

| Level | Typography | Color | Purpose |
|-------|------------|-------|---------|
| **Primary** | titleLarge/titleMedium (16-20px, 600) | `text` (100% opacity) | Main titles, current selection |
| **Secondary** | body (14px, 400) | `text` (87% opacity) | Descriptions, primary content |
| **Tertiary** | caption (12px, 400) | `textSecondary` (60% opacity) | Metadata, timestamps, hints |

### Applying Hierarchy

**List Item Example:**
```
[Primary]   Song Title
[Tertiary]  Artist Name • Duration
```

**Card Example:**
```
[Primary]   Section Title
[Secondary] Description or content
[Tertiary]  Metadata or action link
```

**Screen Example:**
```
[Primary]   Screen Title (Top Bar)
[Primary]   Section Headers
[Secondary] Content Items
[Tertiary]  Supplementary Info
```

---

## 4. MOTION LANGUAGE

### Fluent Motion Tokens

| Purpose | Duration | Curve | Usage |
|---------|----------|-------|-------|
| Micro-interactions | 100ms | `FluentCurve.accelerateMid` | Button press, toggle |
| UI Feedback | 200ms | `FluentCurve.decelerateMid` | Cards appearing |
| Transitions | 300ms | `FluentCurve.easeInOut` | Screen navigation |
| Overlays | 250ms | `FluentCurve.decelerateMax` | Modal entry |
| Dismissals | 200ms | `FluentCurve.accelerateMax` | Modal exit |

### Motion Principles

1. **Responsive**: Immediate feedback on touch (< 100ms)
2. **Natural**: Decelerate on entry, accelerate on exit
3. **Meaningful**: Motion indicates relationship (slide from source)
4. **Consistent**: Same element = same motion everywhere

---

## 5. SURFACE & ELEVATION HIERARCHY

### The 5 Elevation Levels

| Level | Shadow | Z-Index | Usage |
|-------|--------|---------|-------|
| **Level 0** | None | 0 | Background, page surface |
| **Level 1** | Subtle | 1 | Cards, list items |
| **Level 2** | Light | 2 | Raised cards, floating action buttons |
| **Level 3** | Medium | 3 | Mini Player, sticky headers |
| **Level 4** | Strong | 4 | Bottom sheets, context menus |
| **Level 5** | Heavy | 5 | Modal dialogs, overlays |

### Color Layering

```
[Background] → [Surface] → [Surface Container] → [Card] → [Elevated Card]
   darkest        ↑            ↑                   ↑           lightest
                each level slightly lighter in dark mode
                each level slightly darker in light mode
```

---

## 6. COMPONENT CONSISTENCY RULES

### Interactive Elements

| Component | Height | Radius | Touch Target |
|-----------|--------|--------|--------------|
| Button (Primary) | 44px | 22px (pill) | 44px |
| Button (Secondary) | 36px | 18px (pill) | 44px |
| Chip | 36px | 18px (pill) | 44px |
| Icon Button | 44px | 22px (circle) | 44px |
| List Item | 56px / 72px | 0 | Full width |
| Card | Auto | 12px | Full area |
| Slider Thumb | 20px | 10px (circle) | 44px |

### Consistent Card Anatomy

```
┌─────────────────────────────────────┐
│ [16px padding all sides]             │
│                                      │
│ [Icon/Image]  [Title - Primary]      │
│               [Subtitle - Tertiary]  │
│                                      │
│ [16px padding all sides]             │
└─────────────────────────────────────┘
   └── 12px border radius ──┘
```

---

# PART 3: REFACTORING PRIORITY MATRIX

---

## Critical Priority (Week 1) - Fix Immediately

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 1 | Now Playing Screen - complete layout restructure | High | High |
| 2 | Sound Lab Screen - section spacing and slider alignment | High | Medium |
| 3 | MiniPlayer - elevation, sizing, touch targets | High | Low |
| 4 | Song Context Menu - bottom sheet structure | High | Medium |
| 5 | Global spacing tokens enforcement | High | Medium |

## High Priority (Week 2) - Core Screens

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 6 | Listen Screen - section gaps, card consistency | High | Medium |
| 7 | Library Screen - tab bar, search, list items | High | Medium |
| 8 | Queue Screen - list item heights, dividers | Medium | Low |
| 9 | Radio Screen - card symmetry | Medium | Low |
| 10 | SongCard component - standardize | High | Low |

## Medium Priority (Week 3) - Detail Screens

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 11 | Album Detail Screen - hero section | Medium | Medium |
| 12 | Artist Detail Screen - layout alignment | Medium | Medium |
| 13 | Playlist Detail Screen - header consistency | Medium | Low |
| 14 | Settings Screen - section styling | Medium | Low |
| 15 | Appearance Screen - theme grid | Medium | Low |

## Low Priority (Week 4) - Polish

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 16 | All modals - consistent dialog styling | Medium | Medium |
| 17 | Toast component - Fluent styling | Low | Low |
| 18 | Onboarding screens - spacing fixes | Low | Medium |
| 19 | About/License/Privacy screens - typography | Low | Low |
| 20 | Splash/Loading screens - branding | Low | Low |

---

## IMPLEMENTATION APPROACH

### Phase 1: Token Enforcement
1. Audit all StyleSheet.create() usages
2. Replace hardcoded values with Fluent tokens
3. Update shared components first

### Phase 2: Component Hardening
1. Update FluentButton, FluentCard, FluentChip with strict specs
2. Create FluentListItem, FluentSearchBar, FluentSlider
3. Deprecate legacy Card, Button components

### Phase 3: Screen-by-Screen Refactor
1. Start with highest-traffic screens (Now Playing, Listen, Library)
2. Apply rhythm rules to layout structure
3. Verify hierarchy at 3 levels only
4. Test touch targets (44px minimum)

### Phase 4: Motion & Polish
1. Standardize all animation durations and curves
2. Add proper elevation shadows
3. Implement consistent focus/pressed states

---

## SUCCESS METRICS

| Metric | Current | Target |
|--------|---------|--------|
| Global Fluent 2 Compliance | 4.5/10 | 9/10 |
| Spacing Token Usage | ~40% | 100% |
| Typography Token Usage | ~50% | 100% |
| Touch Target Compliance | ~60% | 100% |
| Consistent Card Radii | ~30% | 100% |
| Proper Elevation Usage | ~20% | 100% |

---

*Last Updated: January 19, 2026*  
*Audit Version: 1.0*
