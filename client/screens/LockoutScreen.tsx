import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Spacing, BorderRadius } from '@/constants/theme';

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
      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.error + '20' }]}>
            <MaterialCommunityIcons name="shield-alert" size={64} color={theme.error} />
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
            <MaterialCommunityIcons name="clock-outline" size={20} color={theme.primary} />
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
            <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: Spacing.sm }}>
              Retry Verification
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <MaterialCommunityIcons name="shield-check" size={16} color={theme.textTertiary} />
          <ThemedText type="caption" style={{ color: theme.textTertiary, marginLeft: Spacing.xs }}>
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
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: Spacing['2xl'],
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
    marginBottom: Spacing.lg,
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    lineHeight: 24,
  },
  infoCard: {
    width: '100%',
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing['2xl'],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: Spacing.lg,
  },
  messageContainer: {
    marginBottom: Spacing['2xl'],
  },
  messageText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonsContainer: {
    width: '100%',
    marginBottom: Spacing['2xl'],
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
