import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FluentScreenLayout, FluentText } from '@/components/fluent';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from '@/constants/fluent2';
import { PRICING } from '@/contexts/SubscriptionContext';
import { detectUserRegion } from '@/lib/payment';

export default function SubscriptionRequiredScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { user, signOut, checkSubscriptionStatus } = useAuth();

  const [isIndian, setIsIndian] = useState(false);

  useEffect(() => {
    detectUserRegion().then((result) => {
      setIsIndian(result.isIndian);
    });
  }, []);

  const pricing = isIndian ? PRICING.india : PRICING.international;

  const handlePurchase = async () => {
    if (Platform.OS === 'android') {
      await Linking.openURL('https://play.google.com/store/apps/details?id=com.newaudio360');
    } else {
      await Linking.openURL('https://newaudio360.com/purchase');
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
          <FluentText variant="title1" align="center">License Required</FluentText>
          <FluentText variant="body1" color="secondary" align="center" style={styles.subtitle}>
            A license is required to use New Audio 360
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

          <View style={styles.purchaseSection}>
            <FluentText variant="subtitle1" align="center">Unlock All Features</FluentText>

            <View style={[styles.licenseCard, styles.highlightedCard, { backgroundColor: colors.colorBrandBackground + '10', borderColor: colors.colorBrandForeground1 }]}>
              <View style={[styles.oneTimeBadge, { backgroundColor: colors.colorBrandBackground }]}>
                <FluentText variant="caption2" color="onBrand">ONE-TIME PURCHASE</FluentText>
              </View>
              <View style={styles.licenseHeader}>
                <FluentText variant="title3">Lifetime License</FluentText>
                <FluentText variant="title2" style={{ color: colors.colorBrandForeground1 }}>
                  {pricing.symbol}{pricing.oneTime}
                </FluentText>
              </View>
              <View style={styles.licenseFeatures}>
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
                  <FluentText variant="caption1" color="secondary">Lifetime Access - Never Expires</FluentText>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + FluentSpacing.m }]}>
          <Pressable
            style={[styles.purchaseButton, { backgroundColor: colors.colorBrandBackground }]}
            onPress={handlePurchase}
          >
            <MaterialCommunityIcons name="google-play" size={20} color="#FFFFFF" />
            <FluentText variant="subtitle1" color="onBrand">Purchase on Google Play</FluentText>
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
  purchaseSection: {
    gap: FluentSpacing.m,
  },
  licenseCard: {
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    borderWidth: 1,
    gap: FluentSpacing.s,
  },
  highlightedCard: {
    borderWidth: 2,
    position: 'relative',
  },
  oneTimeBadge: {
    position: 'absolute',
    top: -10,
    right: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xxs,
    borderRadius: FluentControlRadius.button,
  },
  licenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  licenseFeatures: {
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
  purchaseButton: {
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
