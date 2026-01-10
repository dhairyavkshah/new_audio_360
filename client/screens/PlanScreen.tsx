import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useSubscription, PRICING, SupportedCurrency } from "@/contexts/SubscriptionContext";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { Layout } from "@/constants/theme";
import { detectUserRegion } from "@/lib/payment";

type FeatureItem = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
  standard: boolean;
  premium: boolean;
};

const FEATURES: FeatureItem[] = [
  { icon: "music", text: "Music Player", standard: true, premium: true },
  { icon: "playlist-music", text: "Playlist Management", standard: true, premium: true },
  { icon: "palette", text: "5 System Themes", standard: true, premium: true },
  { icon: "palette-outline", text: "All 55 Themes", standard: false, premium: true },
  { icon: "equalizer", text: "Equalizer Presets", standard: true, premium: true },
  { icon: "surround-sound", text: "Immersive Modes", standard: false, premium: true },
  { icon: "heart", text: "Favorites & History", standard: true, premium: true },
  { icon: "timer-sand", text: "Sleep Timer", standard: true, premium: true },
];

export default function PlanScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { plan, isLoading, purchaseStandard, purchasePremium, upgradeToPremiun, restorePurchases } = useSubscription();

  const [currency, setCurrency] = useState<SupportedCurrency>("USD");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    detectUserRegion().then((result) => {
      if (result.currency && result.currency in PRICING) {
        setCurrency(result.currency as SupportedCurrency);
      }
    });
  }, []);

  const pricing = PRICING[currency];

  const handlePurchaseStandard = async () => {
    if (plan !== "free") return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    
    try {
      const success = await purchaseStandard();
      if (success) {
        Alert.alert("Success", "Standard plan activated! Enjoy your music.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to complete purchase. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchasePremium = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    
    try {
      const success = plan === "standard" ? await upgradeToPremiun() : await purchasePremium();
      if (success) {
        Alert.alert("Success", "Premium plan activated! All features unlocked.");
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

  const getPlanBadge = () => {
    switch (plan) {
      case "premium":
        return { label: "Premium", color: colors.colorPaletteYellowForeground1, icon: "crown" as const };
      case "standard":
        return { label: "Standard", color: colors.colorBrandForeground1, icon: "check-circle" as const };
      default:
        return { label: "Free Trial", color: colors.colorNeutralForeground2, icon: "account-outline" as const };
    }
  };

  const badge = getPlanBadge();

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
            {feature.standard ? (
              <MaterialCommunityIcons name="check" size={18} color={colors.colorPaletteGreenForeground1} />
            ) : (
              <MaterialCommunityIcons name="close" size={18} color={colors.colorPaletteRedForeground1} />
            )}
          </View>
          <View style={[styles.checkBox, { width: 60 }]}>
            {feature.premium ? (
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
            Current Plan
          </FluentText>
          <FluentText variant="title1" style={[styles.planName, { color: badge.color }]}>
            {badge.label}
          </FluentText>
          {plan === "premium" && (
            <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
              All features unlocked
            </FluentText>
          )}
        </GlassCard>

        <View style={styles.comparisonSection}>
          <FluentText variant="subtitle1" style={styles.sectionTitle}>
            Compare Plans
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
                  <FluentText variant="caption1" color="brand" style={{ fontWeight: "600" }}>
                    Standard
                  </FluentText>
                </View>
                <View style={[styles.checkBox, { width: 60 }]}>
                  <FluentText variant="caption1" style={{ color: colors.colorPaletteYellowForeground1, fontWeight: "600" }}>
                    Premium
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
              Pay once, own forever. No subscriptions.
            </FluentText>

            {plan === "free" && (
              <Pressable
                onPress={handlePurchaseStandard}
                disabled={isProcessing}
                style={[
                  styles.planButton,
                  { 
                    backgroundColor: colors.colorBrandBackground,
                    opacity: isProcessing ? 0.6 : 1,
                  },
                ]}
              >
                <View style={styles.planButtonContent}>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#FFFFFF" />
                  <View style={styles.planButtonText}>
                    <FluentText variant="body1" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      Standard
                    </FluentText>
                    <FluentText variant="caption1" style={{ color: "rgba(255,255,255,0.8)" }}>
                      5 themes, Equalizer, Playlists
                    </FluentText>
                  </View>
                </View>
                <FluentText variant="title3" style={{ color: "#FFFFFF" }}>
                  {pricing.symbol}{pricing.standard}
                </FluentText>
              </Pressable>
            )}

            {plan !== "premium" && (
              <Pressable
                onPress={handlePurchasePremium}
                disabled={isProcessing}
                style={[
                  styles.planButton,
                  { 
                    backgroundColor: colors.colorPaletteYellowForeground1,
                    opacity: isProcessing ? 0.6 : 1,
                    marginTop: plan === "free" ? FluentSpacing.m : 0,
                  },
                ]}
              >
                <View style={styles.planButtonContent}>
                  <MaterialCommunityIcons name="crown" size={24} color="#FFFFFF" />
                  <View style={styles.planButtonText}>
                    <FluentText variant="body1" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      {plan === "standard" ? "Upgrade to Premium" : "Premium"}
                    </FluentText>
                    <FluentText variant="caption1" style={{ color: "rgba(255,255,255,0.8)" }}>
                      All 55 themes, Immersive Audio
                    </FluentText>
                  </View>
                </View>
                <FluentText variant="title3" style={{ color: "#FFFFFF" }}>
                  {pricing.symbol}{plan === "standard" ? pricing.upgrade : pricing.premium}
                </FluentText>
              </Pressable>
            )}

            {plan === "premium" && (
              <View style={[styles.allUnlockedCard, { backgroundColor: colors.colorPaletteGreenForeground1 + "15" }]}>
                <MaterialCommunityIcons name="check-decagram" size={32} color={colors.colorPaletteGreenForeground1} />
                <FluentText variant="body1" style={{ color: colors.colorPaletteGreenForeground1, marginTop: FluentSpacing.s }}>
                  You have access to all features!
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
              <MaterialCommunityIcons name="infinity" size={16} color={colors.colorBrandForeground1} />
              <FluentText variant="caption1" color="secondary" style={{ marginLeft: FluentSpacing.s }}>
                Lifetime access - no recurring fees
              </FluentText>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="cellphone" size={16} color={colors.colorBrandForeground2} />
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
  planButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
  },
  planButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  planButtonText: {
    marginLeft: FluentSpacing.m,
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
