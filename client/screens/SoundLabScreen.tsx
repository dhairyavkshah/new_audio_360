import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, TextInput, Modal } from "react-native";
import Slider from "@react-native-community/slider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText, FluentButton } from "@/components/fluent";
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
  getVirtualizerEnabled, saveVirtualizerEnabled,
  getBassBoostStrength, saveBassBoostStrength,
  getVirtualizerStrength, saveVirtualizerStrength,
  getCustomEQBands, saveCustomEQBands,
  getCustomEQPresets, saveCustomEQPresets,
  CustomEQPreset
} from "@/lib/storage";
import { BassBoostModule, VirtualizerModule } from "../../modules/audio-effects";
import { 
  ImmersiveModeEngineModule, 
  IMMERSIVE_MODE_INFO, 
  ImmersiveMode,
  ImmersiveModeInfo 
} from "../../modules/audio-effects";
import NativeAudioService from "@/services/NativeAudioService";
import { NativeEffectsManager } from "@/services/NativeEffectsManager";

type SoundLabMode = "equalizer" | "immersive" | "off";

const EQ_PRESETS = [
  { 
    name: "Flat", 
    description: "Natural, unprocessed sound",
    bands: [0, 0, 0, 0, 0]
  },
  { 
    name: "Rock", 
    description: "Punchy bass, crisp guitars",
    bands: [3, 2, -1, 2, 3]
  },
  { 
    name: "Pop", 
    description: "Bright vocals, balanced bass",
    bands: [2, 1, 2, 3, 2]
  },
  { 
    name: "Jazz", 
    description: "Warm mids, smooth highs",
    bands: [2, 3, 1, -1, 0]
  },
  { 
    name: "Classical", 
    description: "Wide dynamics, clear separation",
    bands: [1, 1, 0, 2, 3]
  },
  { 
    name: "Electronic", 
    description: "Deep bass, sparkling highs",
    bands: [4, 3, -1, 2, 4]
  },
  { 
    name: "Hip-Hop", 
    description: "Heavy sub-bass, clear vocals",
    bands: [5, 3, 1, 2, 1]
  },
  { 
    name: "Acoustic", 
    description: "Natural warmth, presence",
    bands: [1, 2, 2, 1, 1]
  },
];

const CUSTOM_EQ_BAND_LABELS = ["60Hz", "230Hz", "910Hz", "3.6kHz", "14kHz"];
const STRENGTH_OPTIONS = [100, 200, 300];

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
  const [isCustomEQ, setIsCustomEQ] = useState(false);
  const [customBands, setCustomBands] = useState<number[]>([0, 0, 0, 0, 0]);
  const [customPresets, setCustomPresets] = useState<CustomEQPreset[]>([]);
  const [selectedImmersive, setSelectedImmersive] = useState<ImmersiveMode>("off");
  const [availableModes, setAvailableModes] = useState<ImmersiveModeInfo[]>([]);
  
  const [bassBoostEnabled, setBassBoostEnabled] = useState(false);
  const [bassBoostStrength, setBassBoostStrength] = useState(200);
  const [virtualizerEnabled, setVirtualizerEnabled] = useState(false);
  const [virtualizerStrength, setVirtualizerStrength] = useState(200);
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

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

      const [eqPreset, soundMode, bassBoost, virtualizer, bbStrength, virStrength, bands, presets] = await Promise.all([
        getEQPreset(),
        getSoundMode(),
        getBassBoostEnabled(),
        getVirtualizerEnabled(),
        getBassBoostStrength(),
        getVirtualizerStrength(),
        getCustomEQBands(),
        getCustomEQPresets()
      ]);
      
      setBassBoostEnabled(bassBoost);
      setVirtualizerEnabled(virtualizer);
      setBassBoostStrength(bbStrength);
      setVirtualizerStrength(virStrength);
      setCustomBands(bands);
      setCustomPresets(presets);
      
      if (eqPreset) {
        if (eqPreset === "Custom") {
          setIsCustomEQ(true);
        } else {
          setSelectedEQ(eqPreset);
        }
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

  const disableAudioEnhancements = useCallback(async () => {
    setBassBoostEnabled(false);
    setVirtualizerEnabled(false);
    await saveBassBoostEnabled(false);
    await saveVirtualizerEnabled(false);
    if (BassBoostModule.isAvailable()) {
      BassBoostModule.setEnabled(false);
    }
    if (VirtualizerModule.isAvailable()) {
      VirtualizerModule.setEnabled(false);
    }
  }, []);

  const handleEQChange = async (preset: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (preset === "Custom") {
      if (isCustomEQ && soundLabMode === "equalizer") {
        setSoundLabMode("off");
        setIsCustomEQ(false);
        await clearEQPreset();
        await disableAudioEnhancements();
        await NativeAudioService.setImmersiveMode('off');
        NativeEffectsManager.disableEQ();
      } else {
        setIsCustomEQ(true);
        setSelectedEQ("");
        setSoundLabMode("equalizer");
        await clearSoundMode();
        await saveEQPreset("Custom");
        await NativeAudioService.setImmersiveMode('off');
        NativeEffectsManager.applyFiveBandEQ(customBands);
      }
    } else {
      if (soundLabMode === "equalizer" && selectedEQ === preset && !isCustomEQ) {
        setSoundLabMode("off");
        setSelectedEQ("");
        await clearEQPreset();
        await disableAudioEnhancements();
        await NativeAudioService.setImmersiveMode('off');
        NativeEffectsManager.disableEQ();
      } else {
        setSelectedEQ(preset);
        setIsCustomEQ(false);
        setSoundLabMode("equalizer");
        await clearSoundMode();
        await saveEQPreset(preset);
        await NativeAudioService.setImmersiveMode('off');
        // Apply the preset's EQ bands
        const presetData = EQ_PRESETS.find(p => p.name === preset);
        if (presetData) {
          NativeEffectsManager.applyFiveBandEQ(presetData.bands);
        }
      }
    }
  };

  const handleBandChange = async (index: number, value: number) => {
    const newBands = [...customBands];
    newBands[index] = Math.round(value);
    setCustomBands(newBands);
    await saveCustomEQBands(newBands);
    // Apply to native equalizer in real-time
    NativeEffectsManager.applyFiveBandEQ(newBands);
  };

  const handleResetBands = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const resetBands = [0, 0, 0, 0, 0];
    setCustomBands(resetBands);
    await saveCustomEQBands(resetBands);
    NativeEffectsManager.applyFiveBandEQ(resetBands);
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      Alert.alert("Error", "Please enter a preset name");
      return;
    }
    
    const newPreset: CustomEQPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      bands: [...customBands]
    };
    
    const updatedPresets = [...customPresets, newPreset];
    setCustomPresets(updatedPresets);
    await saveCustomEQPresets(updatedPresets);
    setNewPresetName("");
    setShowSaveDialog(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLoadPreset = async (preset: CustomEQPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomBands(preset.bands);
    await saveCustomEQBands(preset.bands);
    NativeEffectsManager.applyFiveBandEQ(preset.bands);
  };

  const handleDeletePreset = async (presetId: string) => {
    Alert.alert(
      "Delete Preset",
      "Are you sure you want to delete this preset?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedPresets = customPresets.filter(p => p.id !== presetId);
            setCustomPresets(updatedPresets);
            await saveCustomEQPresets(updatedPresets);
          }
        }
      ]
    );
  };

  const handleBassBoostToggle = async () => {
    if (soundLabMode !== "equalizer") return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !bassBoostEnabled;
    setBassBoostEnabled(newValue);
    await saveBassBoostEnabled(newValue);
    
    if (BassBoostModule.isAvailable()) {
      BassBoostModule.setEnabled(newValue);
      if (newValue) {
        BassBoostModule.setStrength(bassBoostStrength);
      }
    }
  };

  const handleBassBoostStrengthChange = async (strength: number) => {
    if (soundLabMode !== "equalizer") return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBassBoostStrength(strength);
    await saveBassBoostStrength(strength);
    
    if (BassBoostModule.isAvailable() && bassBoostEnabled) {
      BassBoostModule.setStrength(strength);
    }
  };

  const handleVirtualizerToggle = async () => {
    if (soundLabMode !== "equalizer") return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !virtualizerEnabled;
    setVirtualizerEnabled(newValue);
    await saveVirtualizerEnabled(newValue);
    
    if (VirtualizerModule.isAvailable()) {
      VirtualizerModule.setEnabled(newValue);
      if (newValue) {
        VirtualizerModule.setStrength(virtualizerStrength);
      }
    }
  };

  const handleVirtualizerStrengthChange = async (strength: number) => {
    if (soundLabMode !== "equalizer") return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVirtualizerStrength(strength);
    await saveVirtualizerStrength(strength);
    
    if (VirtualizerModule.isAvailable() && virtualizerEnabled) {
      VirtualizerModule.setStrength(strength);
    }
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
      }
    } else {
      const result = await NativeAudioService.setImmersiveMode(modeId);
      if (result.success) {
        setSelectedImmersive(modeId);
        setSoundLabMode("immersive");
        setIsCustomEQ(false);
        setSelectedEQ("");
        await clearEQPreset();
        await saveSoundMode(modeId);
        await disableAudioEnhancements();
        NativeEffectsManager.disableEQ();
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

  const isEqualizerActive = soundLabMode === "equalizer";
  const isImmersiveActive = soundLabMode === "immersive";

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
          Tap a preset to apply, tap again to turn off. Only one mode can be active at a time.
        </FluentText>

        <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="tune-vertical" size={18} color={colors.colorBrandForeground1} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Equalizer Mode
            </FluentText>
            {isEqualizerActive ? (
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
                isSelected={isEqualizerActive && selectedEQ === preset.name && !isCustomEQ}
                onPress={() => handleEQChange(preset.name)}
              />
            ))}
            <EffectChip
              label="Custom"
              isSelected={isEqualizerActive && isCustomEQ}
              onPress={() => handleEQChange("Custom")}
              isPremium={false}
            />
          </View>

          {isEqualizerActive && selectedEQ && !isCustomEQ ? (
            <GlassCard style={styles.presetInfo}>
              <FluentText variant="body1Strong">{selectedEQ}</FluentText>
              <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                {EQ_PRESETS.find(p => p.name === selectedEQ)?.description}
              </FluentText>
            </GlassCard>
          ) : null}

          {isEqualizerActive && isCustomEQ ? (
            <GlassCard style={styles.customEQContainer}>
              <FluentText variant="body1Strong" style={{ marginBottom: FluentSpacing.m }}>
                Custom Equalizer
              </FluentText>
              
              {CUSTOM_EQ_BAND_LABELS.map((label, index) => (
                <View key={label} style={styles.bandRow}>
                  <FluentText variant="caption1" style={styles.bandLabel}>{label}</FluentText>
                  <Slider
                    style={styles.slider}
                    minimumValue={-8}
                    maximumValue={8}
                    step={1}
                    value={customBands[index]}
                    onValueChange={(value) => handleBandChange(index, value)}
                    minimumTrackTintColor={colors.colorBrandForeground1}
                    maximumTrackTintColor={colors.colorNeutralStroke2}
                    thumbTintColor={colors.colorBrandForeground1}
                  />
                  <FluentText variant="caption1" style={styles.bandValue}>
                    {customBands[index] > 0 ? `+${customBands[index]}` : customBands[index]}
                  </FluentText>
                </View>
              ))}
              
              <View style={styles.customEQButtons}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.colorNeutralBackground3 }]}
                  onPress={handleResetBands}
                >
                  <MaterialCommunityIcons name="refresh" size={16} color={colors.colorNeutralForeground1} />
                  <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs }}>Reset</FluentText>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.colorBrandBackground }]}
                  onPress={() => setShowSaveDialog(true)}
                >
                  <MaterialCommunityIcons name="content-save" size={16} color="#FFFFFF" />
                  <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs, color: "#FFFFFF" }}>Save Preset</FluentText>
                </Pressable>
              </View>

              {customPresets.length > 0 ? (
                <View style={styles.savedPresetsSection}>
                  <FluentText variant="body2" color="secondary" style={{ marginBottom: FluentSpacing.s }}>
                    Saved Presets
                  </FluentText>
                  {customPresets.map((preset) => (
                    <View key={preset.id} style={[styles.savedPresetRow, { backgroundColor: colors.colorNeutralBackground3 }]}>
                      <Pressable style={styles.savedPresetInfo} onPress={() => handleLoadPreset(preset)}>
                        <FluentText variant="body2">{preset.name}</FluentText>
                        <FluentText variant="caption1" color="secondary">
                          {preset.bands.map(b => b > 0 ? `+${b}` : b).join(", ")}
                        </FluentText>
                      </Pressable>
                      <Pressable onPress={() => handleDeletePreset(preset.id)} style={styles.deleteButton}>
                        <MaterialCommunityIcons name="delete-outline" size={18} color={colors.colorPaletteRedForeground1} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </GlassCard>
          ) : null}
        </View>

        {isEqualizerActive ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="speaker" size={18} color={colors.colorBrandForeground1} />
              <FluentText variant="subtitle1" style={styles.sectionTitle}>
                Audio Enhancements
              </FluentText>
            </View>
            <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.m }}>
              Enhance your sound with bass boost and virtualizer effects
            </FluentText>
            
            <View style={styles.enhancementsContainer}>
              <GlassCard style={styles.enhancementSection}>
                <Pressable onPress={handleBassBoostToggle} style={styles.enhancementHeader}>
                  <MaterialCommunityIcons
                    name="speaker"
                    size={20}
                    color={bassBoostEnabled ? colors.colorBrandForeground1 : colors.colorNeutralForeground2}
                  />
                  <View style={styles.enhancementText}>
                    <FluentText variant="body1Strong">Bass Boost</FluentText>
                    <FluentText variant="caption1" color="secondary">Enhanced low frequencies</FluentText>
                  </View>
                  <View style={[
                    styles.toggleIndicator,
                    { backgroundColor: bassBoostEnabled ? colors.colorBrandBackground : colors.colorNeutralBackground3 }
                  ]}>
                    <FluentText variant="caption1" style={{ color: bassBoostEnabled ? "#FFFFFF" : colors.colorNeutralForeground2 }}>
                      {bassBoostEnabled ? "ON" : "OFF"}
                    </FluentText>
                  </View>
                </Pressable>
                
                {bassBoostEnabled ? (
                  <View style={styles.strengthSelector}>
                    <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.xs }}>
                      Strength
                    </FluentText>
                    <View style={styles.strengthChips}>
                      {STRENGTH_OPTIONS.map((strength) => (
                        <Pressable
                          key={strength}
                          style={[
                            styles.strengthChip,
                            {
                              backgroundColor: bassBoostStrength === strength 
                                ? colors.colorBrandBackground 
                                : colors.colorNeutralBackground3,
                            }
                          ]}
                          onPress={() => handleBassBoostStrengthChange(strength)}
                        >
                          <FluentText
                            variant="caption1"
                            style={{
                              color: bassBoostStrength === strength ? "#FFFFFF" : colors.colorNeutralForeground1,
                              fontWeight: "600"
                            }}
                          >
                            {strength}
                          </FluentText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </GlassCard>

              <GlassCard style={styles.enhancementSection}>
                <Pressable onPress={handleVirtualizerToggle} style={styles.enhancementHeader}>
                  <MaterialCommunityIcons
                    name="surround-sound"
                    size={20}
                    color={virtualizerEnabled ? colors.colorBrandForeground1 : colors.colorNeutralForeground2}
                  />
                  <View style={styles.enhancementText}>
                    <FluentText variant="body1Strong">Virtualizer</FluentText>
                    <FluentText variant="caption1" color="secondary">Spatial audio effect</FluentText>
                  </View>
                  <View style={[
                    styles.toggleIndicator,
                    { backgroundColor: virtualizerEnabled ? colors.colorBrandBackground : colors.colorNeutralBackground3 }
                  ]}>
                    <FluentText variant="caption1" style={{ color: virtualizerEnabled ? "#FFFFFF" : colors.colorNeutralForeground2 }}>
                      {virtualizerEnabled ? "ON" : "OFF"}
                    </FluentText>
                  </View>
                </Pressable>
                
                {virtualizerEnabled ? (
                  <View style={styles.strengthSelector}>
                    <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.xs }}>
                      Strength
                    </FluentText>
                    <View style={styles.strengthChips}>
                      {STRENGTH_OPTIONS.map((strength) => (
                        <Pressable
                          key={strength}
                          style={[
                            styles.strengthChip,
                            {
                              backgroundColor: virtualizerStrength === strength 
                                ? colors.colorBrandBackground 
                                : colors.colorNeutralBackground3,
                            }
                          ]}
                          onPress={() => handleVirtualizerStrengthChange(strength)}
                        >
                          <FluentText
                            variant="caption1"
                            style={{
                              color: virtualizerStrength === strength ? "#FFFFFF" : colors.colorNeutralForeground1,
                              fontWeight: "600"
                            }}
                          >
                            {strength}
                          </FluentText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </GlassCard>
            </View>
          </View>
        ) : null}

        <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="headphones" size={18} color={colors.colorBrandForeground1} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Immersive Modes
            </FluentText>
            {!isImmersiveModeUnlocked() ? (
              <View style={[styles.premiumBadge, { backgroundColor: colors.colorPaletteYellowBackground1 }]}>
                <MaterialCommunityIcons name="crown" size={12} color={colors.colorPaletteYellowForeground1} />
                <FluentText variant="caption1" style={{ color: colors.colorPaletteYellowForeground1, fontWeight: "600", marginLeft: 4 }}>Premium</FluentText>
              </View>
            ) : isImmersiveActive && selectedImmersive !== 'off' ? (
              <View style={[styles.activeIndicator, { backgroundColor: colors.colorBrandBackground }]}>
                <FluentText variant="caption1" color="onBrand" style={{ fontWeight: "600" }}>Active</FluentText>
              </View>
            ) : null}
          </View>
          
          {isEqualizerActive ? (
            <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.m }}>
              Disable equalizer to use immersive modes
            </FluentText>
          ) : (
            <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.m }}>
              Premium audio processing for an immersive experience
            </FluentText>
          )}
          
          <View style={styles.modesContainer}>
            {immersiveModes.filter(mode => mode.id !== 'off').map((mode) => (
              <Pressable
                key={mode.id}
                onPress={() => handleImmersiveChange(mode.id)}
                disabled={isEqualizerActive}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: isImmersiveActive && selectedImmersive === mode.id 
                      ? colors.colorBrandBackground 
                      : colors.colorNeutralBackground2,
                    opacity: isEqualizerActive ? 0.5 : 1,
                  },
                ]}
              >
                <View style={styles.modeCardContent}>
                  <MaterialCommunityIcons
                    name={getModeIcon(mode.icon)}
                    size={20}
                    color={isImmersiveActive && selectedImmersive === mode.id ? "#FFFFFF" : colors.colorNeutralForeground1}
                  />
                  <View style={styles.modeCardText}>
                    <FluentText
                      variant="body1"
                      style={{
                        fontWeight: "600",
                        color: isImmersiveActive && selectedImmersive === mode.id ? "#FFFFFF" : colors.colorNeutralForeground1,
                      }}
                    >
                      {mode.name}
                    </FluentText>
                    <FluentText
                      variant="caption1"
                      style={{
                        color: isImmersiveActive && selectedImmersive === mode.id 
                          ? "rgba(255,255,255,0.8)" 
                          : colors.colorNeutralForeground2,
                      }}
                    >
                      {mode.description}
                    </FluentText>
                  </View>
                  {isImmersiveActive && selectedImmersive === mode.id ? (
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
              <FluentText variant="body1Strong">Sound Experience</FluentText>
              <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                Your audio settings are saved automatically and applied to all playback.
              </FluentText>
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      <Modal
        visible={showSaveDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSaveDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.colorNeutralBackground1 }]}>
            <FluentText variant="subtitle1" style={{ marginBottom: FluentSpacing.m }}>
              Save Custom Preset
            </FluentText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.colorNeutralBackground3,
                  color: colors.colorNeutralForeground1,
                  borderColor: colors.colorNeutralStroke2,
                }
              ]}
              placeholder="Preset name"
              placeholderTextColor={colors.colorNeutralForeground2}
              value={newPresetName}
              onChangeText={setNewPresetName}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.colorNeutralBackground3 }]}
                onPress={() => {
                  setShowSaveDialog(false);
                  setNewPresetName("");
                }}
              >
                <FluentText variant="body2">Cancel</FluentText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.colorBrandBackground }]}
                onPress={handleSavePreset}
              >
                <FluentText variant="body2" style={{ color: "#FFFFFF" }}>Save</FluentText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionCard: {
    borderRadius: 12,
    padding: FluentSpacing.l,
    marginBottom: FluentSpacing.m,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
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
    gap: FluentSpacing.s,
  },
  presetInfo: {
    marginTop: FluentSpacing.m,
  },
  customEQContainer: {
    marginTop: FluentSpacing.m,
  },
  bandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.s,
  },
  bandLabel: {
    width: 50,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  bandValue: {
    width: 30,
    textAlign: "right",
  },
  customEQButtons: {
    flexDirection: "row",
    gap: FluentSpacing.s,
    marginTop: FluentSpacing.m,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  savedPresetsSection: {
    marginTop: FluentSpacing.l,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
    paddingTop: FluentSpacing.m,
  },
  savedPresetRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    marginBottom: FluentSpacing.xs,
  },
  savedPresetInfo: {
    flex: 1,
  },
  deleteButton: {
    padding: FluentSpacing.xs,
  },
  enhancementsContainer: {
    gap: FluentSpacing.s,
  },
  enhancementSection: {
    padding: FluentSpacing.m,
  },
  enhancementHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  enhancementText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  toggleIndicator: {
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
  },
  strengthSelector: {
    marginTop: FluentSpacing.m,
    paddingTop: FluentSpacing.m,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  strengthChips: {
    flexDirection: "row",
    gap: FluentSpacing.s,
  },
  strengthChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentControlRadius.card,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: FluentSpacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    padding: FluentSpacing.xl,
    borderRadius: FluentControlRadius.card,
  },
  textInput: {
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    borderWidth: 1,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: FluentSpacing.s,
    marginTop: FluentSpacing.l,
  },
  modalButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
});
