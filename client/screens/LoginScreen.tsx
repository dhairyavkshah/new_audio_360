import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FluentScreenLayout, FluentText } from '@/components/fluent';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from '@/constants/fluent2';

const DEV_MODE = __DEV__ || process.env.NODE_ENV === 'development';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { signInWithGoogle, signInAsTestUser, isLoading } = useAuth();
  const { setLicenseForTesting } = useSubscription();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    const success = await signInWithGoogle();
    if (!success) {
      setError('Sign in was cancelled or failed. Please try again.');
    }
  };

  const handleTestSignIn = async () => {
    setError(null);
    const success = await signInAsTestUser();
    if (success) {
      setLicenseForTesting('licensed');
    } else {
      setError('Test sign in failed. Please try again.');
    }
  };

  return (
    <FluentScreenLayout edges={['top', 'bottom']} hasBottomNavigation={false}>
      <View style={[styles.container, { paddingTop: insets.top + FluentSpacing.xxxl }]}>
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: colors.colorBrandBackground + '15' }]}>
            <MaterialCommunityIcons name="music-circle" size={80} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title1" align="center">New Audio 360</FluentText>
          <FluentText variant="body1" color="secondary" align="center" style={styles.subtitle}>
            Premium Music Experience
          </FluentText>
        </View>

        <View style={styles.content}>
          <FluentText variant="subtitle1" align="center" style={styles.welcomeText}>
            Sign in to access your music
          </FluentText>
          
          <FluentText variant="body2" color="secondary" align="center" style={styles.description}>
            A license is required to use New Audio 360. Sign in with your Google account to verify your purchase.
          </FluentText>

          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.colorPaletteRedBackground1 }]}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.colorPaletteRedForeground1} />
              <FluentText variant="caption1" color="error" style={styles.errorText}>{error}</FluentText>
            </View>
          )}

          <Pressable
            style={[
              styles.googleButton,
              { backgroundColor: isDark ? '#4285F4' : '#FFFFFF', borderColor: colors.colorNeutralStroke1 }
            ]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#4285F4'} />
            ) : (
              <>
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={styles.googleIcon}
                />
                <FluentText 
                  variant="subtitle2" 
                  style={{ color: isDark ? '#FFFFFF' : '#757575' }}
                >
                  Sign in with Google
                </FluentText>
              </>
            )}
          </Pressable>

          {DEV_MODE && (
            <Pressable
              style={[
                styles.testButton,
                { borderColor: colors.colorNeutralStroke2 }
              ]}
              onPress={handleTestSignIn}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="bug-outline" size={20} color={colors.colorNeutralForeground2} />
              <FluentText variant="body2" color="secondary">
                Skip for Testing
              </FluentText>
            </Pressable>
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + FluentSpacing.m }]}>
          <FluentText variant="caption2" color="secondary" align="center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </FluentText>
          <FluentText variant="caption2" color="secondary" align="center" style={styles.attribution}>
            By: Dhairya Shah, The Team 360
          </FluentText>
        </View>
      </View>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: FluentSpacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: FluentSpacing.s,
    marginBottom: FluentSpacing.xxxl,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: FluentControlRadius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: FluentSpacing.m,
  },
  subtitle: {
    marginTop: FluentSpacing.xxs,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: FluentSpacing.l,
  },
  welcomeText: {
    marginBottom: FluentSpacing.xs,
  },
  description: {
    lineHeight: 22,
    paddingHorizontal: FluentSpacing.l,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.s,
  },
  errorText: {
    flex: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.m,
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.xl,
    borderRadius: FluentControlRadius.dialog,
    borderWidth: 1,
    minWidth: 250,
    height: 52,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.s,
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
    borderWidth: 1,
    borderStyle: 'dashed',
    minWidth: 200,
  },
  footer: {
    gap: FluentSpacing.s,
  },
  attribution: {
    marginTop: FluentSpacing.xs,
  },
});
