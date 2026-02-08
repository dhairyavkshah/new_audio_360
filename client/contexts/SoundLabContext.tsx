import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import { Platform, AppState } from 'react-native';
import { getEQPreset, getSoundMode } from '@/lib/storage';
import { 
  ImmersiveModeEngineModule, 
  IMMERSIVE_MODE_INFO, 
  ImmersiveMode, 
  ImmersiveModeSettings,
  ImmersiveModeInfo,
  PlaybackEngineModule
} from '../../modules/audio-effects';
import { AudioSessionSource } from '@/services/NativeEffectsManager';
import { WebAudioEffectsEngine } from '@/services/WebAudioEffectsEngine';
import { getDeviceCapabilities } from '@/lib/deviceCapabilities';

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

// 10-band EQ presets: [60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz]
const EQ_PRESETS_10BAND: Record<string, number[]> = {
  Flat:       [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  Rock:       [+0.4, +0.4, -0.3, -1.1, -1.1, -0.1, +0.9, +1.6, +0.7, -0.7],
  Pop:        [+0.3, +0.3, -0.4, -0.5, -0.4, +0.7, +0.8, +0.7, -0.4, -0.7],
  Jazz:       [-0.3, -0.3, -1.1, +1.0, +1.0, +0.3, -0.7, -0.3, -0.3, -0.9],
  Classical:  [-0.8, -0.8, -0.4, -0.4, -0.2, +0.2, +0.5, +1.0, +0.9, +0.4],
  Electronic: [+1.3, +1.3, +0.5, -1.4, -1.4, -0.5, +0.5, +1.3, +0.5, -1.2],
  'Hip-Hop':  [+2.4, +2.4, +0.7, -1.2, -0.6, 0.0, +0.4, -0.6, -1.4, -2.0],
  Acoustic:   [-0.6, -0.6, -1.2, +0.7, +1.5, +1.5, +0.7, -0.3, -0.3, -1.3],
  'Bass+':    [+2.5, +1.8, +1.0, -0.4, -0.9, -0.9, -0.9, -0.9, -0.4, -0.9],
  Clarity:    [-1.9, -1.9, -0.9, -0.8, +0.3, +0.6, +1.3, +1.3, +1.9, +0.1],
};

// Legacy 7-band format for UI compatibility (mapping from 10-band)
const EQ_PRESETS: Record<string, EQBands> = {
  Flat:       { sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, brilliance: 0 },
  Rock:       { sub: +0.4, bass: -0.3, lowMid: -1.1, mid: -0.1, highMid: +0.9, treble: +1.6, brilliance: -0.7 },
  Pop:        { sub: +0.3, bass: -0.4, lowMid: -0.5, mid: +0.7, highMid: +0.8, treble: +0.7, brilliance: -0.7 },
  Jazz:       { sub: -0.3, bass: -1.1, lowMid: +1.0, mid: +0.3, highMid: -0.7, treble: -0.3, brilliance: -0.9 },
  Classical:  { sub: -0.8, bass: -0.4, lowMid: -0.4, mid: +0.2, highMid: +0.5, treble: +1.0, brilliance: +0.4 },
  Electronic: { sub: +1.3, bass: +0.5, lowMid: -1.4, mid: -0.5, highMid: +0.5, treble: +1.3, brilliance: -1.2 },
  'Hip-Hop':  { sub: +2.4, bass: +0.7, lowMid: -1.2, mid: 0, highMid: +0.4, treble: -0.6, brilliance: -2.0 },
  Acoustic:   { sub: -0.6, bass: -1.2, lowMid: +0.7, mid: +1.5, highMid: +0.7, treble: -0.3, brilliance: -1.3 },
  'Bass+':    { sub: +2.5, bass: +1.0, lowMid: -0.4, mid: -0.9, highMid: -0.9, treble: -0.9, brilliance: -0.9 },
  Clarity:    { sub: -1.9, bass: -0.9, lowMid: -0.8, mid: +0.6, highMid: +1.3, treble: +1.3, brilliance: +0.1 },
};

const EQ_FREQUENCIES = {
  sub: 60,
  bass: 170,
  lowMid: 600,
  mid: 3000,
  highMid: 6000,
  treble: 12000,
  brilliance: 16000,
};

// 10-band frequencies for direct DSP access
const EQ_FREQUENCIES_10BAND = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

export { EQ_PRESETS_10BAND, EQ_FREQUENCIES_10BAND };

const VALID_IMMERSIVE_MODES: ImmersiveMode[] = ['off', 'music', '360_reality', 'gaming', 'podcast', 'movie', 'sports'];

interface ImmersiveEffectSettings {
  reverb: number;
  delay: number;
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
    setBassBoostState(Math.max(-5, Math.min(5, value)));
  }, []);

  const setTrebleBoost = useCallback((value: number) => {
    setTrebleBoostState(Math.max(-5, Math.min(5, value)));
  }, []);

  const eqBands = useMemo(
    () => EQ_PRESETS[eqPresetName] || EQ_PRESETS.Flat,
    [eqPresetName]
  );

  useEffect(() => {
    if (!webAudioInitialized && Platform.OS === 'web') {
      getDeviceCapabilities().then((capabilities) => {
        if (!capabilities.enableAIUpscaling) {
          if (capabilities.memory.memoryClass === 'low') {
            console.warn('[SoundLabContext] Low-memory device detected (<3GB): Advanced audio features will be limited');
          } else if (capabilities.memory.totalRamMB < 4096) {
            console.warn('[SoundLabContext] Medium-memory device detected (<4GB): Some advanced audio features disabled');
          }
        }
        
        WebAudioEffectsEngine.initialize().then((success) => {
          setWebAudioInitialized(success);
        });
      });
    }
    return () => {
      if (Platform.OS === 'web') {
        WebAudioEffectsEngine.release();
      }
    };
  }, [webAudioInitialized]);

  // Immersive modes now only use zero-sum EQ - no spatial effects
  const immersiveEffect: ImmersiveEffectSettings = useMemo(() => {
    return { reverb: 0, delay: 0 };
  }, []);

  const getImmersiveModeInfo = useCallback((modeId: ImmersiveMode) => {
    return IMMERSIVE_MODE_INFO[modeId] || IMMERSIVE_MODE_INFO.off;
  }, []);

  const applyEffectsToEngine = useCallback((currentMode: SoundLabMode, currentEqBands: EQBands, currentImmersiveMode: ImmersiveMode, presetName?: string) => {
    const isWeb = Platform.OS === 'web';
    const isAndroid = Platform.OS === 'android';
    
    if (currentMode === 'equalizer') {
      if (isWeb && webAudioInitialized) {
        WebAudioEffectsEngine.applySevenBandEQ(currentEqBands);
      }
      if (isAndroid) {
        const tenBandPreset = presetName && EQ_PRESETS_10BAND[presetName] 
          ? EQ_PRESETS_10BAND[presetName] 
          : EQ_PRESETS_10BAND.Flat;
        PlaybackEngineModule.setEqBands(tenBandPreset);
        ImmersiveModeEngineModule.setMode('off');
      }
    } else if (currentMode === 'immersive' && currentImmersiveMode !== 'off') {
      if (isWeb && webAudioInitialized) {
        WebAudioEffectsEngine.applyImmersiveMode(currentImmersiveMode);
      }
      if (isAndroid) {
        ImmersiveModeEngineModule.setMode(currentImmersiveMode);
      }
    } else {
      if (isWeb && webAudioInitialized) {
        WebAudioEffectsEngine.resetEQ();
      }
      if (isAndroid) {
        ImmersiveModeEngineModule.setMode('off');
        PlaybackEngineModule.setEqBands(EQ_PRESETS_10BAND.Flat);
      }
    }
  }, [webAudioInitialized]);

  const setImmersiveMode = useCallback(async (newMode: ImmersiveMode): Promise<{ success: boolean; error?: string }> => {
    const isWeb = Platform.OS === 'web';
    const isAndroid = Platform.OS === 'android';
    
    try {
      if (newMode !== 'off') {
        if (isWeb && webAudioInitialized) {
          WebAudioEffectsEngine.applyImmersiveMode(newMode);
        }
        if (isAndroid) {
          await ImmersiveModeEngineModule.setMode(newMode);
        }
        setImmersiveModeName(newMode);
        setMode('immersive');
      } else {
        if (isWeb && webAudioInitialized) {
          WebAudioEffectsEngine.applySevenBandEQ(EQ_PRESETS.Flat);
        }
        if (isAndroid) {
          await ImmersiveModeEngineModule.setMode('off');
          PlaybackEngineModule.setEqBands(EQ_PRESETS_10BAND.Flat);
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
        // Default to Flat EQ preset
        setEqPresetName('Flat');
        setMode('equalizer');
      }
    } catch (error) {
      // Silent error handling
    }
  }, [webAudioInitialized]);

  const applyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    if (applyDebounceRef.current) {
      clearTimeout(applyDebounceRef.current);
    }
    applyDebounceRef.current = setTimeout(() => {
      applyEffectsToEngine(mode, eqBands, immersiveModeName, eqPresetName);
    }, 50);
    return () => {
      if (applyDebounceRef.current) {
        clearTimeout(applyDebounceRef.current);
      }
    };
  }, [mode, eqBands, immersiveModeName, eqPresetName, applyEffectsToEngine]);

  const appStateRef = useRef(AppState.currentState);
  
  useEffect(() => {
    refreshSettings();
    
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        refreshSettings();
      }
      appStateRef.current = nextAppState;
    });
    
    return () => subscription.remove();
  }, []);

  const contextValue = useMemo(
    () => ({
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
    }),
    [
      mode,
      eqPresetName,
      immersiveModeName,
      immersiveModeSettings,
      immersiveEffect,
      eqBands,
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
    ]
  );

  return (
    <SoundLabContext.Provider value={contextValue}>
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
