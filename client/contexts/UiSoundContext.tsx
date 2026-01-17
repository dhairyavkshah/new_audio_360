import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getUiSoundEnabled, setUiSoundEnabled as saveUiSoundEnabled } from '@/lib/storage';

interface UiSoundContextValue {
  uiSoundEnabled: boolean;
  setUiSoundEnabled: (enabled: boolean) => void;
  playTickSound: () => void;
  playKeypressSound: () => void;
  playTapSound: () => void;
}

const UiSoundContext = createContext<UiSoundContextValue | undefined>(undefined);

export function UiSoundProvider({ children }: { children: ReactNode }) {
  const [uiSoundEnabled, setUiSoundEnabledState] = useState(false);

  useEffect(() => {
    getUiSoundEnabled().then(setUiSoundEnabledState);
  }, []);

  const setUiSoundEnabled = useCallback((enabled: boolean) => {
    setUiSoundEnabledState(enabled);
    saveUiSoundEnabled(enabled);
  }, []);

  const playTickSound = useCallback(() => {
    // UI sounds disabled on Android to prevent audio focus conflicts with track player
    // Haptic feedback is used instead for tactile feedback
  }, []);

  const playKeypressSound = useCallback(() => {
    // UI sounds disabled on Android to prevent audio focus conflicts with track player
    // Haptic feedback is used instead for tactile feedback
  }, []);

  const playTapSound = useCallback(() => {
    // UI sounds disabled on Android to prevent audio focus conflicts with track player
    // Haptic feedback is used instead for tactile feedback
  }, []);

  return (
    <UiSoundContext.Provider value={{ 
      uiSoundEnabled, 
      setUiSoundEnabled, 
      playTickSound,
      playKeypressSound,
      playTapSound,
    }}>
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
