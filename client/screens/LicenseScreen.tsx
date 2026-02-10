import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText, FluentSectionHeader } from "@/components/fluent";
import { useThemedColors } from "@/contexts/ThemeContext";
import { useSubscription, PRICING } from "@/contexts/SubscriptionContext";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentSpacing, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.theteam360.newaudio360';

type FeatureCategory = {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  features: string[];
};

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: "soundlab",
    icon: "equalizer",
    title: "Sound Lab",
    features: [
      "10-Band Parametric Equalizer (60Hz to 16kHz)",
      "10 EQ Presets (Flat, Rock, Pop, Jazz, Classical, Electronic, Hip-Hop, Acoustic, Bass+, Clarity)",
      "Bass & Treble Control (\u00b112dB shelf filters)",
      "6-Level Spatial Enhancement (HRTF psychoacoustic processing)",
      "Multi-Tap Reverb (4 delay lines)",
      "Brickwall Limiter (distortion prevention)",
      "6 Immersive Modes (Music, 360 Reality, Gaming, Podcast, Movie, Sports)",
      "AI Audio Upscaling (Neural network enhancement)",
      "Psychoacoustic Bass Enhancement",
      "Real-time Waveform Visualization",
      "32-bit Float Internal Processing",
    ],
  },
  {
    id: "playback",
    icon: "play-circle-outline",
    title: "Playback",
    features: [
      "Music Player with background playback",
      "Queue management with shuffle/repeat",
      "Playlist creation and management",
      "Smart categories (Recently Played, Most Played, Favorites)",
      "Music folder selection",
      "Playback speed control",
      "Sleep timer",
    ],
  },
  {
    id: "themes",
    icon: "palette-outline",
    title: "Themes",
    features: [
      "55 handcrafted themes (6 categories)",
      "Microsoft Fluent 2 design system",
      "Dark/Light mode support",
    ],
  },
  {
    id: "radio",
    icon: "radio",
    title: "Radio",
    features: [
      "40,000+ online radio stations",
      "Intelligent Radio Discovery (country-based)",
      "FM/AM support (Android hardware)",
    ],
  },
  {
    id: "discovery",
    icon: "compass-outline",
    title: "Discovery",
    features: [
      "SoundCloud integration (OAuth 2.1 PKCE)",
      "Internet Archive streaming (public domain/CC)",
      "Full DSP/AI effects on streamed content",
    ],
  },
  {
    id: "privacy",
    icon: "shield-check-outline",
    title: "Privacy",
    features: [
      "All data stored locally on device",
      "No analytics or tracking",
      "No cloud storage required",
      "Works fully offline",
      "Biometric authentication support",
      "Encrypted secure storage",
    ],
  },
];

type OpenSourceLibrary = {
  name: string;
  license: string;
};

const OPEN_SOURCE_LIBRARIES: OpenSourceLibrary[] = [
  { name: "React Native", license: "MIT" },
  { name: "React", license: "MIT" },
  { name: "Expo SDK", license: "MIT" },
  { name: "React Navigation", license: "MIT" },
  { name: "TensorFlow.js", license: "Apache 2.0" },
  { name: "React Native Track Player", license: "Apache 2.0" },
  { name: "React Native Audio API", license: "MIT" },
  { name: "React Native Reanimated", license: "MIT" },
  { name: "Async Storage", license: "MIT" },
  { name: "ExoPlayer/Media3", license: "Apache 2.0" },
  { name: "Zod", license: "MIT" },
];

type BenefitItem = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
  color: string;
};

export default function LicenseScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const colors = useThemedColors();
  const { licenseStatus, isLoading, checkLicenseStatus } = useSubscription();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const handleVerifyInstallation = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await checkLicenseStatus();
  };

  const handleOpenPlayStore = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL(PLAY_STORE_URL);
  };

  const toggleCategory = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isLicensed = licenseStatus === "licensed";

  const badge = isLicensed
    ? { label: "Licensed", color: colors.colorPaletteYellowForeground1, icon: "crown" as const }
    : { label: "Unlicensed", color: colors.colorNeutralForeground2, icon: "lock-outline" as const };

  const benefits: BenefitItem[] = [
    { icon: "shield-check", text: "Secure purchase via Google Play", color: colors.colorPaletteGreenForeground1 },
    { icon: "cash-remove", text: "One-time purchase - no recurring charges", color: colors.colorBrandForeground1 },
    { icon: "infinity", text: "Lifetime access - never expires", color: colors.colorBrandForeground1 },
    { icon: "wifi-off", text: "100% offline - works without internet", color: colors.colorNeutralForeground2 },
    { icon: "update", text: "Regular free updates", color: colors.colorBrandForeground1 },
    { icon: "advertisements-off", text: "No ads ever", color: colors.colorPaletteGreenForeground1 },
  ];

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. License Status Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.heroBadge, { backgroundColor: badge.color + "20" }]}>
            <MaterialCommunityIcons name={badge.icon} size={32} color={badge.color} />
          </View>
          <FluentText variant="title3" style={styles.heroStatus}>
            Current Status
          </FluentText>
          <FluentText variant="title1" style={{ color: badge.color }}>
            {badge.label}
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
            {isLicensed ? "Lifetime access \u2014 all features unlocked forever" : "Install from Google Play to activate"}
          </FluentText>
          <FluentText variant="caption2" color="tertiary" style={{ marginTop: FluentSpacing.xs }}>
            v35.0
          </FluentText>
        </View>

        {/* 2. What You Get */}
        <View style={styles.section}>
          <FluentSectionHeader icon="star-outline" title="What You Get" />
          <View style={[styles.card, { backgroundColor: colors.colorNeutralBackground2 }]}>
            {FEATURE_CATEGORIES.map((category, index) => {
              const isExpanded = expandedCategories[category.id] ?? false;
              return (
                <View key={category.id}>
                  {index > 0 && (
                    <View style={[styles.categoryDivider, { backgroundColor: colors.colorNeutralStroke1 + "40" }]} />
                  )}
                  <Pressable
                    onPress={() => toggleCategory(category.id)}
                    style={({ pressed }) => [
                      styles.categoryHeader,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={category.icon}
                      size={FluentIconSize.regular}
                      color={colors.colorBrandForeground1}
                    />
                    <FluentText variant="body1Strong" style={{ flex: 1, marginLeft: FluentSpacing.s }}>
                      {category.title}
                    </FluentText>
                    <FluentText variant="caption2" color="secondary" style={{ marginRight: FluentSpacing.xs }}>
                      {category.features.length}
                    </FluentText>
                    <MaterialCommunityIcons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={FluentIconSize.regular}
                      color={colors.colorNeutralForeground2}
                    />
                  </Pressable>
                  {isExpanded && (
                    <View style={styles.featureList}>
                      {category.features.map((feature) => (
                        <View key={feature} style={styles.featureItem}>
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={FluentIconSize.small}
                            color={colors.colorPaletteGreenForeground1}
                          />
                          <FluentText variant="caption1" color="secondary" style={{ marginLeft: FluentSpacing.s, flex: 1 }}>
                            {feature}
                          </FluentText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* 3. Pricing Card (unlicensed) / 4. Licensed Confirmation */}
        {!isLicensed ? (
          <View style={styles.section}>
            <FluentSectionHeader icon="tag-outline" title="Pricing" />
            <View style={[styles.card, { backgroundColor: colors.colorNeutralBackground2 }]}>
              <View style={styles.pricingRow}>
                <View style={styles.priceBox}>
                  <FluentText variant="caption2" color="secondary">India</FluentText>
                  <FluentText variant="title2" style={{ color: colors.colorBrandForeground1 }}>
                    {PRICING.india.symbol}{PRICING.india.amount}
                  </FluentText>
                  <FluentText variant="caption2" color="tertiary">{PRICING.india.currency}</FluentText>
                </View>
                <View style={[styles.priceDivider, { backgroundColor: colors.colorNeutralStroke1 + "40" }]} />
                <View style={styles.priceBox}>
                  <FluentText variant="caption2" color="secondary">International</FluentText>
                  <FluentText variant="title2" style={{ color: colors.colorBrandForeground1 }}>
                    {PRICING.international.symbol}{PRICING.international.amount}
                  </FluentText>
                  <FluentText variant="caption2" color="tertiary">{PRICING.international.currency}</FluentText>
                </View>
              </View>

              <View style={styles.badgeRow}>
                <View style={[styles.priceBadge, { backgroundColor: colors.colorPaletteGreenForeground1 + "15" }]}>
                  <FluentText variant="caption2" style={{ color: colors.colorPaletteGreenForeground1 }}>
                    One-time purchase
                  </FluentText>
                </View>
                <View style={[styles.priceBadge, { backgroundColor: colors.colorBrandForeground1 + "15" }]}>
                  <FluentText variant="caption2" style={{ color: colors.colorBrandForeground1 }}>
                    No subscriptions
                  </FluentText>
                </View>
              </View>

              <Pressable
                onPress={handleOpenPlayStore}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: colors.colorBrandBackground,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons name="google-play" size={20} color="#FFFFFF" />
                <FluentText variant="body1Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s }}>
                  Get it on Google Play
                </FluentText>
              </Pressable>

              <Pressable
                onPress={handleVerifyInstallation}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.colorNeutralBackground3,
                    opacity: isLoading ? 0.6 : pressed ? 0.9 : 1,
                    marginTop: FluentSpacing.s,
                  },
                ]}
              >
                <MaterialCommunityIcons name="refresh" size={20} color={colors.colorNeutralForeground1} />
                <FluentText variant="body1" style={{ marginLeft: FluentSpacing.s }}>
                  {isLoading ? "Verifying..." : "Verify Installation"}
                </FluentText>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: colors.colorPaletteGreenForeground1 + "10" }]}>
              <View style={styles.licensedConfirmation}>
                <MaterialCommunityIcons name="check-decagram" size={40} color={colors.colorPaletteGreenForeground1} />
                <FluentText variant="title3" style={{ color: colors.colorPaletteGreenForeground1, marginTop: FluentSpacing.m }}>
                  All features unlocked forever
                </FluentText>
                <FluentText variant="body2" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                  Lifetime license active
                </FluentText>
              </View>
            </View>
          </View>
        )}

        {/* 5. Key Benefits */}
        <View style={styles.section}>
          <FluentSectionHeader icon="check-decagram" title="Key Benefits" />
          <View style={[styles.card, { backgroundColor: colors.colorNeutralBackground2 }]}>
            {benefits.map((benefit) => (
              <View key={benefit.text} style={styles.benefitRow}>
                <MaterialCommunityIcons name={benefit.icon} size={FluentIconSize.small} color={benefit.color} />
                <FluentText variant="body2" color="secondary" style={{ marginLeft: FluentSpacing.s, flex: 1 }}>
                  {benefit.text}
                </FluentText>
              </View>
            ))}
          </View>
        </View>

        {/* 6. Open Source Components */}
        <View style={styles.section}>
          <FluentSectionHeader icon="code-braces" title="Open Source Components" />
          <View style={[styles.card, { backgroundColor: colors.colorNeutralBackground2 }]}>
            <FluentText variant="body2" color="secondary" style={{ marginBottom: FluentSpacing.m }}>
              This app is built with the following open source libraries:
            </FluentText>
            <View style={styles.libraryList}>
              {OPEN_SOURCE_LIBRARIES.map((library) => (
                <View key={library.name} style={styles.libraryRow}>
                  <FluentText variant="body2" style={{ flex: 1 }}>
                    {library.name}
                  </FluentText>
                  <View style={[
                    styles.licenseBadge,
                    {
                      backgroundColor: library.license === "MIT"
                        ? colors.colorPaletteGreenForeground1 + "20"
                        : colors.colorBrandForeground1 + "20",
                    },
                  ]}>
                    <FluentText
                      variant="caption2"
                      style={{
                        color: library.license === "MIT"
                          ? colors.colorPaletteGreenForeground1
                          : colors.colorBrandForeground1,
                      }}
                    >
                      {library.license}
                    </FluentText>
                  </View>
                </View>
              ))}
            </View>
            <View style={[styles.licenseNote, { borderTopColor: colors.colorNeutralStroke1 }]}>
              <MaterialCommunityIcons
                name="information-outline"
                size={FluentIconSize.small}
                color={colors.colorNeutralForeground2}
              />
              <FluentText variant="caption1" color="secondary" style={{ marginLeft: FluentSpacing.s, flex: 1 }}>
                Full license details available in Open Source Licenses section
              </FluentText>
            </View>
          </View>
        </View>

        {/* 7. Footer */}
        <View style={styles.footer}>
          <FluentText variant="caption1" color="tertiary" align="center">
            {"\u00A9"} 2024-2026 Dhairya Vipulkumar Shah, The Team 360
          </FluentText>
          <FluentText variant="caption2" color="tertiary" align="center" style={{ marginTop: FluentSpacing.xxs }}>
            All rights reserved
          </FluentText>
          <FluentText variant="caption2" color="secondary" align="center" style={{ marginTop: FluentSpacing.xs }}>
            support@theteam360.com
          </FluentText>
        </View>
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: FluentSpacing.l,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: FluentSpacing.m,
    marginBottom: FluentSpacing.xl,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: FluentControlRadius.avatar,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  heroStatus: {
    marginBottom: FluentSpacing.xs,
  },
  section: {
    marginBottom: FluentSpacing.xl,
  },
  card: {
    borderRadius: FluentControlRadius.card,
    padding: FluentSpacing.l,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
  },
  categoryDivider: {
    height: 1,
  },
  featureList: {
    paddingLeft: FluentSpacing.xxl,
    paddingBottom: FluentSpacing.s,
    gap: FluentSpacing.xs,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: FluentSpacing.xxs,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.l,
  },
  priceBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: FluentSpacing.s,
  },
  priceDivider: {
    width: 1,
    height: 48,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: FluentSpacing.s,
    marginBottom: FluentSpacing.l,
  },
  priceBadge: {
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentControlRadius.chip,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.button,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.button,
  },
  licensedConfirmation: {
    alignItems: "center",
    paddingVertical: FluentSpacing.l,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.xs,
  },
  libraryList: {
    gap: FluentSpacing.xs,
  },
  libraryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.xxs,
  },
  licenseBadge: {
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xxs,
    borderRadius: FluentControlRadius.chip,
  },
  licenseNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: FluentSpacing.l,
    paddingTop: FluentSpacing.m,
    borderTopWidth: 1,
  },
  footer: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xl,
    marginBottom: FluentSpacing.m,
  },
});
