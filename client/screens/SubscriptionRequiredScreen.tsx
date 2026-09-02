import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FluentScreenLayout, FluentText } from '@/components/fluent';
import { useThemeContext, useThemedColors } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { FluentSpacing, FluentControlRadius } from '@/constants/fluent2';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.theteam360.newaudio360';

export default function SubscriptionRequiredScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemedColors();
  const { checkLicenseStatus, isLoading } = useSubscription();

  const handleVerify = async () => {
    await checkLicenseStatus();
  };

  const handleOpenPlayStore = () => {
    Linking.openURL(PLAY_STORE_URL);
  };

  return (
    <FluentScreenLayout edges={['top', 'bottom']} hasBottomNavigation={false}>
      <View style={[styles.container, { paddingTop: insets.top + FluentSpacing.xl }]}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandBackground + '15' }]}>
            <MaterialCommunityIcons name="google-play" size={64} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title1" align="center">License Required</FluentText>
          <FluentText variant="body1" color="secondary" align="center" style={styles.subtitle}>
            This is a paid app available on Google Play Store
          </FluentText>
        </View>

        <View style={styles.content}>
          <View style={[styles.infoCard, { backgroundColor: colors.colorNeutralBackground3 }]}>
            <MaterialCommunityIcons name="information-outline" size={24} color={colors.colorBrandForeground1} />
            <View style={styles.infoContent}>
              <FluentText variant="body1Strong">How to get licensed</FluentText>
              <FluentText variant="body2" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                New Audio 360 must be purchased and installed from the Google Play Store. If you already purchased the app, tap "Verify Installation" below.
              </FluentText>
            </View>
          </View>

          <View style={styles.featuresSection}>
            <FluentText variant="subtitle1" align="center">What's Included</FluentText>

            <View style={[styles.licenseCard, { backgroundColor: colors.colorNeutralBackground3 }]}>
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
            style={[styles.primaryButton, { backgroundColor: colors.colorBrandBackground, opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
                <FluentText variant="subtitle1" color="onBrand">Verify Installation</FluentText>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.colorNeutralStroke1 }]}
            onPress={handleOpenPlayStore}
          >
            <MaterialCommunityIcons name="google-play" size={18} color={colors.colorNeutralForeground1} />
            <FluentText variant="body2">Get it on Google Play</FluentText>
          </Pressable>
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
    borderRadius: FluentControlRadius.avatar,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.m,
  },
  infoContent: {
    flex: 1,
  },
  featuresSection: {
    gap: FluentSpacing.m,
  },
  licenseCard: {
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.s,
  },
  licenseFeatures: {
    gap: FluentSpacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.s,
  },
  footer: {
    gap: FluentSpacing.m,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.s,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.dialog,
    height: 52,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.s,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentControlRadius.card,
    borderWidth: 1,
  },
});
