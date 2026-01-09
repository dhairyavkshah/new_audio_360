import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useSubscription, PRICING, SupportedCurrency } from "@/contexts/SubscriptionContext";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentSpacing, FluentControlRadius } from "@/constants/fluent2";
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
  { icon: "palette", text: "5 System Themes", standard: true, premium: true },
  { icon: "palette-outline", text: "All 55 Themes", standard: false, premium: true },
  { icon: "equalizer", text: "Equalizer Presets", standard: true, premium: true },
  { icon: "surround-sound", text: "Immersive Modes", standard: false, premium: true },
  { icon: "microphone", text: "Studio Mode", standard: true, premium: true },
  { icon: "volume-off", text: "Light Noise Reduction", standard: true, premium: true },
  { icon: "volume-off", text: "All Noise Reduction", standard: false, premium: true },
  { icon: "waveform", text: "Small Studio Reverb", standard: true, premium: true },
  { icon: "waveform", text: "All Reverb Presets", standard: false, premium: true },
];

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const { theme } = useThemeContext();
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
        return { label: "Premium", color: theme.warning, icon: "crown" as const };
      case "standard":
        return { label: "Standard", color: theme.primary, icon: "check-circle" as const };
      default:
        return { label: "Free Trial", color: theme.textSecondary, icon: "account-outline" as const };
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
            color={theme.textSecondary} 
          />
          <ThemedText type="body" style={styles.featureText}>
            {feature.text}
          </ThemedText>
        </View>
        <View style={styles.featureChecks}>
          <View style={[styles.checkBox, { width: 60 }]}>
            {feature.standard ? (
              <MaterialCommunityIcons name="check" size={18} color={theme.success} />
            ) : (
              <MaterialCommunityIcons name="close" size={18} color={theme.error} />
            )}
          </View>
          <View style={[styles.checkBox, { width: 60 }]}>
            {feature.premium ? (
              <MaterialCommunityIcons name="check" size={18} color={theme.success} />
            ) : (
              <MaterialCommunityIcons name="close" size={18} color={theme.error} />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
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
          <ThemedText type="h4" style={styles.currentPlanTitle}>
            Current Plan
          </ThemedText>
          <ThemedText type="h3" style={[styles.planName, { color: badge.color }]}>
            {badge.label}
          </ThemedText>
          {plan === "premium" && (
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: FluentSpacing.xs }}>
              All features unlocked
            </ThemedText>
          )}
        </GlassCard>

        <View style={styles.comparisonSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Compare Plans
          </ThemedText>
          
          <View style={[styles.comparisonHeader, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.featureLeft}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Features
              </ThemedText>
            </View>
            <View style={styles.featureChecks}>
              <View style={[styles.checkBox, { width: 60 }]}>
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                  Standard
                </ThemedText>
              </View>
              <View style={[styles.checkBox, { width: 60 }]}>
                <ThemedText type="small" style={{ color: theme.warning, fontWeight: "600" }}>
                  Premium
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.featuresList, { backgroundColor: theme.backgroundSecondary }]}>
            {FEATURES.map(renderFeatureRow)}
          </View>
        </View>

        <View style={styles.pricingSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            One-Time Purchase
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: FluentSpacing.l }}>
            Pay once, own forever. No subscriptions.
          </ThemedText>

          {plan === "free" && (
            <Pressable
              onPress={handlePurchaseStandard}
              disabled={isProcessing}
              style={[
                styles.planButton,
                { 
                  backgroundColor: theme.primary,
                  opacity: isProcessing ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.planButtonContent}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#FFFFFF" />
                <View style={styles.planButtonText}>
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    Standard
                  </ThemedText>
                  <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                    5 themes, Equalizer, Basic Studio
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="h4" style={{ color: "#FFFFFF" }}>
                {pricing.symbol}{pricing.standard}
              </ThemedText>
            </Pressable>
          )}

          {plan !== "premium" && (
            <Pressable
              onPress={handlePurchasePremium}
              disabled={isProcessing}
              style={[
                styles.planButton,
                { 
                  backgroundColor: theme.warning,
                  opacity: isProcessing ? 0.6 : 1,
                  marginTop: plan === "free" ? FluentSpacing.m : 0,
                },
              ]}
            >
              <View style={styles.planButtonContent}>
                <MaterialCommunityIcons name="crown" size={24} color="#FFFFFF" />
                <View style={styles.planButtonText}>
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {plan === "standard" ? "Upgrade to Premium" : "Premium"}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                    All 55 themes, Immersive, Full Studio
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="h4" style={{ color: "#FFFFFF" }}>
                {pricing.symbol}{plan === "standard" ? pricing.upgrade : pricing.premium}
              </ThemedText>
            </Pressable>
          )}

          {plan === "premium" && (
            <View style={[styles.allUnlockedCard, { backgroundColor: theme.success + "15" }]}>
              <MaterialCommunityIcons name="check-decagram" size={32} color={theme.success} />
              <ThemedText type="body" style={{ color: theme.success, marginTop: FluentSpacing.s }}>
                You have access to all features!
              </ThemedText>
            </View>
          )}
        </View>

        <Pressable
          onPress={handleRestore}
          disabled={isProcessing}
          style={[styles.restoreButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <MaterialCommunityIcons name="refresh" size={20} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: FluentSpacing.s }}>
            Restore Purchases
          </ThemedText>
        </Pressable>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="shield-check" size={16} color={theme.success} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: FluentSpacing.s }}>
              Secure payment via Google Play
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="infinity" size={16} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: FluentSpacing.s }}>
              Lifetime access - no recurring fees
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="cellphone" size={16} color={theme.secondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: FluentSpacing.s }}>
              100% offline - works without internet
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
