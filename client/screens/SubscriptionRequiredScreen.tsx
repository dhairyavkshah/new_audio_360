import React from 'react';
import { View, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FluentScreenLayout, FluentText } from '@/components/fluent';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from '@/constants/fluent2';
import { PRICING, SupportedCurrency } from '@/contexts/SubscriptionContext';

export default function SubscriptionRequiredScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { user, signOut, checkSubscriptionStatus } = useAuth();

  const currency: SupportedCurrency = 'INR';
  const pricing = PRICING[currency];

  const handleSubscribe = async () => {
    if (Platform.OS === 'android') {
      await Linking.openURL('https://play.google.com/store/apps/details?id=com.newaudio360');
    } else {
      await Linking.openURL('https://newaudio360.com/subscribe');
    }
  };

  const handleRefresh = async () => {
    await checkSubscriptionStatus();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <FluentScreenLayout edges={['top', 'bottom']} hasBottomNavigation={false}>
      <View style={[styles.container, { paddingTop: insets.top + FluentSpacing.xl }]}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandBackground + '15' }]}>
            <MaterialCommunityIcons name="crown" size={64} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title1" align="center">Subscription Required</FluentText>
          <FluentText variant="body1" color="secondary" align="center" style={styles.subtitle}>
            An active subscription is required to use New Audio 360
          </FluentText>
        </View>

        <View style={styles.content}>
          {user && (
            <View style={[styles.userCard, { backgroundColor: colors.colorNeutralBackground3 }]}>
              <MaterialCommunityIcons name="account-circle" size={24} color={colors.colorNeutralForeground2} />
              <View style={styles.userInfo}>
                <FluentText variant="body1Strong">{user.displayName || 'User'}</FluentText>
                <FluentText variant="caption1" color="secondary">{user.email}</FluentText>
              </View>
            </View>
          )}

          <View style={styles.plansSection}>
            <FluentText variant="subtitle1" align="center">Choose a Plan</FluentText>

            <View style={[styles.planCard, { backgroundColor: colors.colorNeutralBackground2, borderColor: colors.colorNeutralStroke2 }]}>
              <View style={styles.planHeader}>
                <FluentText variant="title3">Standard</FluentText>
                <FluentText variant="title2" style={{ color: colors.colorBrandForeground1 }}>
                  {pricing.symbol}{pricing.standard}
                </FluentText>
              </View>
              <View style={styles.planFeatures}>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check" size={16} color={colors.colorPaletteGreenForeground1} />
                  <FluentText variant="caption1" color="secondary">5 Premium Themes</FluentText>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check" size={16} color={colors.colorPaletteGreenForeground1} />
                  <FluentText variant="caption1" color="secondary">Basic Equalizer</FluentText>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check" size={16} color={colors.colorPaletteGreenForeground1} />
                  <FluentText variant="caption1" color="secondary">Unlimited Playback</FluentText>
                </View>
              </View>
            </View>

            <View style={[styles.planCard, styles.recommendedPlan, { backgroundColor: colors.colorBrandBackground + '10', borderColor: colors.colorBrandForeground1 }]}>
              <View style={[styles.recommendedBadge, { backgroundColor: colors.colorBrandBackground }]}>
                <FluentText variant="caption2" color="onBrand">RECOMMENDED</FluentText>
              </View>
              <View style={styles.planHeader}>
                <FluentText variant="title3">Premium</FluentText>
                <FluentText variant="title2" style={{ color: colors.colorBrandForeground1 }}>
                  {pricing.symbol}{pricing.premium}
                </FluentText>
              </View>
              <View style={styles.planFeatures}>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check" size={16} color={colors.colorPaletteGreenForeground1} />
                  <FluentText variant="caption1" color="secondary">All 55 Themes</FluentText>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check" size={16} color={colors.colorPaletteGreenForeground1} />
                  <FluentText variant="caption1" color="secondary">Immersive Audio Modes</FluentText>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check" size={16} color={colors.colorPaletteGreenForeground1} />
                  <FluentText variant="caption1" color="secondary">All Effects & Reverbs</FluentText>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check" size={16} color={colors.colorPaletteGreenForeground1} />
                  <FluentText variant="caption1" color="secondary">Priority Support</FluentText>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + FluentSpacing.m }]}>
          <Pressable
            style={[styles.subscribeButton, { backgroundColor: colors.colorBrandBackground }]}
            onPress={handleSubscribe}
          >
            <MaterialCommunityIcons name="google-play" size={20} color="#FFFFFF" />
            <FluentText variant="subtitle1" color="onBrand">Subscribe on Google Play</FluentText>
          </Pressable>

          <View style={styles.footerButtons}>
            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.colorNeutralStroke1 }]}
              onPress={handleRefresh}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={colors.colorNeutralForeground1} />
              <FluentText variant="body2">Refresh Status</FluentText>
            </Pressable>
            
            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.colorNeutralStroke1 }]}
              onPress={handleSignOut}
            >
              <MaterialCommunityIcons name="logout" size={18} color={colors.colorNeutralForeground1} />
              <FluentText variant="body2">Sign Out</FluentText>
            </Pressable>
          </View>
        </View>
      </View>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: FluentSpacing.l,
  },
  header: {
    alignItems: 'center',
    gap: FluentSpacing.s,
    marginBottom: FluentSpacing.l,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: FluentSpacing.s,
  },
  subtitle: {
    paddingHorizontal: FluentSpacing.l,
  },
  content: {
    flex: 1,
    gap: FluentSpacing.l,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.m,
  },
  userInfo: {
    flex: 1,
  },
  plansSection: {
    gap: FluentSpacing.m,
  },
  planCard: {
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    borderWidth: 1,
    gap: FluentSpacing.s,
  },
  recommendedPlan: {
    borderWidth: 2,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xxs,
    borderRadius: FluentControlRadius.button,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planFeatures: {
    gap: FluentSpacing.xs,
    marginTop: FluentSpacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.s,
  },
  footer: {
    gap: FluentSpacing.m,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.s,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.dialog,
    height: 52,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: FluentSpacing.m,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.xs,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentControlRadius.card,
    borderWidth: 1,
  },
});
