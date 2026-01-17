import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, TextInput, Modal } from "react-native";
import Slider from "@react-native-community/slider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText, FluentButton } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { EffectChip } from "@/components/EffectChip";
import { useThemeContext, useThemeTokens } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getCardEffectStyle } from "@/lib/themeUtils";
import { FluentSpacing, FluentRadius } from "@/constants/fluent2";
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
  getBassControlLevel, saveBassControlLevel,
  getTrebleControlLevel, saveTrebleControlLevel,
  CustomEQPreset
} from "@/lib/storage";
import { BassBoostModule, VirtualizerModule, EqualizerModule, TrebleModule } from "../../modules/audio-effects";
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
const VIRTUALIZER_STRENGTH_OPTIONS = [1, 2, 3, 4, 5];

const DISPLAY_IMMERSIVE_MODES: ImmersiveMode[] = [
  'off', 'music', '360_reality', 'gaming', 'podcast', 'movie'
];

export default function SoundLabScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const tokens = useThemeTokens();
  const { isLicensed } = useSubscription();
  
  const cardStyle = getCardEffectStyle(tokens);
  
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
  const [bassControlLevel, setBassControlLevel] = useState(0);
  const [trebleControlLevel, setTrebleControlLevel] = useState(0);
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CustomEQPreset | null>(null);
  const [editPresetName, setEditPresetName] = useState("");

  const MAX_CUSTOM_PRESETS = 5;

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

      const [eqPreset, soundMode, bassBoost, virtualizer, bbStrength, virStrength, bands, presets, bassLevel, trebleLevel] = await Promise.all([
        getEQPreset(),
        getSoundMode(),
        getBassBoostEnabled(),
        getVirtualizerEnabled(),
        getBassBoostStrength(),
        getVirtualizerStrength(),
        getCustomEQBands(),
        getCustomEQPresets(),
        getBassControlLevel(),
        getTrebleControlLevel()
      ]);
      
      setBassBoostEnabled(bassBoost);
      setVirtualizerEnabled(virtualizer);
      setBassBoostStrength(bbStrength);
      setVirtualizerStrength(virStrength);
      setCustomBands(bands);
      setCustomPresets(presets);
      setBassControlLevel(bassLevel);
      setTrebleControlLevel(trebleLevel);
      
      if (eqPreset) {
        if (eqPreset === "Custom") {
          setIsCustomEQ(true);
        } else {
          setSelectedEQ(eqPreset);
        }
        setSoundLabMode("equalizer");
      } else if (soundMode) {
        if (isLicensed) {
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
  }, [isLicensed]);

  const disableAudioEnhancements = useCallback(async () => {
    setBassBoostEnabled(false);
    setVirtualizerEnabled(false);
    setBassControlLevel(0);
    setTrebleControlLevel(0);
    await saveBassBoostEnabled(false);
    await saveVirtualizerEnabled(false);
    await saveBassControlLevel(0);
    await saveTrebleControlLevel(0);
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
        // Apply with gain staging, passing current bass/treble levels
        NativeEffectsManager.applyFiveBandEQWithGainStaging(customBands, bassControlLevel, trebleControlLevel);
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
        // Apply the preset's EQ bands with gain staging
        const presetData = EQ_PRESETS.find(p => p.name === preset);
        if (presetData) {
          NativeEffectsManager.applyFiveBandEQWithGainStaging(presetData.bands, bassControlLevel, trebleControlLevel);
        }
      }
    }
  };

  const handleBandChange = async (index: number, value: number) => {
    const newBands = [...customBands];
    newBands[index] = Math.round(value);
    setCustomBands(newBands);
    await saveCustomEQBands(newBands);
    // Apply to native equalizer with gain staging
    NativeEffectsManager.applyFiveBandEQWithGainStaging(newBands, bassControlLevel, trebleControlLevel);
  };

  const handleResetBands = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const resetBands = [0, 0, 0, 0, 0];
    setCustomBands(resetBands);
    await saveCustomEQBands(resetBands);
    NativeEffectsManager.applyFiveBandEQWithGainStaging(resetBands, bassControlLevel, trebleControlLevel);
  };

  const handleSavePreset = async () => {
    if (customPresets.length >= MAX_CUSTOM_PRESETS) {
      Alert.alert(
        "Limit Reached",
        "Maximum 5 custom presets allowed. Delete an existing preset to add a new one."
      );
      setShowSaveDialog(false);
      setNewPresetName("");
      return;
    }

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
    NativeEffectsManager.applyFiveBandEQWithGainStaging(preset.bands, bassControlLevel, trebleControlLevel);
  };

  const handleDeletePreset = async (preset: CustomEQPreset) => {
    Alert.alert(
      "Delete Preset",
      `Are you sure you want to delete "${preset.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedPresets = customPresets.filter(p => p.id !== preset.id);
            setCustomPresets(updatedPresets);
            await saveCustomEQPresets(updatedPresets);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  const handleEditPreset = (preset: CustomEQPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingPreset(preset);
    setEditPresetName(preset.name);
    setCustomBands(preset.bands);
    NativeEffectsManager.applyFiveBandEQWithGainStaging(preset.bands, bassControlLevel, trebleControlLevel);
    setShowEditDialog(true);
  };

  const handleUpdatePreset = async () => {
    if (!editingPreset) return;
    
    if (!editPresetName.trim()) {
      Alert.alert("Error", "Please enter a preset name");
      return;
    }
    
    const updatedPresets = customPresets.map(p => 
      p.id === editingPreset.id 
        ? { ...p, name: editPresetName.trim(), bands: [...customBands] }
        : p
    );
    
    setCustomPresets(updatedPresets);
    await saveCustomEQPresets(updatedPresets);
    await saveCustomEQBands(customBands);
    setEditingPreset(null);
    setEditPresetName("");
    setShowEditDialog(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Bass Control - uses gain-staged approach to prevent distortion
  const handleBassControlChange = async (value: number) => {
    if (soundLabMode !== "equalizer") return;
    
    const newLevel = Math.round(value);
    setBassControlLevel(newLevel);
    await saveBassControlLevel(newLevel);
    
    // Apply bass control through NativeEffectsManager for proper gain staging
    NativeEffectsManager.applyBassControl(newLevel);
    
    // Re-apply EQ with updated gain staging to compensate for bass boost
    const currentBands = isCustomEQ ? customBands : (EQ_PRESETS.find(p => p.name === selectedEQ)?.bands || [0,0,0,0,0]);
    NativeEffectsManager.applyFiveBandEQWithGainStaging(currentBands, newLevel, trebleControlLevel);
  };

  // Treble Control - uses gain-staged approach to prevent distortion
  const handleTrebleControlChange = async (value: number) => {
    if (soundLabMode !== "equalizer") return;
    
    const newLevel = Math.round(value);
    setTrebleControlLevel(newLevel);
    await saveTrebleControlLevel(newLevel);
    
    // Apply treble control through NativeEffectsManager for proper gain staging
    NativeEffectsManager.applyTrebleControl(newLevel);
    
    // Re-apply EQ with updated gain staging to compensate for treble boost
    const currentBands = isCustomEQ ? customBands : (EQ_PRESETS.find(p => p.name === selectedEQ)?.bands || [0,0,0,0,0]);
    NativeEffectsManager.applyFiveBandEQWithGainStaging(currentBands, bassControlLevel, newLevel);
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

  const handleVirtualizerStrengthChange = async (displayValue: number) => {
    if (soundLabMode !== "equalizer") return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const internalStrength = displayValue * 100;
    setVirtualizerStrength(internalStrength);
    await saveVirtualizerStrength(internalStrength);
    
    if (VirtualizerModule.isAvailable() && virtualizerEnabled) {
      VirtualizerModule.setStrength(internalStrength);
    }
  };

  const handleImmersiveChange = async (modeId: ImmersiveMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!isLicensed && modeId !== 'off') {
      Alert.alert(
        "License Required",
        "A license is required to use Immersive Modes.",
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

        <View style={[styles.sectionCard, cardStyle]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="tune-vertical" size={18} color={tokens.colors.primary} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Equalizer Mode
            </FluentText>
            {isEqualizerActive ? (
              <View style={[styles.activeIndicator, { backgroundColor: tokens.colors.primary }]}>
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
                    minimumTrackTintColor={tokens.colors.primary}
                    maximumTrackTintColor={tokens.colors.outline}
                    thumbTintColor={tokens.colors.primary}
                  />
                  <FluentText variant="caption1" style={styles.bandValue}>
                    {customBands[index] > 0 ? `+${customBands[index]}` : customBands[index]}
                  </FluentText>
                </View>
              ))}
              
              <View style={styles.customEQButtons}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: tokens.colors.surfaceVariant, borderRadius: tokens.shapes.buttonBorderRadius }]}
                  onPress={handleResetBands}
                >
                  <MaterialCommunityIcons name="refresh" size={16} color={tokens.colors.text} />
                  <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs }}>Reset</FluentText>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: tokens.colors.primary, borderRadius: tokens.shapes.buttonBorderRadius }]}
                  onPress={() => setShowSaveDialog(true)}
                >
                  <MaterialCommunityIcons name="content-save" size={16} color={tokens.colors.onPrimary} />
                  <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs, color: tokens.colors.onPrimary }}>Save Preset</FluentText>
                </Pressable>
              </View>

              {customPresets.length > 0 ? (
                <View style={styles.savedPresetsSection}>
                  <FluentText variant="body2" color="secondary" style={{ marginBottom: FluentSpacing.s }}>
                    My Presets ({customPresets.length}/{MAX_CUSTOM_PRESETS})
                  </FluentText>
                  {customPresets.map((preset) => (
                    <View key={preset.id} style={[styles.savedPresetRow, { backgroundColor: tokens.colors.surfaceVariant, borderRadius: tokens.shapes.cardBorderRadius }]}>
                      <Pressable style={styles.savedPresetInfo} onPress={() => handleLoadPreset(preset)}>
                        <FluentText variant="body2">{preset.name}</FluentText>
                        <FluentText variant="caption1" color="secondary">
                          {preset.bands.map(b => b > 0 ? `+${b}` : b).join(", ")}
                        </FluentText>
                      </Pressable>
                      <View style={styles.presetActions}>
                        <Pressable onPress={() => handleEditPreset(preset)} style={styles.actionIconButton}>
                          <MaterialCommunityIcons name="pencil-outline" size={18} color={tokens.colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => handleDeletePreset(preset)} style={styles.actionIconButton}>
                          <MaterialCommunityIcons name="delete-outline" size={18} color={tokens.colors.error} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </GlassCard>
          ) : null}
        </View>

        {isEqualizerActive ? (
          <View style={[styles.sectionCard, cardStyle]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="speaker" size={18} color={tokens.colors.primary} />
              <FluentText variant="subtitle1" style={styles.sectionTitle}>
                Audio Enhancements
              </FluentText>
            </View>
            <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.m }}>
              Fine-tune bass, treble, and spatial audio effects
            </FluentText>
            
            <View style={styles.enhancementsContainer}>
              <View style={styles.enhancementItem}>
                <View style={styles.enhancementHeader}>
                  <View style={[styles.enhancementIconContainer, { backgroundColor: bassControlLevel !== 0 ? tokens.colors.primary + "20" : tokens.colors.surfaceVariant }]}>
                    <MaterialCommunityIcons
                      name="speaker"
                      size={22}
                      color={bassControlLevel !== 0 ? tokens.colors.primary : tokens.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.enhancementText}>
                    <FluentText variant="body1Strong">Bass Control</FluentText>
                    <FluentText variant="caption1" color="secondary">Adjust low frequencies</FluentText>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: bassControlLevel !== 0 ? tokens.colors.primary : tokens.colors.surfaceVariant }]}>
                    <FluentText
                      variant="body2"
                      style={{
                        color: bassControlLevel !== 0 ? tokens.colors.onPrimary : tokens.colors.textSecondary,
                        fontWeight: "700",
                      }}
                    >
                      {bassControlLevel > 0 ? `+${bassControlLevel}` : bassControlLevel}
                    </FluentText>
                  </View>
                </View>
                
                <View style={styles.sliderContainer}>
                  <FluentText variant="caption1" color="secondary" style={styles.sliderLabel}>-5</FluentText>
                  <Slider
                    style={styles.controlSlider}
                    minimumValue={-5}
                    maximumValue={5}
                    step={1}
                    value={bassControlLevel}
                    onValueChange={handleBassControlChange}
                    minimumTrackTintColor={tokens.colors.primary}
                    maximumTrackTintColor={tokens.colors.outline}
                    thumbTintColor={tokens.colors.primary}
                  />
                  <FluentText variant="caption1" color="secondary" style={styles.sliderLabel}>+5</FluentText>
                </View>
              </View>

              <View style={[styles.enhancementDivider, { backgroundColor: tokens.colors.outline }]} />

              <View style={styles.enhancementItem}>
                <View style={styles.enhancementHeader}>
                  <View style={[styles.enhancementIconContainer, { backgroundColor: trebleControlLevel !== 0 ? tokens.colors.primary + "20" : tokens.colors.surfaceVariant }]}>
                    <MaterialCommunityIcons
                      name="tune"
                      size={22}
                      color={trebleControlLevel !== 0 ? tokens.colors.primary : tokens.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.enhancementText}>
                    <FluentText variant="body1Strong">Treble Control</FluentText>
                    <FluentText variant="caption1" color="secondary">Adjust high frequencies</FluentText>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: trebleControlLevel !== 0 ? tokens.colors.primary : tokens.colors.surfaceVariant }]}>
                    <FluentText
                      variant="body2"
                      style={{
                        color: trebleControlLevel !== 0 ? tokens.colors.onPrimary : tokens.colors.textSecondary,
                        fontWeight: "700",
                      }}
                    >
                      {trebleControlLevel > 0 ? `+${trebleControlLevel}` : trebleControlLevel}
                    </FluentText>
                  </View>
                </View>
                
                <View style={styles.sliderContainer}>
                  <FluentText variant="caption1" color="secondary" style={styles.sliderLabel}>-5</FluentText>
                  <Slider
                    style={styles.controlSlider}
                    minimumValue={-5}
                    maximumValue={5}
                    step={1}
                    value={trebleControlLevel}
                    onValueChange={handleTrebleControlChange}
                    minimumTrackTintColor={tokens.colors.primary}
                    maximumTrackTintColor={tokens.colors.outline}
                    thumbTintColor={tokens.colors.primary}
                  />
                  <FluentText variant="caption1" color="secondary" style={styles.sliderLabel}>+5</FluentText>
                </View>
              </View>

              <View style={[styles.enhancementDivider, { backgroundColor: tokens.colors.outline }]} />

              <View style={styles.enhancementItem}>
                <Pressable onPress={handleVirtualizerToggle} style={styles.enhancementHeader}>
                  <View style={[styles.enhancementIconContainer, { backgroundColor: virtualizerEnabled ? tokens.colors.primary + "20" : tokens.colors.surfaceVariant }]}>
                    <MaterialCommunityIcons
                      name="surround-sound"
                      size={22}
                      color={virtualizerEnabled ? tokens.colors.primary : tokens.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.enhancementText}>
                    <FluentText variant="body1Strong">Virtualizer</FluentText>
                    <FluentText variant="caption1" color="secondary">Spatial audio effect</FluentText>
                  </View>
                  <View style={[
                    styles.toggleIndicator,
                    { backgroundColor: virtualizerEnabled ? tokens.colors.primary : tokens.colors.surfaceVariant }
                  ]}>
                    <FluentText variant="caption1" style={{ color: virtualizerEnabled ? tokens.colors.onPrimary : tokens.colors.textSecondary }}>
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
                      {VIRTUALIZER_STRENGTH_OPTIONS.map((displayValue) => (
                        <Pressable
                          key={displayValue}
                          style={[
                            styles.strengthChip,
                            {
                              backgroundColor: virtualizerStrength === displayValue * 100 
                                ? tokens.colors.primary 
                                : tokens.colors.surfaceVariant,
                              borderRadius: tokens.shapes.buttonBorderRadius,
                            }
                          ]}
                          onPress={() => handleVirtualizerStrengthChange(displayValue)}
                        >
                          <FluentText
                            variant="caption1"
                            style={{
                              color: virtualizerStrength === displayValue * 100 ? tokens.colors.onPrimary : tokens.colors.text,
                              fontWeight: "600"
                            }}
                          >
                            {displayValue}
                          </FluentText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.sectionCard, cardStyle]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="headphones" size={18} color={tokens.colors.primary} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Immersive Modes
            </FluentText>
            {!isLicensed ? (
              <View style={[styles.premiumBadge, { backgroundColor: tokens.colors.warning }]}>
                <MaterialCommunityIcons name="crown" size={12} color={tokens.colors.onPrimary} />
                <FluentText variant="caption1" style={{ color: tokens.colors.onPrimary, fontWeight: "600", marginLeft: 4 }}>License Required</FluentText>
              </View>
            ) : isImmersiveActive && selectedImmersive !== 'off' ? (
              <View style={[styles.activeIndicator, { backgroundColor: tokens.colors.primary }]}>
                <FluentText variant="caption1" color="onBrand" style={{ fontWeight: "600" }}>Active</FluentText>
              </View>
            ) : null}
          </View>
          
          <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.m }}>
            Premium audio processing for an immersive experience
          </FluentText>
          
          <View style={styles.modesContainer}>
            {immersiveModes.filter(mode => mode.id !== 'off').map((mode) => (
              <Pressable
                key={mode.id}
                onPress={() => handleImmersiveChange(mode.id)}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: isImmersiveActive && selectedImmersive === mode.id 
                      ? tokens.colors.primary 
                      : tokens.colors.surface,
                    borderRadius: tokens.shapes.cardBorderRadius,
                  },
                ]}
              >
                <View style={styles.modeCardContent}>
                  <MaterialCommunityIcons
                    name={getModeIcon(mode.icon)}
                    size={20}
                    color={isImmersiveActive && selectedImmersive === mode.id ? tokens.colors.onPrimary : tokens.colors.text}
                  />
                  <View style={styles.modeCardText}>
                    <FluentText
                      variant="body1"
                      style={{
                        fontWeight: "600",
                        color: isImmersiveActive && selectedImmersive === mode.id ? tokens.colors.onPrimary : tokens.colors.text,
                      }}
                    >
                      {mode.name}
                    </FluentText>
                    <FluentText
                      variant="caption1"
                      style={{
                        color: isImmersiveActive && selectedImmersive === mode.id 
                          ? "rgba(255,255,255,0.8)" 
                          : tokens.colors.textSecondary,
                      }}
                    >
                      {mode.description}
                    </FluentText>
                  </View>
                  {isImmersiveActive && selectedImmersive === mode.id ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color={tokens.colors.onPrimary} />
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <GlassCard style={styles.infoCard}>
          <View style={styles.infoContent}>
            <MaterialCommunityIcons name="information-outline" size={18} color={tokens.colors.primary} />
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
          <View style={[styles.modalContent, { backgroundColor: tokens.colors.backgroundDefault, borderRadius: tokens.shapes.cardBorderRadius }]}>
            <FluentText variant="subtitle1" style={{ marginBottom: FluentSpacing.m }}>
              Save Custom Preset
            </FluentText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: tokens.colors.surfaceVariant,
                  color: tokens.colors.text,
                  borderColor: tokens.colors.outline,
                  borderRadius: tokens.shapes.buttonBorderRadius,
                }
              ]}
              placeholder="Preset name"
              placeholderTextColor={tokens.colors.textSecondary}
              value={newPresetName}
              onChangeText={setNewPresetName}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.surfaceVariant, borderRadius: tokens.shapes.buttonBorderRadius }]}
                onPress={() => {
                  setShowSaveDialog(false);
                  setNewPresetName("");
                }}
              >
                <FluentText variant="body2">Cancel</FluentText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.primary, borderRadius: tokens.shapes.buttonBorderRadius }]}
                onPress={handleSavePreset}
              >
                <FluentText variant="body2" style={{ color: tokens.colors.onPrimary }}>Save</FluentText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowEditDialog(false);
          setEditingPreset(null);
          setEditPresetName("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tokens.colors.backgroundDefault, borderRadius: tokens.shapes.cardBorderRadius }]}>
            <FluentText variant="subtitle1" style={{ marginBottom: FluentSpacing.m }}>
              Edit Preset
            </FluentText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: tokens.colors.surfaceVariant,
                  color: tokens.colors.text,
                  borderColor: tokens.colors.outline,
                  borderRadius: tokens.shapes.buttonBorderRadius,
                  marginBottom: FluentSpacing.m,
                }
              ]}
              placeholder="Preset name"
              placeholderTextColor={tokens.colors.textSecondary}
              value={editPresetName}
              onChangeText={setEditPresetName}
            />
            <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.s }}>
              Adjust EQ bands and save changes
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
                  minimumTrackTintColor={tokens.colors.primary}
                  maximumTrackTintColor={tokens.colors.outline}
                  thumbTintColor={tokens.colors.primary}
                />
                <FluentText variant="caption1" style={styles.bandValue}>
                  {customBands[index] > 0 ? `+${customBands[index]}` : customBands[index]}
                </FluentText>
              </View>
            ))}
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.surfaceVariant, borderRadius: tokens.shapes.buttonBorderRadius }]}
                onPress={() => {
                  setShowEditDialog(false);
                  setEditingPreset(null);
                  setEditPresetName("");
                }}
              >
                <FluentText variant="body2">Cancel</FluentText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.primary, borderRadius: tokens.shapes.buttonBorderRadius }]}
                onPress={handleUpdatePreset}
              >
                <FluentText variant="body2" style={{ color: tokens.colors.onPrimary }}>Save Changes</FluentText>
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
    marginBottom: FluentSpacing.xs,
  },
  savedPresetInfo: {
    flex: 1,
  },
  presetActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.xs,
  },
  actionIconButton: {
    padding: FluentSpacing.xs,
  },
  enhancementsContainer: {
    gap: 0,
  },
  enhancementItem: {
    paddingVertical: FluentSpacing.m,
  },
  enhancementDivider: {
    height: 1,
    opacity: 0.3,
  },
  enhancementSection: {
    padding: FluentSpacing.l,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.15)",
  },
  enhancementHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  enhancementText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  enhancementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  levelBadge: {
    minWidth: 40,
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderLabel: {
    width: 24,
    textAlign: "center",
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
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: FluentSpacing.m,
    paddingTop: FluentSpacing.m,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
    gap: FluentSpacing.s,
  },
  controlSlider: {
    flex: 1,
    height: 40,
  },
  modesContainer: {
    gap: FluentSpacing.s,
  },
  modeCard: {
    padding: FluentSpacing.m,
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
  },
  textInput: {
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.m,
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
  },
});
