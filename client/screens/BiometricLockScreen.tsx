import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import { FluentScreenLayout, FluentText } from '@/components/fluent';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from '@/constants/fluent2';

export default function BiometricLockScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { authenticateWithBiometric, signOut, user } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<'fingerprint' | 'face' | 'pin'>('fingerprint');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    detectAuthType();
    promptBiometric();
  }, []);

  const detectAuthType = async () => {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setAuthType('face');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setAuthType('fingerprint');
      } else {
        setAuthType('pin');
      }
    } catch {
      setAuthType('pin');
    }
  };

  const promptBiometric = async () => {
    setIsAuthenticating(true);
    setError(null);
    
    const success = await authenticateWithBiometric();
    
    if (!success) {
      setError('Authentication failed. Please try again.');
    }
    
    setIsAuthenticating(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getAuthIcon = (): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (authType) {
      case 'face':
        return 'face-recognition';
      case 'fingerprint':
        return 'fingerprint';
      default:
        return 'lock';
    }
  };

  const getAuthLabel = (): string => {
    switch (authType) {
      case 'face':
        return 'Use Face ID';
      case 'fingerprint':
        return 'Use Fingerprint';
      default:
        return 'Use PIN';
    }
  };

  return (
    <FluentScreenLayout edges={['top', 'bottom']} hasBottomNavigation={false}>
      <View style={[styles.container, { paddingTop: insets.top + FluentSpacing.xxxl }]}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandBackground + '15' }]}>
            <MaterialCommunityIcons name="lock" size={64} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title2" align="center">App Locked</FluentText>
          {user && (
            <FluentText variant="body2" color="secondary" align="center">
              Welcome back, {user.displayName || user.email}
            </FluentText>
          )}
        </View>

        <View style={styles.content}>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.colorPaletteRedBackground1 }]}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.colorPaletteRedForeground1} />
              <FluentText variant="caption1" color="error" style={styles.errorText}>{error}</FluentText>
            </View>
          )}

          <Pressable
            style={[styles.unlockButton, { backgroundColor: colors.colorBrandBackground }]}
            onPress={promptBiometric}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name={getAuthIcon()} size={24} color="#FFFFFF" />
                <FluentText variant="subtitle2" color="onBrand">{getAuthLabel()}</FluentText>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.signOutButton, { borderColor: colors.colorNeutralStroke1 }]}
            onPress={handleSignOut}
          >
            <FluentText variant="body2" color="secondary">Sign out</FluentText>
          </Pressable>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + FluentSpacing.m }]}>
          <FluentText variant="caption1" color="secondary" align="center">
            Your data is protected with biometric authentication
          </FluentText>
        </View>
      </View>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: FluentSpacing.xxxl,
  },
  header: {
    alignItems: 'center',
    gap: FluentSpacing.m,
    marginBottom: FluentSpacing.xxxl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: FluentControlRadius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: FluentSpacing.m,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: FluentSpacing.l,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.s,
    width: '100%',
  },
  errorText: {
    flex: 1,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.m,
    borderRadius: FluentControlRadius.dialog,
    width: '100%',
    height: 44,
  },
  signOutButton: {
    height: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: FluentControlRadius.dialog,
    borderWidth: 1,
  },
  footer: {
    gap: FluentSpacing.s,
  },
});
