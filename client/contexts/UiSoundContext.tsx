import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { getUiSoundEnabled, setUiSoundEnabled as saveUiSoundEnabled } from '@/lib/storage';
import { isMusicPlaying, subscribeToPlaybackState } from '@/lib/playbackState';

interface UiSoundContextValue {
  uiSoundEnabled: boolean;
  isPlaybackActive: boolean;
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
  const [isPlaybackActive, setIsPlaybackActive] = useState(isMusicPlaying());
  const tickPlayer = useAudioPlayer(tickSound);
  const keypressPlayer = useAudioPlayer(keypressSound);

  useEffect(() => {
    getUiSoundEnabled().then(setUiSoundEnabledState);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPlaybackState(setIsPlaybackActive);
    return unsubscribe;
  }, []);

  const setUiSoundEnabled = useCallback((enabled: boolean) => {
    setUiSoundEnabledState(enabled);
    saveUiSoundEnabled(enabled);
  }, []);

  const effectivelyEnabled = uiSoundEnabled && !isPlaybackActive;

  const playTickSound = useCallback(() => {
    if (effectivelyEnabled && tickPlayer) {
      try {
        tickPlayer.seekTo(0);
        tickPlayer.play();
      } catch (error) {
      }
    }
  }, [effectivelyEnabled, tickPlayer]);

  const playKeypressSound = useCallback(() => {
    if (effectivelyEnabled && keypressPlayer) {
      try {
        keypressPlayer.seekTo(0);
        keypressPlayer.play();
      } catch (error) {
      }
    }
  }, [effectivelyEnabled, keypressPlayer]);

  const playTapSound = useCallback(() => {
    playKeypressSound();
  }, [playKeypressSound]);

  return (
    <UiSoundContext.Provider value={{ 
      uiSoundEnabled, 
      isPlaybackActive,
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
