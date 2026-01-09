import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { EffectChip } from "@/components/EffectChip";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { FluentSpacing, FluentControlRadius, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { Layout } from "@/constants/theme";
import { getEQPreset, saveEQPreset, clearEQPreset, getSoundMode, saveSoundMode, clearSoundMode } from "@/lib/storage";

type SoundLabMode = "equalizer" | "immersive" | "off";

const EQ_PRESETS = [
  { 
    name: "Flat", 
    description: "Natural, unprocessed sound",
    bands: { sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, brilliance: 0 }
  },
  { 
    name: "Rock", 
    description: "Punchy bass, crisp guitars",
    bands: { sub: +2, bass: +3, lowMid: +1, mid: -1, highMid: +2, treble: +3, brilliance: +1 }
  },
  { 
    name: "Pop", 
    description: "Bright vocals, balanced bass",
    bands: { sub: +1, bass: +2, lowMid: 0, mid: +2, highMid: +3, treble: +2, brilliance: +1 }
  },
  { 
    name: "Jazz", 
    description: "Warm mids, smooth highs",
    bands: { sub: +1, bass: +2, lowMid: +2, mid: +1, highMid: 0, treble: -1, brilliance: 0 }
  },
  { 
    name: "Classical", 
    description: "Wide dynamics, clear separation",
    bands: { sub: 0, bass: +1, lowMid: +1, mid: 0, highMid: +1, treble: +2, brilliance: +2 }
  },
  { 
    name: "Electronic", 
    description: "Deep bass, sparkling highs",
    bands: { sub: +4, bass: +3, lowMid: 0, mid: -1, highMid: +1, treble: +3, brilliance: +2 }
  },
  { 
    name: "Hip-Hop", 
    description: "Heavy sub-bass, clear vocals",
    bands: { sub: +4, bass: +3, lowMid: +1, mid: +2, highMid: +1, treble: +1, brilliance: 0 }
  },
  { 
    name: "Acoustic", 
    description: "Natural warmth, presence",
    bands: { sub: 0, bass: +1, lowMid: +2, mid: +2, highMid: +1, treble: +1, brilliance: 0 }
  },
];

const IMMERSIVE_MODES = [
  { 
    name: "Cinema", 
    icon: "filmstrip" as const,
    description: "Wide, cinematic soundstage",
    effect: { stereoWidth: 1.4, reverb: 0.3, delay: 40 }
  },
  { 
    name: "Music", 
    icon: "music" as const,
    description: "Balanced richness",
    effect: { stereoWidth: 1.2, reverb: 0.15, delay: 20 }
  },
  { 
    name: "Sports", 
    icon: "run-fast" as const,
    description: "Enhanced voice clarity",
    effect: { stereoWidth: 1.0, reverb: 0.05, delay: 0 }
  },
  { 
    name: "360 Reality", 
    icon: "earth" as const,
    description: "Immersive surround feel",
    effect: { stereoWidth: 1.6, reverb: 0.4, delay: 60 }
  },
];

export default function SoundLabScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { isImmersiveModeUnlocked } = useSubscription();
  const [soundLabMode, setSoundLabMode] = useState<SoundLabMode>("off");
  const [selectedEQ, setSelectedEQ] = useState("Flat");
  const [selectedImmersive, setSelectedImmersive] = useState("Music");

  useEffect(() => {
    const loadSettings = async () => {
      const eqPreset = await getEQPreset();
      const soundMode = await getSoundMode();
      
      if (eqPreset) {
        setSelectedEQ(eqPreset);
        setSoundLabMode("equalizer");
      } else if (soundMode) {
        if (isImmersiveModeUnlocked()) {
          setSelectedImmersive(soundMode);
          setSoundLabMode("immersive");
        } else {
          await clearSoundMode();
          setSoundLabMode("off");
          setSelectedImmersive("");
        }
      } else {
        setSoundLabMode("off");
      }
    };
    loadSettings();
  }, [isImmersiveModeUnlocked]);

  const handleSoundLabModeChange = async (mode: SoundLabMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSoundLabMode(mode);
    
    if (mode === "equalizer") {
      await clearSoundMode();
      await saveEQPreset(selectedEQ);
    } else if (mode === "immersive") {
      await clearEQPreset();
      await saveSoundMode(selectedImmersive);
    } else {
      await clearEQPreset();
      await clearSoundMode();
    }
  };

  const handleEQChange = async (preset: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (soundLabMode === "equalizer" && selectedEQ === preset) {
      setSoundLabMode("off");
      setSelectedEQ("");
      await clearEQPreset();
    } else {
      setSelectedEQ(preset);
      setSoundLabMode("equalizer");
      await clearSoundMode();
      await saveEQPreset(preset);
    }
  };

  const handleImmersiveChange = async (mode: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!isImmersiveModeUnlocked()) {
      Alert.alert(
        "Premium Feature",
        "Upgrade to Premium to unlock Immersive Modes for a rich, cinematic audio experience.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }
    
    if (soundLabMode === "immersive" && selectedImmersive === mode) {
      setSoundLabMode("off");
      setSelectedImmersive("");
      await clearSoundMode();
    } else {
      setSelectedImmersive(mode);
      setSoundLabMode("immersive");
      await clearEQPreset();
      await saveSoundMode(mode);
    }
  };

  return (
    <FluentScreenLayout edges={[]} hasBottomNavigation={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.m, paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <FluentText variant="caption1" color="secondary" style={styles.sectionDesc}>
          Tap a preset to apply, tap again to turn off. Only one effect can be active at a time.
        </FluentText>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="tune-vertical" size={18} color={colors.colorBrandForeground1} />
            <FluentText variant="body1Strong" style={styles.sectionTitle}>
              Equalizer Presets
            </FluentText>
            {soundLabMode === "equalizer" && selectedEQ ? (
              <View style={[styles.activeIndicator, { backgroundColor: colors.colorBrandBackground }]}>
                <FluentText variant="caption1" color="onBrand" style={{ fontWeight: "600" }}>Active</FluentText>
              </View>
            ) : null}
          </View>
          <View style={styles.chipsContainer}>
            {EQ_PRESETS.map((preset) => (
              <EffectChip
                key={preset.name}
                label={preset.name}
                isSelected={soundLabMode === "equalizer" && selectedEQ === preset.name}
                onPress={() => handleEQChange(preset.name)}
              />
            ))}
          </View>
          {soundLabMode === "equalizer" && selectedEQ ? (
            <GlassCard style={styles.presetInfo}>
              <FluentText variant="body1Strong">
                {selectedEQ}
              </FluentText>
              <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                {EQ_PRESETS.find(p => p.name === selectedEQ)?.description}
              </FluentText>
            </GlassCard>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="headphones" size={18} color={colors.colorBrandForeground1} />
            <FluentText variant="body1Strong" style={styles.sectionTitle}>
              Immersive Modes
            </FluentText>
            {!isImmersiveModeUnlocked() ? (
              <View style={[styles.premiumBadge, { backgroundColor: colors.colorPaletteYellowBackground1 }]}>
                <MaterialCommunityIcons name="crown" size={12} color={colors.colorPaletteYellowForeground1} />
                <FluentText variant="caption1" style={{ color: colors.colorPaletteYellowForeground1, fontWeight: "600", marginLeft: 4 }}>Premium</FluentText>
              </View>
            ) : soundLabMode === "immersive" && selectedImmersive ? (
              <View style={[styles.activeIndicator, { backgroundColor: colors.colorBrandBackground }]}>
                <FluentText variant="caption1" color="onBrand" style={{ fontWeight: "600" }}>Active</FluentText>
              </View>
            ) : null}
          </View>
          <View style={styles.modesContainer}>
            {IMMERSIVE_MODES.map((mode) => (
              <Pressable
                key={mode.name}
                onPress={() => handleImmersiveChange(mode.name)}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: soundLabMode === "immersive" && selectedImmersive === mode.name 
                      ? colors.colorBrandBackground 
                      : colors.colorNeutralBackground2,
                  },
                ]}
              >
                <View style={styles.modeCardContent}>
                  <MaterialCommunityIcons
                    name={mode.icon}
                    size={20}
                    color={soundLabMode === "immersive" && selectedImmersive === mode.name ? "#FFFFFF" : colors.colorNeutralForeground1}
                  />
                  <View style={styles.modeCardText}>
                    <FluentText
                      variant="body1"
                      style={{
                        fontWeight: "600",
                        color: soundLabMode === "immersive" && selectedImmersive === mode.name ? "#FFFFFF" : colors.colorNeutralForeground1,
                      }}
                    >
                      {mode.name}
                    </FluentText>
                    <FluentText
                      variant="caption1"
                      style={{
                        color: soundLabMode === "immersive" && selectedImmersive === mode.name 
                          ? "rgba(255,255,255,0.8)" 
                          : colors.colorNeutralForeground2,
                      }}
                    >
                      {mode.description}
                    </FluentText>
                  </View>
                  {soundLabMode === "immersive" && selectedImmersive === mode.name ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>


        <GlassCard style={styles.infoCard}>
          <View style={styles.infoContent}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.colorBrandForeground1} />
            <View style={styles.infoText}>
              <FluentText variant="body1Strong">
                Sound Experience
              </FluentText>
              <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                Your audio settings are saved automatically and applied to all playback.
              </FluentText>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.horizontalPadding,
  },
  sectionDesc: {
    marginBottom: FluentSpacing.m,
  },
  modeToggle: {
    flexDirection: "row",
    gap: FluentSpacing.s,
    marginBottom: FluentSpacing.l,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  section: {
    marginBottom: FluentSpacing.l,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xs,
  },
  sectionTitle: {
    marginLeft: FluentSpacing.xs,
    flex: 1,
  },
  activeIndicator: {
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: FluentSpacing.xs,
  },
  presetInfo: {
    marginTop: FluentSpacing.m,
  },
  modesContainer: {
    gap: FluentSpacing.s,
  },
  modeCard: {
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  modeCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  modeCardText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  infoCard: {
    marginTop: FluentSpacing.m,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
});
