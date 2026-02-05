import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  AppState,
  AppStateStatus,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { FluentScreenLayout, FluentText, FluentModal } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentLightColors, FluentDarkColors, FluentTypography } from "@/constants/fluent2";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  PaymentHandler,
  Currency,
  CURRENCIES,
  DONATION_TIERS,
  detectUserRegion,
  RegionDetectionResult,
} from "@/lib/payment";


export default function SupportDeveloperScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<"upi" | "paypal" | null>(null);
  const [isDonor, setIsDonor] = useState(false);
  const [geoInfo, setGeoInfo] = useState<RegionDetectionResult | null>(null);
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
            backgroundColor: isSelected ? colors.colorBrandBackground : colors.colorNeutralBackground2,
            borderColor: isSelected ? colors.colorBrandForeground1 : colors.colorNeutralStroke1,
          },
        ]}
      >
        <View
          style={[
            styles.tierIconHalo,
            {
              backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : colors.colorBrandForeground1 + "15",
            },
          ]}
        >
          <MaterialCommunityIcons
            name={tier.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={FluentIconSize.medium}
            color={isSelected ? "#FFFFFF" : colors.colorBrandForeground1}
          />
        </View>
        <FluentText
          variant="body1"
          style={[
            styles.tierAmount,
            { color: isSelected ? "#FFFFFF" : colors.colorNeutralForeground1 },
          ]}
        >
          {getCurrencySymbol()} {tier.amount}
        </FluentText>
        <FluentText
          variant="caption2"
          style={{
            color: isSelected ? "rgba(255,255,255,0.8)" : colors.colorNeutralForeground2,
          }}
        >
          {tier.label}
        </FluentText>
      </Pressable>
    );
  };

  return (
    <FluentScreenLayout edges={[]} hasBottomNavigation={true}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={[
            styles.content,
            { paddingTop: FluentSpacing.s, paddingBottom: tabBarHeight + FluentSpacing.l },
          ]}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
        >
        <GlassCard style={styles.developerCard}>
          <View style={[styles.avatar, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
            <MaterialCommunityIcons name="account" size={FluentIconSize.xxlarge} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title3" style={styles.developerName}>
            Dhairya Shah, The Team 360
          </FluentText>
          <FluentText variant="caption1" color="secondary" style={styles.developerBio}>
            Hi! I'm the solo developer behind New Audio 360. Your support helps me continue
            developing new features and keeping the app free of ads.
          </FluentText>
          {isDonor ? (
            <View style={[styles.donorBadge, { backgroundColor: colors.colorPaletteGreenForeground1 + "20" }]}>
              <MaterialCommunityIcons name="heart" size={FluentIconSize.tiny} color={colors.colorPaletteGreenForeground1} />
              <FluentText variant="caption2" style={{ color: colors.colorPaletteGreenForeground1, marginLeft: 4 }}>
                Supporter
              </FluentText>
            </View>
          ) : null}
        </GlassCard>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="currency-usd" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
            <FluentText variant="body1" style={styles.sectionTitle}>
              Select Currency
            </FluentText>
          </View>

          <Pressable
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            style={[styles.currencySelector, { backgroundColor: colors.colorNeutralBackground2 }]}
          >
            <FluentText
              variant="body1"
              style={{ color: selectedCurrency ? colors.colorNeutralForeground1 : colors.colorNeutralForeground2 }}
            >
              {selectedCurrency
                ? CURRENCIES.find((c) => c.value === selectedCurrency)?.label
                : "Choose your currency"}
            </FluentText>
            <MaterialCommunityIcons
              name={showCurrencyPicker ? "chevron-up" : "chevron-down"}
              size={FluentIconSize.regular}
              color={colors.colorNeutralForeground2}
            />
          </Pressable>

          {showCurrencyPicker ? (
            <View style={[styles.currencyList, { backgroundColor: colors.colorNeutralBackground2 }]}>
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
                      backgroundColor: colors.colorBrandForeground1 + "20",
                    },
                  ]}
                >
                  <View style={styles.currencyInfo}>
                    <FluentText variant="body1">{currency.label}</FluentText>
                    <FluentText variant="caption2" color="secondary">
                      {currency.value === "INR" ? "UPI Available" : "PayPal"}
                    </FluentText>
                  </View>
                  <FluentText variant="body1" color="brand">
                    {currency.symbol}
                  </FluentText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {selectedCurrency ? (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="heart" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
                <FluentText variant="body1" style={styles.sectionTitle}>
                  Choose an Amount
                </FluentText>
              </View>
              <FluentText variant="caption2" color="secondary" style={styles.sectionDesc}>
                Every contribution helps, no matter the size
              </FluentText>

              <View style={styles.tiersGrid}>
                {DONATION_TIERS[selectedCurrency].map(renderTierCard)}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="pencil" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
                <FluentText variant="body1" style={styles.sectionTitle}>
                  Custom Amount
                </FluentText>
              </View>
              <View
                style={[styles.customInputContainer, { backgroundColor: colors.colorNeutralBackground2 }]}
              >
                <FluentText variant="body1" color="secondary">
                  {getCurrencySymbol()}
                </FluentText>
                <TextInput
                  style={[styles.customInput, { color: colors.colorNeutralForeground1 }]}
                  value={customAmount}
                  onChangeText={handleCustomAmountChange}
                  placeholder="Enter amount"
                  placeholderTextColor={colors.colorNeutralForeground2}
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
                      backgroundColor: finalAmount > 0 ? "#5C2D91" : colors.colorNeutralBackground2,
                      opacity: finalAmount > 0 ? 1 : 0.5,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="bank"
                    size={FluentIconSize.medium}
                    color={finalAmount > 0 ? "#FFFFFF" : colors.colorNeutralForeground2}
                  />
                  <FluentText
                    variant="body1"
                    style={[
                      styles.payButtonText,
                      { color: finalAmount > 0 ? "#FFFFFF" : colors.colorNeutralForeground2 },
                    ]}
                  >
                    {finalAmount > 0 ? `Pay ₹${finalAmount} with UPI` : "Select an Amount"}
                  </FluentText>
                </Pressable>

                <FluentText variant="caption2" color="secondary" style={styles.payHint}>
                  Opens your preferred UPI app (GPay, PhonePe, Paytm, etc.)
                </FluentText>
              </View>
            ) : (
              <View style={styles.section}>
                <Pressable
                  onPress={handlePayPalPayment}
                  style={[
                    styles.payButton,
                    {
                      backgroundColor: finalAmount > 0 ? "#0070BA" : colors.colorNeutralBackground2,
                      opacity: finalAmount > 0 ? 1 : 0.5,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="credit-card-outline"
                    size={FluentIconSize.medium}
                    color={finalAmount > 0 ? "#FFFFFF" : colors.colorNeutralForeground2}
                  />
                  <FluentText
                    variant="body1"
                    style={[
                      styles.payButtonText,
                      { color: finalAmount > 0 ? "#FFFFFF" : colors.colorNeutralForeground2 },
                    ]}
                  >
                    {finalAmount > 0
                      ? `Pay ${getCurrencySymbol()} ${finalAmount} with PayPal`
                      : "Select an Amount"}
                  </FluentText>
                </Pressable>
              </View>
            )}
          </>
        ) : null}

        <GlassCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="shield-check" size={FluentIconSize.regular} color={colors.colorPaletteGreenForeground1} />
            <FluentText variant="caption1" color="secondary" style={styles.infoText}>
              Secure payment processing
            </FluentText>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="gift" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
            <FluentText variant="caption1" color="secondary" style={styles.infoText}>
              All donations unlock premium features as a thank you
            </FluentText>
          </View>
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <MaterialCommunityIcons name="heart-outline" size={FluentIconSize.regular} color={colors.colorPaletteRedForeground1} />
            <FluentText variant="caption1" color="secondary" style={styles.infoText}>
              Your support keeps this app ad-free
            </FluentText>
          </View>
        </GlassCard>
        </KeyboardAwareScrollViewCompat>
      </KeyboardAvoidingView>

      <FluentModal
        visible={showConfirmationModal}
        onClose={handleDenyPayment}
        title="Did your support transaction go through?"
        showHandle={true}
        showCloseButton={false}
      >
        <View style={styles.confirmationContent}>
          <FluentText
            variant="caption1"
            color="secondary"
            style={styles.confirmationDesc}
          >
            We can't verify UPI payments automatically. Please confirm if your payment was
            successful.
          </FluentText>

          <Pressable
            onPress={handleConfirmPayment}
            style={[styles.confirmButton, { backgroundColor: colors.colorPaletteGreenForeground1 }]}
          >
            <MaterialCommunityIcons name="check" size={FluentIconSize.regular} color="#FFFFFF" />
            <FluentText variant="body1" style={styles.confirmButtonText}>
              Yes, I contributed
            </FluentText>
          </Pressable>

          <Pressable
            onPress={handleDenyPayment}
            style={[styles.denyButton, { backgroundColor: colors.colorNeutralBackground2 }]}
          >
            <FluentText variant="body1" color="secondary">
              No / Not yet
            </FluentText>
          </Pressable>
        </View>
      </FluentModal>

      <FluentModal
        visible={showThankYouModal}
        onClose={() => setShowThankYouModal(false)}
        showHandle={false}
        showCloseButton={false}
        animationType="fade"
        presentationStyle="overFullScreen"
      >
        <Animated.View
          style={[styles.thankYouCard, { backgroundColor: colors.colorNeutralBackground1 }, confettiStyle]}
        >
          <View style={styles.confettiContainer}>
            <Animated.View style={[styles.confettiParticle, confetti1Style]}>
              <MaterialCommunityIcons name="star" size={FluentIconSize.regular} color="#FFD700" />
            </Animated.View>
            <Animated.View style={[styles.confettiParticle, confetti2Style]}>
              <MaterialCommunityIcons name="heart" size={FluentIconSize.small} color="#FF6B6B" />
            </Animated.View>
            <Animated.View style={[styles.confettiParticle, confetti3Style]}>
              <MaterialCommunityIcons name="star" size={FluentIconSize.tiny} color="#4ECDC4" />
            </Animated.View>
            <Animated.View style={[styles.confettiParticle, confetti4Style]}>
              <MaterialCommunityIcons name="circle" size={FluentIconSize.tiny} color="#9B59B6" />
            </Animated.View>
            <Animated.View style={[styles.confettiParticle, confetti5Style]}>
              <MaterialCommunityIcons name="star" size={FluentIconSize.regular} color="#3498DB" />
            </Animated.View>
            <Animated.View style={[styles.confettiParticle, confetti6Style]}>
              <MaterialCommunityIcons name="heart" size={FluentIconSize.tiny} color="#E74C3C" />
            </Animated.View>
          </View>
          <Animated.View style={heartStyle}>
            <MaterialCommunityIcons name="heart" size={64} color={colors.colorPaletteRedForeground1} />
          </Animated.View>
          <FluentText variant="title1" style={styles.thankYouTitle}>
            Thank You!
          </FluentText>
          <FluentText
            variant="body1"
            color="secondary"
            style={styles.thankYouDesc}
          >
            Your support means the world to me. You've unlocked all premium features!
          </FluentText>
          <Pressable
            onPress={() => setShowThankYouModal(false)}
            style={[styles.thankYouButton, { backgroundColor: colors.colorBrandBackground }]}
          >
            <FluentText variant="body1Strong" style={{ color: "#FFFFFF" }}>
              Continue
            </FluentText>
          </Pressable>
        </Animated.View>
      </FluentModal>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: FluentSpacing.l,
  },
  developerCard: {
    alignItems: "center",
    marginBottom: FluentSpacing.l,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: FluentControlRadius.avatar,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  developerName: {
    marginBottom: FluentSpacing.xs,
    textAlign: "center",
  },
  developerBio: {
    textAlign: "center",
    lineHeight: 20,
  },
  donorBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentControlRadius.chip,
    marginTop: FluentSpacing.m,
  },
  section: {
    marginBottom: FluentSpacing.l,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.s,
  },
  sectionTitle: {
    marginLeft: FluentSpacing.s,
  },
  sectionDesc: {
    marginBottom: FluentSpacing.m,
  },
  currencySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  currencyList: {
    marginTop: FluentSpacing.s,
    borderRadius: FluentControlRadius.card,
    overflow: "hidden",
  },
  currencyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: FluentSpacing.m,
  },
  currencyInfo: {
    flex: 1,
  },
  tiersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: FluentSpacing.s,
  },
  tierCard: {
    width: "31%",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    borderWidth: 1,
  },
  tierIconHalo: {
    width: 44,
    height: 44,
    borderRadius: FluentControlRadius.fab,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.s,
  },
  tierAmount: {
    marginBottom: FluentSpacing.xxs,
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  customInput: {
    flex: 1,
    marginLeft: FluentSpacing.s,
    fontSize: FluentTypography.body1.fontSize,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
  },
  payButtonText: {
    marginLeft: FluentSpacing.s,
  },
  payHint: {
    textAlign: "center",
    marginTop: FluentSpacing.s,
  },
  infoCard: {
    marginTop: FluentSpacing.m,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  infoText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  confirmationContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
  },
  confirmationDesc: {
    textAlign: "center",
    marginBottom: FluentSpacing.xl,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.button,
    marginBottom: FluentSpacing.m,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    marginLeft: FluentSpacing.s,
  },
  denyButton: {
    width: "100%",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.button,
    alignItems: "center",
  },
  thankYouCard: {
    marginHorizontal: FluentSpacing.xl,
    padding: FluentSpacing.xl,
    borderRadius: FluentControlRadius.dialog,
    alignItems: "center",
    overflow: "visible",
  },
  confettiContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  confettiParticle: {
    position: "absolute",
  },
  thankYouTitle: {
    marginTop: FluentSpacing.l,
    marginBottom: FluentSpacing.m,
  },
  thankYouDesc: {
    textAlign: "center",
    marginBottom: FluentSpacing.xl,
  },
  thankYouButton: {
    width: "100%",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.button,
    alignItems: "center",
  },
});
