import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, BackHandler, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Fluent2 } from "@/constants/fluent2";
import { FluentText, FluentToggle, FluentMenuItem, FluentChip } from "@/components/fluent2";
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = 80 + insets.bottom;
  }
  const { colors, spacing, radius } = useFluent2Theme();
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

  const SectionHeader = ({ icon, title, iconColor }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; iconColor?: string }) => (
    <View style={[styles.sectionHeader, { paddingHorizontal: spacing.xs, marginBottom: spacing.xs }]}>
      <MaterialCommunityIcons name={icon} size={Fluent2.iconSize.md} color={iconColor || colors.brandPrimary} />
      <FluentText variant="subtitle1" style={[styles.sectionTitle, { marginLeft: spacing.xs }]}>
        {title}
      </FluentText>
    </View>
  );

  const SettingToggle = ({ icon, label, value, onValueChange }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: boolean; onValueChange: (v: boolean) => void }) => (
    <View style={[styles.settingItem, { backgroundColor: colors.surfaceSecondary, padding: spacing.m, borderRadius: radius.medium }]}>
      <View style={styles.settingInfo}>
        <MaterialCommunityIcons name={icon} size={Fluent2.iconSize.sm} color={colors.textPrimary} />
        <FluentText variant="body1" style={[styles.settingLabel, { marginLeft: spacing.s }]}>
          {label}
        </FluentText>
      </View>
      <FluentToggle value={value} onValueChange={onValueChange} />
    </View>
  );

  const HEADER_HEIGHT = insets.top + 56;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.headerContent, { paddingHorizontal: spacing.m }]}>
          <FluentText variant="title1">Settings</FluentText>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: HEADER_HEIGHT + spacing.s, paddingBottom: tabBarHeight + spacing.l, paddingHorizontal: spacing.m },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { marginBottom: spacing.l }]}>
          <SectionHeader icon="music-note" title="Audio" />
          <FluentMenuItem
            icon="tune-vertical"
            title="Sound Lab"
            subtitle="Equalizer presets and immersive modes"
            onPress={() => navigation.navigate("SoundLab")}
          />
        </View>

        <View style={[styles.section, { marginBottom: spacing.l }]}>
          <SectionHeader icon="palette" title="Display" />
          <FluentMenuItem
            icon="palette-outline"
            title="Appearance"
            subtitle="Themes and visual customization"
            onPress={() => navigation.navigate("Appearance")}
          />
        </View>

        <View style={[styles.section, { marginBottom: spacing.l }]}>
          <SectionHeader icon="cog-outline" title="Preferences" />
          <SettingToggle
            icon="vibrate"
            label="Haptic Feedback"
            value={hapticEnabled}
            onValueChange={handleHapticToggle}
          />
          <View style={{ height: spacing.xs }} />
          <SettingToggle
            icon="volume-high"
            label="UI Sounds"
            value={uiSoundEnabled}
            onValueChange={handleUiSoundToggle}
          />
        </View>

        <View style={[styles.section, { marginBottom: spacing.l }]}>
          <SectionHeader icon="timer-outline" title="Sleep Timer" />
          <View style={[styles.timerGrid, { gap: spacing.xs }]}>
            {SLEEP_TIMER_OPTIONS.map((option) => (
              <FluentChip
                key={option.label}
                label={option.label}
                selected={sleepTimerMinutes === option.value}
                onPress={() => {
                  playTapSound();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSleepTimer(option.value);
                }}
              />
            ))}
          </View>
          {sleepTimerMinutes && (
            <FluentText variant="caption1" style={{ color: colors.textSecondary, marginTop: spacing.s }}>
              Playback will stop in {sleepTimerMinutes} minutes
            </FluentText>
          )}
        </View>

        <View style={[styles.section, { marginBottom: spacing.l }]}>
          <SectionHeader icon="heart" title="Support" iconColor={colors.statusDanger} />
          <FluentMenuItem
            icon="crown-outline"
            iconColor={colors.statusWarning}
            title="Plan"
            subtitle="View your current plan"
            onPress={() => navigation.navigate("Plan")}
          />
          <FluentMenuItem
            icon="gift-outline"
            iconColor={colors.brandPrimary}
            title="Support the Developer"
            subtitle="Help us improve the app"
            onPress={() => navigation.navigate("SupportDeveloper")}
          />
        </View>

        <View style={[styles.section, { marginBottom: spacing.l }]}>
          <SectionHeader icon="information" title="About" />
          <FluentMenuItem
            icon="information-outline"
            title="About New Audio 360"
            subtitle="Version, legal, and more"
            onPress={() => navigation.navigate("About")}
          />
          <FluentMenuItem
            icon="power"
            iconColor={colors.statusDanger}
            title="Close App"
            subtitle="Securely exit the application"
            onPress={handleCloseApp}
          />
        </View>

        <View style={[styles.footer, { paddingVertical: spacing.m }]}>
          <FluentText variant="caption1" style={{ color: colors.textSecondary, textAlign: "center" }}>
            New Audio 360 v1.0.0
          </FluentText>
          <FluentText
            variant="caption1"
            style={{ color: colors.textSecondary, textAlign: "center", marginTop: spacing.xxs }}
          >
            Your personal music experience
          </FluentText>
        </View>
      </ScrollView>
      {showExitScreen && (
        <ExitScreen
          onCancel={() => setShowExitScreen(false)}
          onConfirm={handleExitConfirm}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
  },
  headerContent: {
    height: 56,
    justifyContent: "center",
  },
  content: {},
  section: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {},
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingLabel: {},
  footer: {
    alignItems: "center",
  },
  timerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
