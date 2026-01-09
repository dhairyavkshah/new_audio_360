import React, { useState } from 'react';
import { View, StyleSheet, Platform, Linking, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useUiSound } from '@/contexts/UiSoundContext';
import { useMediaLibraryContext } from '@/contexts/MediaLibraryContext';
import { FluentSpacing, FluentControlRadius } from '@/constants/fluent2';

interface PermissionOnboardingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface PermissionItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  status: 'pending' | 'granted' | 'denied';
}

export default function PermissionOnboardingScreen({ onComplete, onSkip }: PermissionOnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeContext();
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

  const PermissionItem = ({ icon, title, description, status }: PermissionItemProps) => (
    <View style={[styles.permissionItem, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.permissionIcon, { backgroundColor: theme.primary + '20' }]}>
        <MaterialCommunityIcons name={icon} size={28} color={theme.primary} />
      </View>
      <View style={styles.permissionContent}>
        <ThemedText type="h4" style={styles.permissionTitle}>{title}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>{description}</ThemedText>
      </View>
      <View style={styles.permissionStatus}>
        {status === 'granted' ? (
          <MaterialCommunityIcons name="check-circle" size={24} color={theme.success} />
        ) : status === 'denied' ? (
          <MaterialCommunityIcons name="close-circle" size={24} color={theme.error} />
        ) : (
          <MaterialCommunityIcons name="circle-outline" size={24} color={theme.textSecondary} />
        )}
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + FluentSpacing.xl, paddingBottom: insets.bottom + FluentSpacing.xl }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
          <MaterialCommunityIcons name="music-box-multiple" size={64} color={theme.primary} />
        </View>
        <ThemedText type="h1" style={styles.title}>Welcome to New Audio 360</ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          To play music from your device, we need access to your media library.
        </ThemedText>
      </View>

      <View style={styles.permissionsList}>
        <PermissionItem
          icon="folder-music"
          title="Media Library"
          description="Access audio files on your device to play your music"
          status={mediaPermission}
        />
        <PermissionItem
          icon="image-multiple"
          title="Album Artwork"
          description="Display album covers for a better experience"
          status={mediaPermission}
        />
      </View>

      <View style={styles.footer}>
        {mediaPermission === 'denied' ? (
          <>
            <ThemedText type="small" style={[styles.deniedText, { color: theme.textSecondary }]}>
              Permission was denied. Please enable it in Settings to access your music.
            </ThemedText>
            {Platform.OS !== 'web' && (
              <Pressable
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleOpenSettings}
              >
                <MaterialCommunityIcons name="cog" size={20} color="#FFFFFF" />
                <ThemedText type="h4" style={styles.buttonText}>Open Settings</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={[styles.secondaryButton, { borderColor: theme.outline }]}
              onPress={handleSkip}
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>Continue with Sample Music</ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: theme.primary },
                isRequesting && styles.buttonDisabled
              ]}
              onPress={handleRequestPermissions}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <ThemedText type="h4" style={styles.buttonText}>Requesting...</ThemedText>
              ) : (
                <>
                  <MaterialCommunityIcons name="shield-check" size={20} color="#FFFFFF" />
                  <ThemedText type="h4" style={styles.buttonText}>Grant Access</ThemedText>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, { borderColor: theme.outline }]}
              onPress={handleSkip}
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>Skip for Now</ThemedText>
            </Pressable>
          </>
        )}

        <ThemedText type="caption" style={[styles.privacyNote, { color: theme.textSecondary }]}>
          Your music stays on your device. We never upload or share your files.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: FluentSpacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: FluentSpacing.xxxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: FluentSpacing.l,
  },
  title: {
    textAlign: 'center',
    marginBottom: FluentSpacing.m,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
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
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    flex: 1,
    gap: FluentSpacing.xs,
  },
  permissionTitle: {
    fontWeight: '600',
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
    height: 52,
    width: '100%',
    borderRadius: FluentControlRadius.dialog,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: FluentControlRadius.dialog,
    borderWidth: 1,
  },
  deniedText: {
    textAlign: 'center',
    marginBottom: FluentSpacing.s,
  },
  privacyNote: {
    textAlign: 'center',
    marginTop: FluentSpacing.m,
  },
});
