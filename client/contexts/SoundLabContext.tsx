import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { Platform } from 'react-native';
import { getEQPreset, getSoundMode } from '@/lib/storage';
import { 
  ImmersiveModeEngineModule, 
  IMMERSIVE_MODE_INFO, 
  ImmersiveMode, 
  ImmersiveModeSettings,
  ImmersiveModeInfo
} from '../../modules/audio-effects';
import NativeAudioService from '@/services/NativeAudioService';
import { NativeEffectsManager, AudioSessionSource } from '@/services/NativeEffectsManager';
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

const VALID_IMMERSIVE_MODES: ImmersiveMode[] = ['off', 'music', '360_reality', 'gaming', 'podcast', 'movie'];

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
  const [webAudioInitialized, setWebAudioInitialized] = useState(false);

  const eqBands = EQ_PRESETS[eqPresetName] || EQ_PRESETS.Flat;

  useEffect(() => {
    if ((Platform.OS === 'web' || Platform.OS === 'ios') && !webAudioInitialized) {
      WebAudioEffectsEngine.initialize().then((success) => {
        setWebAudioInitialized(success);
      });
    }
    return () => {
      if (Platform.OS === 'web' || Platform.OS === 'ios') {
        WebAudioEffectsEngine.release();
      }
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
    if (Platform.OS === 'android') {
      if (currentMode === 'equalizer') {
        const fiveBand = [
          (currentEqBands.sub + currentEqBands.bass) / 2,
          currentEqBands.lowMid,
          currentEqBands.mid,
          currentEqBands.highMid,
          (currentEqBands.treble + currentEqBands.brilliance) / 2,
        ];
        NativeEffectsManager.applyFiveBandEQ(fiveBand);
      } else {
        NativeEffectsManager.disableEQ();
      }
    } else if ((Platform.OS === 'web' || Platform.OS === 'ios') && webAudioInitialized) {
      if (currentMode === 'equalizer') {
        WebAudioEffectsEngine.applySevenBandEQ(currentEqBands);
      } else if (currentMode === 'immersive' && currentImmersiveMode !== 'off') {
        WebAudioEffectsEngine.applyImmersiveMode(currentImmersiveMode);
      } else {
        WebAudioEffectsEngine.resetEQ();
      }
    }
  }, [webAudioInitialized]);

  const setImmersiveMode = useCallback(async (newMode: ImmersiveMode): Promise<{ success: boolean; error?: string }> => {
    const previousMode = immersiveModeName;
    const previousSettings = immersiveModeSettings;
    const previousLabMode = mode;

    try {
      if (Platform.OS === 'web' && webAudioInitialized) {
        if (newMode !== 'off') {
          WebAudioEffectsEngine.applyImmersiveMode(newMode);
          setImmersiveModeName(newMode);
          setMode('immersive');
        } else {
          WebAudioEffectsEngine.resetEQ();
          setImmersiveModeName('off');
          setMode('off');
        }
        return { success: true };
      }

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
      return { success: false, error: String(error) };
    }
  }, [immersiveModeName, immersiveModeSettings, mode, webAudioInitialized]);

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
      setIsEffectsActive(NativeEffectsManager.isEffectsActive() || webAudioInitialized);

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
      // Silent error handling in production
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
