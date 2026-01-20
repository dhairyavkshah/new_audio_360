import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { Platform } from 'react-native';
import { getEQPreset, getSoundMode } from '@/lib/storage';
import { 
  ImmersiveModeEngineModule, 
  EqualizerModule,
  IMMERSIVE_MODE_INFO, 
  ImmersiveMode, 
  ImmersiveModeSettings,
  ImmersiveModeInfo
} from '../../modules/audio-effects';
import { AudioSessionSource } from '@/services/NativeEffectsManager';
import { WebAudioEffectsEngine } from '@/services/WebAudioEffectsEngine';

export type SoundLabMode = 'equalizer' | 'immersive' | 'off';

export { ImmersiveMode, ImmersiveModeSettings, ImmersiveModeInfo };

// Zero-sum EQ presets for maximum headroom
const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [0.4, 0.4, -0.3, -1.1, -1.1, -0.1, 0.9, 1.6, 0.7, -0.7],
  Pop: [0.3, 0.3, -0.4, -0.5, -0.4, 0.7, 0.8, 0.7, -0.4, -0.7],
  Jazz: [-0.3, -0.3, -1.1, 1.0, 1.0, 0.3, -0.7, -0.3, -0.3, -0.9],
  Classical: [-0.8, -0.8, -0.4, -0.4, -0.2, 0.2, 0.5, 1.0, 0.9, 0.4],
  Electronic: [1.3, 1.3, 0.5, -1.4, -1.4, -0.5, 0.5, 1.3, 0.5, -1.2],
  'Hip-Hop': [2.4, 2.4, 0.7, -1.2, -0.6, 0.0, 0.4, -0.6, -1.4, -2.0],
  Acoustic: [-0.6, -0.6, -1.2, 0.7, 1.5, 1.5, 0.7, -0.3, -0.3, -1.3],
  'Bass+': [3.5, 2.5, 1.5, -0.6, -1.2, -1.2, -1.2, -1.2, -0.5, -1.4],
  Clarity: [-1.9, -1.9, -0.9, -0.8, 0.3, 0.6, 1.3, 1.3, 1.9, 0.1],
};

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

const VALID_IMMERSIVE_MODES: ImmersiveMode[] = ['off', 'music', '360_reality', 'gaming', 'podcast', 'movie', 'sports'];

interface SoundLabContextType {
  mode: SoundLabMode;
  eqPresetName: string;
  immersiveModeName: ImmersiveMode;
  immersiveModeSettings: ImmersiveModeSettings | null;
  eqBands: number[];
  frequencies: number[];
  availableImmersiveModes: ImmersiveModeInfo[];
  audioSource: AudioSessionSource;
  isEffectsActive: boolean;
  bassBoost: number;
  trebleBoost: number;
  setBassBoost: (value: number) => void;
  setTrebleBoost: (value: number) => void;
  getImmersiveModeInfo: (modeId: ImmersiveMode) => { name: string; description: string; icon: string };
  setImmersiveMode: (mode: ImmersiveMode) => Promise<{ success: boolean; error?: string }>;
  refreshSettings: () => Promise<void>;
}

const SoundLabContext = createContext<SoundLabContextType | undefined>(undefined);

export function SoundLabProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SoundLabMode>('equalizer');
  const [eqPresetName, setEqPresetName] = useState('Flat');
  const [immersiveModeName, setImmersiveModeName] = useState<ImmersiveMode>('off');
  const [immersiveModeSettings, setImmersiveModeSettings] = useState<ImmersiveModeSettings | null>(null);
  const [availableImmersiveModes, setAvailableImmersiveModes] = useState<ImmersiveModeInfo[]>([]);
  const [audioSource, setAudioSource] = useState<AudioSessionSource>('none');
  const [isEffectsActive, setIsEffectsActive] = useState(false);
  const [webAudioInitialized, setWebAudioInitialized] = useState(false);
  const [bassBoost, setBassBoostState] = useState(0);
  const [trebleBoost, setTrebleBoostState] = useState(0);

  const setBassBoost = useCallback((value: number) => {
    const clampedValue = Math.max(-5, Math.min(5, value));
    setBassBoostState(clampedValue);
    if (webAudioInitialized) {
      WebAudioEffectsEngine.setBassBoost(clampedValue);
    }
  }, [webAudioInitialized]);

  const setTrebleBoost = useCallback((value: number) => {
    const clampedValue = Math.max(-5, Math.min(5, value));
    setTrebleBoostState(clampedValue);
    if (webAudioInitialized) {
      WebAudioEffectsEngine.setTrebleBoost(clampedValue);
    }
  }, [webAudioInitialized]);

  const eqBands = EQ_PRESETS[eqPresetName] || EQ_PRESETS.Flat;

  useEffect(() => {
    if (!webAudioInitialized) {
      WebAudioEffectsEngine.initialize().then((success) => {
        setWebAudioInitialized(success);
      });
    }
    return () => {
      WebAudioEffectsEngine.release();
    };
  }, [webAudioInitialized]);

  const getImmersiveModeInfo = useCallback((modeId: ImmersiveMode) => {
    return IMMERSIVE_MODE_INFO[modeId] || IMMERSIVE_MODE_INFO.off;
  }, []);

  const applyEffectsToEngine = useCallback((currentMode: SoundLabMode, currentEqBands: number[], currentImmersiveMode: ImmersiveMode) => {
    if (!webAudioInitialized) return;
    
    if (currentMode === 'equalizer') {
      WebAudioEffectsEngine.applyEQ(currentEqBands);
    } else if (currentMode === 'immersive' && currentImmersiveMode !== 'off') {
      WebAudioEffectsEngine.applyImmersiveMode(currentImmersiveMode);
    } else {
      WebAudioEffectsEngine.resetEQ();
    }
  }, [webAudioInitialized]);

  const setImmersiveMode = useCallback(async (newMode: ImmersiveMode): Promise<{ success: boolean; error?: string }> => {
    try {
      if (newMode !== 'off') {
        if (webAudioInitialized) {
          WebAudioEffectsEngine.applyImmersiveMode(newMode);
        }
        setImmersiveModeName(newMode);
        setMode('immersive');
      } else {
        if (webAudioInitialized) {
          WebAudioEffectsEngine.applyEQ(EQ_PRESETS.Flat);
        }
        setImmersiveModeName('off');
        setEqPresetName('Flat');
        setMode('equalizer');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, [webAudioInitialized]);

  const refreshSettings = useCallback(async () => {
    try {
      const modes = ImmersiveModeEngineModule.getAvailableModes();
      setAvailableImmersiveModes(modes);

      setAudioSource('software');
      setIsEffectsActive(webAudioInitialized);

      const eqPreset = await getEQPreset();
      const soundMode = await getSoundMode();
      
      if (eqPreset && EQ_PRESETS[eqPreset]) {
        setEqPresetName(eqPreset);
        setMode('equalizer');
      } else if (soundMode && VALID_IMMERSIVE_MODES.includes(soundMode as ImmersiveMode) && soundMode !== 'off') {
        setImmersiveModeName(soundMode as ImmersiveMode);
        setMode('immersive');
      } else {
        setEqPresetName('Flat');
        setMode('equalizer');
      }
    } catch (error) {
    }
  }, [webAudioInitialized]);

  useEffect(() => {
    applyEffectsToEngine(mode, eqBands, immersiveModeName);
  }, [mode, eqBands, immersiveModeName, applyEffectsToEngine]);

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
      eqBands,
      frequencies: EQ_FREQUENCIES,
      availableImmersiveModes,
      audioSource,
      isEffectsActive,
      bassBoost,
      trebleBoost,
      setBassBoost,
      setTrebleBoost,
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
