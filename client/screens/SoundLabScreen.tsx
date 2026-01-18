import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, TextInput, Modal, Platform } from "react-native";
import { CrossPlatformSlider } from "@/components/CrossPlatformSlider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText, FluentButton, FluentCard } from "@/components/fluent";
import { EffectChip } from "@/components/EffectChip";
import { useThemeContext, useThemeTokens } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/contexts/ToastContext";
import { useSoundLab } from "@/contexts/SoundLabContext";
import { FluentSpacing, FluentRadius, FluentControlRadius, FluentTypography, FluentIconSize, FluentControlHeight, FluentFontWeight, FluentSliderSize, FluentBorderWidth, FluentLayoutSize } from "@/constants/fluent2";
import { 
  getEQPreset, saveEQPreset, clearEQPreset, 
  getSoundMode, saveSoundMode, clearSoundMode,
  getCustomEQBands, saveCustomEQBands,
  getCustomEQPresets, saveCustomEQPresets,
  getBassControlLevel, saveBassControlLevel,
  getTrebleControlLevel, saveTrebleControlLevel,
  getVirtualizerLevel, saveVirtualizerLevel,
  CustomEQPreset
} from "@/lib/storage";
import { 
  ImmersiveModeEngineModule, 
  IMMERSIVE_MODE_INFO, 
  ImmersiveMode,
  ImmersiveModeInfo,
  BassBoostModule,
  VirtualizerModule
} from "../../modules/audio-effects";
import NativeAudioService from "@/services/NativeAudioService";
import { NativeEffectsManager } from "@/services/NativeEffectsManager";

type SoundLabMode = "equalizer" | "immersive" | "off";

const EQ_PRESETS = [
  { 
    name: "Flat", 
    description: "Natural, unprocessed sound",
    bands: [0, 0, 0, 0, 0],
    bassControl: 0,
    trebleControl: 0,
    virtualizer: 0
  },
  { 
    name: "Rock", 
    description: "Punchy bass, crisp guitars",
    bands: [3, 2, -1, 2, 3],
    bassControl: 0,
    trebleControl: 0,
    virtualizer: 0
  },
  { 
    name: "Pop", 
    description: "Bright vocals, balanced bass",
    bands: [2, 1, 2, 3, 2],
    bassControl: 0,
    trebleControl: 0,
    virtualizer: 0
  },
  { 
    name: "Jazz", 
    description: "Warm mids, smooth highs",
    bands: [2, 3, 1, -1, 0],
    bassControl: 0,
    trebleControl: 0,
    virtualizer: 0
  },
  { 
    name: "Classical", 
    description: "Wide dynamics, clear separation",
    bands: [1, 1, 0, 2, 3],
    bassControl: 0,
    trebleControl: 0,
    virtualizer: 0
  },
  { 
    name: "Electronic", 
    description: "Deep bass, sparkling highs",
    bands: [4, 3, -1, 2, 4],
    bassControl: 0,
    trebleControl: 0,
    virtualizer: 0
  },
  { 
    name: "Hip-Hop", 
    description: "Heavy sub-bass, clear vocals",
    bands: [5, 3, 1, 2, 1],
    bassControl: 0,
    trebleControl: 0,
    virtualizer: 0
  },
  { 
    name: "Acoustic", 
    description: "Natural warmth, presence",
    bands: [1, 2, 2, 1, 1],
    bassControl: 0,
    trebleControl: 0,
    virtualizer: 0
  },
];

const CUSTOM_EQ_BAND_LABELS = ["60Hz", "230Hz", "910Hz", "3.6kHz", "14kHz"];

const DISPLAY_IMMERSIVE_MODES: ImmersiveMode[] = [
  'off', 'music', '360_reality', 'gaming', 'podcast', 'movie', 'sports'
];

function SoundLabScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const tokens = useThemeTokens();
  const { isLicensed } = useSubscription();
  const { showSuccess, showError, showWarning } = useToast();
  const { setBassBoost, setTrebleBoost } = useSoundLab();
  
  const [soundLabMode, setSoundLabMode] = useState<SoundLabMode>("off");
  const [selectedEQ, setSelectedEQ] = useState("Flat");
  const [isCustomEQ, setIsCustomEQ] = useState(false);
  const [customBands, setCustomBands] = useState<number[]>([0, 0, 0, 0, 0]);
  const [customPresets, setCustomPresets] = useState<CustomEQPreset[]>([]);
  const [selectedImmersive, setSelectedImmersive] = useState<ImmersiveMode>("off");
  const [availableModes, setAvailableModes] = useState<ImmersiveModeInfo[]>([]);
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CustomEQPreset | null>(null);
  const [editPresetName, setEditPresetName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<CustomEQPreset | null>(null);
  
  const [bassControl, setBassControl] = useState(0);
  const [trebleControl, setTrebleControl] = useState(0);
  const [virtualizerLevel, setVirtualizerLevel] = useState(0);

  const MAX_CUSTOM_PRESETS = 5;

  const immersiveModes = useMemo(() => {
    return DISPLAY_IMMERSIVE_MODES.map(modeId => ({
      id: modeId,
      name: IMMERSIVE_MODE_INFO[modeId].name,
      description: IMMERSIVE_MODE_INFO[modeId].description,
      icon: IMMERSIVE_MODE_INFO[modeId].icon
    }));
  }, []);

  const applyAudioEffects = useCallback((bass: number, treble: number, virtualizer: number) => {
    if (Platform.OS === 'web') {
      return;
    }
    
    if (BassBoostModule.isAvailable()) {
      try {
        if (bass === 0) {
          BassBoostModule.setEnabled(false);
        } else {
          BassBoostModule.setEnabled(true);
          BassBoostModule.setStrength(Math.abs(bass) * 200);
        }
      } catch (error) {
      }
    }
    
    if (VirtualizerModule.isAvailable()) {
      try {
        if (virtualizer === 0) {
          VirtualizerModule.setEnabled(false);
        } else {
          VirtualizerModule.setEnabled(true);
          VirtualizerModule.setStrength(Math.abs(virtualizer) * 200);
        }
      } catch (error) {
      }
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const modes = ImmersiveModeEngineModule.getAvailableModes();
      setAvailableModes(modes);

      const [eqPreset, soundMode, bands, presets, bassLvl, trebleLvl, virtLvl] = await Promise.all([
        getEQPreset(),
        getSoundMode(),
        getCustomEQBands(),
        getCustomEQPresets(),
        getBassControlLevel(),
        getTrebleControlLevel(),
        getVirtualizerLevel()
      ]);
      
      setCustomBands(bands);
      setCustomPresets(presets);
      setBassControl(bassLvl);
      setBassBoost(bassLvl);
      setTrebleControl(trebleLvl);
      setTrebleBoost(trebleLvl);
      setVirtualizerLevel(virtLvl);
      
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

  const handleEQChange = async (preset: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (preset === "Custom") {
      if (isCustomEQ && soundLabMode === "equalizer") {
        setSoundLabMode("off");
        setIsCustomEQ(false);
        await clearEQPreset();
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
        await NativeAudioService.setImmersiveMode('off');
        NativeEffectsManager.disableEQ();
      } else {
        setSelectedEQ(preset);
        setIsCustomEQ(false);
        setSoundLabMode("equalizer");
        await clearSoundMode();
        await saveEQPreset(preset);
        await NativeAudioService.setImmersiveMode('off');
        const presetData = EQ_PRESETS.find(p => p.name === preset);
        if (presetData) {
          NativeEffectsManager.applyFiveBandEQ(presetData.bands);
          const newBass = presetData.bassControl ?? 0;
          const newTreble = presetData.trebleControl ?? 0;
          const newVirt = presetData.virtualizer ?? 0;
          setBassControl(newBass);
          setBassBoost(newBass);
          setTrebleControl(newTreble);
          setTrebleBoost(newTreble);
          setVirtualizerLevel(newVirt);
          await Promise.all([
            saveBassControlLevel(newBass),
            saveTrebleControlLevel(newTreble),
            saveVirtualizerLevel(newVirt)
          ]);
          applyAudioEffects(newBass, newTreble, newVirt);
        }
      }
    }
  };

  const handleBandChange = async (index: number, value: number) => {
    const newBands = [...customBands];
    newBands[index] = Math.round(value);
    setCustomBands(newBands);
    await saveCustomEQBands(newBands);
    NativeEffectsManager.applyFiveBandEQ(newBands);
  };

  const handleResetBands = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const resetBands = [0, 0, 0, 0, 0];
    setCustomBands(resetBands);
    await saveCustomEQBands(resetBands);
    NativeEffectsManager.applyFiveBandEQ(resetBands);
  };

  const handleBassControlChange = async (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBassControl(level);
    setBassBoost(level);
    await saveBassControlLevel(level);
    
    if (Platform.OS !== 'web' && BassBoostModule.isAvailable()) {
      try {
        if (level === 0) {
          BassBoostModule.setEnabled(false);
        } else {
          BassBoostModule.setEnabled(true);
          const strength = Math.abs(level) * 200;
          BassBoostModule.setStrength(strength);
        }
      } catch (error) {
      }
    }
  };

  const handleTrebleControlChange = async (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTrebleControl(level);
    setTrebleBoost(level);
    await saveTrebleControlLevel(level);
  };

  const handleVirtualizerLevelChange = async (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVirtualizerLevel(level);
    await saveVirtualizerLevel(level);
    
    if (Platform.OS !== 'web' && VirtualizerModule.isAvailable()) {
      try {
        if (level === 0) {
          VirtualizerModule.setEnabled(false);
        } else {
          VirtualizerModule.setEnabled(true);
          const strength = Math.abs(level) * 200;
          VirtualizerModule.setStrength(strength);
        }
      } catch (error) {
      }
    }
  };

  const handleSavePreset = async () => {
    if (customPresets.length >= MAX_CUSTOM_PRESETS) {
      showWarning("Maximum 5 custom presets allowed. Delete one first.");
      setShowSaveDialog(false);
      setNewPresetName("");
      return;
    }

    if (!newPresetName.trim()) {
      showError("Please enter a preset name");
      return;
    }
    
    const newPreset: CustomEQPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      bands: [...customBands],
      bassControl,
      trebleControl,
      virtualizer: virtualizerLevel
    };
    
    const updatedPresets = [...customPresets, newPreset];
    setCustomPresets(updatedPresets);
    await saveCustomEQPresets(updatedPresets);
    setNewPresetName("");
    setShowSaveDialog(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showSuccess(`Preset "${newPresetName.trim()}" saved!`);
  };

  const handleLoadPreset = async (preset: CustomEQPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomBands(preset.bands);
    await saveCustomEQBands(preset.bands);
    NativeEffectsManager.applyFiveBandEQ(preset.bands);
    
    const newBass = preset.bassControl ?? 0;
    const newTreble = preset.trebleControl ?? 0;
    const newVirt = preset.virtualizer ?? 0;
    setBassControl(newBass);
    setBassBoost(newBass);
    setTrebleControl(newTreble);
    setTrebleBoost(newTreble);
    setVirtualizerLevel(newVirt);
    await Promise.all([
      saveBassControlLevel(newBass),
      saveTrebleControlLevel(newTreble),
      saveVirtualizerLevel(newVirt)
    ]);
    applyAudioEffects(newBass, newTreble, newVirt);
  };

  const handleDeletePreset = (preset: CustomEQPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPresetToDelete(preset);
    setShowDeleteDialog(true);
  };

  const confirmDeletePreset = async () => {
    if (!presetToDelete) return;
    const updatedPresets = customPresets.filter(p => p.id !== presetToDelete.id);
    setCustomPresets(updatedPresets);
    await saveCustomEQPresets(updatedPresets);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showSuccess(`Preset "${presetToDelete.name}" deleted`);
    setShowDeleteDialog(false);
    setPresetToDelete(null);
  };

  const handleEditPreset = (preset: CustomEQPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingPreset(preset);
    setEditPresetName(preset.name);
    setCustomBands(preset.bands);
    const presetBass = preset.bassControl ?? 0;
    const presetTreble = preset.trebleControl ?? 0;
    setBassControl(presetBass);
    setBassBoost(presetBass);
    setTrebleControl(presetTreble);
    setTrebleBoost(presetTreble);
    setVirtualizerLevel(preset.virtualizer ?? 0);
    NativeEffectsManager.applyFiveBandEQ(preset.bands);
    setShowEditDialog(true);
  };

  const handleUpdatePreset = async () => {
    if (!editingPreset) return;
    
    if (!editPresetName.trim()) {
      showError("Please enter a preset name");
      return;
    }
    
    const updatedPresets = customPresets.map(p => 
      p.id === editingPreset.id 
        ? { ...p, name: editPresetName.trim(), bands: [...customBands], bassControl, trebleControl, virtualizer: virtualizerLevel }
        : p
    );
    
    setCustomPresets(updatedPresets);
    await saveCustomEQPresets(updatedPresets);
    await saveCustomEQBands(customBands);
    setEditingPreset(null);
    setEditPresetName("");
    setShowEditDialog(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showSuccess(`Preset "${editPresetName.trim()}" updated!`);
  };

  const handleImmersiveChange = async (modeId: ImmersiveMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!isLicensed && modeId !== 'off') {
      showWarning("A license is required to use Immersive Modes.");
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
        NativeEffectsManager.disableEQ();
      } else {
        showError(result.error || "Failed to set immersive mode. Please ensure audio is playing.");
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
      'stadium': 'stadium',
      'tune': 'tune',
    };
    return iconMap[iconName] || 'music';
  };

  const isEqualizerActive = soundLabMode === "equalizer";
  const isImmersiveActive = soundLabMode === "immersive";

  const formatValue = (value: number) => {
    if (value === 0) return "0";
    return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  };

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + FluentSpacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <FluentText variant="caption1" color="secondary" style={styles.screenHint}>
          Tap a preset to apply, tap again to turn off. Only one mode can be active at a time.
        </FluentText>

        <View style={styles.section}>
          <FluentText variant="caption1" color="secondary" style={styles.sectionLabel}>
            EQ PRESETS
          </FluentText>
          <FluentCard elevation="subtle" noPadding style={styles.sectionCard}>
            <View style={styles.cardInnerPadding}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScrollContent}
              >
                {EQ_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.name}
                    onPress={() => handleEQChange(preset.name)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isEqualizerActive && selectedEQ === preset.name && !isCustomEQ 
                          ? tokens.colors.primary 
                          : tokens.colors.surfaceVariant,
                      }
                    ]}
                  >
                    <FluentText 
                      variant="body2" 
                      style={{ 
                        color: isEqualizerActive && selectedEQ === preset.name && !isCustomEQ 
                          ? tokens.colors.onPrimary 
                          : tokens.colors.text 
                      }}
                    >
                      {preset.name}
                    </FluentText>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => handleEQChange("Custom")}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isEqualizerActive && isCustomEQ 
                        ? tokens.colors.primary 
                        : tokens.colors.surfaceVariant,
                    }
                  ]}
                >
                  <FluentText 
                    variant="body2" 
                    style={{ 
                      color: isEqualizerActive && isCustomEQ 
                        ? tokens.colors.onPrimary 
                        : tokens.colors.text 
                    }}
                  >
                    Custom
                  </FluentText>
                </Pressable>
              </ScrollView>

              {isEqualizerActive && selectedEQ && !isCustomEQ && (
                <View style={styles.presetInfo}>
                  <FluentText variant="body1Strong">{selectedEQ}</FluentText>
                  <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                    {EQ_PRESETS.find(p => p.name === selectedEQ)?.description}
                  </FluentText>
                </View>
              )}
            </View>
          </FluentCard>
        </View>

        {isEqualizerActive && (
          <View style={styles.section}>
            <FluentText variant="caption1" color="secondary" style={styles.sectionLabel}>
              BASS & TREBLE
            </FluentText>
            <FluentCard elevation="subtle" noPadding style={styles.sectionCard}>
              <View style={styles.cardInnerPadding}>
                <View style={styles.symmetricSliderRow}>
                  <View style={styles.symmetricSliderColumn}>
                    <FluentText variant="body2" style={styles.sliderLabel}>Bass</FluentText>
                    <View style={styles.sliderWithIcons}>
                      <FluentText variant="caption1" color="secondary">-5</FluentText>
                      <CrossPlatformSlider
                        style={styles.symmetricSlider}
                        minimumValue={-5}
                        maximumValue={5}
                        step={0.1}
                        value={bassControl}
                        onValueChange={(value) => handleBassControlChange(Math.round(value * 10) / 10)}
                        minimumTrackTintColor={tokens.colors.primary}
                        maximumTrackTintColor={tokens.colors.outline}
                        thumbTintColor={tokens.colors.primary}
                      />
                      <FluentText variant="caption1" color="secondary">+5</FluentText>
                    </View>
                    <FluentText variant="caption1" color="secondary" style={styles.sliderValue}>
                      Value: {formatValue(bassControl)}
                    </FluentText>
                  </View>

                  <View style={styles.symmetricSliderColumn}>
                    <FluentText variant="body2" style={styles.sliderLabel}>Treble</FluentText>
                    <View style={styles.sliderWithIcons}>
                      <FluentText variant="caption1" color="secondary">-5</FluentText>
                      <CrossPlatformSlider
                        style={styles.symmetricSlider}
                        minimumValue={-5}
                        maximumValue={5}
                        step={0.1}
                        value={trebleControl}
                        onValueChange={(value) => handleTrebleControlChange(Math.round(value * 10) / 10)}
                        minimumTrackTintColor={tokens.colors.primary}
                        maximumTrackTintColor={tokens.colors.outline}
                        thumbTintColor={tokens.colors.primary}
                      />
                      <FluentText variant="caption1" color="secondary">+5</FluentText>
                    </View>
                    <FluentText variant="caption1" color="secondary" style={styles.sliderValue}>
                      Value: {formatValue(trebleControl)}
                    </FluentText>
                  </View>
                </View>

                <View style={styles.virtualizerSection}>
                  <FluentText variant="body2" style={styles.sliderLabel}>Virtualizer</FluentText>
                  <View style={styles.sliderWithIcons}>
                    <FluentText variant="caption1" color="secondary">-5</FluentText>
                    <CrossPlatformSlider
                      style={styles.virtualizerSlider}
                      minimumValue={-5}
                      maximumValue={5}
                      step={0.1}
                      value={virtualizerLevel}
                      onValueChange={(value) => handleVirtualizerLevelChange(Math.round(value * 10) / 10)}
                      minimumTrackTintColor={tokens.colors.primary}
                      maximumTrackTintColor={tokens.colors.outline}
                      thumbTintColor={tokens.colors.primary}
                    />
                    <FluentText variant="caption1" color="secondary">+5</FluentText>
                  </View>
                  <FluentText variant="caption1" color="secondary" style={styles.sliderValue}>
                    Value: {formatValue(virtualizerLevel)}
                  </FluentText>
                </View>
              </View>
            </FluentCard>
          </View>
        )}

        {isEqualizerActive && isCustomEQ && (
          <View style={styles.section}>
            <FluentText variant="caption1" color="secondary" style={styles.sectionLabel}>
              CUSTOM EQ EDITOR
            </FluentText>
            <FluentCard elevation="subtle" noPadding style={styles.sectionCard}>
              <View style={styles.cardInnerPadding}>
                <View style={styles.customEQBands}>
                  {CUSTOM_EQ_BAND_LABELS.map((label, index) => (
                    <View key={label} style={styles.customEQBand}>
                      <FluentText variant="caption1" style={styles.bandDbValue}>
                        {customBands[index] > 0 ? `+${customBands[index]}` : customBands[index]}dB
                      </FluentText>
                      <View style={styles.verticalSliderContainer}>
                        <CrossPlatformSlider
                          style={styles.verticalSlider}
                          minimumValue={-8}
                          maximumValue={8}
                          step={1}
                          value={customBands[index]}
                          onValueChange={(value) => handleBandChange(index, value)}
                          minimumTrackTintColor={tokens.colors.primary}
                          maximumTrackTintColor={tokens.colors.outline}
                          thumbTintColor={tokens.colors.primary}
                        />
                      </View>
                      <FluentText variant="caption1" color="secondary" style={styles.bandFreqLabel}>
                        {label}
                      </FluentText>
                    </View>
                  ))}
                </View>
                
                <View style={styles.customEQButtons}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: tokens.colors.surfaceVariant }]}
                    onPress={handleResetBands}
                  >
                    <MaterialCommunityIcons name="refresh" size={16} color={tokens.colors.text} />
                    <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs }}>Reset</FluentText>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: tokens.colors.primary }]}
                    onPress={() => setShowSaveDialog(true)}
                  >
                    <MaterialCommunityIcons name="content-save" size={16} color={tokens.colors.onPrimary} />
                    <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs, color: tokens.colors.onPrimary }}>Save Preset</FluentText>
                  </Pressable>
                </View>

                {customPresets.length > 0 && (
                  <View style={styles.savedPresetsSection}>
                    <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.s }}>
                      My Presets ({customPresets.length}/{MAX_CUSTOM_PRESETS})
                    </FluentText>
                    {customPresets.map((preset) => (
                      <View key={preset.id} style={[styles.savedPresetRow, { backgroundColor: tokens.colors.surfaceVariant }]}>
                        <Pressable style={styles.savedPresetInfo} onPress={() => handleLoadPreset(preset)}>
                          <FluentText variant="body2">{preset.name}</FluentText>
                          <FluentText variant="caption1" color="secondary">
                            {preset.bands.map(b => b > 0 ? `+${b}` : b).join(", ")}
                          </FluentText>
                        </Pressable>
                        <View style={styles.presetActions}>
                          <Pressable onPress={() => handleEditPreset(preset)} style={styles.actionIconButton}>
                            <MaterialCommunityIcons name="pencil-outline" size={FluentIconSize.regular} color={tokens.colors.primary} />
                          </Pressable>
                          <Pressable onPress={() => handleDeletePreset(preset)} style={styles.actionIconButton}>
                            <MaterialCommunityIcons name="delete-outline" size={FluentIconSize.regular} color={tokens.colors.error} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </FluentCard>
          </View>
        )}

        <View style={styles.section}>
          <FluentText variant="caption1" color="secondary" style={styles.sectionLabel}>
            IMMERSIVE MODES
          </FluentText>
          <FluentCard elevation="subtle" noPadding style={styles.sectionCard}>
            <View style={styles.cardInnerPadding}>
              {!isLicensed && (
                <View style={[styles.licenseBadge, { backgroundColor: tokens.colors.warning + '20' }]}>
                  <MaterialCommunityIcons name="crown" size={16} color={tokens.colors.warning} />
                  <FluentText variant="caption1" style={{ color: tokens.colors.warning, marginLeft: FluentSpacing.xs }}>
                    License Required
                  </FluentText>
                </View>
              )}
              
              <View style={styles.modesGrid}>
                {immersiveModes.filter(mode => mode.id !== 'off').map((mode) => {
                  const isSelected = isImmersiveActive && selectedImmersive === mode.id;
                  return (
                    <Pressable
                      key={mode.id}
                      onPress={() => handleImmersiveChange(mode.id)}
                      style={[
                        styles.modeCard,
                        {
                          backgroundColor: isSelected 
                            ? tokens.colors.primary + '15'
                            : tokens.colors.surfaceVariant,
                          borderWidth: isSelected ? FluentBorderWidth.thick : 0,
                          borderColor: isSelected ? tokens.colors.primary : 'transparent',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={getModeIcon(mode.icon)}
                        size={FluentIconSize.medium}
                        color={isSelected ? tokens.colors.primary : tokens.colors.text}
                      />
                      <FluentText
                        variant="body2"
                        style={{
                          marginLeft: FluentSpacing.m,
                          color: isSelected ? tokens.colors.primary : tokens.colors.text,
                          flex: 1,
                        }}
                      >
                        {mode.name}
                      </FluentText>
                      {isSelected && (
                        <MaterialCommunityIcons name="check-circle" size={FluentIconSize.regular} color={tokens.colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </FluentCard>
        </View>

        <View style={styles.section}>
          <FluentCard elevation="subtle" noPadding style={styles.sectionCard}>
            <View style={[styles.cardInnerPadding, styles.infoContent]}>
              <MaterialCommunityIcons name="information-outline" size={FluentIconSize.regular} color={tokens.colors.primary} />
              <View style={styles.infoText}>
                <FluentText variant="body2Strong">Sound Experience</FluentText>
                <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                  Your audio settings are saved automatically and applied to all playback.
                </FluentText>
              </View>
            </View>
          </FluentCard>
        </View>
      </ScrollView>

      <Modal
        visible={showSaveDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSaveDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tokens.colors.backgroundDefault }]}>
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
                }
              ]}
              placeholder="Preset name"
              placeholderTextColor={tokens.colors.textSecondary}
              value={newPresetName}
              onChangeText={setNewPresetName}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.surfaceVariant }]}
                onPress={() => {
                  setShowSaveDialog(false);
                  setNewPresetName("");
                }}
              >
                <FluentText variant="body2">Cancel</FluentText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.primary }]}
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
          <View style={[styles.modalContent, { backgroundColor: tokens.colors.backgroundDefault }]}>
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
                <CrossPlatformSlider
                  style={styles.modalSlider}
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
                style={[styles.modalButton, { backgroundColor: tokens.colors.surfaceVariant }]}
                onPress={() => {
                  setShowEditDialog(false);
                  setEditingPreset(null);
                  setEditPresetName("");
                }}
              >
                <FluentText variant="body2">Cancel</FluentText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.primary }]}
                onPress={handleUpdatePreset}
              >
                <FluentText variant="body2" style={{ color: tokens.colors.onPrimary }}>Save Changes</FluentText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tokens.colors.backgroundDefault }]}>
            <MaterialCommunityIcons name="delete-alert" size={48} color={tokens.colors.error} style={{ alignSelf: "center", marginBottom: FluentSpacing.m }} />
            <FluentText variant="subtitle1" style={{ textAlign: "center", marginBottom: FluentSpacing.s }}>
              Delete Preset
            </FluentText>
            <FluentText variant="body2" color="secondary" style={{ textAlign: "center", marginBottom: FluentSpacing.l }}>
              Are you sure you want to delete "{presetToDelete?.name}"? This action cannot be undone.
            </FluentText>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.surfaceVariant }]}
                onPress={() => {
                  setShowDeleteDialog(false);
                  setPresetToDelete(null);
                }}
              >
                <FluentText variant="body2">Cancel</FluentText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.error }]}
                onPress={confirmDeletePreset}
              >
                <FluentText variant="body2" style={{ color: "#FFFFFF" }}>Delete</FluentText>
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
    paddingHorizontal: FluentSpacing.xl,
  },
  screenHint: {
    marginBottom: FluentSpacing.l,
  },
  section: {
    marginBottom: FluentSpacing.xxxl,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    marginBottom: FluentSpacing.s,
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: FluentRadius.xLarge,
  },
  cardInnerPadding: {
    padding: FluentSpacing.l,
  },
  chipsScrollContent: {
    gap: FluentSpacing.s,
    paddingRight: FluentSpacing.s,
  },
  chip: {
    height: FluentLayoutSize.chipHeight,
    paddingHorizontal: FluentSpacing.l,
    borderRadius: FluentRadius.circular,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetInfo: {
    marginTop: FluentSpacing.m,
    paddingTop: FluentSpacing.m,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  symmetricSliderRow: {
    flexDirection: 'row',
    gap: FluentSpacing.l,
  },
  symmetricSliderColumn: {
    flex: 1,
    alignItems: 'center',
  },
  sliderLabel: {
    textAlign: 'center',
    marginBottom: FluentSpacing.s,
  },
  sliderWithIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: FluentSpacing.xs,
  },
  symmetricSlider: {
    flex: 1,
    height: FluentSliderSize.thumbMedium,
  },
  sliderValue: {
    textAlign: 'center',
    marginTop: FluentSpacing.xs,
  },
  virtualizerSection: {
    marginTop: FluentSpacing.l,
    paddingTop: FluentSpacing.l,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
    alignItems: 'center',
  },
  virtualizerSlider: {
    flex: 1,
    height: FluentSliderSize.thumbMedium,
  },
  customEQBands: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: FluentSpacing.l,
  },
  customEQBand: {
    flex: 1,
    alignItems: 'center',
  },
  bandDbValue: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: FluentSpacing.xs,
  },
  verticalSliderContainer: {
    height: 120,
    justifyContent: 'center',
  },
  verticalSlider: {
    width: 120,
    height: FluentSliderSize.thumbMedium,
    transform: [{ rotate: '-90deg' }],
  },
  bandFreqLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: FluentSpacing.xs,
  },
  customEQButtons: {
    flexDirection: 'row',
    gap: FluentSpacing.s,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
  },
  savedPresetsSection: {
    marginTop: FluentSpacing.l,
    paddingTop: FluentSpacing.l,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  savedPresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    marginBottom: FluentSpacing.xs,
    borderRadius: FluentRadius.large,
  },
  savedPresetInfo: {
    flex: 1,
  },
  presetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.xs,
  },
  actionIconButton: {
    padding: FluentSpacing.xs,
  },
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentRadius.large,
    marginBottom: FluentSpacing.m,
    alignSelf: 'flex-start',
  },
  modesGrid: {
    gap: FluentSpacing.m,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentRadius.large,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: FluentSpacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: FluentSpacing.xl,
    borderRadius: FluentRadius.xLarge,
  },
  textInput: {
    height: FluentLayoutSize.inputFieldHeight,
    paddingHorizontal: FluentSpacing.m,
    borderWidth: FluentBorderWidth.thin,
    borderRadius: FluentControlRadius.input,
    marginBottom: FluentSpacing.m,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: FluentSpacing.s,
    marginTop: FluentSpacing.m,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FluentSpacing.s,
  },
  bandLabel: {
    width: 50,
  },
  modalSlider: {
    flex: 1,
    height: FluentControlHeight.medium,
  },
  bandValue: {
    width: 30,
    textAlign: 'right',
  },
});

export default SoundLabScreen;
