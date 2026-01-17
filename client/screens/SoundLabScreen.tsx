import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, TextInput, Modal, Platform } from "react-native";
import { CrossPlatformSlider } from "@/components/CrossPlatformSlider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText, FluentButton } from "@/components/fluent";
import { EffectChip } from "@/components/EffectChip";
import { useThemeContext, useThemeTokens } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/contexts/ToastContext";
import { getCardEffectStyle } from "@/lib/themeUtils";
import { FluentSpacing, FluentRadius } from "@/constants/fluent2";
import { Layout } from "@/constants/theme";
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
  'off', 'music', '360_reality', 'gaming', 'podcast', 'movie'
];

export default function SoundLabScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const tokens = useThemeTokens();
  const { isLicensed } = useSubscription();
  const { showSuccess, showError, showWarning } = useToast();
  
  const cardStyle = getCardEffectStyle(tokens);
  
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

  const applyAudioEffects = useCallback((bass: number, treble: number, virtualizer: number) => {
    if (Platform.OS === 'web') {
      console.log(`[Web Simulation] Applying effects - Bass: ${bass}, Treble: ${treble}, Virtualizer: ${virtualizer}`);
      return;
    }
    
    // Bass - use BassBoostModule
    if (BassBoostModule.isAvailable()) {
      try {
        if (bass === 0) {
          BassBoostModule.setEnabled(false);
        } else {
          BassBoostModule.setEnabled(true);
          BassBoostModule.setStrength(Math.abs(bass) * 333);
        }
      } catch (error) {
        console.warn('[SoundLab] BassBoostModule error:', error);
      }
    }
    
    // Virtualizer
    if (VirtualizerModule.isAvailable()) {
      try {
        if (virtualizer === 0) {
          VirtualizerModule.setEnabled(false);
        } else {
          VirtualizerModule.setEnabled(true);
          VirtualizerModule.setStrength(Math.abs(virtualizer) * 333);
        }
      } catch (error) {
        console.warn('[SoundLab] VirtualizerModule error:', error);
      }
    }
    
    // Treble - log for now, EQ-based in future
    console.log(`[SoundLab] Treble effect level: ${treble}`);
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
      setTrebleControl(trebleLvl);
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
        // Apply the preset's EQ bands and load bass/treble/virtualizer values
        const presetData = EQ_PRESETS.find(p => p.name === preset);
        if (presetData) {
          NativeEffectsManager.applyFiveBandEQ(presetData.bands);
          // Load bass/treble/virtualizer values from preset into state
          const newBass = presetData.bassControl ?? 0;
          const newTreble = presetData.trebleControl ?? 0;
          const newVirt = presetData.virtualizer ?? 0;
          setBassControl(newBass);
          setTrebleControl(newTreble);
          setVirtualizerLevel(newVirt);
          // Persist to storage
          await Promise.all([
            saveBassControlLevel(newBass),
            saveTrebleControlLevel(newTreble),
            saveVirtualizerLevel(newVirt)
          ]);
          // Apply effects to native audio
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

  const handleBassControlChange = async (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBassControl(level);
    await saveBassControlLevel(level);
    
    if (Platform.OS === 'web') {
      console.log(`[Web Simulation] Bass Control set to level ${level}`);
    } else if (BassBoostModule.isAvailable()) {
      try {
        if (level === 0) {
          BassBoostModule.setEnabled(false);
          console.log('[SoundLab] Bass boost disabled');
        } else {
          BassBoostModule.setEnabled(true);
          const strength = Math.abs(level) * 333;
          BassBoostModule.setStrength(strength);
          console.log('[SoundLab] Bass boost enabled with strength:', strength);
        }
      } catch (error) {
        console.warn('[SoundLab] BassBoostModule error:', error);
      }
    }
  };

  const handleTrebleControlChange = async (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTrebleControl(level);
    await saveTrebleControlLevel(level);
    
    if (Platform.OS === 'web') {
      console.log(`[Web Simulation] Treble Control set to level ${level}`);
    } else {
      // TODO: Implement treble control using EQ high-frequency bands
      // For now, we can boost/cut the high-frequency EQ bands (3.6kHz and 14kHz)
      // This would require modifying the EQ bands directly
      console.log('[SoundLab] Treble control set to level:', level, '(EQ-based implementation pending)');
    }
  };

  const handleVirtualizerLevelChange = async (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVirtualizerLevel(level);
    await saveVirtualizerLevel(level);
    
    if (Platform.OS === 'web') {
      console.log(`[Web Simulation] Virtualizer set to level ${level}`);
    } else if (VirtualizerModule.isAvailable()) {
      try {
        if (level === 0) {
          VirtualizerModule.setEnabled(false);
          console.log('[SoundLab] Virtualizer disabled');
        } else {
          VirtualizerModule.setEnabled(true);
          const strength = Math.abs(level) * 333;
          VirtualizerModule.setStrength(strength);
          console.log('[SoundLab] Virtualizer enabled with strength:', strength);
        }
      } catch (error) {
        console.warn('[SoundLab] VirtualizerModule error:', error);
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
    setTrebleControl(newTreble);
    setVirtualizerLevel(newVirt);
    await Promise.all([
      saveBassControlLevel(newBass),
      saveTrebleControlLevel(newTreble),
      saveVirtualizerLevel(newVirt)
    ]);
    // Apply effects to native audio
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
    setBassControl(preset.bassControl ?? 0);
    setTrebleControl(preset.trebleControl ?? 0);
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
      'tune': 'tune',
    };
    return iconMap[iconName] || 'music';
  };

  const isEqualizerActive = soundLabMode === "equalizer";
  const isImmersiveActive = soundLabMode === "immersive";

  return (
    <FluentScreenLayout edges={[]} hasBottomNavigation={true} hideStatusBar>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + FluentSpacing.xl },
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
            <View style={styles.presetInfo}>
              <FluentText variant="body1Strong">{selectedEQ}</FluentText>
              <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                {EQ_PRESETS.find(p => p.name === selectedEQ)?.description}
              </FluentText>
            </View>
          ) : null}

          {isEqualizerActive ? (
            <View style={[styles.effectControlsSection, { backgroundColor: tokens.colors.surfaceVariant, borderRadius: FluentRadius.large }]}>
              <FluentText variant="body2Strong" style={{ marginBottom: FluentSpacing.s }}>Audio Effects</FluentText>
              
              <View style={styles.effectSliderRow}>
                <View style={styles.effectSliderHeader}>
                  <MaterialCommunityIcons name="speaker-wireless" size={18} color={tokens.colors.primary} />
                  <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs, flex: 1 }}>Bass</FluentText>
                  <FluentText variant="body2Strong" style={{ color: tokens.colors.primary, minWidth: 40, textAlign: 'right' }}>
                    {bassControl === 0 ? "Off" : bassControl > 0 ? `+${bassControl}` : `${bassControl}`}
                  </FluentText>
                </View>
                <View style={styles.effectSliderContainer}>
                  <FluentText variant="caption1" color="secondary">-3</FluentText>
                  <CrossPlatformSlider
                    style={styles.effectSlider}
                    minimumValue={-3}
                    maximumValue={3}
                    step={1}
                    value={bassControl}
                    onValueChange={(value) => handleBassControlChange(value)}
                    minimumTrackTintColor={tokens.colors.primary}
                    maximumTrackTintColor={tokens.colors.outline}
                    thumbTintColor={tokens.colors.primary}
                  />
                  <FluentText variant="caption1" color="secondary">+3</FluentText>
                </View>
              </View>

              <View style={styles.effectSliderRow}>
                <View style={styles.effectSliderHeader}>
                  <MaterialCommunityIcons name="tune-vertical" size={18} color={tokens.colors.primary} />
                  <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs, flex: 1 }}>Treble</FluentText>
                  <FluentText variant="body2Strong" style={{ color: tokens.colors.primary, minWidth: 40, textAlign: 'right' }}>
                    {trebleControl === 0 ? "Off" : trebleControl > 0 ? `+${trebleControl}` : `${trebleControl}`}
                  </FluentText>
                </View>
                <View style={styles.effectSliderContainer}>
                  <FluentText variant="caption1" color="secondary">-3</FluentText>
                  <CrossPlatformSlider
                    style={styles.effectSlider}
                    minimumValue={-3}
                    maximumValue={3}
                    step={1}
                    value={trebleControl}
                    onValueChange={(value) => handleTrebleControlChange(value)}
                    minimumTrackTintColor={tokens.colors.primary}
                    maximumTrackTintColor={tokens.colors.outline}
                    thumbTintColor={tokens.colors.primary}
                  />
                  <FluentText variant="caption1" color="secondary">+3</FluentText>
                </View>
              </View>

              <View style={styles.effectSliderRow}>
                <View style={styles.effectSliderHeader}>
                  <MaterialCommunityIcons name="surround-sound" size={18} color={tokens.colors.primary} />
                  <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs, flex: 1 }}>Virtualizer</FluentText>
                  <FluentText variant="body2Strong" style={{ color: tokens.colors.primary, minWidth: 40, textAlign: 'right' }}>
                    {virtualizerLevel === 0 ? "Off" : virtualizerLevel > 0 ? `+${virtualizerLevel}` : `${virtualizerLevel}`}
                  </FluentText>
                </View>
                <View style={styles.effectSliderContainer}>
                  <FluentText variant="caption1" color="secondary">-3</FluentText>
                  <CrossPlatformSlider
                    style={styles.effectSlider}
                    minimumValue={-3}
                    maximumValue={3}
                    step={1}
                    value={virtualizerLevel}
                    onValueChange={(value) => handleVirtualizerLevelChange(value)}
                    minimumTrackTintColor={tokens.colors.primary}
                    maximumTrackTintColor={tokens.colors.outline}
                    thumbTintColor={tokens.colors.primary}
                  />
                  <FluentText variant="caption1" color="secondary">+3</FluentText>
                </View>
              </View>
            </View>
          ) : null}

          {isEqualizerActive && isCustomEQ ? (
            <View style={styles.customEQContainer}>
              <FluentText variant="body1Strong" style={{ marginBottom: FluentSpacing.m }}>
                Custom Equalizer
              </FluentText>
              
              {CUSTOM_EQ_BAND_LABELS.map((label, index) => (
                <View key={label} style={styles.bandRow}>
                  <FluentText variant="caption1" style={styles.bandLabel}>{label}</FluentText>
                  <CrossPlatformSlider
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
            </View>
          ) : null}
        </View>

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

        <View style={[styles.sectionCard, cardStyle, styles.infoCard]}>
          <View style={styles.infoContent}>
            <MaterialCommunityIcons name="information-outline" size={18} color={tokens.colors.primary} />
            <View style={styles.infoText}>
              <FluentText variant="body1Strong">Sound Experience</FluentText>
              <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                Your audio settings are saved automatically and applied to all playback.
              </FluentText>
            </View>
          </View>
        </View>
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
                <CrossPlatformSlider
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

      <Modal
        visible={showDeleteDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tokens.colors.backgroundDefault, borderRadius: tokens.shapes.cardBorderRadius }]}>
            <MaterialCommunityIcons name="delete-alert" size={48} color={tokens.colors.error} style={{ alignSelf: "center", marginBottom: FluentSpacing.m }} />
            <FluentText variant="subtitle1" style={{ textAlign: "center", marginBottom: FluentSpacing.s }}>
              Delete Preset
            </FluentText>
            <FluentText variant="body2" color="secondary" style={{ textAlign: "center", marginBottom: FluentSpacing.l }}>
              Are you sure you want to delete "{presetToDelete?.name}"? This action cannot be undone.
            </FluentText>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.surfaceVariant, borderRadius: tokens.shapes.buttonBorderRadius }]}
                onPress={() => {
                  setShowDeleteDialog(false);
                  setPresetToDelete(null);
                }}
              >
                <FluentText variant="body2">Cancel</FluentText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: tokens.colors.error, borderRadius: tokens.shapes.buttonBorderRadius }]}
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
  effectControlsSection: {
    marginTop: FluentSpacing.m,
    padding: FluentSpacing.m,
    gap: FluentSpacing.s,
  },
  effectSliderRow: {
    gap: FluentSpacing.xs,
  },
  effectSliderHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  effectSliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.xs,
  },
  effectSlider: {
    flex: 1,
    height: 36,
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
