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
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentIconSize, FluentControlHeight, FluentFontWeight } from "@/constants/fluent2";
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

type SettingsItemProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightAccessory?: React.ReactNode;
  showChevron?: boolean;
  showDivider?: boolean;
  isDark: boolean;
  disabled?: boolean;
};

function SettingsItem({ icon, iconColor, title, subtitle, onPress, rightAccessory, showChevron = true, showDivider = true, isDark, disabled }: SettingsItemProps) {
  const { playTapSound } = useUiSound();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  
  const handlePress = () => {
    if (disabled || !onPress) return;
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  
  return (
    <>
      <Pressable
        onPress={handlePress}
        disabled={disabled || !onPress}
        style={[styles.settingsItem, { opacity: disabled ? 0.5 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
      >
        <View style={styles.settingsItemLeft}>
          <MaterialCommunityIcons name={icon} size={FluentIconSize.medium} color={iconColor || colors.colorNeutralForeground1} />
          <View style={styles.settingsItemText}>
            <FluentText variant="body2" style={{ color: colors.colorNeutralForeground1 }}>
              {title}
            </FluentText>
            {subtitle ? (
              <FluentText variant="caption2" style={{ color: colors.colorNeutralForeground2, marginTop: 2 }}>
                {subtitle}
              </FluentText>
            ) : null}
          </View>
        </View>
        {rightAccessory || (showChevron && onPress ? (
          <MaterialCommunityIcons name="chevron-right" size={FluentIconSize.small} color={colors.colorNeutralForeground2} />
        ) : null)}
      </Pressable>
      {showDivider && <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />}
    </>
  );
}

function SectionHeader({ title, isDark }: { title: string; isDark: boolean }) {
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  return (
    <FluentText 
      variant="caption2" 
      style={[styles.sectionHeader, { color: colors.colorNeutralForeground2, fontWeight: FluentFontWeight.medium }]}
    >
      {title.toUpperCase()}
    </FluentText>
  );
}

function SectionCard({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
      {children}
    </View>
  );
}

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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Audio" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <SettingsItem
            icon="tune-vertical"
            iconColor={colors.colorBrandForeground1}
            title="Sound Lab"
            subtitle="Equalizer presets and immersive modes"
            onPress={() => navigation.navigate("SoundLab")}
            isDark={isDark}
          />
          <SettingsItem
            icon="folder-music"
            iconColor={colors.colorBrandForeground1}
            title="Music Folders"
            subtitle="Select folders to source music from"
            onPress={() => navigation.navigate("FolderSelection")}
            showDivider={false}
            isDark={isDark}
          />
        </SectionCard>

        <SectionHeader title="Display" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <SettingsItem
            icon="palette-outline"
            iconColor={colors.colorBrandForeground1}
            title="Appearance"
            subtitle="Themes and visual customization"
            onPress={() => navigation.navigate("Appearance")}
            showDivider={false}
            isDark={isDark}
          />
        </SectionCard>

        <SectionHeader title="Preferences" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <SettingsItem
            icon="vibrate"
            title="Haptic Feedback"
            subtitle="Vibration on interactions"
            showChevron={false}
            rightAccessory={
              <FluentToggle
                value={hapticEnabled}
                onValueChange={handleHapticToggle}
              />
            }
            isDark={isDark}
          />
          <SettingsItem
            icon="volume-high"
            title="UI Sounds"
            subtitle={isPlaybackActive ? "Disabled during playback" : "Sound effects for buttons"}
            showChevron={false}
            rightAccessory={
              <FluentToggle
                value={uiSoundEnabled}
                onValueChange={handleUiSoundToggle}
                disabled={isPlaybackActive}
              />
            }
            showDivider={false}
            isDark={isDark}
            disabled={isPlaybackActive}
          />
        </SectionCard>

        <SectionHeader title="Sleep Timer" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <View style={styles.timerGrid}>
            {SLEEP_TIMER_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                style={[
                  styles.timerOption,
                  { 
                    backgroundColor: sleepTimerMinutes === option.value 
                      ? colors.colorBrandBackground 
                      : colors.colorNeutralBackground3 
                  },
                ]}
                onPress={() => {
                  playTapSound();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSleepTimer(option.value);
                }}
              >
                <FluentText
                  variant="caption1"
                  style={{
                    color: sleepTimerMinutes === option.value ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground1,
                    fontWeight: FluentFontWeight.medium,
                  }}
                >
                  {option.label}
                </FluentText>
              </Pressable>
            ))}
          </View>
          {sleepTimerMinutes ? (
            <FluentText variant="caption2" style={[styles.timerHint, { color: colors.colorNeutralForeground2 }]}>
              Playback will stop in {sleepTimerMinutes} minutes
            </FluentText>
          ) : null}
        </SectionCard>

        <SectionHeader title="License" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <SettingsItem
            icon="crown-outline"
            iconColor={colors.colorPaletteYellowForeground1}
            title="License"
            subtitle="Manage your license"
            onPress={() => navigation.navigate("License")}
            showDivider={false}
            isDark={isDark}
          />
        </SectionCard>

        <SectionHeader title="About" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <SettingsItem
            icon="information-outline"
            iconColor={colors.colorBrandForeground1}
            title="About New Audio 360"
            subtitle="Version, legal, and more"
            onPress={() => navigation.navigate("About")}
            isDark={isDark}
          />
          <SettingsItem
            icon="power"
            iconColor={colors.colorPaletteRedForeground1}
            title="Close App"
            subtitle="Securely exit the application"
            onPress={handleCloseApp}
            showDivider={false}
            isDark={isDark}
          />
        </SectionCard>

        <View style={styles.footer}>
          <FluentText variant="caption2" style={{ color: colors.colorNeutralForeground3, textAlign: "center" }}>
            New Audio 360 v1.0
          </FluentText>
          <FluentText
            variant="caption2"
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
    paddingTop: FluentSpacing.l,
    paddingBottom: FluentSpacing.xxl,
  },
  sectionHeader: {
    paddingLeft: FluentSpacing.l,
    paddingTop: FluentSpacing.s,
    paddingBottom: FluentSpacing.s,
    marginTop: FluentSpacing.xxl,
  },
  sectionCard: {
    marginHorizontal: FluentSpacing.l,
    borderRadius: FluentRadius.xLarge,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingLeft: FluentSpacing.l,
    paddingRight: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: FluentSpacing.m,
  },
  settingsItemText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  divider: {
    height: 1,
    marginLeft: FluentSpacing.l + FluentIconSize.medium + FluentSpacing.m,
  },
  timerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: FluentSpacing.s,
    padding: FluentSpacing.l,
  },
  timerOption: {
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    minWidth: 64,
    alignItems: "center",
    height: FluentControlHeight.small,
    justifyContent: "center",
  },
  timerHint: {
    paddingHorizontal: FluentSpacing.l,
    paddingBottom: FluentSpacing.l,
  },
  footer: {
    paddingVertical: FluentSpacing.xxl,
    alignItems: "center",
  },
});
