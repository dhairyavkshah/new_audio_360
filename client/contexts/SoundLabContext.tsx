import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getEQPreset, getSoundMode } from '@/lib/storage';

export type EQBands = {
  sub: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  brilliance: number;
};

export type ImmersiveEffect = {
  stereoWidth: number;
  reverb: number;
  delay: number;
};

export type SoundLabMode = 'equalizer' | 'immersive' | 'off';

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

const IMMERSIVE_MODES: Record<string, ImmersiveEffect> = {
  Cinema: { stereoWidth: 1.4, reverb: 0.3, delay: 40 },
  Music: { stereoWidth: 1.2, reverb: 0.15, delay: 20 },
  Sports: { stereoWidth: 1.0, reverb: 0.05, delay: 0 },
  '360 Reality': { stereoWidth: 1.6, reverb: 0.4, delay: 60 },
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

interface SoundLabContextType {
  mode: SoundLabMode;
  eqPresetName: string;
  immersiveModeName: string;
  eqBands: EQBands;
  immersiveEffect: ImmersiveEffect;
  frequencies: typeof EQ_FREQUENCIES;
  refreshSettings: () => Promise<void>;
}

const SoundLabContext = createContext<SoundLabContextType | undefined>(undefined);

export function SoundLabProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SoundLabMode>('off');
  const [eqPresetName, setEqPresetName] = useState('Flat');
  const [immersiveModeName, setImmersiveModeName] = useState('Music');

  const eqBands = EQ_PRESETS[eqPresetName] || EQ_PRESETS.Flat;
  const immersiveEffect = IMMERSIVE_MODES[immersiveModeName] || IMMERSIVE_MODES.Music;

  const refreshSettings = useCallback(async () => {
    try {
      const eqPreset = await getEQPreset();
      const soundMode = await getSoundMode();
      
      if (eqPreset && EQ_PRESETS[eqPreset]) {
        setEqPresetName(eqPreset);
        setMode('equalizer');
      } else if (soundMode && IMMERSIVE_MODES[soundMode]) {
        setImmersiveModeName(soundMode);
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
      eqBands,
      immersiveEffect,
      frequencies: EQ_FREQUENCIES,
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
