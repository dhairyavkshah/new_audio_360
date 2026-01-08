import React, { useState } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
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
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
          <MaterialCommunityIcons name="folder-music" size={64} color={theme.primary} />
        </View>
        <ThemedText type="h1" style={styles.title}>
          {showDemoOption ? 'Get Started' : 'Choose Music Folder'}
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {showDemoOption
            ? Platform.OS === 'web'
              ? 'Folder selection requires Android. Use demo songs to explore the app, or run on an Android device for full access.'
              : 'Folder selection is only available on Android. Use demo songs to explore the app.'
            : 'Select a folder on your device that contains your music files. We\'ll scan it for audio files.'}
        </ThemedText>
      </View>

      <View style={styles.infoSection}>
        <View style={[styles.infoItem, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.infoIcon, { backgroundColor: theme.primary + '20' }]}>
            <MaterialCommunityIcons name="folder-search" size={24} color={theme.primary} />
          </View>
          <View style={styles.infoContent}>
            <ThemedText type="bodyLarge" style={{ fontWeight: '600' }}>Supported Formats</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              MP3, WAV, FLAC, M4A, AAC, OGG
            </ThemedText>
          </View>
        </View>

        <View style={[styles.infoItem, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.infoIcon, { backgroundColor: theme.success + '20' }]}>
            <MaterialCommunityIcons name="shield-lock" size={24} color={theme.success} />
          </View>
          <View style={styles.infoContent}>
            <ThemedText type="bodyLarge" style={{ fontWeight: '600' }}>Private & Secure</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
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
              <ThemedText type="bodyLarge" style={{ fontWeight: '600', color: theme.success }}>Folder Selected</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                {getFolderDisplayName(musicFolderUri)}
              </ThemedText>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {isAndroid && (
          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.primary },
              isSelecting && styles.buttonDisabled
            ]}
            onPress={handleSelectFolder}
            disabled={isSelecting}
          >
            {isSelecting ? (
              <ThemedText type="h4" style={styles.buttonText}>Selecting...</ThemedText>
            ) : (
              <>
                <MaterialCommunityIcons name="folder-open" size={20} color="#FFFFFF" />
                <ThemedText type="h4" style={styles.buttonText}>Select Music Folder</ThemedText>
              </>
            )}
          </Pressable>
        )}

        <Pressable
          style={[
            styles.button,
            { backgroundColor: showDemoOption ? theme.primary : theme.backgroundSecondary }
          ]}
          onPress={handleUseDemoSongs}
        >
          <MaterialCommunityIcons 
            name="music-note-plus" 
            size={20} 
            color={showDemoOption ? '#FFFFFF' : theme.text} 
          />
          <ThemedText 
            type="h4" 
            style={[styles.buttonText, { color: showDemoOption ? '#FFFFFF' : theme.text }]}
          >
            Use Demo Songs
          </ThemedText>
        </Pressable>

        <ThemedText type="caption" style={[styles.privacyNote, { color: theme.textSecondary }]}>
          {isAndroid ? 'You can change the folder anytime in Settings' : 'Demo songs let you explore all features'}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  infoSection: {
    flex: 1,
    gap: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
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
    gap: Spacing.md,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    width: '100%',
    borderRadius: BorderRadius.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  privacyNote: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
