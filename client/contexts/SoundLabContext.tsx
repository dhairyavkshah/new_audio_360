import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { getEQPreset, getSoundMode } from '@/lib/storage';
import { 
  ImmersiveModeEngineModule, 
  IMMERSIVE_MODE_INFO, 
  ImmersiveMode, 
  ImmersiveModeSettings,
  ImmersiveModeInfo,
  EqualizerModule,
  PlaybackEngineModule
} from '../../modules/audio-effects';
import { AudioSessionSource } from '@/services/NativeEffectsManager';
import { WebAudioEffectsEngine } from '@/services/WebAudioEffectsEngine';

// Preset name to index mapping for Android EqualizerModule.usePreset()
const PRESET_INDEX: Record<string, number> = {
  Flat: 0, Rock: 1, Pop: 2, Jazz: 3, Classical: 4,
  Electronic: 5, 'Hip-Hop': 6, Acoustic: 7, 'Bass+': 8, Clarity: 9
};

// Immersive mode name mapping for Android ImmersiveModeEngineModule
const IMMERSIVE_MODE_ANDROID: Record<ImmersiveMode, string> = {
  off: 'off', music: 'music', '360_reality': '360_reality',
  gaming: 'gaming', podcast: 'podcast', movie: 'movie', sports: 'sports', custom: 'off'
};

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
  'Bass+': [2.5, 1.8, 1.0, -0.4, -0.9, -0.9, -0.9, -0.9, -0.4, -0.9],
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
  
  const immersiveModeAttachedRef = useRef(false);
  
  const ensureImmersiveModeAttached = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !ImmersiveModeEngineModule.isAvailable()) {
      return false;
    }
    
    if (immersiveModeAttachedRef.current) {
      return true;
    }
    
    try {
      const currentMode = ImmersiveModeEngineModule.getCurrentMode();
      if (currentMode.isAttached) {
        immersiveModeAttachedRef.current = true;
        return true;
      }
      
      const status = await PlaybackEngineModule.getStatus();
      const sessionId = status.audioSessionId || 0;
      
      const attachResult = await ImmersiveModeEngineModule.attach(sessionId);
      if (attachResult.success) {
        immersiveModeAttachedRef.current = true;
        return true;
      }
      console.warn('[SoundLab] Failed to attach ImmersiveModeEngine:', attachResult.error);
      return false;
    } catch (error) {
      console.warn('[SoundLab] Error attaching ImmersiveModeEngine:', error);
      return false;
    }
  }, []);

  const setBassBoost = useCallback((value: number) => {
    const clampedValue = Math.max(-5, Math.min(5, value));
    setBassBoostState(clampedValue);
    // Web DSP
    if (Platform.OS === 'web' && webAudioInitialized) {
      WebAudioEffectsEngine.setBassBoost(clampedValue);
    }
    // Android DSP
    if (Platform.OS === 'android' && EqualizerModule.isAvailable()) {
      EqualizerModule.setBassBoost(clampedValue);
    }
  }, [webAudioInitialized]);

  const setTrebleBoost = useCallback((value: number) => {
    const clampedValue = Math.max(-5, Math.min(5, value));
    setTrebleBoostState(clampedValue);
    // Web DSP
    if (Platform.OS === 'web' && webAudioInitialized) {
      WebAudioEffectsEngine.setTrebleBoost(clampedValue);
    }
    // Android DSP
    if (Platform.OS === 'android' && EqualizerModule.isAvailable()) {
      EqualizerModule.setTrebleBoost(clampedValue);
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

  const applyEffectsToEngine = useCallback(async (currentMode: SoundLabMode, currentEqBands: number[], currentImmersiveMode: ImmersiveMode, presetName: string) => {
    // Web DSP: Apply via WebAudioEffectsEngine (Web Audio API)
    if (Platform.OS === 'web' && webAudioInitialized) {
      if (currentMode === 'equalizer') {
        WebAudioEffectsEngine.applyEQ(currentEqBands);
      } else if (currentMode === 'immersive' && currentImmersiveMode !== 'off') {
        WebAudioEffectsEngine.applyImmersiveMode(currentImmersiveMode);
      } else {
        WebAudioEffectsEngine.resetEQ();
      }
    }
    
    // Android DSP: Apply via native modules (SoftwareDSPAudioProcessor)
    if (Platform.OS === 'android') {
      if (currentMode === 'equalizer') {
        // First reset immersive mode to clear bass/treble/virtualizer settings
        if (ImmersiveModeEngineModule.isAvailable() && immersiveModeAttachedRef.current) {
          try {
            await ImmersiveModeEngineModule.setMode('off');
          } catch (err) {
            // Ignore errors - we're just resetting
          }
        }
        // Then apply the EQ preset
        const presetIndex = PRESET_INDEX[presetName] ?? 0;
        if (EqualizerModule.isAvailable()) {
          EqualizerModule.usePreset(presetIndex);
        }
      } else if (currentMode === 'immersive' && currentImmersiveMode !== 'off') {
        if (ImmersiveModeEngineModule.isAvailable()) {
          const attached = await ensureImmersiveModeAttached();
          if (attached) {
            try {
              await ImmersiveModeEngineModule.setMode(IMMERSIVE_MODE_ANDROID[currentImmersiveMode] as ImmersiveMode);
            } catch (err) {
              console.warn('[SoundLab] Failed to set immersive mode:', err);
            }
          }
        }
      } else {
        if (EqualizerModule.isAvailable()) {
          EqualizerModule.usePreset(0); // Flat
        }
      }
    }
  }, [webAudioInitialized, ensureImmersiveModeAttached]);

  const setImmersiveMode = useCallback(async (newMode: ImmersiveMode): Promise<{ success: boolean; error?: string }> => {
    try {
      if (newMode !== 'off') {
        // Web DSP
        if (Platform.OS === 'web' && webAudioInitialized) {
          WebAudioEffectsEngine.applyImmersiveMode(newMode);
        }
        // Android DSP
        if (Platform.OS === 'android' && ImmersiveModeEngineModule.isAvailable()) {
          const attached = await ensureImmersiveModeAttached();
          if (attached) {
            const result = await ImmersiveModeEngineModule.setMode(IMMERSIVE_MODE_ANDROID[newMode] as ImmersiveMode);
            if (!result.success) {
              return { success: false, error: result.error || 'Failed to set immersive mode' };
            }
          } else {
            return { success: false, error: 'Could not attach immersive mode engine' };
          }
        }
        setImmersiveModeName(newMode);
        setMode('immersive');
      } else {
        // Web DSP
        if (Platform.OS === 'web' && webAudioInitialized) {
          WebAudioEffectsEngine.applyEQ(EQ_PRESETS.Flat);
        }
        // Android DSP: Turn off immersive mode by resetting to flat EQ
        if (Platform.OS === 'android') {
          if (ImmersiveModeEngineModule.isAvailable() && immersiveModeAttachedRef.current) {
            try {
              await ImmersiveModeEngineModule.setMode('off');
            } catch (err) {
              console.warn('[SoundLab] Failed to turn off immersive mode:', err);
            }
          }
          if (EqualizerModule.isAvailable()) {
            EqualizerModule.usePreset(0); // Flat
          }
        }
        setImmersiveModeName('off');
        setEqPresetName('Flat');
        setMode('equalizer');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, [webAudioInitialized, ensureImmersiveModeAttached]);

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
    applyEffectsToEngine(mode, eqBands, immersiveModeName, eqPresetName);
  }, [mode, eqBands, immersiveModeName, eqPresetName, applyEffectsToEngine]);

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
