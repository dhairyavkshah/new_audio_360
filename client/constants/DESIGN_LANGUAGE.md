# New Audio 360 Design Language

## Overview

This document establishes the official design language for New Audio 360, a premium music player application. All screens must follow these specifications for visual consistency, accessibility, and brand alignment.

**Design System**: Microsoft Fluent 2  
**Base Unit**: 4px (all values are multiples of 4)  
**Tagline**: "Top-grade music experience crafted for you"

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

### Cards
| Property | Value | Token |
|----------|-------|-------|
| Padding | 16px | `CardPadding.standard` |
| Border Radius | 12px | `BorderRadius.card` |
| Background | `theme.cardBackground` | - |
| Border | 1px `theme.cardBorder` | - |
| Gap Between Cards | 12px | `Layout.cardGap` |

---

## 6. SOUND LAB COMPONENTS

Specialized UI components for the audio effects interface.

### Slider Controls (Bass/Treble)
| Property | Value | Token |
|----------|-------|-------|
| Track Height | 6px | `FluentSliderSize.trackMedium` |
| Thumb Size | 20px | `FluentSliderSize.thumbMedium` |
| Slider Width | Full width - 40px padding | - |
| Label Position | Above slider, centered | - |
| Value Display | Below slider, centered | - |

### Slider Value Range
| Control | Slider Range | dB Range | Filter Type |
|---------|--------------|----------|-------------|
| Bass | -5 to +5 | ±12 dB | Lowshelf @ 150Hz |
| Treble | -5 to +5 | ±12 dB | Highshelf @ 6kHz |

### EQ Preset Chips
| Property | Value | Token |
|----------|-------|-------|
| Height | 36px | `FluentControlHeight.medium` |
| Padding | 16px horizontal | `Spacing.l` |
| Border Radius | 18px (pill) | `BorderRadius.pill` |
| Gap | 8px | `Spacing.s` |

### Immersive Mode Cards
| Property | Value | Token |
|----------|-------|-------|
| Height | 80px | - |
| Width | Full width | - |
| Icon Size | 32px | - |
| Border Radius | 12px | `BorderRadius.card` |
| Selected Border | 2px primary | - |

---

## 7. FLOATING BAR (MINI PLAYER)

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

---

## 8. MODAL / OVERLAY

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

### Dialog/Modal
| Property | Value | Token |
|----------|-------|-------|
| Width | 90% of screen, max 400px | - |
| Border Radius | 16px | `BorderRadius.dialog` |
| Padding | 24px | `Spacing.xxl` |

---

## 9. BOTTOM BAR (Tab Navigation)

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
| Tab Count | 4 (Listen, Library, Radio, Settings) |
| Tab Distribution | Equal width |
| Icon Position | Centered horizontally |
| Label Position | Below icon, centered |

### Styling
| Property | Value | Token |
|----------|-------|-------|
| Background | `theme.surfaceContainer` | - |
| Icon (inactive) | `theme.onSurfaceVariant` | - |
| Icon (active) | `theme.primary` | - |
| Label (inactive) | `theme.onSurfaceVariant` | - |
| Label (active) | `theme.primary` | - |

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
| Sliders | 20px thumb with 48px touch area |

---

## FLUENT 2 TOKEN SYSTEM

The application uses a comprehensive token system from `@/constants/fluent2` for design consistency.

### Token Categories

| Category | Import | Purpose |
|----------|--------|---------|
| `FluentSpacing` | spacing.ts | Base spacing scale (4px increments) |
| `FluentControlHeight` | controls.ts | Interactive element heights |
| `FluentSliderSize` | controls.ts | Slider thumb and track dimensions |
| `FluentBorderWidth` | controls.ts | Border thickness tokens |
| `FluentTouchTarget` | controls.ts | Accessibility minimum touch sizes |
| `FluentLayoutSize` | controls.ts | Component dimensions |
| `FluentControlRadius` | radii.ts | Corner radii for controls |
| `FluentTypography` | typography.ts | Text styles and sizes |

### Control Heights (FluentControlHeight)

| Token | Value | Use Case |
|-------|-------|----------|
| `small` | 32px | Compact buttons, chips |
| `medium` | 36px | Default buttons |
| `large` | 44px | Primary actions, meets touch target |
| `xlarge` | 48px | Large interactive elements |

### Slider Sizes (FluentSliderSize)

| Token | Value | Use Case |
|-------|-------|----------|
| `thumbSmall` | 16px | Compact sliders |
| `thumbMedium` | 20px | Default volume/EQ sliders |
| `thumbLarge` | 24px | Large sliders |
| `trackThin` | 4px | Inactive/subtle tracks |
| `trackMedium` | 6px | Active/highlighted tracks |
| `trackThick` | 8px | Prominent tracks |

### Touch Target (FluentTouchTarget)

| Token | Value | Description |
|-------|-------|-------------|
| `minimum` | 44px | WCAG AA minimum touch target |
| `recommended` | 48px | Preferred touch target size |

### Example Usage

```typescript
import { 
  FluentControlHeight, 
  FluentSliderSize, 
  FluentBorderWidth,
  FluentTouchTarget 
} from '@/constants/fluent2';

const styles = StyleSheet.create({
  button: {
    height: FluentControlHeight.medium,
    borderWidth: FluentBorderWidth.thin,
  },
  slider: {
    thumbSize: FluentSliderSize.thumbMedium,
    trackHeight: FluentSliderSize.trackMedium,
  },
});

// Ensure touch target compliance
const hitSlop = {
  top: (FluentTouchTarget.minimum - iconSize) / 2,
  bottom: (FluentTouchTarget.minimum - iconSize) / 2,
  left: (FluentTouchTarget.minimum - iconSize) / 2,
  right: (FluentTouchTarget.minimum - iconSize) / 2,
};
```

---

*Last Updated: January 18, 2026*  
*Version: 2.2.0*
