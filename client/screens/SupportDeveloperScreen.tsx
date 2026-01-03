import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  AppState,
  AppStateStatus,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import {
  PaymentHandler,
  Currency,
  CURRENCIES,
  DONATION_TIERS,
  detectUserRegion,
  GeoDetectionResult,
} from "@/lib/payment";


export default function SupportDeveloperScreen() {
  const insets = useSafeAreaInsets();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = Layout.bottomNavHeight + insets.bottom;
  }
  const { theme } = useThemeContext();

  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<"upi" | "paypal" | null>(null);
  const [isDonor, setIsDonor] = useState(false);
  const [geoInfo, setGeoInfo] = useState<GeoDetectionResult | null>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState(true);

  const confettiScale = useSharedValue(0);
  const heartScale = useSharedValue(1);
  const confetti1Y = useSharedValue(0);
  const confetti2Y = useSharedValue(0);
  const confetti3Y = useSharedValue(0);
  const confetti4Y = useSharedValue(0);
  const confetti5Y = useSharedValue(0);
  const confetti6Y = useSharedValue(0);

  const isUPICurrency = selectedCurrency === "INR" && geoInfo?.isIndian === true;
  const finalAmount = selectedAmount || parseFloat(customAmount) || 0;

  useEffect(() => {
    PaymentHandler.getDonorStatus().then(setIsDonor);
    
    detectUserRegion().then((result) => {
      setGeoInfo(result);
      setSelectedCurrency(result.currency);
      setIsLoadingGeo(false);
    });
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && pendingPaymentMethod) {
        setShowConfirmationModal(true);
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [pendingPaymentMethod]);

  const handleCurrencySelect = (currency: Currency) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCurrency(currency);
    setShowCurrencyPicker(false);
    setSelectedAmount(null);
    setCustomAmount("");
  };

  const handleAmountSelect = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9.]/g, "");
    setCustomAmount(numericText);
    setSelectedAmount(null);
  };

  const handleUPIPayment = async () => {
    if (!finalAmount) {
      Alert.alert("Select Amount", "Please select or enter a donation amount first.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await PaymentHandler.openUPIPayment(finalAmount);

    if (result.success && result.requiresConfirmation) {
      setPendingPaymentMethod("upi");
    } else if (!result.success) {
      Alert.alert("UPI Not Available", result.error || "No UPI app found on this device.");
    }
  };

  const handlePayPalPayment = async () => {
    if (!finalAmount || !selectedCurrency) {
      Alert.alert("Select Amount", "Please select or enter a donation amount first.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await PaymentHandler.openPayPalPayment(finalAmount, selectedCurrency);

    if (result.success && result.requiresConfirmation) {
      setPendingPaymentMethod("paypal");
    } else if (!result.success) {
      Alert.alert("Error", result.error || "Failed to open PayPal.");
    }
  };

  const triggerConfetti = () => {
    const duration = 1500;
    const easing = Easing.out(Easing.cubic);

    confetti1Y.value = 0;
    confetti2Y.value = 0;
    confetti3Y.value = 0;
    confetti4Y.value = 0;
    confetti5Y.value = 0;
    confetti6Y.value = 0;

    confetti1Y.value = withTiming(-200, { duration, easing });
    confetti2Y.value = withDelay(100, withTiming(-180, { duration, easing }));
    confetti3Y.value = withDelay(50, withTiming(-220, { duration, easing }));
    confetti4Y.value = withDelay(150, withTiming(-190, { duration, easing }));
    confetti5Y.value = withDelay(75, withTiming(-210, { duration, easing }));
    confetti6Y.value = withDelay(125, withTiming(-185, { duration, easing }));
  };

  const handleConfirmPayment = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await PaymentHandler.setDonorStatus(true);
    setIsDonor(true);
    setShowConfirmationModal(false);
    setPendingPaymentMethod(null);
    setShowThankYouModal(true);

    confettiScale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withDelay(200, withSpring(1, { damping: 10 }))
    );
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );

    triggerConfetti();
  };

  const handleDenyPayment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowConfirmationModal(false);
    setPendingPaymentMethod(null);
  };

  const getCurrencySymbol = () => {
    if (!selectedCurrency) return "";
    return PaymentHandler.getCurrencySymbol(selectedCurrency);
  };

  const confettiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confettiScale.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const confetti1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: confetti1Y.value }, { translateX: -60 }, { rotate: "15deg" }],
    opacity: confetti1Y.value === 0 ? 0 : 1 - Math.abs(confetti1Y.value) / 200,
  }));

  const confetti2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: confetti2Y.value }, { translateX: 60 }, { rotate: "-20deg" }],
    opacity: confetti2Y.value === 0 ? 0 : 1 - Math.abs(confetti2Y.value) / 180,
  }));

  const confetti3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: confetti3Y.value }, { translateX: -30 }, { rotate: "45deg" }],
    opacity: confetti3Y.value === 0 ? 0 : 1 - Math.abs(confetti3Y.value) / 220,
  }));

  const confetti4Style = useAnimatedStyle(() => ({
    transform: [{ translateY: confetti4Y.value }, { translateX: 40 }, { rotate: "-30deg" }],
    opacity: confetti4Y.value === 0 ? 0 : 1 - Math.abs(confetti4Y.value) / 190,
  }));

  const confetti5Style = useAnimatedStyle(() => ({
    transform: [{ translateY: confetti5Y.value }, { translateX: -80 }, { rotate: "60deg" }],
    opacity: confetti5Y.value === 0 ? 0 : 1 - Math.abs(confetti5Y.value) / 210,
  }));

  const confetti6Style = useAnimatedStyle(() => ({
    transform: [{ translateY: confetti6Y.value }, { translateX: 80 }, { rotate: "-45deg" }],
    opacity: confetti6Y.value === 0 ? 0 : 1 - Math.abs(confetti6Y.value) / 185,
  }));

  const renderTierCard = (tier: { amount: number; label: string; icon: string }) => {
    const isSelected = selectedAmount === tier.amount;
    return (
      <Pressable
        key={tier.amount}
        onPress={() => handleAmountSelect(tier.amount)}
        style={[
          styles.tierCard,
          {
            backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
            borderColor: isSelected ? theme.primary : theme.outline,
          },
        ]}
      >
        <View
          style={[
            styles.tierIconHalo,
            {
              backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : theme.primary + "15",
            },
          ]}
        >
          <MaterialCommunityIcons
            name={tier.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={24}
            color={isSelected ? "#FFFFFF" : theme.primary}
          />
        </View>
        <ThemedText
          type="body"
          style={[
            styles.tierAmount,
            { color: isSelected ? "#FFFFFF" : theme.text },
          ]}
        >
          {getCurrencySymbol()} {tier.amount}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{
            color: isSelected ? "rgba(255,255,255,0.8)" : theme.textSecondary,
          }}
        >
          {tier.label}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.sm, paddingBottom: tabBarHeight + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <GlassCard style={styles.developerCard}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + "20" }]}>
            <MaterialCommunityIcons name="account" size={40} color={theme.primary} />
          </View>
          <ThemedText type="h4" style={styles.developerName}>
            Dhairya Shah (The Team 360)
          </ThemedText>
          <ThemedText type="small" style={[styles.developerBio, { color: theme.textSecondary }]}>
            Hi! I'm the solo developer behind New Audio 360. Your support helps me continue
            developing new features and keeping the app free of ads.
          </ThemedText>
          {isDonor ? (
            <View style={[styles.donorBadge, { backgroundColor: theme.success + "20" }]}>
              <MaterialCommunityIcons name="heart" size={14} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.success, marginLeft: 4 }}>
                Supporter
              </ThemedText>
            </View>
          ) : null}
        </GlassCard>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="currency-usd" size={18} color={theme.primary} />
            <ThemedText type="body" style={styles.sectionTitle}>
              Select Currency
            </ThemedText>
          </View>

          <Pressable
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            style={[styles.currencySelector, { backgroundColor: theme.backgroundSecondary }]}
          >
            <ThemedText
              type="body"
              style={{ color: selectedCurrency ? theme.text : theme.textSecondary }}
            >
              {selectedCurrency
                ? CURRENCIES.find((c) => c.value === selectedCurrency)?.label
                : "Choose your currency"}
            </ThemedText>
            <MaterialCommunityIcons
              name={showCurrencyPicker ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>

          {showCurrencyPicker ? (
            <View style={[styles.currencyList, { backgroundColor: theme.backgroundSecondary }]}>
              {CURRENCIES.filter((c) => {
                if (c.value === "INR") {
                  return geoInfo?.isIndian === true;
                }
                return true;
              }).map((currency) => (
                <Pressable
                  key={currency.value}
                  onPress={() => handleCurrencySelect(currency.value)}
                  style={[
                    styles.currencyOption,
                    selectedCurrency === currency.value && {
                      backgroundColor: theme.primary + "20",
                    },
                  ]}
                >
                  <View style={styles.currencyInfo}>
                    <ThemedText type="body">{currency.label}</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {currency.value === "INR" ? "UPI Available" : "PayPal"}
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={{ color: theme.primary }}>
                    {currency.symbol}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {selectedCurrency ? (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="heart" size={18} color={theme.primary} />
                <ThemedText type="body" style={styles.sectionTitle}>
                  Choose an Amount
                </ThemedText>
              </View>
              <ThemedText type="caption" style={[styles.sectionDesc, { color: theme.textSecondary }]}>
                Every contribution helps, no matter the size
              </ThemedText>

              <View style={styles.tiersGrid}>
                {DONATION_TIERS[selectedCurrency].map(renderTierCard)}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="pencil" size={18} color={theme.primary} />
                <ThemedText type="body" style={styles.sectionTitle}>
                  Custom Amount
                </ThemedText>
              </View>
              <View
                style={[styles.customInputContainer, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  {getCurrencySymbol()}
                </ThemedText>
                <TextInput
                  style={[styles.customInput, { color: theme.text }]}
                  value={customAmount}
                  onChangeText={handleCustomAmountChange}
                  placeholder="Enter amount"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {isUPICurrency ? (
              <View style={styles.section}>
                <Pressable
                  onPress={handleUPIPayment}
                  style={[
                    styles.payButton,
                    {
                      backgroundColor: finalAmount > 0 ? "#5C2D91" : theme.backgroundSecondary,
                      opacity: finalAmount > 0 ? 1 : 0.5,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="bank"
                    size={22}
                    color={finalAmount > 0 ? "#FFFFFF" : theme.textSecondary}
                  />
                  <ThemedText
                    type="body"
                    style={[
                      styles.payButtonText,
                      { color: finalAmount > 0 ? "#FFFFFF" : theme.textSecondary },
                    ]}
                  >
                    {finalAmount > 0 ? `Pay ₹${finalAmount} with UPI` : "Select an Amount"}
                  </ThemedText>
                </Pressable>

                <ThemedText type="caption" style={[styles.payHint, { color: theme.textSecondary }]}>
                  Opens your preferred UPI app (GPay, PhonePe, Paytm, etc.)
                </ThemedText>
              </View>
            ) : (
              <View style={styles.section}>
                <Pressable
                  onPress={handlePayPalPayment}
                  style={[
                    styles.payButton,
                    {
                      backgroundColor: finalAmount > 0 ? "#0070BA" : theme.backgroundSecondary,
                      opacity: finalAmount > 0 ? 1 : 0.5,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="credit-card-outline"
                    size={22}
                    color={finalAmount > 0 ? "#FFFFFF" : theme.textSecondary}
                  />
                  <ThemedText
                    type="body"
                    style={[
                      styles.payButtonText,
                      { color: finalAmount > 0 ? "#FFFFFF" : theme.textSecondary },
                    ]}
                  >
                    {finalAmount > 0
                      ? `Pay ${getCurrencySymbol()} ${finalAmount} with PayPal`
                      : "Select an Amount"}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </>
        ) : null}

        <GlassCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="shield-check" size={18} color={theme.success} />
            <ThemedText type="small" style={[styles.infoText, { color: theme.textSecondary }]}>
              Secure payment processing
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="gift" size={18} color={theme.primary} />
            <ThemedText type="small" style={[styles.infoText, { color: theme.textSecondary }]}>
              All donations unlock premium features as a thank you
            </ThemedText>
          </View>
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <MaterialCommunityIcons name="heart-outline" size={18} color={theme.error} />
            <ThemedText type="small" style={[styles.infoText, { color: theme.textSecondary }]}>
              Your support keeps this app ad-free
            </ThemedText>
          </View>
        </GlassCard>
      </ScrollView>

      <Modal
        visible={showConfirmationModal}
        transparent
        animationType="slide"
        onRequestClose={handleDenyPayment}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmationSheet, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.outline }]} />
            <ThemedText type="h4" style={styles.confirmationTitle}>
              Did your support transaction go through?
            </ThemedText>
            <ThemedText
              type="small"
              style={[styles.confirmationDesc, { color: theme.textSecondary }]}
            >
              We can't verify UPI payments automatically. Please confirm if your payment was
              successful.
            </ThemedText>

            <Pressable
              onPress={handleConfirmPayment}
              style={[styles.confirmButton, { backgroundColor: theme.success }]}
            >
              <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.confirmButtonText}>
                Yes, I contributed
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleDenyPayment}
              style={[styles.denyButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                No / Not yet
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showThankYouModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThankYouModal(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: "center" }]}>
          <Animated.View
            style={[styles.thankYouCard, { backgroundColor: theme.backgroundDefault }, confettiStyle]}
          >
            <View style={styles.confettiContainer}>
              <Animated.View style={[styles.confettiParticle, confetti1Style]}>
                <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
              </Animated.View>
              <Animated.View style={[styles.confettiParticle, confetti2Style]}>
                <MaterialCommunityIcons name="heart" size={16} color="#FF6B6B" />
              </Animated.View>
              <Animated.View style={[styles.confettiParticle, confetti3Style]}>
                <MaterialCommunityIcons name="star" size={14} color="#4ECDC4" />
              </Animated.View>
              <Animated.View style={[styles.confettiParticle, confetti4Style]}>
                <MaterialCommunityIcons name="circle" size={12} color="#9B59B6" />
              </Animated.View>
              <Animated.View style={[styles.confettiParticle, confetti5Style]}>
                <MaterialCommunityIcons name="star" size={18} color="#3498DB" />
              </Animated.View>
              <Animated.View style={[styles.confettiParticle, confetti6Style]}>
                <MaterialCommunityIcons name="heart" size={14} color="#E74C3C" />
              </Animated.View>
            </View>
            <Animated.View style={heartStyle}>
              <MaterialCommunityIcons name="heart" size={64} color={theme.error} />
            </Animated.View>
            <ThemedText type="h3" style={styles.thankYouTitle}>
              Thank You!
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.thankYouDesc, { color: theme.textSecondary }]}
            >
              Your support means the world to me. You've unlocked all premium features!
            </ThemedText>
            <Pressable
              onPress={() => setShowThankYouModal(false)}
              style={[styles.thankYouButton, { backgroundColor: theme.primary }]}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Continue
              </ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
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
  developerCard: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  developerName: {
    fontWeight: "700",
    marginBottom: Spacing["2xs"],
  },
  developerBio: {
    textAlign: "center",
    lineHeight: 20,
  },
  donorBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing["2xs"],
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing["2xs"],
  },
  sectionTitle: {
    marginLeft: Spacing.xs,
    fontWeight: "600",
  },
  sectionDesc: {
    marginBottom: Spacing.sm,
  },
  currencySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  currencyList: {
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  currencyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  currencyInfo: {
    flex: 1,
  },
  tiersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tierCard: {
    width: "31%",
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    borderWidth: 1,
  },
  tierIconHalo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  tierAmount: {
    fontWeight: "600",
    marginBottom: 2,
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  customInput: {
    flex: 1,
    marginLeft: Spacing.xs,
    fontSize: 16,
    minHeight: 24,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
    minHeight: 52,
  },
  payButtonText: {
    fontWeight: "700",
    marginLeft: Spacing.xs,
  },
  payHint: {
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  manualCard: {
    marginTop: Spacing.md,
  },
  manualTitle: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  manualRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  manualInfo: {
    flex: 1,
  },
  copyButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  showManualLink: {
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  infoCard: {
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  infoText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  confirmationSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  confirmationTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  confirmationDesc: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: Spacing.xs,
  },
  denyButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  thankYouCard: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    alignSelf: "center",
    maxWidth: 320,
  },
  thankYouTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  thankYouDesc: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  thankYouButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  confettiContainer: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  confettiParticle: {
    position: "absolute",
  },
});
