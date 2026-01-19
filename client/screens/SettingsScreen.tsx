import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, BackHandler, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText, FluentListItem, FluentSectionHeader } from "@/components/fluent";
import { FluentTopBar } from "@/components/FluentTopBar";
import { FluentToggle } from "@/components/FluentToggle";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentIconSize, FluentControlHeight, FluentFontWeight, getShadowStyle } from "@/constants/fluent2";
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
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { uiSoundEnabled, isPlaybackActive, setUiSoundEnabled, playTapSound } = useUiSound();
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
    <FluentScreenLayout header={<FluentTopBar title="Settings" />}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.l },
        ]}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.section}>
          <FluentSectionHeader icon="music-note" title="Audio" />
          <View style={styles.menuGroup}>
            <FluentListItem
              icon="tune-vertical"
              title="Sound Lab"
              subtitle="Equalizer presets and immersive modes"
              onPress={() => navigation.navigate("SoundLab")}
            />
            <FluentListItem
              icon="folder-music"
              title="Music Folders"
              subtitle="Select folders to source music from"
              onPress={() => navigation.navigate("FolderSelection")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <FluentSectionHeader icon="palette" title="Display" />
          <View style={styles.menuGroup}>
            <FluentListItem
              icon="palette-outline"
              title="Appearance"
              subtitle="Themes and visual customization"
              onPress={() => navigation.navigate("Appearance")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <FluentSectionHeader icon="cog-outline" title="Preferences" />
          <View style={styles.menuGroup}>
            <FluentListItem
              icon="vibrate"
              title="Haptic Feedback"
              showChevron={false}
              rightElement={
                <FluentToggle
                  value={hapticEnabled}
                  onValueChange={handleHapticToggle}
                />
              }
            />
            <FluentListItem
              icon="volume-high"
              title="UI Sounds"
              subtitle={isPlaybackActive ? "Disabled during playback" : undefined}
              showChevron={false}
              disabled={isPlaybackActive}
              rightElement={
                <FluentToggle
                  value={uiSoundEnabled}
                  onValueChange={handleUiSoundToggle}
                  disabled={isPlaybackActive}
                />
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <FluentSectionHeader icon="timer-outline" title="Sleep Timer" />
          <View style={[styles.timerGrid]}>
            {SLEEP_TIMER_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                style={[
                  styles.timerOption,
                  { 
                    backgroundColor: sleepTimerMinutes === option.value 
                      ? colors.colorBrandBackground 
                      : colors.colorNeutralBackground2 
                  },
                ]}
                onPress={() => {
                  playTapSound();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSleepTimer(option.value);
                }}
              >
                <FluentText
                  variant="body2"
                  style={{
                    color: sleepTimerMinutes === option.value ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground1,
                    fontWeight: FluentFontWeight.semibold,
                  }}
                >
                  {option.label}
                </FluentText>
              </Pressable>
            ))}
          </View>
          {sleepTimerMinutes ? (
            <FluentText variant="caption1" style={{ color: colors.colorNeutralForeground3, marginTop: FluentSpacing.m }}>
              Playback will stop in {sleepTimerMinutes} minutes
            </FluentText>
          ) : null}
        </View>

        <View style={styles.section}>
          <FluentSectionHeader icon="crown" title="License" iconColor={colors.colorPaletteYellowForeground1} />
          <View style={styles.menuGroup}>
            <FluentListItem
              icon="crown-outline"
              iconColor={colors.colorPaletteYellowForeground1}
              title="License"
              subtitle="Manage your license"
              onPress={() => navigation.navigate("License")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <FluentSectionHeader icon="information" title="About" />
          <View style={styles.menuGroup}>
            <FluentListItem
              icon="information-outline"
              title="About New Audio 360"
              subtitle="Version, legal, and more"
              onPress={() => navigation.navigate("About")}
            />
            <FluentListItem
              icon="power"
              iconColor={colors.colorPaletteRedForeground1}
              title="Close App"
              subtitle="Securely exit the application"
              onPress={handleCloseApp}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <FluentText variant="caption1" style={{ color: colors.colorNeutralForeground3, textAlign: "center" }}>
            New Audio 360 v1.0
          </FluentText>
          <FluentText
            variant="caption1"
            style={{ color: colors.colorNeutralForeground3, textAlign: "center", marginTop: FluentSpacing.xs }}
          >
            By: Dhairya Shah (The Team 360)
          </FluentText>
        </View>
      </ScrollView>
      {showExitScreen ? (
        <ExitScreen
          onCancel={() => setShowExitScreen(false)}
          onConfirm={handleExitConfirm}
        />
      ) : null}
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: FluentSpacing.l,
  },
  menuGroup: {
    gap: FluentSpacing.s,
  },
  section: {
    marginBottom: FluentSpacing.xxl,
  },
  footer: {
    paddingVertical: FluentSpacing.xxl,
    alignItems: "center",
  },
  timerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: FluentSpacing.s,
  },
  timerOption: {
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.l,
    borderRadius: FluentRadius.medium,
    minWidth: 72,
    alignItems: "center",
    height: FluentControlHeight.large,
    justifyContent: "center",
  },
});
