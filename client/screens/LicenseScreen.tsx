import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePlatformMode } from "@/contexts/PlatformModeContext";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { Layout } from "@/constants/theme";

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

export default function LicenseScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { licenseStatus, isLoading, checkLicenseStatus } = useSubscription();
  const { isAndroid } = usePlatformMode();

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

  const renderFeatureRow = (feature: FeatureItem) => {
    return (
      <View key={feature.text} style={styles.featureRow}>
        <View style={styles.featureLeft}>
          <MaterialCommunityIcons 
            name={feature.icon} 
            size={20} 
            color={colors.colorNeutralForeground2} 
          />
          <FluentText variant="body1" style={styles.featureText}>
            {feature.text}
          </FluentText>
        </View>
        <View style={styles.featureChecks}>
          <View style={[styles.checkBox, { width: 60 }]}>
            {feature.licensed ? (
              <MaterialCommunityIcons name="check" size={18} color={colors.colorPaletteGreenForeground1} />
            ) : (
              <MaterialCommunityIcons name="close" size={18} color={colors.colorPaletteRedForeground1} />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.currentPlanSection}>
          <View style={[styles.planBadge, { backgroundColor: badge.color + "20" }]}>
            <MaterialCommunityIcons name={badge.icon} size={24} color={badge.color} />
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

        <View style={styles.comparisonSection}>
          <FluentText variant="subtitle1" style={styles.sectionTitle}>
            Features Included
          </FluentText>
          
          <View style={{
            backgroundColor: colors.colorNeutralBackground2,
            borderRadius: FluentControlRadius.dialog,
            padding: FluentSpacing.l,
            marginBottom: FluentSpacing.m,
          }}>
            <View style={styles.comparisonHeader}>
              <View style={styles.featureLeft}>
                <FluentText variant="caption1" color="secondary">
                  Features
                </FluentText>
              </View>
              <View style={styles.featureChecks}>
                <View style={[styles.checkBox, { width: 60 }]}>
                  <FluentText variant="caption1" style={{ color: colors.colorPaletteYellowForeground1, fontWeight: "600" }}>
                    Included
                  </FluentText>
                </View>
              </View>
            </View>

            <View style={styles.featuresList}>
              {FEATURES.map(renderFeatureRow)}
            </View>
          </View>
        </View>

        <View style={styles.pricingSection}>
          <FluentText variant="subtitle1" style={styles.sectionTitle}>
            How to Get Licensed
          </FluentText>
          
          <View style={{
            backgroundColor: colors.colorNeutralBackground2,
            borderRadius: FluentControlRadius.dialog,
            padding: FluentSpacing.l,
            marginBottom: FluentSpacing.m,
          }}>
            <FluentText variant="body2" color="secondary" style={{ marginBottom: FluentSpacing.l }}>
              New Audio 360 is a paid app available on Google Play Store. Purchase and install the app from Google Play to unlock all features.
            </FluentText>

            {licenseStatus !== "licensed" && isAndroid && (
              <>
                <View style={[
                  styles.infoCard,
                  { 
                    backgroundColor: colors.colorBrandBackground + "10",
                    borderColor: colors.colorBrandForeground1,
                    borderWidth: 1,
                  },
                ]}>
                  <MaterialCommunityIcons name="google-play" size={32} color={colors.colorBrandForeground1} />
                  <View style={{ flex: 1, marginLeft: FluentSpacing.m }}>
                    <FluentText variant="body1" style={{ fontWeight: "600" }}>
                      Available on Google Play
                    </FluentText>
                    <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xxs }}>
                      One-time purchase, lifetime access
                    </FluentText>
                  </View>
                </View>

                <Pressable
                  onPress={handleVerifyInstallation}
                  disabled={isLoading}
                  style={[
                    styles.verifyButton,
                    { 
                      backgroundColor: colors.colorBrandBackground,
                      opacity: isLoading ? 0.6 : 1,
                      marginTop: FluentSpacing.l,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
                  <FluentText variant="body1" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: FluentSpacing.s }}>
                    {isLoading ? "Verifying..." : "Verify Installation"}
                  </FluentText>
                </Pressable>

                <Pressable
                  onPress={handleOpenPlayStore}
                  style={[
                    styles.playStoreButton,
                    { 
                      backgroundColor: colors.colorNeutralBackground3,
                      marginTop: FluentSpacing.m,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="google-play" size={20} color={colors.colorNeutralForeground1} />
                  <FluentText variant="body1" style={{ marginLeft: FluentSpacing.s }}>
                    Get it on Google Play
                  </FluentText>
                </Pressable>
              </>
            )}
            
            {licenseStatus !== "licensed" && !isAndroid && (
              <View style={[styles.allUnlockedCard, { backgroundColor: colors.colorBrandBackground + "15" }]}>
                <MaterialCommunityIcons name="information-outline" size={32} color={colors.colorBrandForeground1} />
                <FluentText variant="body1" style={{ color: colors.colorBrandForeground1, marginTop: FluentSpacing.s, textAlign: "center" }}>
                  Web preview mode - all features available
                </FluentText>
                <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs, textAlign: "center" }}>
                  Purchase on Android for full license
                </FluentText>
              </View>
            )}

            {licenseStatus === "licensed" && (
              <View style={[styles.allUnlockedCard, { backgroundColor: colors.colorPaletteGreenForeground1 + "15" }]}>
                <MaterialCommunityIcons name="check-decagram" size={32} color={colors.colorPaletteGreenForeground1} />
                <FluentText variant="body1" style={{ color: colors.colorPaletteGreenForeground1, marginTop: FluentSpacing.s }}>
                  You have access to all features!
                </FluentText>
                <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                  Lifetime license active
                </FluentText>
              </View>
            )}
          </View>
        </View>

        <View style={{
          backgroundColor: colors.colorNeutralBackground2,
          borderRadius: FluentControlRadius.dialog,
          padding: FluentSpacing.l,
          marginBottom: FluentSpacing.m,
        }}>
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="shield-check" size={16} color={colors.colorPaletteGreenForeground1} />
              <FluentText variant="caption1" color="secondary" style={{ marginLeft: FluentSpacing.s }}>
                Secure purchase via Google Play
              </FluentText>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="google-play" size={16} color={colors.colorBrandForeground1} />
              <FluentText variant="caption1" color="secondary" style={{ marginLeft: FluentSpacing.s }}>
                One-time purchase - no recurring charges
              </FluentText>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="infinity" size={16} color={colors.colorBrandForeground2} />
              <FluentText variant="caption1" color="secondary" style={{ marginLeft: FluentSpacing.s }}>
                Lifetime access - never expires
              </FluentText>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="cellphone" size={16} color={colors.colorNeutralForeground2} />
              <FluentText variant="caption1" color="secondary" style={{ marginLeft: FluentSpacing.s }}>
                100% offline - works without internet
              </FluentText>
            </View>
          </View>
        </View>
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.horizontalPadding,
  },
  currentPlanSection: {
    alignItems: "center",
    marginBottom: FluentSpacing.xl,
    paddingTop: FluentSpacing.m,
  },
  planBadge: {
    width: 56,
    height: 56,
    borderRadius: FluentControlRadius.avatar,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  currentPlanTitle: {
    marginBottom: FluentSpacing.xs,
  },
  planName: {
    fontWeight: "700",
  },
  comparisonSection: {
    marginBottom: FluentSpacing.xl,
  },
  sectionTitle: {
    marginBottom: FluentSpacing.m,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderTopLeftRadius: FluentControlRadius.dialog,
    borderTopRightRadius: FluentControlRadius.dialog,
  },
  featuresList: {
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderBottomLeftRadius: FluentControlRadius.dialog,
    borderBottomRightRadius: FluentControlRadius.dialog,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.s,
  },
  featureLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    marginLeft: FluentSpacing.s,
  },
  featureChecks: {
    flexDirection: "row",
  },
  checkBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  pricingSection: {
    marginBottom: FluentSpacing.xl,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
  },
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
  },
  playStoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
  },
  allUnlockedCard: {
    alignItems: "center",
    padding: FluentSpacing.xl,
    borderRadius: FluentControlRadius.dialog,
  },
  infoSection: {
    gap: FluentSpacing.s,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
