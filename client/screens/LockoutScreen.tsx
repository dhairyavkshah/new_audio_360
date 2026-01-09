import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { FluentSpacing, FluentControlRadius, FluentIconSize } from '@/constants/fluent2';

export default function LockoutScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeContext();
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
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + FluentSpacing.xxxxxxl, paddingBottom: insets.bottom + FluentSpacing.xxxxl }]}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.error + '20' }]}>
            <MaterialCommunityIcons name="shield-alert" size={FluentIconSize.xxlarge + 16} color={theme.error} />
          </View>
        </View>

        <ThemedText type="h2" style={styles.title}>
          App Temporarily Unavailable
        </ThemedText>

        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          We detected unusual activity that suggests this app may have been modified. 
          For your security and to protect premium features, the app is temporarily locked.
        </ThemedText>

        <View style={[styles.infoCard, { backgroundColor: theme.surfaceContainer }]}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={FluentIconSize.regular} color={theme.primary} />
            <View style={styles.infoText}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                Access Restored In
              </ThemedText>
              <ThemedText type="h4" style={{ color: theme.primary }}>
                {formatTimeRemaining(lockoutRemaining)}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.messageContainer}>
          <ThemedText type="small" style={[styles.messageText, { color: theme.textSecondary }]}>
            If you believe this is an error, please ensure you're using an official version 
            of the app from Google Play Store.
          </ThemedText>
        </View>

        <View style={styles.buttonsContainer}>
          <Pressable
            onPress={handleRetry}
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
          >
            <MaterialCommunityIcons name="refresh" size={FluentIconSize.regular} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: FluentSpacing.s }}>
              Retry Verification
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <MaterialCommunityIcons name="shield-check" size={FluentIconSize.small} color={theme.textTertiary} />
          <ThemedText type="caption" style={{ color: theme.textTertiary, marginLeft: FluentSpacing.xs }}>
            Protected by New Audio 360 Security
          </ThemedText>
        </View>
      </View>
    </ThemedView>
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
    textAlign: 'center',
    marginBottom: FluentSpacing.l,
  },
  description: {
    textAlign: 'center',
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
    textAlign: 'center',
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
