# Microsoft Store Submission Guide

## New Audio 360 - Windows Store Submission

This document provides step-by-step instructions for submitting New Audio 360 to the Microsoft Store.

---

## Prerequisites

1. **Microsoft Partner Center Account**
   - Create account at: https://partner.microsoft.com/
   - Complete identity verification
   - Pay one-time registration fee ($19 for individuals, $99 for companies)

2. **Publisher Identity**
   - Publisher Display Name: `Dhairya Shah, The Team 360`
   - Publisher CN: `CN=The Team 360`

3. **Built Package**
   - Run the GitHub Actions workflow to generate the MSIX package
   - Download the `windows-store-package-X.X.X` artifact

---

## Store Listing Information

### Basic Info

| Field | Value |
|-------|-------|
| **Product Name** | New Audio 360 |
| **Short Description** | Premium music player with world-class sound processing |
| **Category** | Music |
| **Subcategory** | Music players |
| **Privacy Policy URL** | https://www.theteam360.com/newaudio360 |
| **Website** | https://www.theteam360.com/newaudio360 |
| **Support Contact** | support@theteam360.com |

### Full Description

```
New Audio 360 - Premium Music Player

Transform your music listening experience with studio-grade audio processing.

KEY FEATURES:

Sound Lab - Professional Audio Control
• 10-Band Parametric Equalizer with precision frequency control
• 10 Expert-Tuned Presets: Flat, Rock, Pop, Jazz, Classical, Electronic, Hip-Hop, Acoustic, Bass+, Clarity
• Custom EQ Editor for personalized sound signatures
• Bass & Treble Boost controls with shelf filters
• Brickwall Limiter for distortion-free playback

Spatial Enhancement
• 6-Level stereo widening for immersive sound
• Psychoacoustic processing for natural depth
• Safety-limited to prevent audio fatigue

6 Immersive Modes
• Music Mode - Balanced for all genres
• 360 Reality - Full spatial immersion
• Gaming Mode - Enhanced directional audio
• Movie Mode - Cinematic sound
• Voice Mode - Optimized for podcasts
• Night Mode - Reduced dynamics for quiet listening

Intelligent Radio Discovery
• Access 40,000+ radio stations worldwide
• Automatic station discovery by country
• Quality-filtered streaming
• 30-day smart cache for reliability

Beautiful Themes
• 55 handcrafted themes across 6 categories
• Light and dark mode support
• Fluent Design System integration

Privacy First
• All data stored locally on your device
• No accounts required
• No tracking or analytics
• No ads

AUDIO FORMATS SUPPORTED:
MP3, M4A, AAC, FLAC, WAV, OGG, WMA, OPUS, AIFF

REQUIREMENTS:
• Windows 10 version 1809 or later
• Windows 11 (all versions)

One-time purchase. Lifetime access. No subscriptions.
Built for audio enthusiasts by audio enthusiasts.
```

### Keywords/Search Terms

```
music player, audio player, equalizer, eq, sound enhancer, bass boost, 
spatial audio, 360 audio, music app, mp3 player, flac player, hi-fi, 
audiophile, dsp, sound lab, radio, fm radio, streaming radio
```

---

## Store Assets Required

### Screenshots (Required)

| Type | Dimensions | Description |
|------|------------|-------------|
| Desktop Wide 1 | 1920x1080 | Main player view |
| Desktop Wide 2 | 1920x1080 | Sound Lab / EQ view |
| Desktop Wide 3 | 1920x1080 | Library view |
| Desktop Wide 4 | 1920x1080 | Radio stations view |
| Desktop Wide 5 | 1920x1080 | Theme selection |

### App Icons (Required)

| Asset | Dimensions | Purpose |
|-------|------------|---------|
| Square 44x44 | 44x44 px | Taskbar icon |
| Square 71x71 | 71x71 px | Small tile |
| Square 150x150 | 150x150 px | Medium tile |
| Square 310x310 | 310x310 px | Large tile |
| Wide 310x150 | 310x150 px | Wide tile |
| Store Logo | 50x50 px | Store listing |
| Splash Screen | 620x300 px | App launch |

### Promotional Images (Recommended)

| Type | Dimensions |
|------|------------|
| Poster Art | 720x1080 |
| Hero Art | 1920x1080 |
| Box Art | 358x358 |

---

## Availability

### Markets
- Available in all markets where Microsoft Store operates
- No regional restrictions

### Visibility
- Public (immediately visible after certification)

---

## Age Rating

### IARC Rating Questionnaire Responses

| Question | Answer |
|----------|--------|
| Violence | None |
| Fear | None |
| Sexuality | None |
| Drugs/Alcohol/Tobacco | None |
| Crude Humor | None |
| Gambling | None |
| User Interaction | No |
| In-App Purchases | No |
| Location Sharing | No |

**Expected Rating**: Everyone (PEGI 3, ESRB E)

---

## Submission Checklist

### Before Submission

- [ ] Build MSIX package using GitHub Actions
- [ ] Verify app launches correctly on Windows 10/11
- [ ] Test audio playback functionality
- [ ] Test folder scanning (Music library access)
- [ ] Verify offline functionality
- [ ] Test all screen sizes (windowed, maximized, full-screen)
- [ ] Prepare all required screenshots
- [ ] Prepare all app icons
- [ ] Write store description
- [ ] Prepare privacy policy URL

### Partner Center Steps

1. **Create New App**
   - Go to Partner Center > Apps and Games
   - Click "New product" > "MSIX or PWA app"
   - Reserve app name: "New Audio 360"

2. **Upload Package**
   - Go to Packages section
   - Upload the MSIX/MSIXBUNDLE file
   - Verify package validation passes

3. **Store Listing**
   - Fill in description, keywords, screenshots
   - Add promotional images
   - Set up localized listings if needed

4. **Pricing and Availability**
   - Set base price
   - Configure regional pricing
   - Select markets

5. **Age Ratings**
   - Complete IARC questionnaire
   - Generate rating certificate

6. **Submit for Certification**
   - Review all sections
   - Click "Submit for certification"

---

## Post-Submission

### Certification Timeline
- Typical: 1-3 business days
- Complex cases: Up to 5 business days

### Common Certification Issues

1. **Package Signing**
   - Ensure package is unsigned (Microsoft signs during submission)

2. **Privacy Policy**
   - Must be accessible at provided URL
   - Must cover data collection practices

3. **Screenshots**
   - Must accurately represent app functionality
   - No placeholder content

4. **Age Rating**
   - Accurate questionnaire responses required

---

## Update Process

1. Increment version in `app.config.js`
2. Run GitHub Actions workflow with new version
3. Upload new package to Partner Center
4. Submit update for certification

---

## Support Contacts

- **Developer**: Dhairya Shah
- **Publisher**: The Team 360
- **Technical Support**: support@theteam360.com
- **Business Inquiries**: dhairyashah@theteam360.com
