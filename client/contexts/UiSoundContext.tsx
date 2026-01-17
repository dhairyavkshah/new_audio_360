import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { getUiSoundEnabled, setUiSoundEnabled as saveUiSoundEnabled } from '@/lib/storage';
import { isMusicPlaying } from '@/lib/playbackState';

interface UiSoundContextValue {
  uiSoundEnabled: boolean;
  setUiSoundEnabled: (enabled: boolean) => void;
  playTickSound: () => void;
  playKeypressSound: () => void;
  playTapSound: () => void;
}

const UiSoundContext = createContext<UiSoundContextValue | undefined>(undefined);

const tickSound = require('@/assets/sounds/tick.ogg');
const keypressSound = require('@/assets/sounds/keypress.ogg');

export function UiSoundProvider({ children }: { children: ReactNode }) {
  const [uiSoundEnabled, setUiSoundEnabledState] = useState(false);
  const tickPlayer = useAudioPlayer(tickSound);
  const keypressPlayer = useAudioPlayer(keypressSound);

  useEffect(() => {
    getUiSoundEnabled().then(setUiSoundEnabledState);
  }, []);

  const setUiSoundEnabled = useCallback((enabled: boolean) => {
    setUiSoundEnabledState(enabled);
    saveUiSoundEnabled(enabled);
  }, []);

  const playTickSound = useCallback(() => {
    if (uiSoundEnabled && tickPlayer && !isMusicPlaying()) {
      try {
        tickPlayer.seekTo(0);
        tickPlayer.play();
      } catch (error) {
        // Silently fail if sound can't play
      }
    }
  }, [uiSoundEnabled, tickPlayer]);

  const playKeypressSound = useCallback(() => {
    if (uiSoundEnabled && keypressPlayer && !isMusicPlaying()) {
      try {
        keypressPlayer.seekTo(0);
        keypressPlayer.play();
      } catch (error) {
        // Silently fail if sound can't play
      }
    }
  }, [uiSoundEnabled, keypressPlayer]);

  const playTapSound = useCallback(() => {
    playKeypressSound();
  }, [playKeypressSound]);

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
