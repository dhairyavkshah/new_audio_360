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
  free: boolean;
  premium: boolean;
};

const FEATURES: FeatureItem[] = [
  { icon: "music", text: "Music Player", free: true, premium: true },
  { icon: "playlist-music", text: "Playlist Management", free: true, premium: true },
  { icon: "palette", text: "5 System Themes", free: true, premium: true },
  { icon: "palette-outline", text: "All 55 Themes", free: false, premium: true },
  { icon: "equalizer", text: "Equalizer Presets", free: true, premium: true },
  { icon: "surround-sound", text: "Immersive Modes", free: false, premium: true },
  { icon: "heart", text: "Favorites & History", free: true, premium: true },
  { icon: "timer-sand", text: "Sleep Timer", free: true, premium: true },
];

export default function PlanScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { plan, subscriptionType, isLoading, purchaseSubscription, restorePurchases } = useSubscription();

  const [isIndian, setIsIndian] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    detectUserRegion().then((result) => {
      setIsIndian(result.isIndian);
    });
  }, []);

  const pricing = isIndian ? PRICING.india : PRICING.international;

  const handlePurchaseSubscription = async (type: 'monthly' | 'annual') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    
    try {
      const success = await purchaseSubscription(type);
      if (success) {
        Alert.alert(
          "Success", 
          `Premium ${type === 'monthly' ? 'Monthly' : 'Annual'} subscription activated! All features unlocked.`
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
      Alert.alert("Restored", "Your subscriptions have been restored.");
    } catch (error) {
      Alert.alert("Error", "Failed to restore purchases.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getPlanBadge = () => {
    if (plan === "premium") {
      return { 
        label: subscriptionType === 'annual' ? "Premium Annual" : "Premium Monthly", 
        color: colors.colorPaletteYellowForeground1, 
        icon: "crown" as const 
      };
    }
    return { label: "Free", color: colors.colorNeutralForeground2, icon: "account-outline" as const };
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
            {feature.free ? (
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
                  <FluentText variant="caption1" color="secondary" style={{ fontWeight: "600" }}>
                    Free
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
            Subscription Plans
          </FluentText>
          
          <View style={{
            backgroundColor: colors.colorNeutralBackground2,
            borderRadius: 12,
            padding: FluentSpacing.l,
            marginBottom: FluentSpacing.m,
          }}>
            <FluentText variant="body2" color="secondary" style={{ marginBottom: FluentSpacing.l }}>
              Choose your subscription plan. Cancel anytime.
            </FluentText>

            {plan !== "premium" && (
              <>
                <Pressable
                  onPress={() => setSelectedPlan('annual')}
                  style={[
                    styles.subscriptionOption,
                    { 
                      backgroundColor: selectedPlan === 'annual' 
                        ? colors.colorPaletteYellowForeground1 + "15" 
                        : colors.colorNeutralBackground3,
                      borderColor: selectedPlan === 'annual' 
                        ? colors.colorPaletteYellowForeground1 
                        : 'transparent',
                      borderWidth: 2,
                    },
                  ]}
                >
                  <View style={styles.subscriptionOptionHeader}>
                    <View style={styles.subscriptionOptionLeft}>
                      <View style={[
                        styles.radioButton,
                        { 
                          borderColor: selectedPlan === 'annual' 
                            ? colors.colorPaletteYellowForeground1 
                            : colors.colorNeutralForeground3,
                        }
                      ]}>
                        {selectedPlan === 'annual' && (
                          <View style={[
                            styles.radioButtonInner,
                            { backgroundColor: colors.colorPaletteYellowForeground1 }
                          ]} />
                        )}
                      </View>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: FluentSpacing.s }}>
                          <FluentText variant="body1" style={{ fontWeight: "600" }}>
                            Annual
                          </FluentText>
                          <View style={[styles.bestValueBadge, { backgroundColor: colors.colorPaletteGreenForeground1 }]}>
                            <FluentText variant="caption2" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                              BEST VALUE
                            </FluentText>
                          </View>
                        </View>
                        <FluentText variant="caption1" color="secondary">
                          Save {pricing.symbol}{pricing.annualSavings}/year
                        </FluentText>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <FluentText variant="title3" style={{ fontWeight: "700" }}>
                        {pricing.symbol}{pricing.annual}
                      </FluentText>
                      <FluentText variant="caption1" color="secondary">
                        per year
                      </FluentText>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedPlan('monthly')}
                  style={[
                    styles.subscriptionOption,
                    { 
                      backgroundColor: selectedPlan === 'monthly' 
                        ? colors.colorPaletteYellowForeground1 + "15" 
                        : colors.colorNeutralBackground3,
                      borderColor: selectedPlan === 'monthly' 
                        ? colors.colorPaletteYellowForeground1 
                        : 'transparent',
                      borderWidth: 2,
                      marginTop: FluentSpacing.m,
                    },
                  ]}
                >
                  <View style={styles.subscriptionOptionHeader}>
                    <View style={styles.subscriptionOptionLeft}>
                      <View style={[
                        styles.radioButton,
                        { 
                          borderColor: selectedPlan === 'monthly' 
                            ? colors.colorPaletteYellowForeground1 
                            : colors.colorNeutralForeground3,
                        }
                      ]}>
                        {selectedPlan === 'monthly' && (
                          <View style={[
                            styles.radioButtonInner,
                            { backgroundColor: colors.colorPaletteYellowForeground1 }
                          ]} />
                        )}
                      </View>
                      <View>
                        <FluentText variant="body1" style={{ fontWeight: "600" }}>
                          Monthly
                        </FluentText>
                        <FluentText variant="caption1" color="secondary">
                          Flexible billing
                        </FluentText>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <FluentText variant="title3" style={{ fontWeight: "700" }}>
                        {pricing.symbol}{pricing.monthly}
                      </FluentText>
                      <FluentText variant="caption1" color="secondary">
                        per month
                      </FluentText>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => handlePurchaseSubscription(selectedPlan)}
                  disabled={isProcessing}
                  style={[
                    styles.subscribeButton,
                    { 
                      backgroundColor: colors.colorPaletteYellowForeground1,
                      opacity: isProcessing ? 0.6 : 1,
                      marginTop: FluentSpacing.l,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="crown" size={20} color="#FFFFFF" />
                  <FluentText variant="body1" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: FluentSpacing.s }}>
                    {isProcessing ? "Processing..." : `Subscribe ${selectedPlan === 'annual' ? 'Annually' : 'Monthly'}`}
                  </FluentText>
                </Pressable>
              </>
            )}

            {plan === "premium" && (
              <View style={[styles.allUnlockedCard, { backgroundColor: colors.colorPaletteGreenForeground1 + "15" }]}>
                <MaterialCommunityIcons name="check-decagram" size={32} color={colors.colorPaletteGreenForeground1} />
                <FluentText variant="body1" style={{ color: colors.colorPaletteGreenForeground1, marginTop: FluentSpacing.s }}>
                  You have access to all features!
                </FluentText>
                <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                  {subscriptionType === 'annual' ? 'Annual' : 'Monthly'} subscription active
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
                Managed by Google Play - cancel anytime
              </FluentText>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="autorenew" size={16} color={colors.colorBrandForeground2} />
              <FluentText variant="caption1" color="secondary" style={{ marginLeft: FluentSpacing.s }}>
                Auto-renews until cancelled
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
  subscriptionOption: {
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
  },
  subscriptionOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subscriptionOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.m,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bestValueBadge: {
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subscribeButton: {
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
