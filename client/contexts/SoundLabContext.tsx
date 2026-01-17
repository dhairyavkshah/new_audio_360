import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { getEQPreset, getSoundMode } from '@/lib/storage';
import { 
  ImmersiveModeEngineModule, 
  ImmersiveMode, 
  ImmersiveModeSettings,
  ImmersiveModeInfo
} from '../../modules/audio-effects';
import NativeAudioService from '@/services/NativeAudioService';
import { NativeEffectsManager, AudioSessionSource } from '@/services/NativeEffectsManager';

// ============================================================================
// SINGLE SOURCE OF TRUTH - All audio configuration defined here
// ============================================================================

// 5-band EQ system - all presets are zero-sum (no volume change)
export type EQBands = [number, number, number, number, number];
export type SoundLabMode = 'equalizer' | 'immersive' | 'off';
export { ImmersiveMode, ImmersiveModeSettings, ImmersiveModeInfo };

// EQ Band Configuration
export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000];
export const EQ_BAND_LABELS = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

// 8 Zero-Sum EQ Presets (all bands sum to 0)
export const EQ_PRESETS: { name: string; description: string; bands: EQBands }[] = [
  { name: 'Flat', description: 'Natural, unprocessed sound', bands: [0, 0, 0, 0, 0] },
  { name: 'Rock', description: 'Punchy bass, crisp guitars', bands: [2, 1, -2, 0, -1] },
  { name: 'Pop', description: 'Bright vocals, balanced bass', bands: [1, 0, 1, 0, -2] },
  { name: 'Jazz', description: 'Warm mids, smooth highs', bands: [1, 2, 1, -2, -2] },
  { name: 'Classical', description: 'Wide dynamics, clear separation', bands: [1, 0, -2, 0, 1] },
  { name: 'Electronic', description: 'Deep bass, sparkling highs', bands: [2, 1, -3, -1, 1] },
  { name: 'Hip-Hop', description: 'Heavy sub-bass, clear vocals', bands: [3, 1, 0, -2, -2] },
  { name: 'Acoustic', description: 'Natural warmth, presence', bands: [0, 1, 1, 0, -2] },
];

// 6 Immersive Audio Modes - Pure EQ-based (zero-sum in millibels)
// SINGLE SOURCE OF TRUTH - Native Kotlin module uses these exact values
// All bands sum to exactly 0 millibels (no volume change)
export const IMMERSIVE_MODES: { 
  id: ImmersiveMode; 
  name: string; 
  description: string; 
  icon: string; 
  eqBands: [number, number, number, number, number];  // Values in millibels at [60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz]
}[] = [
  { id: 'off', name: 'Off', description: 'No audio enhancement', icon: 'volume-off', eqBands: [0, 0, 0, 0, 0] },       // Sum: 0
  { id: 'music', name: 'Music', description: 'Optimized for music listening', icon: 'music', eqBands: [40, 10, -40, 10, -20] },       // Sum: 0
  { id: '360_reality', name: '360 Reality', description: 'Immersive 3D spatial audio', icon: 'surround-sound', eqBands: [20, -10, -30, -10, 30] },  // Sum: 0
  { id: 'gaming', name: 'Gaming', description: 'Enhanced positional audio', icon: 'gamepad-variant', eqBands: [-10, -60, 10, 35, 25] },     // Sum: 0
  { id: 'podcast', name: 'Podcast', description: 'Voice clarity enhancement', icon: 'podcast', eqBands: [-80, -30, 40, 50, 20] },    // Sum: 0
  { id: 'movie', name: 'Movie', description: 'Cinematic audio enhancement', icon: 'movie-open', eqBands: [40, -10, -50, -10, 30] },  // Sum: 0
  { id: 'custom', name: 'Custom', description: 'Custom EQ settings', icon: 'tune', eqBands: [0, 0, 0, 0, 0] },         // Sum: 0
];

// Helper to get immersive mode info
export const IMMERSIVE_MODE_INFO: Record<ImmersiveMode, { name: string; description: string; icon: string }> = 
  IMMERSIVE_MODES.reduce((acc, mode) => {
    acc[mode.id] = { name: mode.name, description: mode.description, icon: mode.icon };
    return acc;
  }, {} as Record<ImmersiveMode, { name: string; description: string; icon: string }>);

const VALID_IMMERSIVE_MODES: ImmersiveMode[] = IMMERSIVE_MODES.map(m => m.id).filter(id => id !== 'off') as ImmersiveMode[];

interface ImmersiveEffectSettings {
  reverb: number;
  delay: number;
  stereoWidth: number;
}

interface SoundLabContextType {
  mode: SoundLabMode;
  eqPresetName: string;
  immersiveModeName: ImmersiveMode;
  immersiveModeSettings: ImmersiveModeSettings | null;
  immersiveEffect: ImmersiveEffectSettings;
  eqBands: EQBands;
  frequencies: typeof EQ_FREQUENCIES;
  availableImmersiveModes: ImmersiveModeInfo[];
  audioSource: AudioSessionSource;
  isEffectsActive: boolean;
  getImmersiveModeInfo: (modeId: ImmersiveMode) => { name: string; description: string; icon: string };
  setImmersiveMode: (mode: ImmersiveMode) => Promise<{ success: boolean; error?: string }>;
  refreshSettings: () => Promise<void>;
}

const SoundLabContext = createContext<SoundLabContextType | undefined>(undefined);

export function SoundLabProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SoundLabMode>('off');
  const [eqPresetName, setEqPresetName] = useState('Flat');
  const [immersiveModeName, setImmersiveModeName] = useState<ImmersiveMode>('off');
  const [immersiveModeSettings, setImmersiveModeSettings] = useState<ImmersiveModeSettings | null>(null);
  const [availableImmersiveModes, setAvailableImmersiveModes] = useState<ImmersiveModeInfo[]>([]);
  const [audioSource, setAudioSource] = useState<AudioSessionSource>('none');
  const [isEffectsActive, setIsEffectsActive] = useState(false);

  const eqBands = EQ_PRESETS.find(p => p.name === eqPresetName)?.bands || EQ_PRESETS[0].bands;

  const immersiveEffect: ImmersiveEffectSettings = useMemo(() => {
    if (mode !== 'immersive' || immersiveModeName === 'off') {
      return { reverb: 0, delay: 0, stereoWidth: 1 };
    }
    // Pure EQ-based immersive modes - no separate spatial effects
    return { reverb: 0.15, delay: 25, stereoWidth: 1.2 };
  }, [mode, immersiveModeName]);

  const getImmersiveModeInfo = useCallback((modeId: ImmersiveMode) => {
    return IMMERSIVE_MODE_INFO[modeId] || IMMERSIVE_MODE_INFO.off;
  }, []);

  const setImmersiveMode = useCallback(async (newMode: ImmersiveMode): Promise<{ success: boolean; error?: string }> => {
    const previousMode = immersiveModeName;
    const previousSettings = immersiveModeSettings;
    const previousLabMode = mode;

    try {
      const result = await NativeAudioService.setImmersiveMode(newMode);
      if (result.success) {
        setImmersiveModeName(newMode);
        if (result.settings) {
          setImmersiveModeSettings(result.settings);
        }
        if (newMode !== 'off') {
          setMode('immersive');
        } else {
          setMode('off');
        }
      } else {
        setImmersiveModeName(previousMode);
        setImmersiveModeSettings(previousSettings);
        setMode(previousLabMode);
      }
      return result;
    } catch (error) {
      setImmersiveModeName(previousMode);
      setImmersiveModeSettings(previousSettings);
      setMode(previousLabMode);
      console.error('Error setting immersive mode:', error);
      return { success: false, error: String(error) };
    }
  }, [immersiveModeName, immersiveModeSettings, mode]);

  const refreshSettings = useCallback(async () => {
    try {
      const modes = ImmersiveModeEngineModule.getAvailableModes();
      setAvailableImmersiveModes(modes);

      const currentImmersiveMode = NativeAudioService.getCurrentImmersiveMode();
      if (currentImmersiveMode.isAttached) {
        setImmersiveModeName(currentImmersiveMode.mode);
        setImmersiveModeSettings(currentImmersiveMode.settings);
      }

      setAudioSource(NativeEffectsManager.getCurrentSource());
      setIsEffectsActive(NativeEffectsManager.isEffectsActive());

      const eqPreset = await getEQPreset();
      const soundMode = await getSoundMode();
      
      if (eqPreset && EQ_PRESETS.some(p => p.name === eqPreset)) {
        setEqPresetName(eqPreset);
        setMode('equalizer');
      } else if (soundMode && VALID_IMMERSIVE_MODES.includes(soundMode as ImmersiveMode)) {
        setImmersiveModeName(soundMode as ImmersiveMode);
        setMode('immersive');
      } else {
        setMode('off');
      }
    } catch (error) {
      console.error('Error loading sound lab settings:', error);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    const interval = setInterval(refreshSettings, 1000);
    return () => clearInterval(interval);
  }, [refreshSettings]);

  return (
    <SoundLabContext.Provider value={{
      mode,
      eqPresetName,
      immersiveModeName,
      immersiveModeSettings,
      immersiveEffect,
      eqBands,
      frequencies: EQ_FREQUENCIES,
      availableImmersiveModes,
      audioSource,
      isEffectsActive,
      getImmersiveModeInfo,
      setImmersiveMode,
      refreshSettings,
    }}>
      {children}
    </SoundLabContext.Provider>
  );
}

export function useSoundLab() {
  const context = useContext(SoundLabContext);
  if (!context) {
    throw new Error('useSoundLab must be used within a SoundLabProvider');
  }
  return context;
}
