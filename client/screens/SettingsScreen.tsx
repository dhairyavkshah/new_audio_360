import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, BackHandler, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { TopBar } from "@/components/TopBar";
import { FluentToggle } from "@/components/FluentToggle";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import { getHapticEnabled, setHapticEnabled as saveHapticEnabled } from "@/lib/storage";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import ExitScreen from "@/screens/ExitScreen";

const SLEEP_TIMER_OPTIONS = [
  { label: "Off", value: null },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
];

type MenuItemProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function MenuItem({ icon, iconColor, title, subtitle, onPress }: MenuItemProps) {
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  
  const handlePress = () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  
  return (
    <Pressable
      onPress={handlePress}
      style={[styles.menuItem, { backgroundColor: theme.surfaceContainerLow }]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: theme.surfaceContainerHigh }]}>
        <MaterialCommunityIcons name={icon} size={24} color={iconColor || theme.primary} />
      </View>
      <View style={styles.menuTextContainer}>
        <ThemedText type="body1" style={styles.menuTitle}>
          {title}
        </ThemedText>
        <ThemedText type="caption1" style={{ color: theme.onSurfaceVariant }}>
          {subtitle}
        </ThemedText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={theme.onSurfaceVariant} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { theme } = useThemeContext();
  const { uiSoundEnabled, setUiSoundEnabled, playTapSound } = useUiSound();
  const { sleepTimerMinutes, setSleepTimer } = usePlayerContext();
  const { musicFolderUri, selectMusicFolder, songs, refreshSongs } = useMediaLibraryContext();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [showExitScreen, setShowExitScreen] = useState(false);
  const [isChangingFolder, setIsChangingFolder] = useState(false);

  const bottomPadding = Layout.bottomNavHeight + Layout.miniPlayerHeight + Layout.miniPlayerGapFromNav + Spacing.xxxl + insets.bottom;

  useEffect(() => {
    getHapticEnabled().then(setHapticEnabled);
  }, []);

  const getFolderDisplayName = (uri: string): string => {
    try {
      const decoded = decodeURIComponent(uri);
      const parts = decoded.split('/');
      const folderName = parts[parts.length - 1] || parts[parts.length - 2] || 'Selected Folder';
      return folderName.replace(/%3A/g, ':').replace(/%2F/g, '/');
    } catch {
      return 'Selected Folder';
    }
  };

  const handleChangeFolder = async () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsChangingFolder(true);
    
    try {
      const success = await selectMusicFolder();
      if (success) {
        await refreshSongs();
      }
    } catch (error) {
      console.error('Error changing folder:', error);
    } finally {
      setIsChangingFolder(false);
    }
  };

  const handleHapticToggle = (value: boolean) => {
    if (value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setHapticEnabled(value);
    saveHapticEnabled(value);
  };

  const handleUiSoundToggle = (value: boolean) => {
    if (value) {
      playTapSound();
    }
    setUiSoundEnabled(value);
  };

  const handleCloseApp = () => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowExitScreen(true);
  };

  const handleExitConfirm = () => {
    if (Platform.OS === "android") {
      BackHandler.exitApp();
    } else {
      setShowExitScreen(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <TopBar title="Settings" showBack={false} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.l, paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="folder-music" size={20} color={theme.primary} />
            <ThemedText type="title4" style={styles.sectionTitle}>
              Music Source
            </ThemedText>
          </View>
          <View style={[styles.musicSourceCard, { backgroundColor: theme.surfaceContainerLow }]}>
            <View style={styles.musicSourceInfo}>
              <View style={[styles.folderIconContainer, { backgroundColor: theme.primary + '20' }]}>
                <MaterialCommunityIcons name="folder" size={24} color={theme.primary} />
              </View>
              <View style={styles.musicSourceDetails}>
                <ThemedText type="body1" style={{ fontWeight: '600' }} numberOfLines={1}>
                  {musicFolderUri ? getFolderDisplayName(musicFolderUri) : 'No folder selected'}
                </ThemedText>
                <ThemedText type="caption1" style={{ color: theme.onSurfaceVariant }}>
                  {songs.length} {songs.length === 1 ? 'song' : 'songs'} found
                </ThemedText>
              </View>
            </View>
            <Pressable
              style={[styles.changeFolderButton, { backgroundColor: theme.primary }]}
              onPress={handleChangeFolder}
              disabled={isChangingFolder}
            >
              {isChangingFolder ? (
                <ThemedText type="caption1" style={{ color: '#FFFFFF', fontWeight: '600' }}>...</ThemedText>
              ) : (
                <ThemedText type="caption1" style={{ color: '#FFFFFF', fontWeight: '600' }}>Change</ThemedText>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="music-note" size={20} color={theme.primary} />
            <ThemedText type="title4" style={styles.sectionTitle}>
              Audio
            </ThemedText>
          </View>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="tune-vertical"
              title="Sound Lab"
              subtitle="Equalizer presets and immersive modes"
              onPress={() => navigation.navigate("SoundLab")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="palette" size={20} color={theme.primary} />
            <ThemedText type="title4" style={styles.sectionTitle}>
              Display
            </ThemedText>
          </View>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="palette-outline"
              title="Appearance"
              subtitle="Themes and visual customization"
              onPress={() => navigation.navigate("Appearance")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={theme.primary} />
            <ThemedText type="title4" style={styles.sectionTitle}>
              Preferences
            </ThemedText>
          </View>
          <View style={[styles.settingItem, { backgroundColor: theme.surfaceContainerLow }]}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="vibrate" size={18} color={theme.text} />
              <ThemedText type="body1" style={styles.settingLabel}>
                Haptic Feedback
              </ThemedText>
            </View>
            <FluentToggle
              value={hapticEnabled}
              onValueChange={handleHapticToggle}
            />
          </View>
          <View style={[styles.settingItem, { backgroundColor: theme.surfaceContainerLow, marginTop: Spacing.s }]}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="volume-high" size={18} color={theme.text} />
              <ThemedText type="body1" style={styles.settingLabel}>
                UI Sounds
              </ThemedText>
            </View>
            <FluentToggle
              value={uiSoundEnabled}
              onValueChange={handleUiSoundToggle}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="timer-outline" size={20} color={theme.primary} />
            <ThemedText type="title4" style={styles.sectionTitle}>
              Sleep Timer
            </ThemedText>
          </View>
          <View style={[styles.timerGrid]}>
            {SLEEP_TIMER_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                style={[
                  styles.timerOption,
                  { 
                    backgroundColor: sleepTimerMinutes === option.value 
                      ? theme.primary 
                      : theme.surfaceContainerLow 
                  },
                ]}
                onPress={() => {
                  playTapSound();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSleepTimer(option.value);
                }}
              >
                <ThemedText
                  type="caption1"
                  style={{
                    color: sleepTimerMinutes === option.value ? "#FFFFFF" : theme.text,
                    fontWeight: "600",
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {sleepTimerMinutes ? (
            <ThemedText type="caption1" style={{ color: theme.onSurfaceVariant, marginTop: Spacing.m }}>
              Playback will stop in {sleepTimerMinutes} minutes
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="crown" size={20} color={theme.warning} />
            <ThemedText type="title4" style={styles.sectionTitle}>
              Subscription
            </ThemedText>
          </View>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="crown-outline"
              iconColor={theme.warning}
              title="Plan"
              subtitle="Manage your subscription"
              onPress={() => navigation.navigate("Plan")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information" size={20} color={theme.primary} />
            <ThemedText type="title4" style={styles.sectionTitle}>
              About
            </ThemedText>
          </View>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="information-outline"
              title="About New Audio 360"
              subtitle="Version, legal, and more"
              onPress={() => navigation.navigate("About")}
            />
            <MenuItem
              icon="power"
              iconColor={theme.error}
              title="Close App"
              subtitle="Securely exit the application"
              onPress={handleCloseApp}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText type="caption1" style={{ color: theme.onSurfaceVariant, textAlign: "center" }}>
            New Audio 360 v1.0.0
          </ThemedText>
          <ThemedText
            type="caption2"
            style={{ color: theme.onSurfaceVariant, textAlign: "center", marginTop: Spacing.xs }}
          >
            Your personal music experience
          </ThemedText>
        </View>
      </ScrollView>
      {showExitScreen ? (
        <ExitScreen
          onCancel={() => setShowExitScreen(false)}
          onConfirm={handleExitConfirm}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.l,
  },
  menuGroup: {
    gap: Spacing.m,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.l,
    borderRadius: BorderRadius.medium,
    minHeight: 64,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: Spacing.m,
    gap: Spacing.xs,
  },
  menuTitle: {
    fontWeight: "600",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.m,
  },
  sectionTitle: {
    marginLeft: Spacing.s,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.l,
    borderRadius: BorderRadius.medium,
    minHeight: 56,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingLabel: {
    marginLeft: Spacing.m,
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  timerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
  },
  timerOption: {
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.l,
    borderRadius: BorderRadius.medium,
    minWidth: 70,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  musicSourceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.l,
    borderRadius: BorderRadius.medium,
    minHeight: 72,
  },
  musicSourceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.m,
  },
  folderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  musicSourceDetails: {
    flex: 1,
    marginLeft: Spacing.m,
    gap: Spacing.xs,
  },
  changeFolderButton: {
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.l,
    borderRadius: BorderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
});
