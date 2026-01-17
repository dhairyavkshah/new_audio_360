# Test Plan

## New Audio 360

**Document Version:** 2.0  
**Last Updated:** January 17, 2026

---

## 1. Overview

This document outlines the comprehensive testing strategy for New Audio 360, covering UI/UX, functionality, performance, compatibility, and theme verification testing across all target devices.

### 1.1 Scope

- Mobile application testing (Android primary, iOS reference)
- Web platform testing (limited feature set)
- All 55 themes across all screens and components
- All audio features (playback, equalizer, radio)
- License verification flow
- Device compatibility across flagship and mid-range devices

### 1.2 Test Environment

| Environment | Purpose | Build Profile |
|-------------|---------|---------------|
| Development | Internal testing | `development` |
| Preview | QA testing | `preview` |
| Production | Release candidate | `production` |

---

## 2. Target Device Matrix

### 2.1 Android Devices (Primary Platform)

#### Samsung Galaxy S Series (Flagship)

| Device | Screen Size | Resolution | Android | Status |
|--------|-------------|------------|---------|--------|
| Samsung Galaxy S21 | 6.2" | 1080x2400 | 11-14 | Required |
| Samsung Galaxy S21+ | 6.7" | 1080x2400 | 11-14 | Required |
| Samsung Galaxy S21 Ultra | 6.8" | 1440x3200 | 11-14 | Required |
| Samsung Galaxy S22 | 6.1" | 1080x2340 | 12-14 | Required |
| Samsung Galaxy S22+ | 6.6" | 1080x2340 | 12-14 | Required |
| Samsung Galaxy S22 Ultra | 6.8" | 1440x3088 | 12-14 | Required |
| Samsung Galaxy S23 | 6.1" | 1080x2340 | 13-14 | Required |
| Samsung Galaxy S23+ | 6.6" | 1080x2340 | 13-14 | Required |
| Samsung Galaxy S23 Ultra | 6.8" | 1440x3088 | 13-14 | Required |
| Samsung Galaxy S24 | 6.2" | 1080x2340 | 14 | Required |
| Samsung Galaxy S24+ | 6.7" | 1440x3120 | 14 | Required |
| Samsung Galaxy S24 Ultra | 6.8" | 1440x3120 | 14 | Required |
| Samsung Galaxy S25 | 6.2" | 1080x2340 | 15 | Required |
| Samsung Galaxy S25+ | 6.7" | 1440x3120 | 15 | Required |
| Samsung Galaxy S25 Ultra | 6.9" | 1440x3120 | 15 | Required |

#### Samsung Galaxy S FE Series (Fan Edition)

| Device | Screen Size | Resolution | Android | Status |
|--------|-------------|------------|---------|--------|
| Samsung Galaxy S21 FE | 6.4" | 1080x2340 | 11-14 | Required |
| Samsung Galaxy S22 FE | 6.4" | 1080x2340 | 13-14 | Required |
| Samsung Galaxy S23 FE | 6.4" | 1080x2340 | 13-14 | Required |
| Samsung Galaxy S24 FE | 6.7" | 1080x2340 | 14 | Required |
| Samsung Galaxy S25 FE | 6.7" | 1080x2340 | 15 | Required |

#### Google Pixel Series

| Device | Screen Size | Resolution | Android | Status |
|--------|-------------|------------|---------|--------|
| Google Pixel 7 | 6.3" | 1080x2400 | 13-14 | Required |
| Google Pixel 7 Pro | 6.7" | 1440x3120 | 13-14 | Required |
| Google Pixel 8 | 6.2" | 1080x2400 | 14 | Required |
| Google Pixel 8 Pro | 6.7" | 1344x2992 | 14 | Required |
| Google Pixel 9 | 6.3" | 1080x2424 | 15 | Required |
| Google Pixel 9 Pro | 6.3" | 1280x2856 | 15 | Required |
| Google Pixel 9 Pro XL | 6.8" | 1344x2992 | 15 | Required |
| Google Pixel 10 | 6.3" | 1080x2424 | 16 | Required |
| Google Pixel 10 Pro | 6.3" | 1280x2856 | 16 | Required |
| Google Pixel 10 XL | 6.9" | 1440x3120 | 16 | Required |

#### Other Android Devices (Reference)

| Device | Screen Size | Resolution | Android | Status |
|--------|-------------|------------|---------|--------|
| OnePlus 12 | 6.82" | 1440x3168 | 14 | Reference |
| Xiaomi 14 | 6.36" | 1200x2670 | 14 | Reference |
| Oppo Find X7 | 6.78" | 1264x2780 | 14 | Reference |

### 2.2 iOS Devices (Reference - Future Support)

| Device | Screen Size | Resolution | iOS | Status |
|--------|-------------|------------|-----|--------|
| iPhone SE (3rd Gen) | 4.7" | 750x1334 | 16+ | Reference |
| iPhone 15 | 6.1" | 1179x2556 | 17+ | Reference |
| iPhone 15 Plus | 6.7" | 1290x2796 | 17+ | Reference |
| iPhone 15 Pro | 6.1" | 1179x2556 | 17+ | Reference |
| iPhone 15 Pro Max | 6.7" | 1290x2796 | 17+ | Reference |
| iPhone 16 | 6.1" | 1179x2556 | 18+ | Reference |
| iPhone 16 Plus | 6.7" | 1290x2796 | 18+ | Reference |
| iPhone 16 Pro | 6.3" | 1206x2622 | 18+ | Reference |
| iPhone 16 Pro Max | 6.9" | 1320x2868 | 18+ | Reference |
| iPhone 17 | 6.1" | 1179x2556 | 19+ | Reference |
| iPhone 17 Air | 6.6" | 1290x2796 | 19+ | Reference |
| iPhone 17 Pro | 6.3" | 1206x2622 | 19+ | Reference |
| iPhone 17 Pro Max | 6.9" | 1320x2868 | 19+ | Reference |
| iPad Air (M2) | 10.9" | 2360x1640 | 17+ | Reference |

### 2.3 Screen Size Categories

| Category | Width Range | Example Devices |
|----------|-------------|-----------------|
| Compact | 320-374dp | iPhone SE, older phones |
| Standard | 375-413dp | Most flagship phones |
| Large | 414-480dp | Plus/Max/Ultra models |
| Tablet | 600dp+ | iPad, Galaxy Tab |

---

## 3. Complete Screen Inventory

### 3.1 All Application Screens

| Screen | File | Theme Required | Safe Area | Status |
|--------|------|----------------|-----------|--------|
| SplashScreen | `SplashScreen.tsx` | Yes | Yes | Required |
| LoadingScreen | `LoadingScreen.tsx` | Yes | Yes | Required |
| PermissionOnboardingFlow | `PermissionOnboardingFlow.tsx` | Yes | Yes | Required |
| PermissionOnboardingScreen | `PermissionOnboardingScreen.tsx` | Yes | Yes | Required |
| LoginScreen | `LoginScreen.tsx` | Yes | Yes | Required |
| BiometricLockScreen | `BiometricLockScreen.tsx` | Yes | Yes | Required |
| SubscriptionRequiredScreen | `SubscriptionRequiredScreen.tsx` | Yes | Yes | Required |
| ListenScreen | `ListenScreen.tsx` | Yes | Yes | Required |
| NowPlayingScreen | `NowPlayingScreen.tsx` | Yes | Yes | Required |
| QueueScreen | `QueueScreen.tsx` | Yes | Yes | Required |
| SoundLabScreen | `SoundLabScreen.tsx` | Yes | Yes | Required |
| LibraryScreen | `LibraryScreen.tsx` | Yes | Yes | Required |
| AlbumDetailScreen | `AlbumDetailScreen.tsx` | Yes | Yes | Required |
| PlaylistManagementScreen | `PlaylistManagementScreen.tsx` | Yes | Yes | Required |
| PlaylistDetailScreen | `PlaylistDetailScreen.tsx` | Yes | Yes | Required |
| RadioScreen | `RadioScreen.tsx` | Yes | Yes | Required |
| RadioStationsScreen | `RadioStationsScreen.tsx` | Yes | Yes | Required |
| SettingsScreen | `SettingsScreen.tsx` | Yes | Yes | Required |
| AppearanceScreen | `AppearanceScreen.tsx` | Yes | Yes | Required |
| FolderSelectionScreen | `FolderSelectionScreen.tsx` | Yes | Yes | Required |
| LicenseScreen | `LicenseScreen.tsx` | Yes | Yes | Required |
| AboutScreen | `AboutScreen.tsx` | Yes | Yes | Required |
| PrivacyPolicyScreen | `PrivacyPolicyScreen.tsx` | Yes | Yes | Required |
| OpenSourceLicensesScreen | `OpenSourceLicensesScreen.tsx` | Yes | Yes | Required |
| SupportDeveloperScreen | `SupportDeveloperScreen.tsx` | Yes | Yes | Required |
| RecordingsScreen | `RecordingsScreen.tsx` | Yes | Yes | Required |
| ExitScreen | `ExitScreen.tsx` | Yes | Yes | Required |

### 3.2 All Modal Components

| Modal | File | Theme Required | Backdrop | Status |
|-------|------|----------------|----------|--------|
| Dialog | `Dialog.tsx` | Yes | Scrim 50% | Required |
| BottomSheet | `BottomSheet.tsx` | Yes | Scrim 50% | Required |
| ContextMenu | `ContextMenu.tsx` | Yes | Transparent | Required |
| SongContextMenu | `SongContextMenu.tsx` | Yes | Transparent | Required |

### 3.3 All Notification/Toast Components

| Component | File | Theme Required | Auto-Dismiss | Status |
|-----------|------|----------------|--------------|--------|
| Toast | `Toast.tsx` | Yes (info type) | 3 seconds | Required |
| AudioTipNotification | `AudioTipNotification.tsx` | Yes | 5 seconds | Required |

### 3.4 Persistent UI Components

| Component | File | Theme Required | Position | Status |
|-----------|------|----------------|----------|--------|
| MiniPlayer | `MiniPlayer.tsx` | Yes | Bottom | Required |
| MainTabNavigator | `MainTabNavigator.tsx` | Yes | Bottom | Required |
| FluentTopBar | `FluentTopBar.tsx` | Yes | Top | Required |
| TopBar | `TopBar.tsx` | Yes | Top | Required |

---

## 4. Theme Verification Matrix

### 4.1 All 55 Themes

| Category | Theme Name | Theme Key | Light/Dark | Verification |
|----------|------------|-----------|------------|--------------|
| **System (5)** | Fluent Light | `fluent` | Light | Required |
| | Fluent Dark | `fluentDark` | Dark | Required |
| | Night AMOLED | `nightAmoled` | Dark | Required |
| | Warm Neutral | `warmNeutral` | Light | Required |
| | Cool Blue | `coolBlue` | Light | Required |
| **Winamp (10)** | Classic | `winampClassic` | Dark | Required |
| | Modern | `winampModern` | Dark | Required |
| | Bento | `winampBento` | Dark | Required |
| | Foxpro | `winampFoxpro` | Dark | Required |
| | MMD3 | `winampMmd3` | Dark | Required |
| | Nucleo | `winampNucleo` | Dark | Required |
| | Anime | `winampAnime` | Dark | Required |
| | Aqua | `winampAqua` | Light | Required |
| | Metal | `winampMetal` | Dark | Required |
| | Neon | `winampNeon` | Dark | Required |
| **Retro (10)** | VHS | `retroVhs` | Dark | Required |
| | Cassette | `retroCassette` | Dark | Required |
| | Vaporwave | `retroVaporwave` | Dark | Required |
| | Cyberpunk | `retroCyberpunk` | Dark | Required |
| | Synthwave | `retroSynthwave` | Dark | Required |
| | Arcade | `retroArcade` | Dark | Required |
| | Terminal | `retroTerminal` | Dark | Required |
| | Commodore | `retroCommodore` | Dark | Required |
| | Amiga | `retroAmiga` | Dark | Required |
| | DOS | `retroDos` | Dark | Required |
| **Nature (10)** | Forest | `natureForest` | Light | Required |
| | Ocean | `natureOcean` | Light | Required |
| | Sunset | `natureSunset` | Light | Required |
| | Aurora | `natureAurora` | Dark | Required |
| | Desert | `natureDesert` | Light | Required |
| | Mountain | `natureMountain` | Light | Required |
| | Rainforest | `natureRainforest` | Light | Required |
| | Arctic | `natureArctic` | Light | Required |
| | Volcano | `natureVolcano` | Dark | Required |
| | Meadow | `natureMeadow` | Light | Required |
| **Professional (10)** | Midnight | `proMidnight` | Dark | Required |
| | Corporate | `proCorporate` | Light | Required |
| | Slate | `proSlate` | Dark | Required |
| | Graphite | `proGraphite` | Dark | Required |
| | Charcoal | `proCharcoal` | Dark | Required |
| | Obsidian | `proObsidian` | Dark | Required |
| | Executive | `proExecutive` | Light | Required |
| | Platinum | `proPlatinum` | Light | Required |
| | Titanium | `proTitanium` | Dark | Required |
| | Carbon | `proCarbon` | Dark | Required |
| **Special (10)** | Neon | `specialNeon` | Dark | Required |
| | Holographic | `specialHolographic` | Dark | Required |
| | Candy | `specialCandy` | Light | Required |
| | Galaxy | `specialGalaxy` | Dark | Required |
| | Rainbow | `specialRainbow` | Light | Required |
| | Gradient | `specialGradient` | Light | Required |
| | Glass | `specialGlass` | Light | Required |
| | Metallic | `specialMetallic` | Dark | Required |
| | Crystal | `specialCrystal` | Light | Required |
| | Plasma | `specialPlasma` | Dark | Required |

### 4.2 Theme Application Verification Checklist

For each theme, verify:

#### Colors
- [ ] Primary color applies to buttons, active states
- [ ] Secondary color applies to secondary actions
- [ ] Background colors apply to all screens
- [ ] Surface colors apply to cards, sheets
- [ ] Text colors (primary, secondary, disabled) render correctly
- [ ] Error/Success/Warning colors display properly
- [ ] Accent color applies to focused elements

#### Components
- [ ] FluentButton uses theme colors
- [ ] FluentCard uses theme surface color
- [ ] FluentChip uses theme colors for states
- [ ] FluentIconButton uses theme icon colors
- [ ] FluentDivider uses theme separator color
- [ ] FluentText uses theme text colors
- [ ] FluentSurface uses theme background

#### Screens
- [ ] Screen background matches theme
- [ ] Headers use theme colors
- [ ] List items use theme styling
- [ ] Empty states use theme colors
- [ ] Loading indicators use theme primary color

#### Modals & Overlays
- [ ] Dialog background uses theme surface
- [ ] Dialog title uses theme text color
- [ ] Dialog buttons use theme button styles
- [ ] BottomSheet uses theme surface color
- [ ] BottomSheet handle uses theme separator color
- [ ] Toast info type uses theme primary color
- [ ] Context menus use theme surface/text colors

#### Navigation
- [ ] Tab bar background uses theme surface
- [ ] Active tab uses theme primary color
- [ ] Inactive tabs use theme secondary text
- [ ] MiniPlayer uses theme with glassmorphism effect
- [ ] Top bar uses theme background

---

## 5. Test Categories

### 5.1 UI/UX Testing (250 Test Cases)

#### Navigation & Layout (50 cases)
- Bottom navigation bar displays correctly on all screen sizes
- Tab switching works smoothly
- Safe area compliance on notched devices (all Samsung, Pixel, iPhone models)
- Dynamic Island compatibility (iPhone 14 Pro+)
- Punch-hole camera compatibility (Samsung S series)
- MiniPlayer positioning and behavior
- Screen transitions are smooth
- Pull-to-refresh on applicable screens
- Scroll behavior with large content
- Keyboard handling in input fields

#### Typography & Text (35 cases)
- Font sizes match Fluent 2 specifications
- Text truncation with ellipsis works properly
- Duration format displays as M:SS
- Text scales with system font size (1.0x to 2.0x)
- RTL text support
- Long text wrapping

#### Colors & Theming (50 cases)
- All 55 themes load without errors
- Theme switching updates all UI elements instantly
- Color contrast meets WCAG AA standards
- Dark themes have proper OLED black backgrounds
- Theme persists across app restarts
- System theme following (where applicable)

#### Components (60 cases)
- Buttons respond to press states
- Cards display shadows correctly
- Chips show selected/unselected states
- Icons display at correct sizes (24dp standard)
- Sliders are responsive and accurate
- Progress bars animate smoothly
- Toggle switches work correctly
- Search bar keyboard behavior

#### Responsive Layout (55 cases)
- Portrait orientation
- Landscape orientation (where supported)
- Split-screen mode (Android 7+)
- Foldable device support (Samsung Fold series)
- Small screen (iPhone SE, compact phones)
- Large screen (Ultra/Max models)
- Tablet landscape (iPad Air)

### 5.2 Functionality Testing (600 Test Cases)

#### Music Playback (100 cases)
- Play/pause/stop controls
- Next/previous track navigation
- Seek functionality (drag and tap)
- Queue management
- Shuffle modes (Off, Shuffle)
- Repeat modes (Off, One, All)
- Playback speed adjustment (0.5x to 2.0x)
- Background playback continues
- Notification controls work
- Audio focus handling (calls, other apps)
- Bluetooth audio routing
- Wired headphone support
- Lock screen controls

#### Music Library (80 cases)
- Device media scanning
- Folder selection filtering
- Song listing and sorting
- Album/Artist grouping
- Search functionality
- Hide song feature
- Pagination for large libraries (10,000+ songs)
- Library refresh

#### Playlists (60 cases)
- Create new playlist
- Rename playlist
- Delete playlist (with modal confirmation)
- Add songs to playlist
- Remove songs from playlist
- Reorder playlist tracks
- Empty playlist handling
- Duplicate prevention

#### Favorites & History (40 cases)
- Add to favorites
- Remove from favorites
- Recently played tracking
- Most played statistics
- Quick access categories

#### Sound Lab (80 cases)
- Equalizer preset switching (8 presets)
- Immersive mode switching (6 modes)
- Custom EQ band adjustment (5 bands)
- Save custom EQ preset
- Delete custom EQ preset (with modal confirmation)
- Bass control adjustment
- Treble control adjustment
- Virtualizer toggle
- Waveform visualization
- Effects apply to music playback
- Effects apply to radio playback
- Reset to defaults

#### Radio (80 cases)
- Online radio station search
- Country-based discovery
- Location detection for country
- Genre filtering
- Station favorites
- Stream playback (MP3, OGG, AAC)
- Quality filter verification (>64kbps)
- Sound Lab effects on radio
- FM tuning (if hardware available)
- AM tuning (if hardware available)
- Station switching

#### Themes (60 cases)
- Each of 55 themes applies correctly
- Theme-specific effects render (glass, beveled, etc.)
- Theme persists across sessions
- Theme switching is smooth (< 300ms)

#### License & Payment (60 cases)
- Installation source verification
- License state caching
- Offline access after verification
- Purchase prompt display
- License status in settings

#### Settings (40 cases)
- All settings save correctly
- Settings persist across sessions
- Default values are sensible
- Settings export/import (if available)

### 5.3 Non-Functional Testing (200 Test Cases)

#### Performance (60 cases)
- App cold launch time < 3 seconds
- App warm launch time < 1.5 seconds
- Screen transitions < 300ms
- Audio latency < 100ms
- Memory usage < 200MB average
- Battery drain < 3% per hour active playback
- Large library performance (10,000+ songs)
- Theme switch performance < 300ms
- Scroll performance 60fps

#### Compatibility (50 cases)
- Android 8.0 (API 26) minimum
- Android 9.0 (API 28)
- Android 10 (API 29)
- Android 11 (API 30)
- Android 12 (API 31)
- Android 13 (API 33)
- Android 14 (API 34)
- Android 15 (API 35)
- Various manufacturers (Samsung, Pixel, OnePlus, Xiaomi)
- Different screen densities (mdpi to xxxhdpi)
- Bluetooth audio devices
- USB audio devices
- Wired headphones (3.5mm, USB-C)

#### Security (30 cases)
- License data encrypted (SecureStore)
- No sensitive data in logs
- Secure storage for credentials
- Network traffic encrypted (HTTPS)
- No hardcoded secrets

#### Accessibility (40 cases)
- Screen reader navigation (TalkBack)
- Touch target sizes (minimum 44dp)
- Color contrast ratios (4.5:1 minimum)
- Focus management
- Content descriptions on all interactive elements
- Semantic headings
- Skip navigation

#### Reliability (20 cases)
- App doesn't crash under normal use
- Error handling for edge cases
- Graceful degradation without internet
- Recovery from interruptions (calls, notifications)
- Memory pressure handling
- Process death recovery

---

## 6. Test Execution

### 6.1 Manual Testing

| Phase | Focus | Duration | Devices |
|-------|-------|----------|---------|
| Alpha | Core functionality | 2 weeks | 5 primary devices |
| Beta | Full feature set + themes | 2 weeks | 15 devices |
| RC | Regression & all device matrix | 1 week | All 30+ devices |

### 6.2 Automated Testing

- **Unit Tests:** Core utility functions, audio services
- **Integration Tests:** Audio service, context providers, theme system
- **E2E Tests:** Maestro flows for critical paths
- **Visual Regression:** Theme screenshot comparisons

### 6.3 Primary Test Devices

| Priority | Device | Android Version | Screen Size | Notes |
|----------|--------|-----------------|-------------|-------|
| P0 | Samsung Galaxy S24 | Android 14 | 6.2" | Primary flagship |
| P0 | Google Pixel 9 | Android 15 | 6.3" | Latest stock Android |
| P0 | Samsung Galaxy S23 FE | Android 14 | 6.4" | FE series validation |
| P1 | Samsung Galaxy S21 | Android 13 | 6.2" | Older flagship |
| P1 | Google Pixel 7 | Android 14 | 6.3" | Previous Pixel gen |
| P1 | Samsung Galaxy S25 Ultra | Android 15 | 6.9" | Latest Ultra |
| P2 | Google Pixel 10 XL | Android 16 | 6.9" | Future-proofing |
| P2 | OnePlus 12 | Android 14 | 6.82" | OEM variation |
| P2 | Xiaomi 14 | Android 14 | 6.36" | MIUI validation |

---

## 7. Bug Reporting

### 7.1 Severity Levels

| Level | Description | Example |
|-------|-------------|---------|
| Critical | App unusable | Crash on launch, data loss, license bypass |
| High | Major feature broken | Playback stops unexpectedly, theme not applying |
| Medium | Feature impaired | Equalizer preset doesn't apply, button unresponsive |
| Low | Minor issue | Visual glitch, typo, alignment issue |

### 7.2 Bug Report Template

```
Title: [Short description]
Severity: [Critical/High/Medium/Low]
Device: [Model, Android version]
Theme: [Current theme name]
Steps to Reproduce:
1. 
2. 
3. 
Expected Result: 
Actual Result: 
Build: [Version, build number]
Screenshots/Logs: [Attach if applicable]
```

---

## 8. Acceptance Criteria

### 8.1 Release Readiness

- [ ] All Critical bugs resolved
- [ ] All High bugs resolved or deferred with justification
- [ ] 95% of functionality tests passing
- [ ] 90% of UI tests passing
- [ ] All 55 themes verified on primary devices
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] License verification working end-to-end
- [ ] All target devices tested

### 8.2 Theme Verification Complete

- [ ] All 55 themes render correctly
- [ ] All screens display proper theme colors
- [ ] All modals/dialogs use theme colors
- [ ] All toasts/notifications themed correctly
- [ ] Theme switching works without restart

### 8.3 Device Compatibility Complete

- [ ] All Samsung S21-S25 series tested
- [ ] All Samsung S21 FE-S25 FE series tested
- [ ] All Google Pixel 7-10 series tested
- [ ] Performance acceptable on all devices
- [ ] Safe areas correct on all notch types

### 8.4 Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

## 9. Reference

- **Full Test Cases:** See `TEST_CASES.md` for detailed 1000+ test cases
- **Design Guidelines:** See `design_guidelines.md` for UI specifications
- **Fluent 2 Tokens:** See `client/constants/fluent2.ts` for design tokens
- **Theme Registry:** See `client/constants/theme.ts` for theme definitions

---

*Document maintained by TheTeam360 QA Team*
