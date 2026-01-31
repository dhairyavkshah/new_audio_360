import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText, FluentModal } from "@/components/fluent";
import { CrossPlatformSlider } from "@/components/CrossPlatformSlider";
import { EQPresetCard, ImmersiveModeCard, SmartEnhancementCard } from "@/components/soundlab";
import { useThemeContext, useThemeTokens } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/contexts/ToastContext";
import { useSoundLab } from "@/contexts/SoundLabContext";
import { getCardEffectStyle } from "@/lib/themeUtils";
import { FluentSpacing, FluentRadius, FluentTypography, FluentIconSize, FluentSliderSize, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { Layout } from "@/constants/theme";
import { 
  getEQPreset, saveEQPreset, clearEQPreset, 
  getSoundMode, saveSoundMode, clearSoundMode,
  getCustomEQBands, saveCustomEQBands,
  getCustomEQPresets, saveCustomEQPresets,
  getBassControlLevel, saveBassControlLevel,
  getTrebleControlLevel, saveTrebleControlLevel,
  getSpatialEnhancement, saveSpatialEnhancement,
  getBassEnhancement, saveBassEnhancement,
  getHfRestorationEnabled, saveHfRestorationEnabled,
  getHfRestorationLevel, saveHfRestorationLevel,
  CustomEQPreset
} from "@/lib/storage";
import { 
  ImmersiveModeEngineModule, 
  IMMERSIVE_MODE_INFO, 
  ImmersiveMode,
  ImmersiveModeInfo,
  BassBoostModule,
  SpatialEnhancementModule,
  SmartEnhancementsModule
} from "../../modules/audio-effects";
import NativeAudioService from "@/services/NativeAudioService";
import { NativeEffectsManager } from "@/services/NativeEffectsManager";
import { WebAudioEffectsEngine } from "@/services/WebAudioEffectsEngine";

type SoundLabMode = "equalizer" | "immersive" | "off";

const EQ_PRESETS = [
  { 
    name: "Flat", 
    description: "Natural, unprocessed sound",
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bassControl: 0,
    trebleControl: 0
  },
  { 
    name: "Rock", 
    description: "Punchy bass, crisp guitars",
    bands: [3, 3, 2, 1, -1, 0, 2, 2, 3, 3],
    bassControl: 0,
    trebleControl: 0
  },
  { 
    name: "Pop", 
    description: "Bright vocals, balanced bass",
    bands: [2, 2, 1, 2, 2, 3, 3, 2, 2, 2],
    bassControl: 0,
    trebleControl: 0
  },
  { 
    name: "Jazz", 
    description: "Warm mids, smooth highs",
    bands: [2, 2, 3, 2, 1, 0, -1, -1, 0, 0],
    bassControl: 0,
    trebleControl: 0
  },
  { 
    name: "Classical", 
    description: "Wide dynamics, clear separation",
    bands: [1, 1, 1, 0, 0, 1, 2, 2, 3, 3],
    bassControl: 0,
    trebleControl: 0
  },
  { 
    name: "Electronic", 
    description: "Deep bass, sparkling highs",
    bands: [4, 4, 3, 1, -1, 0, 2, 3, 4, 4],
    bassControl: 0,
    trebleControl: 0
  },
  { 
    name: "Hip-Hop", 
    description: "Heavy sub-bass, clear vocals",
    bands: [5, 5, 3, 2, 1, 2, 2, 1, 1, 1],
    bassControl: 0,
    trebleControl: 0
  },
  { 
    name: "Acoustic", 
    description: "Natural warmth, presence",
    bands: [1, 1, 2, 2, 2, 2, 1, 1, 1, 1],
    bassControl: 0,
    trebleControl: 0
  },
  { 
    name: "Bass+", 
    description: "Party Mode optimized",
    bands: [5, 5, 3, 1, 0, -1, -1, -1, -1, -1],
    bassControl: 0,
    trebleControl: 0
  },
  { 
    name: "Clarity", 
    description: "Podcast & Movie optimized",
    bands: [-2, -2, -1, 0, 1, 2, 2, 3, 3, 3],
    bassControl: 0,
    trebleControl: 0
  },
];

const CUSTOM_EQ_BAND_LABELS = ["60Hz", "170Hz", "310Hz", "600Hz", "1kHz", "3kHz", "6kHz", "12kHz", "14kHz", "16kHz"];

const DISPLAY_IMMERSIVE_MODES: ImmersiveMode[] = [
  'off', 'music', '360_reality', 'gaming', 'podcast', 'movie', 'sports'
];

function SoundLabScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const tokens = useThemeTokens();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { isLicensed } = useSubscription();
  const { showSuccess, showError, showWarning } = useToast();
  const { setBassBoost, setTrebleBoost } = useSoundLab();
  
  const cardStyle = getCardEffectStyle(tokens);
  
  const [soundLabMode, setSoundLabMode] = useState<SoundLabMode>("equalizer");
  const [selectedEQ, setSelectedEQ] = useState("Flat");
  const [isCustomEQ, setIsCustomEQ] = useState(false);
  const [customBands, setCustomBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
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
  const [spatialEnhancement, setSpatialEnhancement] = useState(0);
  const [bassEnhancementEnabled, setBassEnhancementEnabled] = useState(false);
  const [bassEnhancementLevel, setBassEnhancementLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [hfRestorationEnabled, setHfRestorationEnabled] = useState(false);
  const [hfRestorationLevel, setHfRestorationLevel] = useState<'low' | 'medium' | 'high'>('medium');
  
  const ENHANCEMENT_LEVEL_VALUES = { low: 33, medium: 66, high: 100 };
  const getEnhancementLevelFromValue = (value: number): 'low' | 'medium' | 'high' => {
    if (value <= 0) return 'medium';
    if (value <= 40) return 'low';
    if (value <= 75) return 'medium';
    return 'high';
  };

  const MAX_CUSTOM_PRESETS = 5;

  const immersiveModes = useMemo(() => {
    return DISPLAY_IMMERSIVE_MODES.map(modeId => ({
      id: modeId,
      name: IMMERSIVE_MODE_INFO[modeId].name,
      description: IMMERSIVE_MODE_INFO[modeId].description,
      icon: IMMERSIVE_MODE_INFO[modeId].icon
    }));
  }, []);

  const applyAudioEffects = useCallback((bass: number, treble: number) => {
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
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const modes = ImmersiveModeEngineModule.getAvailableModes();
      setAvailableModes(modes);

      const [eqPreset, soundMode, bands, presets, bassLvl, trebleLvl, spatialEnabled, bassEnh, hfEnabled, hfLevel] = await Promise.all([
        getEQPreset(),
        getSoundMode(),
        getCustomEQBands(),
        getCustomEQPresets(),
        getBassControlLevel(),
        getTrebleControlLevel(),
        getSpatialEnhancement(),
        getBassEnhancement(),
        getHfRestorationEnabled(),
        getHfRestorationLevel()
      ]);
      
      setCustomBands(bands);
      setCustomPresets(presets);
      setBassControl(bassLvl);
      setBassBoost(bassLvl);
      setTrebleControl(trebleLvl);
      setTrebleBoost(trebleLvl);
      setSpatialEnhancement(spatialEnabled);
      setBassEnhancementEnabled(bassEnh > 0);
      setBassEnhancementLevel(getEnhancementLevelFromValue(bassEnh));
      setHfRestorationEnabled(hfEnabled);
      setHfRestorationLevel(getEnhancementLevelFromValue(hfLevel));
      
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
        setSoundLabMode("equalizer");
        setSelectedEQ("Flat");
        const flatPreset = EQ_PRESETS.find(p => p.name === "Flat");
        if (flatPreset) {
          NativeEffectsManager.applyTenBandEQ(flatPreset.bands);
        }
      }
    };
    loadSettings();
  }, [isLicensed]);

  const handleEQChange = async (preset: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (preset === "Custom") {
      if (isCustomEQ && soundLabMode === "equalizer") {
        setIsCustomEQ(false);
        setSelectedEQ("Flat");
        await saveEQPreset("Flat");
        await NativeAudioService.setImmersiveMode('off');
        const flatPreset = EQ_PRESETS.find(p => p.name === "Flat");
        if (flatPreset) {
          NativeEffectsManager.applyTenBandEQ(flatPreset.bands);
        }
      } else {
        setIsCustomEQ(true);
        setSelectedEQ("");
        setSoundLabMode("equalizer");
        await clearSoundMode();
        await saveEQPreset("Custom");
        await NativeAudioService.setImmersiveMode('off');
        NativeEffectsManager.applyTenBandEQ(customBands);
      }
    } else {
      if (soundLabMode === "equalizer" && selectedEQ === preset && !isCustomEQ && preset !== "Flat") {
        setSelectedEQ("Flat");
        await saveEQPreset("Flat");
        await NativeAudioService.setImmersiveMode('off');
        const flatPreset = EQ_PRESETS.find(p => p.name === "Flat");
        if (flatPreset) {
          NativeEffectsManager.applyTenBandEQ(flatPreset.bands);
        }
      } else {
        setSelectedEQ(preset);
        setIsCustomEQ(false);
        setSoundLabMode("equalizer");
        await clearSoundMode();
        await saveEQPreset(preset);
        await NativeAudioService.setImmersiveMode('off');
        const presetData = EQ_PRESETS.find(p => p.name === preset);
        if (presetData) {
          NativeEffectsManager.applyTenBandEQ(presetData.bands);
          const newBass = presetData.bassControl ?? 0;
          const newTreble = presetData.trebleControl ?? 0;
          setBassControl(newBass);
          setBassBoost(newBass);
          setTrebleControl(newTreble);
          setTrebleBoost(newTreble);
          await Promise.all([
            saveBassControlLevel(newBass),
            saveTrebleControlLevel(newTreble)
          ]);
          applyAudioEffects(newBass, newTreble);
        }
      }
    }
  };

  const handleBandChange = async (index: number, value: number) => {
    const newBands = [...customBands];
    newBands[index] = Math.round(value);
    setCustomBands(newBands);
    await saveCustomEQBands(newBands);
    NativeEffectsManager.applyTenBandEQ(newBands);
  };

  const handleResetBands = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const resetBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    setCustomBands(resetBands);
    await saveCustomEQBands(resetBands);
    NativeEffectsManager.applyTenBandEQ(resetBands);
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

  const handleSpatialEnhancementChange = async (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpatialEnhancement(level);
    await saveSpatialEnhancement(level);
    
    if (Platform.OS === 'web') {
      if (typeof (WebAudioEffectsEngine as any).setSpatialEnhancement === 'function') {
        (WebAudioEffectsEngine as any).setSpatialEnhancement(level);
      }
      return;
    }
    
    if (SpatialEnhancementModule.isAvailable()) {
      try {
        if (typeof (SpatialEnhancementModule as any).setLevel === 'function') {
          (SpatialEnhancementModule as any).setLevel(level);
        } else {
          SpatialEnhancementModule.setEnabled(level > 0);
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
      trebleControl
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
    NativeEffectsManager.applyTenBandEQ(preset.bands);
    
    const newBass = preset.bassControl ?? 0;
    const newTreble = preset.trebleControl ?? 0;
    setBassControl(newBass);
    setBassBoost(newBass);
    setTrebleControl(newTreble);
    setTrebleBoost(newTreble);
    await Promise.all([
      saveBassControlLevel(newBass),
      saveTrebleControlLevel(newTreble)
    ]);
    applyAudioEffects(newBass, newTreble);
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
    NativeEffectsManager.applyTenBandEQ(preset.bands);
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
        ? { ...p, name: editPresetName.trim(), bands: [...customBands], bassControl, trebleControl }
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
        setSoundLabMode("equalizer");
        setSelectedImmersive("off");
        setSelectedEQ("Flat");
        await clearSoundMode();
        await saveEQPreset("Flat");
        const flatPreset = EQ_PRESETS.find(p => p.name === "Flat");
        if (flatPreset) {
          NativeEffectsManager.applyTenBandEQ(flatPreset.bands);
        }
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

  const handleBassEnhancementToggle = async (enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBassEnhancementEnabled(enabled);
    const value = enabled ? ENHANCEMENT_LEVEL_VALUES[bassEnhancementLevel] : 0;
    await saveBassEnhancement(value);
    SmartEnhancementsModule.setBassEnhancement(value);
    if (Platform.OS === 'web') {
      WebAudioEffectsEngine.setBassEnhancement(value);
    } else {
      NativeEffectsManager.setBassEnhancement(value);
    }
  };

  const handleBassEnhancementLevelChange = async (level: 'low' | 'medium' | 'high') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBassEnhancementLevel(level);
    if (bassEnhancementEnabled) {
      const value = ENHANCEMENT_LEVEL_VALUES[level];
      await saveBassEnhancement(value);
      SmartEnhancementsModule.setBassEnhancement(value);
      if (Platform.OS === 'web') {
        WebAudioEffectsEngine.setBassEnhancement(value);
      } else {
        NativeEffectsManager.setBassEnhancement(value);
      }
    }
  };

  const handleHfRestorationToggle = async (enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHfRestorationEnabled(enabled);
    await saveHfRestorationEnabled(enabled);
    SmartEnhancementsModule.setHfRestoration(enabled);
    if (Platform.OS === 'web') {
      WebAudioEffectsEngine.setHfRestoration(enabled);
    } else {
      NativeEffectsManager.setHfRestoration(enabled);
    }
    if (enabled) {
      const value = ENHANCEMENT_LEVEL_VALUES[hfRestorationLevel];
      await saveHfRestorationLevel(value);
      SmartEnhancementsModule.setHfRestorationLevel(value);
      if (Platform.OS === 'web') {
        WebAudioEffectsEngine.setHfRestorationLevel(value);
      } else {
        NativeEffectsManager.setHfRestorationLevel(value);
      }
    }
  };

  const handleHfRestorationLevelChange = async (level: 'low' | 'medium' | 'high') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHfRestorationLevel(level);
    if (hfRestorationEnabled) {
      const value = ENHANCEMENT_LEVEL_VALUES[level];
      await saveHfRestorationLevel(value);
      SmartEnhancementsModule.setHfRestorationLevel(value);
      if (Platform.OS === 'web') {
        WebAudioEffectsEngine.setHfRestorationLevel(value);
      } else {
        NativeEffectsManager.setHfRestorationLevel(value);
      }
    }
  };

  const isEqualizerActive = soundLabMode === "equalizer";
  const isImmersiveActive = soundLabMode === "immersive";

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <FluentText variant="caption1" color="secondary" style={styles.sectionDesc}>
          Flat EQ is always on by default. Tap another preset or Immersive Mode to switch.
        </FluentText>

        {Platform.OS === 'ios' && (
          <View style={[styles.iosNoticeCard, { backgroundColor: colors.colorNeutralBackground3 }]}>
            <MaterialCommunityIcons
              name="apple"
              size={FluentIconSize.small}
              color={colors.colorNeutralForeground2}
            />
            <FluentText variant="caption1" color="secondary" style={styles.iosNoticeText}>
              Audio effects are simulated on iPhone. For the best experience with hardware-accelerated audio processing, use an Android device.
            </FluentText>
          </View>
        )}

        <EQPresetCard
          isActive={isEqualizerActive}
          selectedPreset={selectedEQ}
          isCustomEQ={isCustomEQ}
          presets={EQ_PRESETS}
          customBands={customBands}
          customPresets={customPresets}
          maxCustomPresets={MAX_CUSTOM_PRESETS}
          bassControl={bassControl}
          trebleControl={trebleControl}
          spatialEnhancement={spatialEnhancement}
          onPresetChange={handleEQChange}
          onBandChange={handleBandChange}
          onResetBands={handleResetBands}
          onSavePreset={() => setShowSaveDialog(true)}
          onLoadPreset={handleLoadPreset}
          onEditPreset={handleEditPreset}
          onDeletePreset={handleDeletePreset}
          onBassChange={handleBassControlChange}
          onTrebleChange={handleTrebleControlChange}
          onSpatialChange={handleSpatialEnhancementChange}
          bandLabels={CUSTOM_EQ_BAND_LABELS}
        />

        <ImmersiveModeCard
          isActive={isImmersiveActive}
          selectedMode={selectedImmersive}
          isLicensed={isLicensed}
          modes={immersiveModes}
          onModeChange={handleImmersiveChange}
        />

        <SmartEnhancementCard
          isLicensed={isLicensed}
          bassEnhancementEnabled={bassEnhancementEnabled}
          bassEnhancementLevel={bassEnhancementLevel}
          hfRestorationEnabled={hfRestorationEnabled}
          hfRestorationLevel={hfRestorationLevel}
          onBassEnhancementToggle={handleBassEnhancementToggle}
          onBassEnhancementLevelChange={handleBassEnhancementLevelChange}
          onHfRestorationToggle={handleHfRestorationToggle}
          onHfRestorationLevelChange={handleHfRestorationLevelChange}
        />

        <View style={[styles.sectionCard, cardStyle, styles.infoCard]}>
          <View style={styles.infoContent}>
            <MaterialCommunityIcons name="information-outline" size={FluentIconSize.regular} color={tokens.colors.primary} />
            <View style={styles.infoText}>
              <FluentText variant="body1Strong">Sound Experience</FluentText>
              <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
                Your audio settings are saved automatically and applied to all playback.
              </FluentText>
            </View>
          </View>
        </View>
      </ScrollView>

      <FluentModal
        visible={showSaveDialog}
        onClose={() => {
          setShowSaveDialog(false);
          setNewPresetName("");
        }}
        title="Save Custom Preset"
        showHandle={true}
        showCloseButton={false}
        presentationStyle="overFullScreen"
        animationType="fade"
      >
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
      </FluentModal>

      <FluentModal
        visible={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setEditingPreset(null);
          setEditPresetName("");
        }}
        title="Edit Preset"
        showHandle={true}
        showCloseButton={false}
        presentationStyle="overFullScreen"
        animationType="fade"
      >
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
              minimumTrackTintColor={colors.colorBrandForeground1}
              maximumTrackTintColor={colors.colorNeutralStroke1}
              thumbTintColor={colors.colorBrandForeground1}
              trackHeight={FluentSliderSize.trackMedium}
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
      </FluentModal>

      <FluentModal
        visible={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setPresetToDelete(null);
        }}
        title="Delete Preset"
        showHandle={true}
        showCloseButton={false}
        presentationStyle="overFullScreen"
        animationType="fade"
      >
        <View style={{ alignItems: "center" }}>
          <MaterialCommunityIcons name="delete-alert" size={48} color={tokens.colors.error} style={{ marginBottom: FluentSpacing.m }} />
          <FluentText variant="body2" color="secondary" style={{ textAlign: "center", marginBottom: FluentSpacing.l }}>
            Are you sure you want to delete "{presetToDelete?.name}"? This action cannot be undone.
          </FluentText>
        </View>
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
      </FluentModal>
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
  textInput: {
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.m,
    borderWidth: 1,
    fontSize: FluentTypography.body1.fontSize,
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
  iosNoticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    marginBottom: FluentSpacing.l,
    gap: FluentSpacing.s,
  },
  iosNoticeText: {
    flex: 1,
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
});

export default memo(SoundLabScreen);
