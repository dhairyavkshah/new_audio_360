import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useUiSound } from '@/contexts/UiSoundContext';
import { useMediaLibraryContext } from '@/contexts/MediaLibraryContext';
import { Spacing, BorderRadius } from '@/constants/theme';

interface FolderSelectionScreenProps {
  onComplete: () => void;
}

export default function FolderSelectionScreen({ onComplete }: FolderSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const { selectMusicFolder, musicFolderUri, completeOnboarding, skipFolderSelection } = useMediaLibraryContext();
  const [isSelecting, setIsSelecting] = useState(false);
  const [folderSelected, setFolderSelected] = useState(false);
  const isAndroid = Platform.OS === 'android';
  const showDemoOption = Platform.OS === 'web' || Platform.OS === 'ios';

  const handleSelectFolder = async () => {
    if (Platform.OS === 'web') {
      await completeOnboarding();
      onComplete();
      return;
    }

    setIsSelecting(true);
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const success = await selectMusicFolder();
      
      if (success) {
        setFolderSelected(true);
        await completeOnboarding();
        setTimeout(() => onComplete(), 500);
      }
    } catch (error) {
      console.error('Folder selection error:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  const getFolderDisplayName = (uri: string): string => {
    try {
      const decoded = decodeURIComponent(uri);
      const parts = decoded.split('/');
      return parts[parts.length - 1] || parts[parts.length - 2] || 'Selected Folder';
    } catch {
      return 'Selected Folder';
    }
  };

  const handleUseDemoSongs = async () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await skipFolderSelection();
    onComplete();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xxl }]}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
            <MaterialCommunityIcons name="folder-music" size={64} color={theme.primary} />
          </View>
          <ThemedText type="titleLarge" style={styles.title}>
            {showDemoOption ? 'Get Started' : 'Choose Music Folder'}
          </ThemedText>
          <ThemedText type="bodyMedium" style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
            {showDemoOption
              ? Platform.OS === 'web'
                ? 'Folder selection requires Android. Use demo songs to explore the app, or run on an Android device for full access.'
                : 'Folder selection is only available on Android. Use demo songs to explore the app.'
              : 'Select a folder on your device that contains your music files. We\'ll scan it for audio files.'}
          </ThemedText>
        </View>

        <View style={styles.infoSection}>
          <View style={[styles.infoItem, { backgroundColor: theme.surfaceContainer }]}>
            <View style={[styles.infoIcon, { backgroundColor: theme.primary + '20' }]}>
              <MaterialCommunityIcons name="folder-search" size={24} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
              <ThemedText type="bodyMediumSemibold">Supported Formats</ThemedText>
              <ThemedText type="bodySmall" style={{ color: theme.onSurfaceVariant }}>
                MP3, WAV, FLAC, M4A, AAC, OGG
              </ThemedText>
            </View>
          </View>

          <View style={[styles.infoItem, { backgroundColor: theme.surfaceContainer }]}>
            <View style={[styles.infoIcon, { backgroundColor: theme.success + '20' }]}>
              <MaterialCommunityIcons name="shield-lock" size={24} color={theme.success} />
            </View>
            <View style={styles.infoContent}>
              <ThemedText type="bodyMediumSemibold">Private & Secure</ThemedText>
              <ThemedText type="bodySmall" style={{ color: theme.onSurfaceVariant }}>
                Your music stays on your device
              </ThemedText>
            </View>
          </View>

          {folderSelected && musicFolderUri && (
            <View style={[styles.infoItem, { backgroundColor: theme.success + '15', borderColor: theme.success, borderWidth: 1 }]}>
              <View style={[styles.infoIcon, { backgroundColor: theme.success + '30' }]}>
                <MaterialCommunityIcons name="check-circle" size={24} color={theme.success} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText type="bodyMediumSemibold" style={{ color: theme.success }}>Folder Selected</ThemedText>
                <ThemedText type="bodySmall" style={{ color: theme.onSurfaceVariant }} numberOfLines={1}>
                  {getFolderDisplayName(musicFolderUri)}
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {isAndroid && (
            <Button
              variant="default"
              size="lg"
              onPress={handleSelectFolder}
              disabled={isSelecting}
              style={styles.button}
            >
              {isSelecting ? 'Selecting...' : 'Select Music Folder'}
            </Button>
          )}

          <Button
            variant={showDemoOption ? "default" : "secondary"}
            size="lg"
            onPress={handleUseDemoSongs}
            style={styles.button}
          >
            Use Demo Songs
          </Button>

          <ThemedText type="bodySmall" style={[styles.privacyNote, { color: theme.onSurfaceVariant }]}>
            {isAndroid ? 'You can change the folder anytime in Settings' : 'Demo songs let you explore all features'}
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
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.l,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.m,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  infoSection: {
    flex: 1,
    gap: Spacing.m,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.l,
    borderRadius: BorderRadius.xLarge,
    gap: Spacing.m,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  footer: {
    gap: Spacing.m,
    alignItems: 'center',
  },
  button: {
    width: '100%',
  },
  privacyNote: {
    textAlign: 'center',
    marginTop: Spacing.m,
  },
});
