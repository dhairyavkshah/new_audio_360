# New Audio 360 Design Language

## Overview

This document establishes the official design language for New Audio 360, organized by UI component region. All screens must follow these specifications for visual consistency.

**Base Unit**: 4px (all values are multiples of 4)

---

## 1. TOP BAR (HOME SCREEN)

The primary navigation header on the app's main entry point (Listen tab home).

### Dimensions
| Property | Value | Token |
|----------|-------|-------|
| Height | 56px | `Layout.topBarHeight` |
| Horizontal Padding | 20px | `Layout.horizontalPadding` |
| Vertical Padding | 12px | `Spacing.m` |

### Content Layout
| Element | Specification |
|---------|---------------|
| App Title/Logo | Left-aligned, `ThemedText type="h1"` (20px, weight 600) |
| Action Icons | Right-aligned, 24px icons, 48px touch target |
| Icon Gap | 8px between multiple icons |

### Styling
| Property | Value | Token |
|----------|-------|-------|
| Background | `theme.surfaceContainer` | - |
| Title Color | `theme.text` | - |
| Icon Color | `theme.text` | - |
| Bottom Border | None (use elevation shadow) | - |
| Shadow | `M3Elevation.level2` | - |

### Example Structure
```
[56px height]
├── [20px padding] App Title ─────────────── [Icon 48x48] [8px] [Icon 48x48] [20px padding]
```

---

## 2. TOP BAR (SUB-PAGES)

Header bar for all screens other than the main home tabs (Now Playing, Settings sub-pages, Playlist Detail, etc.).

### Dimensions
| Property | Value | Token |
|----------|-------|-------|
| Height | 56px | `Layout.topBarHeight` |
| Horizontal Padding | 16px | `Layout.horizontalPaddingMin` |
| Back Button Size | 48x48px | `Layout.touchTargetMin` |

### Content Layout
| Element | Specification |
|---------|---------------|
| Back Button | Left-aligned, chevron-left icon (24px), 48px touch target |
| Page Title | Center-aligned, `ThemedText type="h2"` (16px, weight 600) |
| Action Icons | Right-aligned (optional), 24px icons, 48px touch target |
| Back-to-Title Gap | 8px | `Spacing.s` |

### Styling
| Property | Value | Token |
|----------|-------|-------|
| Background | `theme.surfaceContainer` or transparent (for Now Playing) | - |
| Title Color | `theme.text` | - |
| Back Icon Color | `theme.text` | - |
| Shadow | Optional `M3Elevation.level2` | - |

### Example Structure
```
[56px height]
├── [16px] [Back 48x48] [8px] ─── Page Title (centered) ─── [Action 48x48] [16px]
```

---

## 3. BAR 1 BELOW TOP BAR (Search/Filter Bar)

The primary utility bar directly below the top bar, typically containing search input.

### Dimensions
| Property | Value | Token |
|----------|-------|-------|
| Height | 48px (content area) | `Layout.secondaryBarHeight` |
| Total Height with Padding | 64px | - |
| Horizontal Padding | 20px | `Layout.horizontalPadding` |
| Vertical Padding | 8px top, 8px bottom | `Spacing.s` |
| Input Field Height | 48px | `Layout.inputFieldHeight` |

### Content Layout
| Element | Specification |
|---------|---------------|
| Search Input | Full-width minus action button, 48px height |
| Search Icon | 18px, inside input left, 12px from edge |
| Clear Button | 16px icon, 44px touch target, inside input right |
| Sort/Filter Button | 48x48px, 8px gap from input |

### Styling
| Property | Value | Token |
|----------|-------|-------|
| Background | `theme.backgroundDefault` | - |
| Input Background | `theme.surfaceVariant` | - |
| Input Border Radius | 8px | `BorderRadius.input` |
| Placeholder Color | `theme.textSecondary` | - |
| Input Text | `ThemedText type="body"` (14px) | - |

### Example Structure
```
[64px total]
├── [8px top padding]
├── [48px content] [20px] [Search Input ─────────────────] [8px] [Sort 48x48] [20px]
├── [8px bottom padding]
```

---

## 4. BAR 2 BELOW TOP BAR (Category/Tab Bar)

Secondary filter bar with horizontal scrolling chips or tabs.

### Dimensions
| Property | Value | Token |
|----------|-------|-------|
| Height | 48px | `Layout.tabHeight` |
| Horizontal Padding | 20px (first/last item margin) | `Layout.horizontalPadding` |
| Chip Height | 36px | `Layout.buttonSmall` |
| Chip Gap | 8px | `Spacing.s` |

### Content Layout
| Element | Specification |
|---------|---------------|
| Chips/Tabs | Horizontal scroll, 36px height |
| Chip Padding | 16px horizontal | `Spacing.l` |
| Chip Text | `ThemedText type="labelMedium"` (12px, weight 600) |
| Active Indicator | Background color change or underline |

### Styling
| Property | Value | Token |
|----------|-------|-------|
| Background | `theme.backgroundDefault` | - |
| Chip Background (inactive) | `theme.surfaceVariant` | - |
| Chip Background (active) | `theme.primary` with 15% opacity | - |
| Chip Text (inactive) | `theme.textSecondary` | - |
| Chip Text (active) | `theme.primary` | - |
| Chip Border Radius | 9999px (pill) | `BorderRadius.pill` |

### Example Structure
```
[48px height]
├── [scroll] [20px] [Chip 36px] [8px] [Chip 36px] [8px] [Chip 36px] ... [20px]
```

---

## 5. MAIN CONTENT AREA

The primary scrollable content region between bars.

### Dimensions
| Property | Value | Token |
|----------|-------|-------|
| Horizontal Padding | 20px | `Layout.horizontalPadding` |
| Top Padding | 16px | `Spacing.l` |
| Bottom Padding | 156px minimum (Nav + MiniPlayer + gap) | Calculated |
| Section Gap | 24px | `Layout.sectionGap` |
| Card Gap | 12px | `Layout.cardGap` |

### List Items

#### Standard List Item (Song, Setting)
| Property | Value | Token |
|----------|-------|-------|
| Height | 56px | `Layout.listItemStandard` |
| Horizontal Padding | 16px | `Spacing.l` |
| Vertical Padding | 12px | `Spacing.m` |
| Icon Size | 24px | - |
| Icon-to-Text Gap | 12px | `Spacing.contentBlock` |

#### Rich List Item (with Artwork)
| Property | Value | Token |
|----------|-------|-------|
| Height | 72px | `Layout.listItemRich` |
| Artwork Size | 48x48px | - |
| Artwork Border Radius | 8px | `BorderRadius.medium` |
| Artwork-to-Text Gap | 12px | `Spacing.contentBlock` |

#### Compact List Item
| Property | Value | Token |
|----------|-------|-------|
| Height | 48px | `Layout.listItemCompact` |
| Vertical Padding | 8px | `Spacing.s` |

### List Item Typography
| Element | Style | Size |
|---------|-------|------|
| Primary Text | `ThemedText type="body"` | 14px |
| Secondary Text | `ThemedText type="caption"` | 12px |
| Title-to-Subtitle Gap | 4px | `Spacing.titleToSubtitle` |

### Cards

| Property | Value | Token |
|----------|-------|-------|
| Padding | 16px | `CardPadding.standard` |
| Border Radius | 12px | `BorderRadius.card` |
| Background | `theme.cardBackground` | - |
| Border | 1px `theme.cardBorder` | - |
| Gap Between Cards | 12px | `Layout.cardGap` |

### Section Headers
| Element | Style |
|---------|-------|
| Section Title | `ThemedText type="h2"` (16px, weight 600) |
| Section Title Margin Bottom | 12px | `Spacing.contentBlock` |

### Example Structure
```
[Main Content Area]
├── [16px top padding]
├── Section Title (h2)
├── [12px gap]
├── [Card or List Items]
├── [24px section gap]
├── Section Title (h2)
├── [12px gap]
├── [Card or List Items]
├── [156px bottom padding for nav/player]
```

---

## 6. FLOATING BAR (MINI PLAYER)

The persistent mini player floating above the bottom navigation.

### Dimensions
| Property | Value | Token |
|----------|-------|-------|
| Height | 68px | `Layout.miniPlayerHeight` |
| Horizontal Margin | 16px from screen edges | `Spacing.l` |
| Bottom Margin | 8px above bottom nav | `Layout.miniPlayerGapFromNav` |
| Internal Padding | 12px | `Spacing.m` |
| Border Radius | 16px | `BorderRadius.miniPlayer` |

### Content Layout
| Element | Specification |
|---------|---------------|
| Artwork | 44x44px, left-aligned, 8px border radius |
| Song Info | Left of controls, flex-grow |
| Song Title | `ThemedText type="body"` (14px), single line, ellipsis |
| Artist | `ThemedText type="caption"` (12px), single line, ellipsis |
| Title-to-Artist Gap | 2px | `Spacing.xxs` |
| Artwork-to-Info Gap | 12px | `Spacing.m` |
| Play/Pause Button | 44x44px touch target, 24px icon |
| Next Button | 44x44px touch target, 20px icon |
| Button Gap | 4px | `Spacing.xs` |

### Styling
| Property | Value | Token |
|----------|-------|-------|
| Background | Glassmorphism blur OR `theme.surfaceContainer` | - |
| Blur Intensity | 20-40 (iOS), 15-25 (Android) | - |
| Shadow | `M3Elevation.level3` | - |
| Text Color | `theme.text` | - |
| Icon Color | `theme.text` | - |

### Example Structure
```
[68px height, 16px margins]
├── [12px] [Art 44x44] [12px] [Title/Artist ───] [Play 44x44] [4px] [Next 44x44] [12px]
```

---

## 7. MODAL / OVERLAY

Full-screen or partial overlays including dialogs, sheets, and context menus.

### Bottom Sheet
| Property | Value | Token |
|----------|-------|-------|
| Border Radius (top) | 16px | `BorderRadius.dialog` |
| Horizontal Padding | 20px | `Layout.horizontalPadding` |
| Top Padding | 16px | `Spacing.l` |
| Bottom Padding | 24px + safe area | `Spacing.xxl` |
| Handle Bar Width | 40px | - |
| Handle Bar Height | 4px | - |
| Handle Bar Margin | 8px bottom | `Spacing.s` |

### Dialog/Modal
| Property | Value | Token |
|----------|-------|-------|
| Width | 90% of screen, max 400px | - |
| Border Radius | 16px | `BorderRadius.dialog` |
| Padding | 24px | `Spacing.xxl` |
| Title | `ThemedText type="h2"` (16px, weight 600) |
| Body Text | `ThemedText type="body"` (14px) |
| Title-to-Body Gap | 12px | `Spacing.contentBlock` |
| Body-to-Buttons Gap | 24px | `Spacing.xxl` |
| Button Gap | 12px | `Spacing.m` |

### Context Menu
| Property | Value | Token |
|----------|-------|-------|
| Width | 200-280px | - |
| Border Radius | 12px | `BorderRadius.card` |
| Item Height | 48px | `Layout.listItemCompact` |
| Item Padding | 16px horizontal | `Spacing.l` |
| Icon Size | 20px | - |
| Icon-to-Text Gap | 12px | `Spacing.contentBlock` |

### Overlay Background
| Property | Value | Token |
|----------|-------|-------|
| Scrim Color | `theme.scrim` (rgba black 40-70%) | - |

### Styling
| Property | Value | Token |
|----------|-------|-------|
| Background | `theme.surface` | - |
| Shadow | `M3Elevation.level4` | - |
| Handle Bar Color | `theme.outline` | - |

### Example Structure (Bottom Sheet)
```
[Bottom Sheet]
├── [Scrim Overlay 40% black]
├── [Sheet with 16px top radius]
│   ├── [16px top padding]
│   ├── [Handle Bar 40x4px, centered]
│   ├── [8px gap]
│   ├── Content Area
│   │   ├── [Menu Item 48px height] × N
│   ├── [24px + safe area bottom padding]
```

---

## 8. BOTTOM BAR (Tab Navigation)

The persistent bottom tab bar for primary navigation.

### Dimensions
| Property | Value | Token |
|----------|-------|-------|
| Height | 64px + safe area (iOS) | `Layout.bottomNavHeight` |
| Icon Size | 24px | - |
| Label Size | 10px | `Typography.labelSmall` |
| Icon-to-Label Gap | 4px | `Spacing.xs` |
| Touch Target | Full tab width, 64px height | - |

### Content Layout
| Element | Specification |
|---------|---------------|
| Tab Count | 3 (Listen, Library, Settings) |
| Tab Distribution | Equal width |
| Icon Position | Centered horizontally |
| Label Position | Below icon, centered |
| Active Indicator | Pill background behind icon (optional) |

### Styling
| Property | Value | Token |
|----------|-------|-------|
| Background | `theme.surfaceContainer` | - |
| Icon (inactive) | `theme.onSurfaceVariant` | - |
| Icon (active) | `theme.primary` | - |
| Label (inactive) | `theme.onSurfaceVariant` | - |
| Label (active) | `theme.primary` | - |
| Active Pill Color | `theme.primary` with 15% opacity | - |
| Active Pill Radius | 16px | - |
| Top Border | None (use shadow) | - |
| Shadow | `M3Elevation.level2` (inverted) | - |

### Example Structure
```
[64px height + safe area]
├── [Tab 1: Listen]     [Tab 2: Library]    [Tab 3: Settings]
│   ├── [Icon 24px]     ├── [Icon 24px]     ├── [Icon 24px]
│   ├── [4px gap]       ├── [4px gap]       ├── [4px gap]
│   └── [Label 10px]    └── [Label 10px]    └── [Label 10px]
```

---

## QUICK REFERENCE TABLE

| Component | Height | Horizontal Padding | Key Token |
|-----------|--------|-------------------|-----------|
| Top Bar (Home) | 56px | 20px | `Layout.topBarHeight` |
| Top Bar (Sub-page) | 56px | 16px | `Layout.topBarHeight` |
| Bar 1 (Search) | 48px content | 20px | `Layout.secondaryBarHeight` |
| Bar 2 (Chips) | 48px | 20px | `Layout.tabHeight` |
| Main Content | Flex | 20px | `Layout.horizontalPadding` |
| Mini Player | 68px | 16px margin | `Layout.miniPlayerHeight` |
| Modal/Sheet | Varies | 20-24px | `BorderRadius.dialog` |
| Bottom Nav | 64px + safe | Full width | `Layout.bottomNavHeight` |

---

## TYPOGRAPHY QUICK REFERENCE

| Usage | ThemedText Type | Size | Weight |
|-------|-----------------|------|--------|
| App Title (Home) | `h1` / `titleLarge` | 20px | 600 |
| Page Title (Sub-page) | `h2` / `titleMedium` | 16px | 600 |
| Section Header | `h2` / `titleMedium` | 16px | 600 |
| Card Title | `h3` / `titleSmall` | 14px | 600 |
| Body Text | `body` | 14px | 400 |
| Secondary Text | `bodySmall` / `small` | 12px | 400 |
| Button Label | `labelLarge` | 14px | 600 |
| Chip Label | `labelMedium` | 12px | 600 |
| Caption/Metadata | `caption` | 12px | 400 |
| Tab Label | `labelSmall` | 10px | 600 |

---

## TOUCH TARGET REQUIREMENTS

| Component | Minimum Size |
|-----------|--------------|
| Icon Buttons | 48x48px |
| List Items | Full width × 48px min |
| Chips/Tags | 36px height, 48px if standalone |
| Tab Bar Tabs | Full width × 64px |
| Mini Player | Full width × 68px |

---

*Last Updated: January 2026*
*Version: 2.0.0*
