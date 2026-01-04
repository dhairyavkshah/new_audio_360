import React, { useState } from 'react';
import { View, StyleSheet, Platform, Linking, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';
import { useMediaLibraryContext } from '@/contexts/MediaLibraryContext';
import { FluentText } from '@/components/fluent2/FluentText';
import { FluentButton } from '@/components/fluent2/FluentButton';
import { FluentCard } from '@/components/fluent2/FluentCard';

interface PermissionOnboardingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface PermissionItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  status: 'pending' | 'granted' | 'denied';
}

export default function PermissionOnboardingScreen({ onComplete, onSkip }: PermissionOnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useFluent2Theme();
  const { requestPermission } = useMediaLibraryContext();
  const [mediaPermission, setMediaPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermissions = async () => {
    if (Platform.OS === 'web') {
      onSkip();
      return;
    }

    setIsRequesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const granted = await requestPermission();
      
      if (granted) {
        setMediaPermission('granted');
        setTimeout(() => onComplete(), 500);
      } else {
        setMediaPermission('denied');
      }
    } catch (error) {
      console.error('Permission request error:', error);
      setMediaPermission('denied');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  const PermissionItem = ({ icon, title, description, status }: PermissionItemProps) => (
    <FluentCard variant="outlined" padding="medium" style={{ marginBottom: spacing.md }}>
      <View style={styles.permissionItem}>
        <View style={[styles.permissionIcon, { backgroundColor: colors.brand.background, borderRadius: radius.full }]}>
          <Ionicons name={icon} size={24} color={colors.brand.primary} />
        </View>
        <View style={styles.permissionContent}>
          <FluentText variant="body1" weight="semibold">{title}</FluentText>
          <FluentText variant="body2" color="secondary">{description}</FluentText>
        </View>
        <View style={styles.permissionStatus}>
          {status === 'granted' ? (
            <Ionicons name="checkmark-circle" size={24} color={colors.status.success} />
          ) : status === 'denied' ? (
            <Ionicons name="close-circle" size={24} color={colors.status.error} />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color={colors.foreground.tertiary} />
          )}
        </View>
      </View>
    </FluentCard>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.brand.background, borderRadius: radius.full }]}>
          <Ionicons name="musical-notes" size={64} color={colors.brand.primary} />
        </View>
        <FluentText variant="title2" style={{ textAlign: 'center', marginTop: spacing.lg }}>
          Welcome to New Audio 360
        </FluentText>
        <FluentText variant="body1" color="secondary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
          To play music from your device, we need access to your media library.
        </FluentText>
      </View>

      <View style={styles.permissionsList}>
        <PermissionItem
          icon="folder-open"
          title="Media Library"
          description="Access audio files on your device to play your music"
          status={mediaPermission}
        />
        <PermissionItem
          icon="image"
          title="Album Artwork"
          description="Display album covers for a better experience"
          status={mediaPermission}
        />
      </View>

      <View style={styles.footer}>
        {mediaPermission === 'denied' ? (
          <>
            <FluentText variant="body2" color="secondary" style={{ textAlign: 'center', marginBottom: spacing.md }}>
              Permission was denied. Please enable it in Settings to access your music.
            </FluentText>
            {Platform.OS !== 'web' && (
              <FluentButton
                title="Open Settings"
                onPress={handleOpenSettings}
                variant="primary"
                fullWidth
                icon={<Ionicons name="settings" size={20} color="#FFFFFF" />}
              />
            )}
            <View style={{ height: spacing.sm }} />
            <FluentButton
              title="Continue with Sample Music"
              onPress={handleSkip}
              variant="outline"
              fullWidth
            />
          </>
        ) : (
          <>
            <FluentButton
              title={isRequesting ? "Requesting..." : "Grant Access"}
              onPress={handleRequestPermissions}
              variant="primary"
              fullWidth
              disabled={isRequesting}
              loading={isRequesting}
              icon={!isRequesting ? <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" /> : undefined}
            />
            <View style={{ height: spacing.sm }} />
            <FluentButton
              title="Skip for Now"
              onPress={handleSkip}
              variant="outline"
              fullWidth
            />
          </>
        )}

        <FluentText variant="caption1" color="tertiary" style={{ textAlign: 'center', marginTop: spacing.lg }}>
          Your music stays on your device. We never upload or share your files.
        </FluentText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionsList: {
    flex: 1,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionStatus: {
    width: 32,
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
  },
});
