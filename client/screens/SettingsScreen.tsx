import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, BackHandler, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { TopBar } from "@/components/TopBar";
import { FluentToggle } from "@/components/FluentToggle";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import { getHapticEnabled, setHapticEnabled as saveHapticEnabled } from "@/lib/storage";
import { usePlayerContext } from "@/contexts/PlayerContext";
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
      style={[styles.menuItem, { backgroundColor: theme.backgroundSecondary }]}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: theme.backgroundDefault }]}>
        <MaterialCommunityIcons name={icon} size={24} color={iconColor || theme.primary} />
      </View>
      <View style={styles.menuTextContainer}>
        <ThemedText type="body" style={styles.menuTitle}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {subtitle}
        </ThemedText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = Layout.bottomNavHeight + insets.bottom;
  }
  const { theme } = useThemeContext();
  const { uiSoundEnabled, setUiSoundEnabled, playTapSound } = useUiSound();
  const { sleepTimerMinutes, setSleepTimer } = usePlayerContext();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [showExitScreen, setShowExitScreen] = useState(false);

  useEffect(() => {
    getHapticEnabled().then(setHapticEnabled);
  }, []);

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
    <ThemedView style={styles.container}>
      <TopBar title="Settings" showBack={false} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.l, paddingBottom: tabBarHeight + Spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="music-note" size={20} color={theme.primary} />
            <ThemedText type="h4" style={styles.sectionTitle}>
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
            <ThemedText type="h4" style={styles.sectionTitle}>
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
            <ThemedText type="h4" style={styles.sectionTitle}>
              Preferences
            </ThemedText>
          </View>
          <View style={[styles.settingItem, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="vibrate" size={18} color={theme.text} />
              <ThemedText type="body" style={styles.settingLabel}>
                Haptic Feedback
              </ThemedText>
            </View>
            <FluentToggle
              value={hapticEnabled}
              onValueChange={handleHapticToggle}
            />
          </View>
          <View style={[styles.settingItem, { backgroundColor: theme.backgroundSecondary, marginTop: Spacing.s }]}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="volume-high" size={18} color={theme.text} />
              <ThemedText type="body" style={styles.settingLabel}>
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
            <ThemedText type="h4" style={styles.sectionTitle}>
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
                      : theme.backgroundSecondary 
                  },
                ]}
                onPress={() => {
                  playTapSound();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSleepTimer(option.value);
                }}
              >
                <ThemedText
                  type="small"
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
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.m }}>
              Playback will stop in {sleepTimerMinutes} minutes
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="heart" size={20} color={theme.error} />
            <ThemedText type="h4" style={styles.sectionTitle}>
              Support
            </ThemedText>
          </View>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="crown-outline"
              iconColor={theme.warning}
              title="Plan"
              subtitle="View your current plan"
              onPress={() => navigation.navigate("Plan")}
            />
            <MenuItem
              icon="gift-outline"
              iconColor={theme.primary}
              title="Support the Developer"
              subtitle="Help us improve the app"
              onPress={() => navigation.navigate("SupportDeveloper")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information" size={20} color={theme.primary} />
            <ThemedText type="h4" style={styles.sectionTitle}>
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
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
            New Audio 360 v1.0.0
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.horizontalPadding,
  },
  menuGroup: {
    gap: Spacing.contentBlock,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.l,
    borderRadius: BorderRadius.card,
    minHeight: Layout.listItemStandard,
  },
  menuIconContainer: {
    width: Layout.touchTargetMin,
    height: Layout.touchTargetMin,
    borderRadius: BorderRadius.card,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: Spacing.contentBlock,
    gap: Spacing.titleToSubtitle,
  },
  menuTitle: {
    fontWeight: "600",
  },
  section: {
    marginBottom: Layout.sectionGap,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.contentBlock,
  },
  sectionTitle: {
    marginLeft: Spacing.iconGap,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.l,
    borderRadius: BorderRadius.card,
    minHeight: Layout.listItemStandard,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingLabel: {
    marginLeft: Spacing.contentBlock,
  },
  footer: {
    paddingVertical: Layout.sectionGap,
    alignItems: "center",
  },
  timerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.iconGap,
  },
  timerOption: {
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.l,
    borderRadius: BorderRadius.button,
    minWidth: 70,
    alignItems: "center",
    height: Layout.buttonStandard,
    justifyContent: "center",
  },
});
