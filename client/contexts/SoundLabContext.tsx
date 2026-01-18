import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { getEQPreset, getSoundMode } from '@/lib/storage';
import { 
  ImmersiveModeEngineModule, 
  IMMERSIVE_MODE_INFO, 
  ImmersiveMode, 
  ImmersiveModeSettings,
  ImmersiveModeInfo
} from '../../modules/audio-effects';
import { AudioSessionSource } from '@/services/NativeEffectsManager';
import { WebAudioEffectsEngine } from '@/services/WebAudioEffectsEngine';

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
  Rock: { sub: +3, bass: +2, lowMid: -2, mid: -3, highMid: +1, treble: +3, brilliance: -4 },
  Pop: { sub: +2, bass: +2, lowMid: -1, mid: -2, highMid: +1, treble: +2, brilliance: -4 },
  Jazz: { sub: 0, bass: +2, lowMid: +1, mid: +1, highMid: -2, treble: -1, brilliance: -1 },
  Classical: { sub: -1, bass: 0, lowMid: -1, mid: +2, highMid: +1, treble: +2, brilliance: -3 },
  Electronic: { sub: +4, bass: +3, lowMid: -2, mid: -3, highMid: +1, treble: +3, brilliance: -6 },
  'Hip-Hop': { sub: +4, bass: +3, lowMid: -2, mid: -3, highMid: +1, treble: +1, brilliance: -4 },
  Acoustic: { sub: -2, bass: -1, lowMid: +2, mid: +2, highMid: +1, treble: -1, brilliance: -1 },
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

const VALID_IMMERSIVE_MODES: ImmersiveMode[] = ['off', 'music', '360_reality', 'gaming', 'podcast', 'movie', 'sports'];

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
  const [mode, setMode] = useState<SoundLabMode>('off');
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
    setBassBoostState(Math.max(-5, Math.min(5, value)));
  }, []);

  const setTrebleBoost = useCallback((value: number) => {
    setTrebleBoostState(Math.max(-5, Math.min(5, value)));
  }, []);

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

  // Immersive modes now only use zero-sum EQ - no spatial effects
  const immersiveEffect: ImmersiveEffectSettings = useMemo(() => {
    return { reverb: 0, delay: 0, stereoWidth: 1 };
  }, []);

  const getImmersiveModeInfo = useCallback((modeId: ImmersiveMode) => {
    return IMMERSIVE_MODE_INFO[modeId] || IMMERSIVE_MODE_INFO.off;
  }, []);

  const applyEffectsToEngine = useCallback((currentMode: SoundLabMode, currentEqBands: EQBands, currentImmersiveMode: ImmersiveMode) => {
    if (!webAudioInitialized) return;
    
    if (currentMode === 'equalizer') {
      WebAudioEffectsEngine.applySevenBandEQ(currentEqBands);
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
          WebAudioEffectsEngine.resetEQ();
        }
        setImmersiveModeName('off');
        setMode('off');
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
      } else if (soundMode && VALID_IMMERSIVE_MODES.includes(soundMode as ImmersiveMode)) {
        setImmersiveModeName(soundMode as ImmersiveMode);
        setMode('immersive');
      } else {
        setMode('off');
      }
    } catch (error) {
      // Silent error handling
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
      immersiveEffect,
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
