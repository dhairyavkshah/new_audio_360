# Privacy Policy

**New Audio 360**

**Effective Date:** January 19, 2026  
**Last Updated:** January 19, 2026  
**Version:** 1.0

---

## 1. Introduction

New Audio 360 ("the App," "we," "our," or "us") is a premium music player application developed and published by TheTeam360. This Privacy Policy describes how we collect, use, disclose, and protect your information when you download, install, and use our mobile application.

**Our Privacy Commitment:** New Audio 360 is designed with privacy as a core principle. The App operates primarily offline, stores all user data locally on your device, and does not transmit personal information to external servers. We do not operate data collection servers, employ analytics services, or engage in user tracking.

By downloading, installing, or using New Audio 360, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.

---

## 2. Information We Collect

### 2.1 Information Stored Locally on Your Device

All of the following data is stored exclusively on your device and never transmitted to our servers:

| Data Type | Purpose | Storage Method |
|-----------|---------|----------------|
| Music Library Metadata | Display song information | AsyncStorage |
| User Preferences | Remember your settings | AsyncStorage |
| Theme Selection | Apply chosen visual theme | AsyncStorage |
| Sound Lab Settings | EQ, bass, treble, immersive mode | AsyncStorage |
| Playlists | Store your custom playlists | AsyncStorage |
| Favorites | Track your favorite songs | AsyncStorage |
| Playback History | Recently played, most played | AsyncStorage |
| Custom EQ Presets | Your saved equalizer curves | AsyncStorage |
| License Cache | Offline license verification | SecureStore (encrypted) |
| Hidden Songs | Songs you've chosen to hide | AsyncStorage |

### 2.2 Information We Do NOT Collect

New Audio 360 does not collect, store, process, or transmit:

- Personal identification information (name, email, phone number, address)
- Account credentials or passwords
- Device identifiers for advertising purposes (GAID, IDFA)
- Location data (except temporarily for online radio, see Section 3)
- Usage analytics or behavioral data
- Crash reports or diagnostic information
- Audio files or music content
- Contacts, calendar, or other personal data
- Biometric information
- Financial information (payments handled by Google Play)

---

## 3. Third-Party Services

### 3.1 Google Play Services

New Audio 360 integrates with Google Play Services for the following purposes:

**License Verification:**
- We verify that the App was installed from the Google Play Store
- This uses Android's PackageManager API to check the installer package name
- No personal data is transmitted; only installation source is checked

**Purchase Processing:**
- One-time purchase transactions are processed by Google Play Billing
- We do not receive or store your payment information
- Google handles all payment processing according to their privacy policy

Google's data handling is governed by [Google's Privacy Policy](https://policies.google.com/privacy).

### 3.2 Radio Browser API (Online Radio Feature)

When using the Online Radio feature:

- The App queries the Radio Browser API (api.radio-browser.info) to fetch station listings
- Your device's IP address may be visible to the Radio Browser service
- No personal data, user identifiers, or usage patterns are transmitted
- Location data (if granted) is used only to filter stations by country and is not stored or transmitted

Radio Browser is a community-operated service. Their practices: [radio-browser.info](https://www.radio-browser.info/)

### 3.3 IP Geolocation (Optional)

When using location-based radio discovery:

- The App may query ipapi.co to detect your approximate country
- Only your public IP address is used for country detection
- This information is not stored or linked to any user profile
- You can use Online Radio without location features

---

## 4. Device Permissions

New Audio 360 requests the following permissions:

| Permission | Android Name | Purpose | Required |
|------------|--------------|---------|----------|
| Media Library | READ_MEDIA_AUDIO | Access music files on your device | Yes |
| Storage | READ_EXTERNAL_STORAGE | Read music from selected folders | Yes (Android 12 and below) |
| Location | ACCESS_COARSE_LOCATION | Detect country for online radio | No (optional) |
| Notifications | POST_NOTIFICATIONS | Display playback controls | No (optional) |
| Foreground Service | FOREGROUND_SERVICE | Background music playback | Yes |
| Internet | INTERNET | Online radio streaming, license check | Yes |

**Permission Behavior:**
- All permissions are requested with clear explanations during onboarding
- You may deny optional permissions; related features will be disabled
- Core music playback works without location or notification permissions
- Permissions can be managed in Android Settings at any time

---

## 5. How We Use Information

Local data stored on your device is used solely to:

1. **Provide Core Functionality**: Play music, display library, apply audio effects
2. **Remember Your Preferences**: Theme, Sound Lab settings, playback preferences
3. **Manage Playlists**: Create, edit, and organize your playlists
4. **Track Playback History**: Show recently played and most played songs
5. **Verify License**: Confirm legitimate Play Store installation for offline use
6. **Personalize Experience**: Apply your chosen EQ presets and immersive modes

We do not use your information for:
- Advertising or marketing
- Profiling or behavioral analysis
- Sale to third parties
- Any purpose beyond App functionality

---

## 6. Data Security

### 6.1 Security Measures

| Measure | Implementation |
|---------|----------------|
| Local Encryption | Sensitive data stored using Expo SecureStore |
| No Network Transmission | User data never leaves your device |
| HTTPS Only | All network requests use encrypted connections |
| No Cloud Storage | App data not backed up to external services |
| License Caching | Encrypted locally for secure offline verification |

### 6.2 Audio Processing Security

All audio processing (EQ, bass boost, limiter, etc.) occurs entirely on your device using pure software-based DSP. No audio data is transmitted, recorded, or stored beyond normal playback buffering.

---

## 7. Data Retention and Deletion

### 7.1 Data Retention

Since all data is stored locally on your device:

- Data persists until you uninstall the App or clear app data
- We have no ability to access, view, or modify your data
- No server-side data retention applies

### 7.2 Data Deletion

To delete all App data:

1. **Uninstall the App**: Removes all stored data permanently
2. **Clear App Data**: Android Settings > Apps > New Audio 360 > Clear Data
3. **Selective Deletion**: Use in-app settings to clear playlists, history, or preferences

**Important:** We cannot recover deleted data as it exists only on your device.

---

## 8. Children's Privacy

New Audio 360 is rated "Everyone" and is a general audience application. We do not:

- Knowingly collect information from children under 13
- Target children with advertising (we have no ads)
- Collect any personal information from any user

The App requires a Google Play account for purchase, which has its own age verification and parental controls.

---

## 9. Your Rights

### 9.1 Access and Control

You have complete control over your data:

| Right | How to Exercise |
|-------|-----------------|
| Access | View all settings and data within the App |
| Modification | Change any preferences at any time |
| Deletion | Clear app data or uninstall |
| Portability | Export playlists where feature is available |
| Objection | Deny optional permissions |

### 9.2 Regional Rights

**European Union (GDPR):**
- Right to access, rectification, erasure, and data portability apply
- Since all data is local, you exercise these rights directly on your device
- No data controller obligations apply as we collect no personal data

**California (CCPA):**
- Right to know what personal information is collected: None
- Right to delete: Uninstall or clear app data
- Right to opt-out of sale: We do not sell data
- Non-discrimination: All users receive equal service

**India (DPDP Act 2023):**
- We process no personal data on servers
- All data remains under your control on your device

---

## 10. International Data Transfers

New Audio 360 does not transfer personal data internationally. All user data remains on your device. The only network communications are:

1. **License Verification**: Local check against Play Store (no data transfer)
2. **Online Radio**: API queries to Radio Browser (no personal data)
3. **Geolocation**: Optional IP-based country detection (IP address only)

---

## 11. Changes to This Policy

We may update this Privacy Policy to reflect:
- New features or functionality
- Changes in legal requirements
- Clarifications based on user feedback

Changes will be indicated by updating the "Last Updated" date. Continued use of the App after changes constitutes acceptance of the updated policy. Material changes will be communicated through App update notes.

---

## 12. Contact Information

For privacy-related questions, concerns, or requests:

**Email:** privacy@theteam360.com  
**General Support:** support@theteam360.com  
**Website:** https://theteam360.com/newaudio360/privacy

**Response Time:** We aim to respond to privacy inquiries within 30 days.

---

## 13. Legal Compliance

This Privacy Policy and the App are designed to comply with:

| Regulation | Jurisdiction | Compliance |
|------------|--------------|------------|
| GDPR | European Union | No personal data collected |
| CCPA | California, USA | No personal data sold |
| COPPA | United States | No data from children |
| DPDP Act | India | No personal data processed |
| Google Play Policies | Global | Compliant |

---

## 14. Consent and Acceptance

By downloading, installing, accessing, or using New Audio 360, you expressly acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.

You consent to:
- Local storage of App data on your device
- The App's request for necessary device permissions
- Network communication for online radio and license verification
- Processing as described in this Privacy Policy

If you do not agree to these terms, please do not install or use the Application.

---

**New Audio 360**  
Developed by TheTeam360  
*"The top-grade intelligent music experience built for you"*

---

*This Privacy Policy was last updated on January 19, 2026.*
