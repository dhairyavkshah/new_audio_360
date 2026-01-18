import React, { useState } from 'react';
import { View, StyleSheet, Platform, Linking, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { FluentText, FluentSurface } from '@/components/fluent';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useUiSound } from '@/contexts/UiSoundContext';
import { useMediaLibraryContext } from '@/contexts/MediaLibraryContext';
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from '@/constants/fluent2';

interface PermissionOnboardingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface PermissionItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  status: 'pending' | 'granted' | 'denied';
  colors: typeof FluentLightColors;
}

export default function PermissionOnboardingScreen({ onComplete, onSkip }: PermissionOnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { playTapSound } = useUiSound();
  const { requestPermission } = useMediaLibraryContext();
  const [mediaPermission, setMediaPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [isRequesting, setIsRequesting] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);

  const handleRequestPermissions = async () => {
    if (Platform.OS === 'web') {
      onSkip();
      return;
    }

    setIsRequesting(true);
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const granted = await requestPermission();
      
      if (granted) {
        setMediaPermission('granted');
        setTimeout(() => onComplete(), 500);
      } else {
        setMediaPermission('denied');
        setCanAskAgain(false);
      }
    } catch (error) {
      console.error('Permission request error:', error);
      setMediaPermission('denied');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (Platform.OS !== 'web') {
      try {
        await Linking.openSettings();
      } catch (error) {
        console.error('Cannot open settings:', error);
      }
    }
  };

  const handleSkip = () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  const PermissionItem = ({ icon, title, description, status, colors }: PermissionItemProps) => (
    <View style={[styles.permissionItem, { backgroundColor: colors.colorNeutralBackground3 }]}>
      <View style={[styles.permissionIcon, { backgroundColor: colors.colorBrandBackground + '20' }]}>
        <MaterialCommunityIcons name={icon} size={28} color={colors.colorBrandForeground1} />
      </View>
      <View style={styles.permissionContent}>
        <FluentText variant="subtitle2">{title}</FluentText>
        <FluentText variant="body2" color="secondary">{description}</FluentText>
      </View>
      <View style={styles.permissionStatus}>
        {status === 'granted' ? (
          <MaterialCommunityIcons name="check-circle" size={24} color={colors.colorPaletteGreenForeground1} />
        ) : status === 'denied' ? (
          <MaterialCommunityIcons name="close-circle" size={24} color={colors.colorPaletteRedForeground1} />
        ) : (
          <MaterialCommunityIcons name="circle-outline" size={24} color={colors.colorNeutralForeground2} />
        )}
      </View>
    </View>
  );

  return (
    <FluentSurface background="neutral1" style={[styles.container, { paddingTop: insets.top + FluentSpacing.xl, paddingBottom: insets.bottom + FluentSpacing.xl }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandBackground + '15' }]}>
          <MaterialCommunityIcons name="music-box-multiple" size={64} color={colors.colorBrandForeground1} />
        </View>
        <FluentText variant="title2" align="center">Welcome to New Audio 360</FluentText>
        <FluentText variant="body2" color="secondary" align="center" style={styles.subtitle}>
          To play music from your device, we need access to your media library.
        </FluentText>
      </View>

      <View style={styles.permissionsList}>
        <PermissionItem
          icon="folder-music"
          title="Media Library"
          description="Access audio files on your device to play your music"
          status={mediaPermission}
          colors={colors}
        />
        <PermissionItem
          icon="image-multiple"
          title="Album Artwork"
          description="Display album covers for a better experience"
          status={mediaPermission}
          colors={colors}
        />
      </View>

      <View style={styles.footer}>
        {mediaPermission === 'denied' ? (
          <>
            <FluentText variant="caption1" color="secondary" align="center" style={styles.deniedText}>
              Permission was denied. Please enable it in Settings to access your music.
            </FluentText>
            {Platform.OS !== 'web' && (
              <Pressable
                style={[styles.button, { backgroundColor: colors.colorBrandBackground }]}
                onPress={handleOpenSettings}
              >
                <MaterialCommunityIcons name="cog" size={20} color={colors.colorNeutralForegroundOnBrand} />
                <FluentText variant="subtitle2" color="onBrand">Open Settings</FluentText>
              </Pressable>
            )}
            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.colorNeutralStroke1 }]}
              onPress={handleSkip}
            >
              <FluentText variant="body2" color="secondary">Continue with Sample Music</FluentText>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.colorBrandBackground },
                isRequesting && styles.buttonDisabled
              ]}
              onPress={handleRequestPermissions}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <FluentText variant="subtitle2" color="onBrand">Requesting...</FluentText>
              ) : (
                <>
                  <MaterialCommunityIcons name="shield-check" size={20} color={colors.colorNeutralForegroundOnBrand} />
                  <FluentText variant="subtitle2" color="onBrand">Grant Access</FluentText>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.colorNeutralStroke1 }]}
              onPress={handleSkip}
            >
              <FluentText variant="body2" color="secondary">Skip for Now</FluentText>
            </Pressable>
          </>
        )}

        <FluentText variant="caption1" color="secondary" align="center" style={styles.privacyNote}>
          Your music stays on your device. We never upload or share your files.
        </FluentText>
      </View>
    </FluentSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: FluentSpacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: FluentSpacing.xxl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: FluentControlRadius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: FluentSpacing.l,
  },
  subtitle: {
    lineHeight: 20,
    marginTop: FluentSpacing.s,
  },
  permissionsList: {
    flex: 1,
    gap: FluentSpacing.m,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
    gap: FluentSpacing.m,
  },
  permissionIcon: {
    width: 52,
    height: 52,
    borderRadius: FluentControlRadius.fab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    flex: 1,
    gap: FluentSpacing.xs,
  },
  permissionStatus: {
    width: 32,
    alignItems: 'center',
  },
  footer: {
    gap: FluentSpacing.m,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.s,
    height: 44,
    width: '100%',
    borderRadius: FluentControlRadius.dialog,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    height: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: FluentControlRadius.dialog,
    borderWidth: 1,
  },
  deniedText: {
    marginBottom: FluentSpacing.s,
  },
  privacyNote: {
    marginTop: FluentSpacing.m,
  },
});
