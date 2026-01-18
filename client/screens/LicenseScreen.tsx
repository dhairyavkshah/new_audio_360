import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentIconSize, FluentFontWeight } from "@/constants/fluent2";

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.theteam360.newaudio360';

type FeatureItem = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
  licensed: boolean;
};

const FEATURES: FeatureItem[] = [
  { icon: "music", text: "Music Player", licensed: true },
  { icon: "playlist-music", text: "Playlist Management", licensed: true },
  { icon: "palette-outline", text: "All 55 Themes", licensed: true },
  { icon: "equalizer", text: "Equalizer Presets", licensed: true },
  { icon: "surround-sound", text: "Immersive Modes", licensed: true },
  { icon: "heart", text: "Favorites & History", licensed: true },
  { icon: "timer-sand", text: "Sleep Timer", licensed: true },
  { icon: "volume-high", text: "All Effects & Reverbs", licensed: true },
];

function SectionHeader({ title, isDark }: { title: string; isDark: boolean }) {
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  return (
    <FluentText 
      variant="caption2" 
      style={[styles.sectionHeader, { color: colors.colorNeutralForeground2, fontWeight: FluentFontWeight.medium }]}
    >
      {title.toUpperCase()}
    </FluentText>
  );
}

function SectionCard({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
      {children}
    </View>
  );
}

export default function LicenseScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { licenseStatus, isLoading, checkLicenseStatus } = useSubscription();

  const handleVerifyInstallation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await checkLicenseStatus();
  };

  const handleOpenPlayStore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(PLAY_STORE_URL);
  };

  const getLicenseBadge = () => {
    if (licenseStatus === "licensed") {
      return { 
        label: "Licensed", 
        color: colors.colorPaletteYellowForeground1, 
        icon: "crown" as const 
      };
    }
    return { label: "Unlicensed", color: colors.colorNeutralForeground2, icon: "lock-outline" as const };
  };

  const badge = getLicenseBadge();

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + FluentSpacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.currentPlanSection}>
          <View style={[styles.planBadge, { backgroundColor: badge.color + "20" }]}>
            <MaterialCommunityIcons name={badge.icon} size={FluentIconSize.medium} color={badge.color} />
          </View>
          <FluentText variant="title3" style={styles.currentPlanTitle}>
            Current Status
          </FluentText>
          <FluentText variant="title1" style={[styles.planName, { color: badge.color }]}>
            {badge.label}
          </FluentText>
          {licenseStatus === "licensed" && (
            <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
              All features unlocked forever
            </FluentText>
          )}
          {licenseStatus === "unlicensed" && (
            <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
              Install from Google Play to activate
            </FluentText>
          )}
        </View>

        <SectionHeader title="Features Included" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <View style={styles.featuresContainer}>
            <View style={styles.comparisonHeader}>
              <FluentText variant="caption2" style={{ color: colors.colorNeutralForeground2 }}>
                Features
              </FluentText>
              <FluentText variant="caption2" style={{ color: colors.colorPaletteYellowForeground1, fontWeight: FluentFontWeight.semibold }}>
                Included
              </FluentText>
            </View>
            {FEATURES.map((feature, index) => (
              <View key={feature.text}>
                <View style={styles.featureRow}>
                  <View style={styles.featureLeft}>
                    <MaterialCommunityIcons 
                      name={feature.icon} 
                      size={FluentIconSize.regular} 
                      color={colors.colorNeutralForeground2} 
                    />
                    <FluentText variant="body2" style={[styles.featureText, { color: colors.colorNeutralForeground1 }]}>
                      {feature.text}
                    </FluentText>
                  </View>
                  <View style={styles.checkBox}>
                    {feature.licensed ? (
                      <MaterialCommunityIcons name="check" size={18} color={colors.colorPaletteGreenForeground1} />
                    ) : (
                      <MaterialCommunityIcons name="close" size={18} color={colors.colorPaletteRedForeground1} />
                    )}
                  </View>
                </View>
                {index < FEATURES.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />
                )}
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionHeader title="How to Get Licensed" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <View style={styles.pricingContent}>
            <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.l }}>
              New Audio 360 is a paid app available on Google Play Store. Purchase and install the app from Google Play to unlock all features.
            </FluentText>

            {licenseStatus !== "licensed" && (
              <>
                <View style={[styles.infoCard, { backgroundColor: colors.colorBrandBackground + "10", borderColor: colors.colorBrandForeground1 }]}>
                  <MaterialCommunityIcons name="google-play" size={FluentIconSize.xlarge} color={colors.colorBrandForeground1} />
                  <View style={{ flex: 1, marginLeft: FluentSpacing.m }}>
                    <FluentText variant="body2" style={{ fontWeight: FluentFontWeight.semibold, color: colors.colorNeutralForeground1 }}>
                      Available on Google Play
                    </FluentText>
                    <FluentText variant="caption2" color="secondary" style={{ marginTop: 2 }}>
                      One-time purchase, lifetime access
                    </FluentText>
                  </View>
                </View>

                <Pressable
                  onPress={handleVerifyInstallation}
                  disabled={isLoading}
                  style={[styles.actionButton, { backgroundColor: colors.colorBrandBackground, opacity: isLoading ? 0.6 : 1 }]}
                >
                  <MaterialCommunityIcons name="refresh" size={FluentIconSize.regular} color="#FFFFFF" />
                  <FluentText variant="body2" style={{ color: "#FFFFFF", fontWeight: FluentFontWeight.semibold, marginLeft: FluentSpacing.s }}>
                    {isLoading ? "Verifying..." : "Verify Installation"}
                  </FluentText>
                </Pressable>

                <Pressable
                  onPress={handleOpenPlayStore}
                  style={[styles.actionButton, { backgroundColor: colors.colorNeutralBackground3 }]}
                >
                  <MaterialCommunityIcons name="google-play" size={FluentIconSize.regular} color={colors.colorNeutralForeground1} />
                  <FluentText variant="body2" style={{ marginLeft: FluentSpacing.s, color: colors.colorNeutralForeground1 }}>
                    Get it on Google Play
                  </FluentText>
                </Pressable>
              </>
            )}

            {licenseStatus === "licensed" && (
              <View style={[styles.successCard, { backgroundColor: colors.colorPaletteGreenForeground1 + "15" }]}>
                <MaterialCommunityIcons name="check-decagram" size={FluentIconSize.xlarge} color={colors.colorPaletteGreenForeground1} />
                <FluentText variant="body2" style={{ color: colors.colorPaletteGreenForeground1, marginTop: FluentSpacing.s }}>
                  You have access to all features!
                </FluentText>
                <FluentText variant="caption2" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                  Lifetime license active
                </FluentText>
              </View>
            )}
          </View>
        </SectionCard>

        <SectionHeader title="Purchase Info" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="shield-check" size={FluentIconSize.small} color={colors.colorPaletteGreenForeground1} />
              <FluentText variant="caption1" color="secondary" style={styles.infoText}>
                Secure purchase via Google Play
              </FluentText>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="google-play" size={FluentIconSize.small} color={colors.colorBrandForeground1} />
              <FluentText variant="caption1" color="secondary" style={styles.infoText}>
                One-time purchase - no recurring charges
              </FluentText>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="infinity" size={FluentIconSize.small} color={colors.colorBrandForeground2} />
              <FluentText variant="caption1" color="secondary" style={styles.infoText}>
                Lifetime access - never expires
              </FluentText>
            </View>
            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <MaterialCommunityIcons name="cellphone" size={FluentIconSize.small} color={colors.colorNeutralForeground2} />
              <FluentText variant="caption1" color="secondary" style={styles.infoText}>
                100% offline - works without internet
              </FluentText>
            </View>
          </View>
        </SectionCard>
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: FluentSpacing.l,
  },
  currentPlanSection: {
    alignItems: "center",
    marginBottom: FluentSpacing.l,
    paddingTop: FluentSpacing.m,
  },
  planBadge: {
    width: 56,
    height: 56,
    borderRadius: FluentRadius.circular,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  currentPlanTitle: {
    marginBottom: FluentSpacing.xs,
  },
  planName: {
    fontWeight: FluentFontWeight.bold,
  },
  sectionHeader: {
    paddingLeft: FluentSpacing.l,
    paddingTop: FluentSpacing.s,
    paddingBottom: FluentSpacing.s,
    marginTop: FluentSpacing.xxl,
  },
  sectionCard: {
    marginHorizontal: FluentSpacing.l,
    borderRadius: FluentRadius.xLarge,
    overflow: "hidden",
  },
  featuresContainer: {
    padding: FluentSpacing.l,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: FluentSpacing.m,
    marginBottom: FluentSpacing.s,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: FluentSpacing.s,
  },
  featureLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    marginLeft: FluentSpacing.m,
  },
  checkBox: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginLeft: FluentIconSize.regular + FluentSpacing.m,
  },
  pricingContent: {
    padding: FluentSpacing.l,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentRadius.large,
    borderWidth: 1,
    marginBottom: FluentSpacing.l,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.large,
    minHeight: 48,
    marginTop: FluentSpacing.s,
  },
  successCard: {
    alignItems: "center",
    padding: FluentSpacing.xl,
    borderRadius: FluentRadius.large,
  },
  infoSection: {
    padding: FluentSpacing.l,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  infoText: {
    marginLeft: FluentSpacing.m,
    flex: 1,
  },
});
