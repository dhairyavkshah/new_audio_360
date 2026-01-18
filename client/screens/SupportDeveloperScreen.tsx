import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Modal,
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
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentRadius, FluentIconSize, FluentLightColors, FluentDarkColors, FluentFontWeight } from "@/constants/fluent2";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  PaymentHandler,
  Currency,
  CURRENCIES,
  DONATION_TIERS,
  detectUserRegion,
  RegionDetectionResult,
} from "@/lib/payment";

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
            backgroundColor: isSelected ? colors.colorBrandBackground : colors.colorNeutralBackground3,
            borderColor: isSelected ? colors.colorBrandForeground1 : "transparent",
            borderWidth: isSelected ? 1 : 0,
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
          variant="body2"
          style={{
            color: isSelected ? "#FFFFFF" : colors.colorNeutralForeground1,
            fontWeight: FluentFontWeight.semibold,
            marginTop: FluentSpacing.s,
          }}
        >
          {getCurrencySymbol()} {tier.amount}
        </FluentText>
        <FluentText
          variant="caption2"
          style={{
            color: isSelected ? "rgba(255,255,255,0.8)" : colors.colorNeutralForeground2,
            marginTop: 2,
          }}
        >
          {tier.label}
        </FluentText>
      </Pressable>
    );
  };

  return (
    <FluentScreenLayout edges={[]} hasBottomNavigation={true} isNestedScreen={true}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={[
            styles.content,
            { paddingBottom: tabBarHeight + FluentSpacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
        >
          <View style={styles.developerSection}>
            <View style={[styles.avatar, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
              <MaterialCommunityIcons name="account" size={FluentIconSize.xxlarge} color={colors.colorBrandForeground1} />
            </View>
            <FluentText variant="title3" style={styles.developerName}>
              Dhairya Shah (The Team 360)
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
          </View>

          <SectionHeader title="Select Currency" isDark={isDark} />
          <SectionCard isDark={isDark}>
            <Pressable
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
              style={styles.currencySelector}
            >
              <FluentText
                variant="body2"
                style={{ color: selectedCurrency ? colors.colorNeutralForeground1 : colors.colorNeutralForeground2 }}
              >
                {selectedCurrency
                  ? CURRENCIES.find((c) => c.value === selectedCurrency)?.label
                  : "Choose your currency"}
              </FluentText>
              <MaterialCommunityIcons
                name={showCurrencyPicker ? "chevron-up" : "chevron-down"}
                size={FluentIconSize.small}
                color={colors.colorNeutralForeground2}
              />
            </Pressable>

            {showCurrencyPicker ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />
                {CURRENCIES.filter((c) => {
                  if (c.value === "INR") {
                    return geoInfo?.isIndian === true;
                  }
                  return true;
                }).map((currency, index, arr) => (
                  <View key={currency.value}>
                    <Pressable
                      onPress={() => handleCurrencySelect(currency.value)}
                      style={[
                        styles.currencyOption,
                        selectedCurrency === currency.value && {
                          backgroundColor: colors.colorBrandForeground1 + "10",
                        },
                      ]}
                    >
                      <View style={styles.currencyInfo}>
                        <FluentText variant="body2" style={{ color: colors.colorNeutralForeground1 }}>
                          {currency.label}
                        </FluentText>
                        <FluentText variant="caption2" color="secondary">
                          {currency.value === "INR" ? "UPI Available" : "PayPal"}
                        </FluentText>
                      </View>
                      <FluentText variant="body2" style={{ color: colors.colorBrandForeground1 }}>
                        {currency.symbol}
                      </FluentText>
                    </Pressable>
                    {index < arr.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />
                    )}
                  </View>
                ))}
              </>
            ) : null}
          </SectionCard>

          {selectedCurrency ? (
            <>
              <SectionHeader title="Choose an Amount" isDark={isDark} />
              <SectionCard isDark={isDark}>
                <View style={styles.amountContent}>
                  <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.m }}>
                    Every contribution helps, no matter the size
                  </FluentText>
                  <View style={styles.tiersGrid}>
                    {DONATION_TIERS[selectedCurrency].map(renderTierCard)}
                  </View>
                </View>
              </SectionCard>

              <SectionHeader title="Custom Amount" isDark={isDark} />
              <SectionCard isDark={isDark}>
                <View style={styles.customInputContainer}>
                  <FluentText variant="body2" color="secondary">
                    {getCurrencySymbol()}
                  </FluentText>
                  <TextInput
                    style={[styles.customInput, { color: colors.colorNeutralForeground1 }]}
                    value={customAmount}
                    onChangeText={handleCustomAmountChange}
                    placeholder="Enter amount"
                    placeholderTextColor={colors.colorNeutralForeground3}
                    keyboardType="numeric"
                  />
                </View>
              </SectionCard>

              <View style={styles.paymentSection}>
                {isUPICurrency ? (
                  <>
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
                        variant="body2"
                        style={{
                          color: finalAmount > 0 ? "#FFFFFF" : colors.colorNeutralForeground2,
                          fontWeight: FluentFontWeight.semibold,
                          marginLeft: FluentSpacing.s,
                        }}
                      >
                        {finalAmount > 0 ? `Pay ₹${finalAmount} with UPI` : "Select an Amount"}
                      </FluentText>
                    </Pressable>
                    <FluentText variant="caption2" color="secondary" style={styles.payHint}>
                      Opens your preferred UPI app (GPay, PhonePe, Paytm, etc.)
                    </FluentText>
                  </>
                ) : (
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
                      variant="body2"
                      style={{
                        color: finalAmount > 0 ? "#FFFFFF" : colors.colorNeutralForeground2,
                        fontWeight: FluentFontWeight.semibold,
                        marginLeft: FluentSpacing.s,
                      }}
                    >
                      {finalAmount > 0
                        ? `Pay ${getCurrencySymbol()} ${finalAmount} with PayPal`
                        : "Select an Amount"}
                    </FluentText>
                  </Pressable>
                )}
              </View>
            </>
          ) : null}

          <SectionHeader title="Why Support?" isDark={isDark} />
          <SectionCard isDark={isDark}>
            <View style={styles.infoContent}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="shield-check" size={FluentIconSize.medium} color={colors.colorPaletteGreenForeground1} />
                <FluentText variant="caption1" color="secondary" style={styles.infoText}>
                  Secure payment processing
                </FluentText>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2, marginVertical: FluentSpacing.m }]} />
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="gift" size={FluentIconSize.medium} color={colors.colorBrandForeground1} />
                <FluentText variant="caption1" color="secondary" style={styles.infoText}>
                  All donations unlock premium features as a thank you
                </FluentText>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2, marginVertical: FluentSpacing.m }]} />
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="heart-outline" size={FluentIconSize.medium} color={colors.colorPaletteRedForeground1} />
                <FluentText variant="caption1" color="secondary" style={styles.infoText}>
                  Your support keeps this app ad-free
                </FluentText>
              </View>
            </View>
          </SectionCard>
        </KeyboardAwareScrollViewCompat>
      </KeyboardAvoidingView>

      <Modal
        visible={showConfirmationModal}
        transparent
        animationType="slide"
        onRequestClose={handleDenyPayment}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmationSheet, { backgroundColor: colors.colorNeutralBackground1 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.colorNeutralStroke1 }]} />
            <FluentText variant="title3" style={styles.confirmationTitle}>
              Did your support transaction go through?
            </FluentText>
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
              <FluentText variant="body2" style={styles.confirmButtonText}>
                Yes, I contributed
              </FluentText>
            </Pressable>

            <Pressable
              onPress={handleDenyPayment}
              style={[styles.denyButton, { backgroundColor: colors.colorNeutralBackground2 }]}
            >
              <FluentText variant="body2" color="secondary">
                No / Not yet
              </FluentText>
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
              <View style={[styles.thankYouIcon, { backgroundColor: colors.colorPaletteGreenForeground1 + "20" }]}>
                <MaterialCommunityIcons name="heart" size={FluentIconSize.xxlarge} color={colors.colorPaletteGreenForeground1} />
              </View>
            </Animated.View>
            <FluentText variant="title2" style={styles.thankYouTitle}>
              Thank You!
            </FluentText>
            <FluentText variant="caption1" color="secondary" style={styles.thankYouDesc}>
              Your support means the world to me. You're now a valued supporter of New Audio 360!
            </FluentText>
            <Pressable
              onPress={() => setShowThankYouModal(false)}
              style={[styles.closeThankYouButton, { backgroundColor: colors.colorBrandBackground }]}
            >
              <FluentText variant="body2" style={{ color: "#FFFFFF", fontWeight: FluentFontWeight.semibold }}>
                Continue
              </FluentText>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: FluentSpacing.l,
  },
  developerSection: {
    alignItems: "center",
    marginBottom: FluentSpacing.l,
    paddingHorizontal: FluentSpacing.l,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: FluentRadius.circular,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  developerName: {
    fontWeight: FluentFontWeight.semibold,
    marginBottom: FluentSpacing.s,
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
    borderRadius: FluentRadius.circular,
    marginTop: FluentSpacing.m,
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
  currencySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: FluentSpacing.l,
  },
  currencyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: FluentSpacing.l,
  },
  currencyInfo: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: FluentSpacing.l,
  },
  amountContent: {
    padding: FluentSpacing.l,
  },
  tiersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: FluentSpacing.m,
    justifyContent: "space-between",
  },
  tierCard: {
    width: "47%",
    alignItems: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentRadius.large,
  },
  tierIconHalo: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.circular,
    justifyContent: "center",
    alignItems: "center",
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: FluentSpacing.l,
  },
  customInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: FluentSpacing.s,
    paddingVertical: FluentSpacing.m,
  },
  paymentSection: {
    marginTop: FluentSpacing.xl,
    paddingHorizontal: FluentSpacing.l,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    borderRadius: FluentRadius.xLarge,
  },
  payHint: {
    textAlign: "center",
    marginTop: FluentSpacing.m,
  },
  infoContent: {
    padding: FluentSpacing.l,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    marginLeft: FluentSpacing.m,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  confirmationSheet: {
    borderTopLeftRadius: FluentRadius.xLarge,
    borderTopRightRadius: FluentRadius.xLarge,
    padding: FluentSpacing.xl,
    paddingBottom: FluentSpacing.xxxl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: FluentSpacing.xl,
  },
  confirmationTitle: {
    textAlign: "center",
    marginBottom: FluentSpacing.m,
    fontWeight: FluentFontWeight.semibold,
  },
  confirmationDesc: {
    textAlign: "center",
    marginBottom: FluentSpacing.xl,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    borderRadius: FluentRadius.xLarge,
    marginBottom: FluentSpacing.m,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: FluentFontWeight.semibold,
    marginLeft: FluentSpacing.s,
  },
  denyButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    borderRadius: FluentRadius.xLarge,
  },
  thankYouCard: {
    marginHorizontal: FluentSpacing.xl,
    borderRadius: FluentRadius.xLarge,
    padding: FluentSpacing.xl,
    alignItems: "center",
  },
  confettiContainer: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  confettiParticle: {
    position: "absolute",
  },
  thankYouIcon: {
    width: 80,
    height: 80,
    borderRadius: FluentRadius.circular,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.l,
  },
  thankYouTitle: {
    fontWeight: FluentFontWeight.bold,
    marginBottom: FluentSpacing.m,
  },
  thankYouDesc: {
    textAlign: "center",
    marginBottom: FluentSpacing.xl,
  },
  closeThankYouButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    borderRadius: FluentRadius.xLarge,
  },
});
