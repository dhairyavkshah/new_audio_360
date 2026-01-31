import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { FluentSpacing, FluentLightColors, FluentDarkColors, FluentTouchTarget, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import { getShadowStyle } from "@/constants/fluent2/shadows";
import { useThemeContext } from "@/contexts/ThemeContext";
import OAuthWebViewModal from "@/components/OAuthWebViewModal";

interface SoundCloudLoginPromptProps {
  isLoggingIn: boolean;
  showCodeEntry: boolean;
  manualCode: string;
  showLoginModal: boolean;
  authUrl: string;
  authRedirectUri: string;
  onLogin: () => void;
  onManualCodeChange: (code: string) => void;
  onManualCodeSubmit: () => void;
  onShowCodeEntry: (show: boolean) => void;
  onOAuthSuccess: (url: string) => void;
  onOAuthCancel: () => void;
}

const FEATURES = [
  { icon: 'music-note' as const, label: 'Full track playback' },
  { icon: 'equalizer' as const, label: 'DSP audio processing' },
  { icon: 'brain' as const, label: 'Neural audio enhancement' },
];

export function SoundCloudLoginPrompt({
  isLoggingIn,
  showCodeEntry,
  manualCode,
  showLoginModal,
  authUrl,
  authRedirectUri,
  onLogin,
  onManualCodeChange,
  onManualCodeSubmit,
  onShowCodeEntry,
  onOAuthSuccess,
  onOAuthCancel,
}: SoundCloudLoginPromptProps) {
  const { theme, isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  return (
    <View style={styles.loginContainer}>
      <View style={[
        styles.loginCard, 
        { backgroundColor: colors.colorNeutralBackground2 },
        getShadowStyle('shadow8', isDark),
      ]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandBackground }]}>
          <MaterialCommunityIcons name="soundcloud" size={FluentIconSize.xxlarge} color={colors.colorNeutralForegroundOnBrand} />
        </View>
        
        <FluentText variant="title2" style={styles.loginTitle}>
          Connect SoundCloud
        </FluentText>
        
        <FluentText variant="body2" color="secondary" style={styles.loginDescription}>
          Sign in with your SoundCloud account to stream full tracks with our premium audio processing.
        </FluentText>

        <View style={styles.featureList}>
          {FEATURES.map((feature) => (
            <View key={feature.icon} style={styles.featureItem}>
              <MaterialCommunityIcons name={feature.icon} size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
              <FluentText variant="body2" color="secondary">{feature.label}</FluentText>
            </View>
          ))}
        </View>
        
        {!showCodeEntry ? (
          <>
            <Pressable
              style={[styles.loginButton, { backgroundColor: colors.colorBrandBackground }]}
              onPress={onLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator size="small" color={colors.colorNeutralForegroundOnBrand} />
              ) : (
                <>
                  <MaterialCommunityIcons name="soundcloud" size={FluentIconSize.medium} color={colors.colorNeutralForegroundOnBrand} />
                  <FluentText variant="body1Strong" style={{ color: colors.colorNeutralForegroundOnBrand, marginLeft: 8 }}>
                    Sign in with SoundCloud
                  </FluentText>
                </>
              )}
            </Pressable>
            
            <Pressable onPress={() => onShowCodeEntry(true)}>
              <FluentText variant="caption1" color="secondary" style={{ textDecorationLine: 'underline', marginTop: FluentSpacing.s }}>
                Enter code manually
              </FluentText>
            </Pressable>
            
            <FluentText variant="caption1" color="tertiary" style={[styles.disclaimer, { marginTop: FluentSpacing.m }]}>
              Your SoundCloud credentials are handled securely by SoundCloud. We never see your password.
            </FluentText>
          </>
        ) : (
          <>
            <FluentText variant="body2" color="secondary" style={{ marginBottom: FluentSpacing.s, textAlign: 'center' }}>
              After authorizing in the new tab, copy the entire URL from your browser's address bar and paste it below:
            </FluentText>
            <FluentText variant="caption1" color="tertiary" style={{ marginBottom: FluentSpacing.m, textAlign: 'center' }}>
              The URL will contain "?code=" - that's what we need
            </FluentText>
            
            <View style={[styles.searchInput, { backgroundColor: colors.colorNeutralBackground3, width: '100%', marginBottom: FluentSpacing.m }]}>
              <TextInput
                style={[styles.input, { color: colors.colorNeutralForeground1 }]}
                placeholder="Paste URL or code here..."
                placeholderTextColor={colors.colorNeutralForeground3}
                value={manualCode}
                onChangeText={onManualCodeChange}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
            </View>
            
            <Pressable
              style={[styles.loginButton, { backgroundColor: colors.colorBrandBackground }]}
              onPress={onManualCodeSubmit}
              disabled={isLoggingIn || !manualCode.trim()}
            >
              {isLoggingIn ? (
                <ActivityIndicator size="small" color={colors.colorNeutralForegroundOnBrand} />
              ) : (
                <FluentText variant="body1Strong" style={{ color: colors.colorNeutralForegroundOnBrand }}>
                  Submit Code
                </FluentText>
              )}
            </Pressable>
            
            <Pressable onPress={() => { onShowCodeEntry(false); onManualCodeChange(''); }}>
              <FluentText variant="caption1" color="secondary" style={{ textDecorationLine: 'underline', marginTop: FluentSpacing.m }}>
                Back to sign in
              </FluentText>
            </Pressable>
          </>
        )}
      </View>

      <OAuthWebViewModal
        visible={showLoginModal}
        authUrl={authUrl}
        redirectUri={authRedirectUri}
        onSuccess={onOAuthSuccess}
        onCancel={onOAuthCancel}
        title="Sign in to SoundCloud"
        accentColor={theme.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FluentSpacing.l,
  },
  loginCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: FluentControlRadius.dialog,
    padding: FluentSpacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: FluentSpacing.l,
  },
  loginTitle: {
    marginBottom: FluentSpacing.s,
    textAlign: 'center',
  },
  loginDescription: {
    textAlign: 'center',
    marginBottom: FluentSpacing.l,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    marginBottom: FluentSpacing.l,
    gap: FluentSpacing.s,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.s,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: FluentTouchTarget.minimum,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
    marginBottom: FluentSpacing.m,
  },
  disclaimer: {
    textAlign: 'center',
    lineHeight: 18,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.input,
    height: FluentTouchTarget.minimum,
    gap: FluentSpacing.s,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
});

export default SoundCloudLoginPrompt;
