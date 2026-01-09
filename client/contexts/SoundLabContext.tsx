import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getEQPreset, getSoundMode } from '@/lib/storage';
import { 
  ImmersiveModeEngineModule, 
  IMMERSIVE_MODE_INFO, 
  ImmersiveMode, 
  ImmersiveModeSettings,
  ImmersiveModeInfo
} from '../../modules/audio-effects';
import NativeAudioService from '@/services/NativeAudioService';

export type EQBands = {
  sub: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  brilliance: number;
};

export type SoundLabMode = 'equalizer' | 'immersive' | 'off';

export { ImmersiveMode, ImmersiveModeSettings, ImmersiveModeInfo };

const EQ_PRESETS: Record<string, EQBands> = {
  Flat: { sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, brilliance: 0 },
  Rock: { sub: +2, bass: +3, lowMid: +1, mid: -1, highMid: +2, treble: +3, brilliance: +1 },
  Pop: { sub: +1, bass: +2, lowMid: 0, mid: +2, highMid: +3, treble: +2, brilliance: +1 },
  Jazz: { sub: +1, bass: +2, lowMid: +2, mid: +1, highMid: 0, treble: -1, brilliance: 0 },
  Classical: { sub: 0, bass: +1, lowMid: +1, mid: 0, highMid: +1, treble: +2, brilliance: +2 },
  Electronic: { sub: +4, bass: +3, lowMid: 0, mid: -1, highMid: +1, treble: +3, brilliance: +2 },
  'Hip-Hop': { sub: +4, bass: +3, lowMid: +1, mid: +2, highMid: +1, treble: +1, brilliance: 0 },
  Acoustic: { sub: 0, bass: +1, lowMid: +2, mid: +2, highMid: +1, treble: +1, brilliance: 0 },
};

const EQ_FREQUENCIES = {
  sub: 32,
  bass: 64,
  lowMid: 250,
  mid: 1000,
  highMid: 4000,
  treble: 8000,
  brilliance: 16000,
};

const VALID_IMMERSIVE_MODES: ImmersiveMode[] = ['off', 'music', '360_reality', 'signature_360', 'gaming', 'podcast', 'movie'];

interface SoundLabContextType {
  mode: SoundLabMode;
  eqPresetName: string;
  immersiveModeName: ImmersiveMode;
  immersiveModeSettings: ImmersiveModeSettings | null;
  eqBands: EQBands;
  frequencies: typeof EQ_FREQUENCIES;
  availableImmersiveModes: ImmersiveModeInfo[];
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

  const eqBands = EQ_PRESETS[eqPresetName] || EQ_PRESETS.Flat;

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

      const eqPreset = await getEQPreset();
      const soundMode = await getSoundMode();
      
      if (eqPreset && EQ_PRESETS[eqPreset]) {
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
      eqBands,
      frequencies: EQ_FREQUENCIES,
      availableImmersiveModes,
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
