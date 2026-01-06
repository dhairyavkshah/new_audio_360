# New Audio 360 Design Language

## Overview

This document establishes the official design language for New Audio 360, a premium offline music player. All UI components, screens, and interactions must adhere to these specifications to ensure visual consistency and professional quality.

---

## 1. SPACING SYSTEM

### Base Unit: 4px

All spacing values are multiples of 4px to ensure consistent rhythm.

### Spacing Scale (USE THESE TOKENS ONLY)

| Token Name | Value | Usage |
|------------|-------|-------|
| `Spacing.none` | 0px | No spacing |
| `Spacing.xxs` | 2px | Micro adjustments only |
| `Spacing.xs` | 4px | Icon-to-text gaps, tight element separation |
| `Spacing.s` | 8px | Inline elements, small gaps, icon gaps |
| `Spacing.m` | 12px | Content block spacing, compact padding |
| `Spacing.l` | 16px | Standard padding, input fields, between sections |
| `Spacing.xl` | 20px | Comfortable padding, card padding |
| `Spacing.xxl` | 24px | Section gaps, major separation |
| `Spacing.xxxl` | 32px | Large structural gaps, page-level separation |

### Semantic Spacing Tokens

| Token Name | Value | Context |
|------------|-------|---------|
| `Spacing.iconGap` | 8px | Gap between icon and text |
| `Spacing.titleToSubtitle` | 4px | Gap between title and subtitle text |
| `Spacing.contentBlock` | 12px | Gap between content elements |
| `Spacing.sectionGap` | 24px | Gap between major sections (use `Layout.sectionGap`) |

### DEPRECATED TOKENS (DO NOT USE)

The following tokens exist for backward compatibility but should be migrated:
- `Spacing.size1` through `Spacing.size20` → Use named tokens instead
- `Spacing.sm`, `Spacing.md`, `Spacing.lg` → Use `Spacing.m`, `Spacing.l`, `Spacing.xl`
- `Spacing["2xs"]`, `Spacing["2xl"]`, `Spacing["3xl"]` → Use named equivalents

---

## 2. LAYOUT DIMENSIONS

### Fixed Heights (MUST USE)

| Token Name | Value | Component |
|------------|-------|-----------|
| `Layout.topBarHeight` | 56px | Navigation/header bars |
| `Layout.secondaryBarHeight` | 48px | Filter bars, search bars |
| `Layout.bottomNavHeight` | 64px | Bottom tab navigation |
| `Layout.miniPlayerHeight` | 68px | Mini player overlay |
| `Layout.inputFieldHeight` | 48px | Text inputs, search inputs |
| `Layout.touchTargetMin` | 48px | Minimum tappable area |

### List Item Heights

| Token Name | Value | Usage |
|------------|-------|-------|
| `Layout.listItemCompact` | 48px | Dense lists, settings items |
| `Layout.listItemStandard` | 56px | Standard list items |
| `Layout.listItemRich` | 72px | Items with artwork/thumbnail |

### Button Heights

| Token Name | Value | Usage |
|------------|-------|-------|
| `Layout.buttonSmall` | 36px | Secondary actions, chips |
| `Layout.buttonStandard` | 44px | Default buttons |
| `Layout.buttonLarge` | 48px | Primary call-to-action |
| `Layout.playButtonLarge` | 56px | Main playback control |

### Horizontal Padding

| Token Name | Value | Usage |
|------------|-------|-------|
| `Layout.horizontalPaddingMin` | 16px | Minimum screen padding |
| `Layout.horizontalPadding` | 20px | Standard screen padding |
| `Layout.horizontalPaddingMax` | 24px | Maximum (never exceed) |

---

## 3. TYPOGRAPHY SYSTEM

### Primary Text Styles (USE THESE)

| Style Name | Size | Weight | Line Height | Usage |
|------------|------|--------|-------------|-------|
| `display` | 40px | 600 | 52px | Large hero numbers/text |
| `titleLarge` / `h1` | 20px | 600 | 28px | Screen titles, major headings |
| `titleMedium` / `h2` | 16px | 600 | 22px | Section headings, card titles |
| `titleSmall` / `h3` | 14px | 600 | 20px | Subsection headings |
| `body` / `bodyMedium` | 14px | 400 | 20px | Primary body text |
| `bodySmall` / `small` | 12px | 400 | 16px | Secondary text, descriptions |
| `labelLarge` | 14px | 600 | 20px | Button text, emphasized labels |
| `labelMedium` | 12px | 600 | 16px | Chips, tags, small buttons |
| `labelSmall` | 10px | 600 | 14px | Minimal labels |
| `caption` | 12px | 400 | 16px | Helper text, metadata |
| `captionSmall` | 10px | 400 | 14px | Timestamps, minimal info |

### ThemedText Type Mapping

Always use `<ThemedText type="...">` with these types:
- Screen titles: `type="h1"` or `type="titleLarge"`
- Section headers: `type="h2"` or `type="titleMedium"`
- Card/item titles: `type="h3"` or `type="titleSmall"`
- Body content: `type="body"`
- Secondary info: `type="bodySmall"` or `type="small"`
- Buttons: `type="labelLarge"`
- Chips/badges: `type="labelMedium"`
- Captions: `type="caption"`

### NEVER DO

- Never use raw `fontSize` values in StyleSheet
- Never mix type styles inconsistently (e.g., caption for titles)
- Never use `fontWeight` directly; let ThemedText handle it

---

## 4. BORDER RADIUS

### Standard Radii

| Token Name | Value | Usage |
|------------|-------|-------|
| `BorderRadius.none` | 0px | Sharp corners |
| `BorderRadius.small` | 4px | Subtle rounding, chips |
| `BorderRadius.medium` | 8px | Buttons, inputs |
| `BorderRadius.large` | 12px | Cards, containers |
| `BorderRadius.xLarge` | 16px | Large cards, modals, mini player |
| `BorderRadius.circular` | 9999px | Pills, circular elements |

### Component-Specific

| Token Name | Value | Component |
|------------|-------|-----------|
| `BorderRadius.button` | 8px | All buttons |
| `BorderRadius.input` | 8px | Text inputs |
| `BorderRadius.card` | 12px | Standard cards |
| `BorderRadius.cardLarge` | 16px | Featured cards |
| `BorderRadius.miniPlayer` | 16px | Mini player |
| `BorderRadius.dialog` | 16px | Modals, dialogs |
| `BorderRadius.pill` | 9999px | Pill-shaped elements |

---

## 5. ELEVATION & SHADOWS

### Elevation Levels

| Level | Value | Usage |
|-------|-------|-------|
| `Elevation.level0` | 0 | Flat surfaces |
| `Elevation.level1` | 2 | Subtle lift (cards) |
| `Elevation.level2` | 4 | Floating elements |
| `Elevation.level3` | 8 | Modals, overlays |
| `Elevation.level4` | 16 | High emphasis |
| `Elevation.level5` | 24 | Maximum elevation |

### Shadow Tokens (Web/CSS)

Use `Fluent2Tokens.shadow2` through `Fluent2Tokens.shadow64` for box shadows.

---

## 6. TOUCH TARGETS

### Minimum Requirements

- **Minimum touch target**: 48x48px (`Layout.touchTargetMin`)
- **Comfortable touch target**: 56x56px
- **Icon buttons**: 48x48px minimum, even if icon is 24px
- **List items**: Full-width, minimum 48px height

### Implementation

```tsx
// CORRECT: Touch target wrapper
<Pressable 
  style={{ minWidth: Layout.touchTargetMin, minHeight: Layout.touchTargetMin }}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <Icon size={24} />
</Pressable>

// INCORRECT: No touch expansion
<Pressable>
  <Icon size={24} />
</Pressable>
```

---

## 7. ANIMATION & MOTION

### Duration Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `Motion.duration.fast` | 100ms | Micro-interactions, button presses |
| `Motion.duration.normal` | 200ms | Standard transitions |
| `Motion.duration.slow` | 300ms | Complex animations |
| `Motion.duration.slower` | 400ms | Page transitions |

### Easing Curves

| Token | Usage |
|-------|-------|
| `Motion.easing.fluent` | Standard transitions |
| `Motion.easing.fluentDecelerate` | Elements entering |
| `Motion.easing.fluentAccelerate` | Elements exiting |
| `Motion.easing.emphasized` | Important transitions |

### Spring Animations (Reanimated)

```tsx
// Standard spring
withSpring(value, Motion.spring)

// Gentle spring
withSpring(value, Motion.slowSpring)
```

---

## 8. ICON SIZING

### Standard Sizes

| Size | Value | Usage |
|------|-------|-------|
| Small | 16px | Inline icons, badges |
| Medium | 20px | List item icons |
| Default | 24px | Navigation, actions |
| Large | 28px | Featured icons |
| XLarge | 32px | Hero icons |

### Icon Colors

Always use theme colors:
- Primary action: `theme.primary`
- Interactive: `theme.text`
- Secondary: `theme.textSecondary`
- Disabled: `theme.textTertiary`

---

## 9. COLOR USAGE

### Text Colors

| Color | Token | Usage |
|-------|-------|-------|
| Primary text | `theme.text` | Main content, titles |
| Secondary text | `theme.textSecondary` | Descriptions, captions |
| Tertiary text | `theme.textTertiary` | Disabled, hints |

### Background Colors

| Color | Token | Usage |
|-------|-------|-------|
| Root | `theme.backgroundRoot` | App background |
| Default | `theme.backgroundDefault` | Screen backgrounds |
| Surface | `theme.surface` | Cards, containers |
| Surface Variant | `theme.surfaceVariant` | Inputs, secondary surfaces |

### Interactive Colors

| Color | Token | Usage |
|-------|-------|-------|
| Primary | `theme.primary` | CTAs, links, active states |
| Primary Hover | `theme.primaryHover` | Hover states |
| Primary Pressed | `theme.primaryPressed` | Press states |

---

## 10. COMPONENT PATTERNS

### Card Pattern

```tsx
const cardStyle = {
  backgroundColor: theme.cardBackground,
  borderRadius: BorderRadius.card,
  padding: Spacing.l,
  gap: Spacing.m,
};
```

### List Item Pattern

```tsx
const listItemStyle = {
  minHeight: Layout.listItemStandard,
  paddingHorizontal: Layout.horizontalPadding,
  paddingVertical: Spacing.m,
  gap: Spacing.s,
};
```

### Button Pattern

```tsx
const buttonStyle = {
  height: Layout.buttonStandard,
  paddingHorizontal: Spacing.l,
  borderRadius: BorderRadius.button,
};
```

### Input Pattern

```tsx
const inputStyle = {
  height: Layout.inputFieldHeight,
  paddingHorizontal: Spacing.l,
  borderRadius: BorderRadius.input,
  backgroundColor: theme.surfaceVariant,
};
```

---

## 11. SCREEN LAYOUT STRUCTURE

### Standard Screen Template

```tsx
<View style={{ flex: 1, backgroundColor: theme.backgroundDefault }}>
  {/* TopBar: 56px */}
  <TopBar title="Screen Title" />
  
  {/* Content with horizontal padding */}
  <ScrollView contentContainerStyle={{ 
    paddingHorizontal: Layout.horizontalPadding,
    paddingTop: Spacing.l,
    paddingBottom: Layout.bottomNavHeight + Layout.miniPlayerHeight + Spacing.xxl,
  }}>
    {/* Section with gap */}
    <View style={{ gap: Layout.sectionGap }}>
      {/* Section Header */}
      <ThemedText type="h2">Section Title</ThemedText>
      
      {/* Content */}
      <View style={{ gap: Spacing.m }}>
        {/* Items */}
      </View>
    </View>
  </ScrollView>
</View>
```

---

## 12. CHECKLIST FOR CONSISTENCY

Before completing any UI work, verify:

- [ ] All spacing uses Spacing tokens (no magic numbers)
- [ ] All heights use Layout tokens
- [ ] All text uses ThemedText with proper type
- [ ] All border radius uses BorderRadius tokens
- [ ] Touch targets are minimum 48px
- [ ] Colors use theme tokens, never hardcoded
- [ ] Animations use Motion tokens
- [ ] Icons use standard sizes (16, 20, 24, 28, 32)

---

## 13. MIGRATION NOTES

### Tokens to Replace

| Old | New |
|-----|-----|
| `Spacing.sm` | `Spacing.m` (12px) |
| `Spacing.md` | `Spacing.l` (16px) |
| `Spacing.lg` | `Spacing.xl` (20px) |
| `Spacing.size4` | `Spacing.l` (16px) |
| Raw `24` | `Spacing.xxl` or `Layout.sectionGap` |
| Raw `48` | `Layout.touchTargetMin` |
| Raw `56` | `Layout.listItemStandard` |

---

*Last Updated: January 2026*
*Version: 1.0.0*
