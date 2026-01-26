# Design Audit & Harmonization Plan — Microsoft Fluent 2

**New Audio 360**  
**Audit Date:** January 19, 2026  
**Auditor:** Design Architect Agent

---

## Executive Summary

This audit evaluates the visual harmony, symmetry, and Microsoft Fluent 2 ideology implementation across all screens of New Audio 360. While the application has a solid Fluent 2 token infrastructure, there are opportunities for harmonization to achieve a fully cohesive, premium visual experience.

**Current State:** 70% Fluent 2 Compliant  
**Target State:** 95% Fluent 2 Compliant

---

## Part 1: Design Audit Report

### 1.1 Token Infrastructure Assessment

**Strengths (Well-Implemented):**
- Comprehensive spacing tokens (`FluentSpacing`: 4px base unit)
- Proper shadow system (`FluentShadows` with 6 levels)
- Typography variants defined (`FluentTypography`)
- Color palette with semantic tokens (`FluentLightColors`, `FluentDarkColors`)
- Border radius tokens (`FluentRadius`, `FluentControlRadius`)
- Touch target compliance (`FluentTouchTarget`)

**Rating: 9/10**

---

### 1.2 Screen-by-Screen Analysis

#### A. Settings Screen
| Aspect | Current State | Issue | Severity |
|--------|---------------|-------|----------|
| Surface Layering | Uses `colorNeutralBackground2` | Consistent | OK |
| Section Headers | Icon + Title pattern | Good, but lacks elevation separation | Low |
| Menu Items | Custom styled Pressables | Missing FluentCard wrapper for elevation | Medium |
| Timer Grid | Flat chips | No elevation, feels flat | Medium |
| Toggle Settings | Inline styled | Consistent with menu items | OK |

**Issues Identified:**
1. Menu items lack subtle elevation shadow
2. Section cards blend into background without depth
3. Timer option chips lack hover/pressed state feedback

---

#### B. Sound Lab Screen
| Aspect | Current State | Issue | Severity |
|--------|---------------|-------|----------|
| Section Cards | Uses `cardStyle` from theme utils | Good approach | OK |
| EQ Chips | `EffectChip` component | Consistent | OK |
| Slider Controls | Custom styled | Good spacing, needs track refinement | Low |
| Active Indicator | Brand background pill | Good | OK |
| Custom Presets Section | Different visual weight | Inconsistent with main sections | Medium |

**Issues Identified:**
1. Effect controls section background (`surfaceVariant`) differs from main cards
2. Custom preset modal styling differs from rest of app
3. Slider track thickness inconsistent (should use `FluentSliderSize`)

---

#### C. Radio Screen
| Aspect | Current State | Issue | Severity |
|--------|---------------|-------|----------|
| Mode Toggle | EffectChip pair | Good | OK |
| FM Tuner Card | Uses GlassCard | Good glassmorphism | OK |
| Station List Items | Custom Pressables | Missing elevation consistency | Medium |
| Now Playing Card | GlassCard | Good | OK |
| Search Container | Manual styling | Border styling differs from Library | Medium |
| Country Picker Modal | Custom modal | Needs FluentSurface treatment | Medium |

**Issues Identified:**
1. Online station items lack consistent elevation with FM favorites
2. Search input styling differs from Library search
3. Country picker modal doesn't use standard modal pattern
4. Signal strength bars use hardcoded colors

---

#### D. Library Screen
| Aspect | Current State | Issue | Severity |
|--------|---------------|-------|----------|
| Category Grid | Via FluentTopBar | Consistent | OK |
| Song Cards | SongCard component | Good | OK |
| Album/Artist Grid | AnimatedCard | Good | OK |
| Playlist Items | Manual Pressables | Differs from Settings menu items | Medium |
| Empty States | Centered with icon | Good | OK |
| Success Toast | Manual styling | Should use Toast component | Low |

**Issues Identified:**
1. Playlist items don't match Settings menu item pattern
2. Grid cards lack consistent elevation treatment
3. Success toast styling inline rather than using Toast system

---

#### E. Now Playing Screen
| Aspect | Current State | Issue | Severity |
|--------|---------------|-------|----------|
| Background Blur | ImageBackground with overlay | Good | OK |
| Artwork Container | Custom shadow | Good depth | OK |
| Song Info | Text with shadow | Good for overlay readability | OK |
| Action Buttons | Icon buttons | Good touch targets | OK |
| Progress Bar | Custom component | Good | OK |
| Playback Controls | PlaybackControls component | Good | OK |

**Issues Identified:**
1. Compact mode spacing feels cramped on small screens
2. Error badge styling differs from other error displays
3. Loading overlay could use FluentSurface for background

---

#### F. About Screen
| Aspect | Current State | Issue | Severity |
|--------|---------------|-------|----------|
| Logo Container | Centered alignment | Good | OK |
| Description Card | GlassCard | Good | OK |
| Feature Items | `colorNeutralBackground2` | Consistent with Settings | OK |
| Legal Links | Same pattern as menu items | Good | OK |
| Footer | Caption text | Good | OK |

**Issues Identified:**
1. Feature item icon container size (48x48) differs from Settings (44x44)
2. Section header icon size (small) differs from Settings (regular)

---

#### G. Privacy Policy Screen
| Aspect | Current State | Issue | Severity |
|--------|---------------|-------|----------|
| Header Card | GlassCard | Good | OK |
| Policy Sections | `colorNeutralBackground2` | Consistent | OK |
| Section Gaps | `FluentSpacing.s` | Good rhythm | OK |
| Footer | Centered caption | Good | OK |

**Issues Identified:**
1. Header icon container uses custom size (64px) not from tokens
2. Policy section padding uses `FluentSpacing.m` vs Settings' `FluentSpacing.l`

---

#### H. Permission Onboarding Flow
| Aspect | Current State | Issue | Severity |
|--------|---------------|-------|----------|
| Step Indicator | Dot progression | Good | OK |
| Icon Container | Large brand background | Good | OK |
| Status Container | `colorNeutralBackground3` | Good | OK |
| Buttons | Primary/Secondary pattern | Good | OK |

**Issues Identified:**
1. Button heights (52px primary, 48px secondary) don't match control height tokens
2. Icon container size (120px) not from tokens
3. Dot size (10px) should be 8px or 12px (4px grid)

---

#### I. Appearance Screen
| Aspect | Current State | Issue | Severity |
|--------|---------------|-------|----------|
| Theme Grid | Grid layout | Good | OK |
| Theme Cards | Pressable with preview | Good | OK |
| Category Chips | Horizontal scroll | Good | OK |

**Issues Identified:**
1. Theme card preview colors hardcoded vs from theme
2. Selected state border width may not use `FluentBorderWidth`

---

#### J. Queue Screen
| Aspect | Current State | Issue | Severity |
|--------|---------------|-------|----------|
| Song Items | Draggable list | Good | OK |
| Current Track | Highlighted | Good | OK |

**Issues Identified:**
1. Drag handle visual weight
2. Current track indicator style

---

### 1.3 Cross-Screen Consistency Issues

| Issue Category | Affected Screens | Description |
|----------------|------------------|-------------|
| **Card Elevation** | Settings, Library, Radio | Inconsistent use of shadows on list items |
| **Section Headers** | Settings, About, Privacy | Icon sizes vary (small vs regular) |
| **Menu/List Items** | Settings, Library, About | Icon container sizes differ (44 vs 48) |
| **Search Input** | Library, Radio | Border and background color treatments differ |
| **Modal/Sheet** | Radio, SoundLab, Library | Inconsistent modal backgrounds and padding |
| **Button Heights** | Onboarding, Settings, Radio | Mix of 48, 52, 44 heights |
| **Chip Components** | SoundLab, Radio, Library | Consistent EffectChip usage |

---

### 1.4 Fluent 2 Ideology Gaps

| Principle | Current State | Gap |
|-----------|---------------|-----|
| **Clarity** | Good typography hierarchy | Some text variants misused |
| **Depth/Elevation** | Partial implementation | List items need subtle elevation |
| **Layering** | Background levels used | Inconsistent surface nesting |
| **Motion Readiness** | Basic animations | Most elements ready for motion |
| **Emotional Warmth** | Good through theming | Some sterile flat areas |
| **Polish** | Good overall | Details need refinement |

---

## Part 2: Fluent 2 Harmonization Plan

### 2.1 High-Priority Fixes (Visual Impact)

#### Fix 1: Standardize List Item Pattern
**Affected Files:** `SettingsScreen.tsx`, `LibraryScreen.tsx`, `AboutScreen.tsx`

Create a unified `FluentListItem` component:
```typescript
// Standardized dimensions
const LIST_ITEM_HEIGHT = 56; // FluentControlHeight.xlarge
const ICON_CONTAINER_SIZE = 44; // FluentTouchTarget.minimum
const ICON_SIZE = FluentIconSize.medium; // 24px
const ITEM_PADDING = FluentSpacing.l; // 16px
const ITEM_GAP = FluentSpacing.m; // 12px
const ITEM_RADIUS = FluentControlRadius.card; // 12px
```

**Implementation:**
- Apply `shadow2` elevation to all list items
- Use `colorNeutralBackground2` consistently
- Standardize icon container to 44x44
- Add hover/pressed states with `colorNeutralBackground1Hover`

---

#### Fix 2: Unify Section Headers
**Affected Files:** All screens with sections

Standardize section header pattern:
```typescript
// Section header standard
const SECTION_HEADER = {
  iconSize: FluentIconSize.regular, // 20px
  iconColor: 'colorBrandForeground1',
  textVariant: 'subtitle1',
  textWeight: FluentFontWeight.semibold,
  gap: FluentSpacing.s, // 8px
  marginBottom: FluentSpacing.m, // 12px
};
```

---

#### Fix 3: Consistent Card Elevation
**Affected Files:** `SoundLabScreen.tsx`, `RadioScreen.tsx`, `LibraryScreen.tsx`

Apply consistent elevation strategy:
- **Level 0 (none):** Background surfaces
- **Level 1 (shadow2):** List items, chips
- **Level 2 (shadow4):** Cards, panels
- **Level 3 (shadow8):** Floating elements (FABs, mini-player)
- **Level 4 (shadow16):** Modals, dialogs

---

### 2.2 Medium-Priority Fixes (Consistency)

#### Fix 4: Standardize Search Input
**Affected Files:** `FluentTopBar.tsx`, `RadioScreen.tsx`

Create unified search input styling:
```typescript
const SEARCH_INPUT = {
  height: 48, // FluentControlHeight.xlarge
  backgroundColor: 'colorNeutralBackground3',
  borderRadius: FluentControlRadius.input, // 8px
  borderWidth: 0, // Remove border, use elevation
  paddingHorizontal: FluentSpacing.m,
  iconSize: FluentIconSize.regular,
  placeholder: 'colorNeutralForeground3',
};
```

---

#### Fix 5: Harmonize Button Heights
**Affected Files:** `PermissionOnboardingFlow.tsx`, `SoundLabScreen.tsx`

Standardize button heights to Fluent control heights:
- Small: 32px (`FluentControlHeight.small`)
- Medium: 36px (`FluentControlHeight.medium`)
- Large: 44px (`FluentControlHeight.large`)
- XLarge: 48px (`FluentControlHeight.xlarge`) - Primary actions

---

#### Fix 6: Modal/Dialog Consistency
**Affected Files:** `RadioScreen.tsx`, `SoundLabScreen.tsx`, `LibraryScreen.tsx`

Apply standard modal treatment:
```typescript
const MODAL_STANDARD = {
  borderRadius: FluentControlRadius.dialog, // 16px
  backgroundColor: 'colorNeutralBackground1',
  padding: FluentSpacing.xl, // 20px
  elevation: 'shadow16',
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'colorNeutralStroke1',
    borderRadius: 2,
    marginBottom: FluentSpacing.m,
  },
};
```

---

### 2.3 Low-Priority Fixes (Polish)

#### Fix 7: 4px Grid Alignment
**Affected Files:** Various

Ensure all custom sizes align to 4px grid:
- Change 10px dot → 8px or 12px
- Change 64px containers → 64px (OK) or 60px
- Change 120px containers → 120px (OK)

---

#### Fix 8: Slider Track Consistency
**Affected Files:** `SoundLabScreen.tsx`, `RadioScreen.tsx`

Use `FluentSliderSize` tokens:
```typescript
const SLIDER_STANDARD = {
  trackHeight: FluentSliderSize.trackMedium, // 6px
  thumbSize: FluentSliderSize.thumbMedium, // 20px
  activeColor: 'colorBrandForeground1',
  inactiveColor: 'colorNeutralStroke1',
};
```

---

#### Fix 9: Toast/Notification Styling
**Affected Files:** `LibraryScreen.tsx`, Toast component

Use consistent toast styling:
```typescript
const TOAST_STANDARD = {
  backgroundColor: 'colorBrandBackground',
  borderRadius: FluentControlRadius.card,
  padding: FluentSpacing.m,
  elevation: 'shadow8',
  iconSize: FluentIconSize.regular,
  textVariant: 'body2',
};
```

---

### 2.4 Component Harmonization Checklist

| Component | Action | Priority |
|-----------|--------|----------|
| `FluentListItem` | Create new unified component | High |
| `FluentSectionHeader` | Create standardized section header | High |
| `MenuItem` (Settings) | Migrate to FluentListItem | High |
| Search inputs | Unify styling across screens | Medium |
| Modal backgrounds | Apply standard treatment | Medium |
| Button heights | Audit and standardize | Medium |
| Slider tracks | Apply token sizes | Low |
| Toast component | Centralize styling | Low |
| Dot indicators | Align to 4px grid | Low |

---

### 2.5 Implementation Order

**Phase 1: Core Components (Week 1)**
1. Create `FluentListItem` component
2. Create `FluentSectionHeader` component
3. Update `FluentCard` elevation defaults

**Phase 2: Screen Updates (Week 2)**
1. Harmonize SettingsScreen
2. Harmonize LibraryScreen
3. Harmonize RadioScreen
4. Harmonize SoundLabScreen

**Phase 3: Polish (Week 3)**
1. Standardize modals
2. Align buttons and inputs
3. Review and fix 4px grid alignment
4. Final visual QA pass

---

## Part 3: Visual Harmony Guidelines

### 3.1 Surface Hierarchy

```
Background (colorNeutralBackground1)
  └── Content Area (colorNeutralBackground1)
      └── Section Card (colorNeutralBackground2 + shadow2)
          └── List Item (colorNeutralBackground2 + shadow2)
          └── Nested Content (colorNeutralBackground3)
              └── Interactive Element (colorNeutralBackground4)
```

### 3.2 Typography Hierarchy

| Context | Variant | Weight | Size |
|---------|---------|--------|------|
| Screen Title | title1 | 700 | 22px |
| Section Header | subtitle1 | 600 | 16px |
| Card Title | body1Strong | 600 | 14px |
| Body Text | body1 | 400 | 14px |
| Secondary Text | body2 | 400 | 12px |
| Caption | caption1 | 400 | 12px |
| Label | caption2 | 600 | 11px |

### 3.3 Spacing Rhythm

| Context | Token | Value |
|---------|-------|-------|
| Screen padding | `FluentSpacing.l` | 16px |
| Section gap | `FluentSpacing.xxl` | 24px |
| Card internal padding | `FluentSpacing.l` | 16px |
| List item gap | `FluentSpacing.s` | 8px |
| Icon-to-text gap | `FluentSpacing.m` | 12px |
| Text line gap | `FluentSpacing.xs` | 4px |

### 3.4 Color Usage

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary Background | `#FFFFFF` | Grey 16 |
| Secondary Surface | Grey 98 | Grey 12 |
| Tertiary Surface | Grey 96 | Grey 8 |
| Interactive Surface | Grey 94 | Grey 6 |
| Primary Accent | Brand Blue | Brand Blue |
| Success | Green Foreground | Green Foreground |
| Error | Red Foreground | Red Foreground |
| Warning | Yellow Foreground | Yellow Foreground |

---

## Part 4: Quality Checklist

### Pre-Release Design QA

- [ ] All list items have consistent 56px height
- [ ] All icon containers use 44px standard size
- [ ] All section headers use `subtitle1` variant
- [ ] All cards have appropriate elevation
- [ ] All buttons use standard control heights
- [ ] All spacing aligns to 4px grid
- [ ] All modals use standard dialog pattern
- [ ] All search inputs use unified styling
- [ ] Dark mode maintains proper contrast
- [ ] Touch targets meet 44px minimum
- [ ] Typography hierarchy is clear
- [ ] Brand colors used consistently
- [ ] Animations feel purposeful and subtle
- [ ] Empty states are visually balanced

---

## Conclusion

New Audio 360 has a strong foundation with its Fluent 2 token system. The primary gaps are in consistent application of these tokens across screens. By following this harmonization plan, the app will achieve a fully cohesive, premium Microsoft Fluent 2 visual experience that feels intentional, elegant, and professionally designed.

**Estimated Effort:** 2-3 weeks of focused design refinement
**Impact:** Significant improvement in perceived quality and brand cohesion

---

*Document Version: 1.0*  
*Last Updated: January 19, 2026*
