import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { EffectChip } from "@/components/EffectChip";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
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
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const { theme } = useThemeContext();
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
        setSelectedImmersive(soundMode);
        setSoundLabMode("immersive");
      } else {
        setSoundLabMode("off");
      }
    };
    loadSettings();
  }, []);

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
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.m, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <ThemedText type="caption" style={[styles.sectionDesc, { color: theme.textSecondary }]}>
          Tap a preset to apply, tap again to turn off. Only one effect can be active at a time.
        </ThemedText>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="tune-vertical" size={18} color={theme.primary} />
            <ThemedText type="body" style={styles.sectionTitle}>
              Equalizer Presets
            </ThemedText>
            {soundLabMode === "equalizer" && selectedEQ ? (
              <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>Active</ThemedText>
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
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {selectedEQ}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                {EQ_PRESETS.find(p => p.name === selectedEQ)?.description}
              </ThemedText>
            </GlassCard>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="headphones" size={18} color={theme.primary} />
            <ThemedText type="body" style={styles.sectionTitle}>
              Immersive Modes
            </ThemedText>
            {soundLabMode === "immersive" && selectedImmersive ? (
              <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>Active</ThemedText>
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
                      ? theme.primary 
                      : theme.backgroundSecondary,
                  },
                ]}
              >
                <View style={styles.modeCardContent}>
                  <MaterialCommunityIcons
                    name={mode.icon}
                    size={20}
                    color={soundLabMode === "immersive" && selectedImmersive === mode.name ? "#FFFFFF" : theme.text}
                  />
                  <View style={styles.modeCardText}>
                    <ThemedText
                      type="small"
                      style={{
                        fontWeight: "600",
                        color: soundLabMode === "immersive" && selectedImmersive === mode.name ? "#FFFFFF" : theme.text,
                      }}
                    >
                      {mode.name}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{
                        color: soundLabMode === "immersive" && selectedImmersive === mode.name 
                          ? "rgba(255,255,255,0.8)" 
                          : theme.textSecondary,
                      }}
                    >
                      {mode.description}
                    </ThemedText>
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
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.primary} />
            <View style={styles.infoText}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                Sound Experience
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Your audio settings are saved automatically and applied to all playback.
              </ThemedText>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
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
  sectionDesc: {
    marginBottom: Spacing.m,
  },
  modeToggle: {
    flexDirection: "row",
    gap: Spacing.s,
    marginBottom: Spacing.l,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.medium,
  },
  section: {
    marginBottom: Spacing.l,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    marginLeft: Spacing.xs,
    fontWeight: "600",
    flex: 1,
  },
  activeIndicator: {
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  presetInfo: {
    marginTop: Spacing.m,
  },
  modesContainer: {
    gap: Spacing.s,
  },
  modeCard: {
    padding: Spacing.m,
    borderRadius: BorderRadius.medium,
  },
  modeCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  modeCardText: {
    flex: 1,
    marginLeft: Spacing.m,
  },
  infoCard: {
    marginTop: Spacing.m,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    marginLeft: Spacing.m,
  },
});
