import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, BackHandler, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { FluentTopBar } from "@/components/FluentTopBar";
import { FluentToggle } from "@/components/FluentToggle";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
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
  isDark: boolean;
};

function MenuItem({ icon, iconColor, title, subtitle, onPress, isDark }: MenuItemProps) {
  const { playTapSound } = useUiSound();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  
  const handlePress = () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  
  return (
    <Pressable
      onPress={handlePress}
      style={[styles.menuItem, { backgroundColor: colors.colorNeutralBackground2 }]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: colors.colorNeutralBackground3 }]}>
        <MaterialCommunityIcons name={icon} size={24} color={iconColor || colors.colorBrandForeground1} />
      </View>
      <View style={styles.menuTextContainer}>
        <FluentText variant="body1Strong" style={styles.menuTitle}>
          {title}
        </FluentText>
        <FluentText variant="caption1" style={{ color: colors.colorNeutralForeground3 }}>
          {subtitle}
        </FluentText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.colorNeutralForeground3} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
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
    <FluentScreenLayout header={<FluentTopBar title="Settings" />}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.l },
        ]}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="music-note" size={20} color={colors.colorBrandForeground1} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Audio
            </FluentText>
          </View>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="tune-vertical"
              title="Sound Lab"
              subtitle="Equalizer presets and immersive modes"
              onPress={() => navigation.navigate("SoundLab")}
              isDark={isDark}
            />
            <MenuItem
              icon="folder-music"
              title="Music Folders"
              subtitle="Select folders to source music from"
              onPress={() => navigation.navigate("FolderSelection")}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="palette" size={20} color={colors.colorBrandForeground1} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Display
            </FluentText>
          </View>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="palette-outline"
              title="Appearance"
              subtitle="Themes and visual customization"
              onPress={() => navigation.navigate("Appearance")}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={colors.colorBrandForeground1} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Preferences
            </FluentText>
          </View>
          <View style={[styles.settingItem, { backgroundColor: colors.colorNeutralBackground2 }]}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="vibrate" size={18} color={colors.colorNeutralForeground1} />
              <FluentText variant="body1" style={styles.settingLabel}>
                Haptic Feedback
              </FluentText>
            </View>
            <FluentToggle
              value={hapticEnabled}
              onValueChange={handleHapticToggle}
            />
          </View>
          <View style={[styles.settingItem, { backgroundColor: colors.colorNeutralBackground2, marginTop: FluentSpacing.s }]}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="volume-high" size={18} color={colors.colorNeutralForeground1} />
              <FluentText variant="body1" style={styles.settingLabel}>
                UI Sounds
              </FluentText>
            </View>
            <FluentToggle
              value={uiSoundEnabled}
              onValueChange={handleUiSoundToggle}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="timer-outline" size={20} color={colors.colorBrandForeground1} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Sleep Timer
            </FluentText>
          </View>
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
                    fontWeight: "600",
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
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="crown" size={20} color={colors.colorPaletteYellowForeground1} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              License
            </FluentText>
          </View>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="crown-outline"
              iconColor={colors.colorPaletteYellowForeground1}
              title="License"
              subtitle="Manage your license"
              onPress={() => navigation.navigate("License")}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information" size={20} color={colors.colorBrandForeground1} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              About
            </FluentText>
          </View>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="information-outline"
              title="About New Audio 360"
              subtitle="Version, legal, and more"
              onPress={() => navigation.navigate("About")}
              isDark={isDark}
            />
            <MenuItem
              icon="power"
              iconColor={colors.colorPaletteRedForeground1}
              title="Close App"
              subtitle="Securely exit the application"
              onPress={handleCloseApp}
              isDark={isDark}
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
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentRadius.large,
    minHeight: 56,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: FluentRadius.large,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    gap: FluentSpacing.xxs,
  },
  menuTitle: {
    fontWeight: "600",
  },
  section: {
    marginBottom: FluentSpacing.xxl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  sectionTitle: {
    marginLeft: FluentSpacing.s,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: FluentSpacing.l,
    borderRadius: FluentRadius.large,
    minHeight: 56,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingLabel: {
    marginLeft: FluentSpacing.m,
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
    minWidth: 70,
    alignItems: "center",
    height: 44,
    justifyContent: "center",
  },
});
