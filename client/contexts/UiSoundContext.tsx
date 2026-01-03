import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { getUiSoundEnabled, setUiSoundEnabled as saveUiSoundEnabled } from '@/lib/storage';

interface UiSoundContextValue {
  uiSoundEnabled: boolean;
  setUiSoundEnabled: (enabled: boolean) => void;
  playTapSound: () => void;
}

const UiSoundContext = createContext<UiSoundContextValue | undefined>(undefined);

const TAP_SOUND_URI = 'https://cdn.jsdelivr.net/npm/ion-sound@3.0.7/sounds/water_droplet.mp3';

export function UiSoundProvider({ children }: { children: ReactNode }) {
  const [uiSoundEnabled, setUiSoundEnabledState] = useState(false);
  const player = useAudioPlayer(TAP_SOUND_URI);

  useEffect(() => {
    getUiSoundEnabled().then(setUiSoundEnabledState);
  }, []);

  const setUiSoundEnabled = useCallback((enabled: boolean) => {
    setUiSoundEnabledState(enabled);
    saveUiSoundEnabled(enabled);
  }, []);

  const playTapSound = useCallback(() => {
    if (uiSoundEnabled && player) {
      try {
        player.seekTo(0);
        player.play();
      } catch (error) {
        // Silently fail if sound can't play
      }
    }
  }, [uiSoundEnabled, player]);

  return (
    <UiSoundContext.Provider value={{ uiSoundEnabled, setUiSoundEnabled, playTapSound }}>
      {children}
    </UiSoundContext.Provider>
  );
}

export function useUiSound() {
  const context = useContext(UiSoundContext);
  if (!context) {
    throw new Error('useUiSound must be used within UiSoundProvider');
  }
  return context;
}
