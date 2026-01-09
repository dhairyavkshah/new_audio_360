import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FluentText, FluentSurface } from '@/components/fluent';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentLightColors, FluentDarkColors } from '@/constants/fluent2';

export default function LockoutScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { lockoutRemaining, restorePurchases } = useSubscription();

  const formatTimeRemaining = (ms: number | null): string => {
    if (!ms || ms <= 0) return 'Soon';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const handleRetry = async () => {
    await restorePurchases();
  };

  return (
    <FluentSurface background="neutral1" style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + FluentSpacing.xxxxxxl, paddingBottom: insets.bottom + FluentSpacing.xxxxl }]}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.colorPaletteRedBackground1 }]}>
            <MaterialCommunityIcons name="shield-alert" size={FluentIconSize.xxlarge + 16} color={colors.colorPaletteRedForeground1} />
          </View>
        </View>

        <FluentText variant="title2" align="center" style={styles.title}>
          App Temporarily Unavailable
        </FluentText>

        <FluentText variant="body1" color="secondary" align="center" style={styles.description}>
          We detected unusual activity that suggests this app may have been modified. 
          For your security and to protect premium features, the app is temporarily locked.
        </FluentText>

        <View style={[styles.infoCard, { backgroundColor: colors.colorNeutralBackground3 }]}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
            <View style={styles.infoText}>
              <FluentText variant="body1Strong">
                Access Restored In
              </FluentText>
              <FluentText variant="subtitle1" color="brand">
                {formatTimeRemaining(lockoutRemaining)}
              </FluentText>
            </View>
          </View>
        </View>

        <View style={styles.messageContainer}>
          <FluentText variant="caption1" color="secondary" align="center" style={styles.messageText}>
            If you believe this is an error, please ensure you're using an official version 
            of the app from Google Play Store.
          </FluentText>
        </View>

        <View style={styles.buttonsContainer}>
          <Pressable
            onPress={handleRetry}
            style={[styles.retryButton, { backgroundColor: colors.colorBrandBackground }]}
          >
            <MaterialCommunityIcons name="refresh" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
            <FluentText variant="body1Strong" color="onBrand" style={{ marginLeft: FluentSpacing.s }}>
              Retry Verification
            </FluentText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <MaterialCommunityIcons name="shield-check" size={FluentIconSize.small} color={colors.colorNeutralForeground3} />
          <FluentText variant="caption1" color="tertiary" style={{ marginLeft: FluentSpacing.xs }}>
            Protected by New Audio 360 Security
          </FluentText>
        </View>
      </View>
    </FluentSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: FluentSpacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: FluentSpacing.xxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: FluentSpacing.l,
  },
  description: {
    marginBottom: FluentSpacing.xxl,
    lineHeight: 24,
  },
  infoCard: {
    width: '100%',
    padding: FluentSpacing.xl,
    borderRadius: FluentControlRadius.card,
    marginBottom: FluentSpacing.xxl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: FluentSpacing.l,
  },
  messageContainer: {
    marginBottom: FluentSpacing.xxl,
  },
  messageText: {
    lineHeight: 20,
  },
  buttonsContainer: {
    width: '100%',
    marginBottom: FluentSpacing.xxl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
