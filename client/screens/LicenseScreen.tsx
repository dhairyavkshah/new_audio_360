import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useSubscription, PRICING } from "@/contexts/SubscriptionContext";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { Layout } from "@/constants/theme";
import { detectUserRegion } from "@/lib/payment";

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
  const { licenseStatus, isLoading, purchaseApp, restorePurchases } = useSubscription();

  const [isIndian, setIsIndian] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    detectUserRegion().then((result) => {
      setIsIndian(result.isIndian);
    });
  }, []);

  const pricing = isIndian ? PRICING.india : PRICING.international;

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    
    try {
      const success = await purchaseApp();
      if (success) {
        Alert.alert(
          "Success", 
          "Lifetime license activated! All features are now unlocked forever."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to complete purchase. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsProcessing(true);
    
    try {
      await restorePurchases();
      Alert.alert("Restored", "Your purchases have been restored.");
    } catch (error) {
      Alert.alert("Error", "Failed to restore purchases.");
    } finally {
      setIsProcessing(false);
    }
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
    <FluentScreenLayout edges={[]} hasBottomNavigation={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.l, paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.currentPlanCard}>
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
        </GlassCard>

        <View style={styles.comparisonSection}>
          <FluentText variant="subtitle1" style={styles.sectionTitle}>
            Features Included
          </FluentText>
          
          <View style={{
            backgroundColor: colors.colorNeutralBackground2,
            borderRadius: 12,
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
            One-Time Purchase
          </FluentText>
          
          <View style={{
            backgroundColor: colors.colorNeutralBackground2,
            borderRadius: 12,
            padding: FluentSpacing.l,
            marginBottom: FluentSpacing.m,
          }}>
            <FluentText variant="body2" color="secondary" style={{ marginBottom: FluentSpacing.l }}>
              Pay once, unlock forever. No subscriptions, no renewals.
            </FluentText>

            {licenseStatus !== "licensed" && (
              <>
                <View style={[
                  styles.priceCard,
                  { 
                    backgroundColor: colors.colorPaletteYellowForeground1 + "15",
                    borderColor: colors.colorPaletteYellowForeground1,
                    borderWidth: 2,
                  },
                ]}>
                  <View style={styles.priceCardContent}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: FluentSpacing.s }}>
                        <FluentText variant="body1" style={{ fontWeight: "600" }}>
                          Lifetime License
                        </FluentText>
                        <View style={[styles.bestValueBadge, { backgroundColor: colors.colorPaletteGreenForeground1 }]}>
                          <FluentText variant="caption2" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                            ONE-TIME
                          </FluentText>
                        </View>
                      </View>
                      <FluentText variant="caption1" color="secondary">
                        All features, forever
                      </FluentText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <FluentText variant="title2" style={{ fontWeight: "700" }}>
                        {pricing.symbol}{pricing.amount}
                      </FluentText>
                      <FluentText variant="caption1" color="secondary">
                        one-time
                      </FluentText>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={handlePurchase}
                  disabled={isProcessing}
                  style={[
                    styles.purchaseButton,
                    { 
                      backgroundColor: colors.colorPaletteYellowForeground1,
                      opacity: isProcessing ? 0.6 : 1,
                      marginTop: FluentSpacing.l,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="crown" size={20} color="#FFFFFF" />
                  <FluentText variant="body1" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: FluentSpacing.s }}>
                    {isProcessing ? "Processing..." : "Unlock Now"}
                  </FluentText>
                </Pressable>
              </>
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

        <Pressable
          onPress={handleRestore}
          disabled={isProcessing}
          style={[styles.restoreButton, { backgroundColor: colors.colorNeutralBackground2 }]}
        >
          <MaterialCommunityIcons name="refresh" size={20} color={colors.colorNeutralForeground2} />
          <FluentText variant="body1" color="secondary" style={{ marginLeft: FluentSpacing.s }}>
            Restore Purchases
          </FluentText>
        </Pressable>

        <View style={{
          backgroundColor: colors.colorNeutralBackground2,
          borderRadius: 12,
          padding: FluentSpacing.l,
          marginBottom: FluentSpacing.m,
        }}>
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="shield-check" size={16} color={colors.colorPaletteGreenForeground1} />
              <FluentText variant="caption1" color="secondary" style={{ marginLeft: FluentSpacing.s }}>
                Secure payment via Google Play
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
  currentPlanCard: {
    alignItems: "center",
    marginBottom: FluentSpacing.xl,
  },
  planBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  priceCard: {
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
  },
  priceCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bestValueBadge: {
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: 2,
    borderRadius: 4,
  },
  purchaseButton: {
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
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
    marginBottom: FluentSpacing.xl,
  },
  infoSection: {
    gap: FluentSpacing.s,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
