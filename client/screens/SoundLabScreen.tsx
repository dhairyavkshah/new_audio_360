import React, { useState, useEffect, useMemo } from "react";
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
import { 
  getEQPreset, saveEQPreset, clearEQPreset, 
  getSoundMode, saveSoundMode, clearSoundMode,
  getBassBoostEnabled, saveBassBoostEnabled,
  getVirtualizerEnabled, saveVirtualizerEnabled
} from "@/lib/storage";
import { BassBoostModule, VirtualizerModule } from "../../modules/audio-effects";
import { 
  ImmersiveModeEngineModule, 
  IMMERSIVE_MODE_INFO, 
  ImmersiveMode,
  ImmersiveModeInfo 
} from "../../modules/audio-effects";
import NativeAudioService from "@/services/NativeAudioService";

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

const DISPLAY_IMMERSIVE_MODES: ImmersiveMode[] = [
  'off', 'music', '360_reality', 'gaming', 'podcast', 'movie'
];

export default function SoundLabScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { isImmersiveModeUnlocked } = useSubscription();
  const [soundLabMode, setSoundLabMode] = useState<SoundLabMode>("off");
  const [selectedEQ, setSelectedEQ] = useState("Flat");
  const [selectedImmersive, setSelectedImmersive] = useState<ImmersiveMode>("off");
  const [availableModes, setAvailableModes] = useState<ImmersiveModeInfo[]>([]);
  const [bassBoostEnabled, setBassBoostEnabled] = useState(false);
  const [virtualizerEnabled, setVirtualizerEnabled] = useState(false);

  const immersiveModes = useMemo(() => {
    if (availableModes.length > 0) {
      return availableModes.filter(mode => DISPLAY_IMMERSIVE_MODES.includes(mode.id));
    }
    return DISPLAY_IMMERSIVE_MODES.map(modeId => ({
      id: modeId,
      name: IMMERSIVE_MODE_INFO[modeId].name,
      description: IMMERSIVE_MODE_INFO[modeId].description,
      icon: IMMERSIVE_MODE_INFO[modeId].icon
    }));
  }, [availableModes]);

  useEffect(() => {
    const loadSettings = async () => {
      const modes = ImmersiveModeEngineModule.getAvailableModes();
      setAvailableModes(modes);

      const eqPreset = await getEQPreset();
      const soundMode = await getSoundMode();
      const bassBoost = await getBassBoostEnabled();
      const virtualizer = await getVirtualizerEnabled();
      
      setBassBoostEnabled(bassBoost);
      setVirtualizerEnabled(virtualizer);
      
      if (eqPreset) {
        setSelectedEQ(eqPreset);
        setSoundLabMode("equalizer");
      } else if (soundMode) {
        if (isImmersiveModeUnlocked()) {
          setSelectedImmersive(soundMode as ImmersiveMode);
          setSoundLabMode("immersive");
        } else {
          await clearSoundMode();
          setSoundLabMode("off");
          setSelectedImmersive("off");
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
      await NativeAudioService.setImmersiveMode('off');
    } else if (mode === "immersive") {
      await clearEQPreset();
      await saveSoundMode(selectedImmersive);
      await NativeAudioService.setImmersiveMode(selectedImmersive);
    } else {
      await clearEQPreset();
      await clearSoundMode();
      await NativeAudioService.setImmersiveMode('off');
    }
  };

  const handleEQChange = async (preset: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (soundLabMode === "equalizer" && selectedEQ === preset) {
      setSoundLabMode("off");
      setSelectedEQ("");
      await clearEQPreset();
      await NativeAudioService.setImmersiveMode('off');
    } else {
      setSelectedEQ(preset);
      setSoundLabMode("equalizer");
      await clearSoundMode();
      await saveEQPreset(preset);
      await NativeAudioService.setImmersiveMode('off');
    }
  };

  const handleBassBoostToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !bassBoostEnabled;
    setBassBoostEnabled(newValue);
    await saveBassBoostEnabled(newValue);
    
    if (BassBoostModule.isAvailable()) {
      BassBoostModule.setEnabled(newValue);
      if (newValue) {
        BassBoostModule.setStrength(500);
      }
    }
    console.log(`[SoundLab] Bass Boost ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleVirtualizerToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !virtualizerEnabled;
    setVirtualizerEnabled(newValue);
    await saveVirtualizerEnabled(newValue);
    
    if (VirtualizerModule.isAvailable()) {
      VirtualizerModule.setEnabled(newValue);
      if (newValue) {
        VirtualizerModule.setStrength(500);
      }
    }
    console.log(`[SoundLab] Virtualizer ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleImmersiveChange = async (modeId: ImmersiveMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!isImmersiveModeUnlocked() && modeId !== 'off') {
      Alert.alert(
        "Premium Feature",
        "Upgrade to Premium to unlock Immersive Modes for a rich, cinematic audio experience.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }
    
    if (soundLabMode === "immersive" && selectedImmersive === modeId) {
      const result = await NativeAudioService.setImmersiveMode('off');
      if (result.success) {
        setSoundLabMode("off");
        setSelectedImmersive("off");
        await clearSoundMode();
      } else {
        Alert.alert(
          "Audio Error",
          result.error || "Failed to disable immersive mode. Please try again.",
          [{ text: "OK", style: "default" }]
        );
      }
    } else {
      const result = await NativeAudioService.setImmersiveMode(modeId);
      if (result.success) {
        setSelectedImmersive(modeId);
        setSoundLabMode("immersive");
        await clearEQPreset();
        await saveSoundMode(modeId);
      } else {
        Alert.alert(
          "Audio Error",
          result.error || "Failed to set immersive mode. Please ensure audio is playing and try again.",
          [{ text: "OK", style: "default" }]
        );
      }
    }
  };

  const getModeIcon = (iconName: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    const iconMap: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
      'volume-off': 'volume-off',
      'music': 'music',
      'surround-sound': 'surround-sound',
      'music-circle': 'music-circle',
      'gamepad-variant': 'gamepad-variant',
      'podcast': 'podcast',
      'movie-open': 'movie-open',
      'tune': 'tune',
    };
    return iconMap[iconName] || 'music';
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
            <MaterialCommunityIcons name="speaker" size={18} color={colors.colorBrandForeground1} />
            <FluentText variant="body1Strong" style={styles.sectionTitle}>
              Audio Enhancements
            </FluentText>
          </View>
          <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.s }}>
            These effects work alongside Equalizer Presets
          </FluentText>
          <View style={styles.enhancementsContainer}>
            <Pressable
              onPress={handleBassBoostToggle}
              style={[
                styles.enhancementCard,
                {
                  backgroundColor: bassBoostEnabled 
                    ? colors.colorBrandBackground 
                    : colors.colorNeutralBackground2,
                },
              ]}
            >
              <View style={styles.enhancementContent}>
                <MaterialCommunityIcons
                  name="speaker"
                  size={20}
                  color={bassBoostEnabled ? "#FFFFFF" : colors.colorNeutralForeground1}
                />
                <View style={styles.enhancementText}>
                  <FluentText
                    variant="body1"
                    style={{
                      fontWeight: "600",
                      color: bassBoostEnabled ? "#FFFFFF" : colors.colorNeutralForeground1,
                    }}
                  >
                    Bass Boost
                  </FluentText>
                  <FluentText
                    variant="caption1"
                    style={{
                      color: bassBoostEnabled 
                        ? "rgba(255,255,255,0.8)" 
                        : colors.colorNeutralForeground2,
                    }}
                  >
                    Enhanced low frequencies
                  </FluentText>
                </View>
                {bassBoostEnabled ? (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                ) : null}
              </View>
            </Pressable>

            <Pressable
              onPress={handleVirtualizerToggle}
              style={[
                styles.enhancementCard,
                {
                  backgroundColor: virtualizerEnabled 
                    ? colors.colorBrandBackground 
                    : colors.colorNeutralBackground2,
                },
              ]}
            >
              <View style={styles.enhancementContent}>
                <MaterialCommunityIcons
                  name="surround-sound"
                  size={20}
                  color={virtualizerEnabled ? "#FFFFFF" : colors.colorNeutralForeground1}
                />
                <View style={styles.enhancementText}>
                  <FluentText
                    variant="body1"
                    style={{
                      fontWeight: "600",
                      color: virtualizerEnabled ? "#FFFFFF" : colors.colorNeutralForeground1,
                    }}
                  >
                    Virtualizer
                  </FluentText>
                  <FluentText
                    variant="caption1"
                    style={{
                      color: virtualizerEnabled 
                        ? "rgba(255,255,255,0.8)" 
                        : colors.colorNeutralForeground2,
                    }}
                  >
                    Spatial audio effect
                  </FluentText>
                </View>
                {virtualizerEnabled ? (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                ) : null}
              </View>
            </Pressable>
          </View>
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
            ) : soundLabMode === "immersive" && selectedImmersive !== 'off' ? (
              <View style={[styles.activeIndicator, { backgroundColor: colors.colorBrandBackground }]}>
                <FluentText variant="caption1" color="onBrand" style={{ fontWeight: "600" }}>Active</FluentText>
              </View>
            ) : null}
          </View>
          <View style={styles.modesContainer}>
            {immersiveModes.filter(mode => mode.id !== 'off').map((mode) => (
              <Pressable
                key={mode.id}
                onPress={() => handleImmersiveChange(mode.id)}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: soundLabMode === "immersive" && selectedImmersive === mode.id 
                      ? colors.colorBrandBackground 
                      : colors.colorNeutralBackground2,
                  },
                ]}
              >
                <View style={styles.modeCardContent}>
                  <MaterialCommunityIcons
                    name={getModeIcon(mode.icon)}
                    size={20}
                    color={soundLabMode === "immersive" && selectedImmersive === mode.id ? "#FFFFFF" : colors.colorNeutralForeground1}
                  />
                  <View style={styles.modeCardText}>
                    <FluentText
                      variant="body1"
                      style={{
                        fontWeight: "600",
                        color: soundLabMode === "immersive" && selectedImmersive === mode.id ? "#FFFFFF" : colors.colorNeutralForeground1,
                      }}
                    >
                      {mode.name}
                    </FluentText>
                    <FluentText
                      variant="caption1"
                      style={{
                        color: soundLabMode === "immersive" && selectedImmersive === mode.id 
                          ? "rgba(255,255,255,0.8)" 
                          : colors.colorNeutralForeground2,
                      }}
                    >
                      {mode.description}
                    </FluentText>
                  </View>
                  {soundLabMode === "immersive" && selectedImmersive === mode.id ? (
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
  enhancementsContainer: {
    gap: FluentSpacing.s,
  },
  enhancementCard: {
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  enhancementContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  enhancementText: {
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
