import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_FAVORITES = '@new_audio_360_radio_favorites';

export type FMBandType = 'fm' | 'am';

export interface RDSData {
  stationName?: string;
  programType?: string;
  radioText?: string;
  title?: string;
  artist?: string;
}

export interface RadioStation {
  id: string;
  frequency: number;
  frequencyMHz: number;
  bandType: FMBandType;
  signalStrength?: number;
  name?: string;
  isFavorite?: boolean;
}

interface FMCapabilities {
  hasRDS: boolean;
  hasStereo: boolean;
  hasAM: boolean;
  hasFM: boolean;
  hasEffectsSupport: boolean;
  minFrequency: number;
  maxFrequency: number;
}

interface RadioContextType {
  isAvailable: boolean;
  isInitialized: boolean;
  capabilities: FMCapabilities | null;
  currentFrequency: number;
  bandType: FMBandType;
  isPlaying: boolean;
  signalStrength: number;
  rdsData: RDSData;
  stations: RadioStation[];
  scanResults: RadioStation[];
  isScanning: boolean;
  needsHeadphoneAntenna: boolean;
  hasHeadphoneConnected: boolean;
  hasEffectsSupport: boolean;
  isEffectsAttached: boolean;
  error: string | null;
  
  initialize: () => Promise<{ success: boolean; error?: string }>;
  tune: (frequency: number, band?: FMBandType) => Promise<{ success: boolean; error?: string }>;
  play: () => Promise<{ success: boolean; error?: string }>;
  stop: () => Promise<{ success: boolean; error?: string }>;
  seekUp: () => Promise<{ success: boolean; error?: string }>;
  seekDown: () => Promise<{ success: boolean; error?: string }>;
  scan: (band?: FMBandType) => Promise<{ success: boolean; error?: string }>;
  addFavorite: (station: RadioStation) => Promise<void>;
  removeFavorite: (stationId: string) => Promise<void>;
  getAudioSessionId: () => number;
  release: () => Promise<void>;
}

const RadioContext = createContext<RadioContextType | undefined>(undefined);

export function RadioProvider({ children }: { children: ReactNode }) {
  const [stations, setStations] = useState<RadioStation[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_FAVORITES);
      if (data) {
        setStations(JSON.parse(data));
      }
    } catch (err) {
      console.error('Error loading radio favorites:', err);
    }
  };

  const saveFavorites = async (favorites: RadioStation[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
    } catch (err) {
      console.error('Error saving radio favorites:', err);
    }
  };

  const initialize = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'FM Radio not available - hardware support removed' };
  }, []);

  const tune = useCallback(async (_frequency: number, _band?: FMBandType): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'FM Radio not available' };
  }, []);

  const play = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'FM Radio not available' };
  }, []);

  const stop = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'FM Radio not available' };
  }, []);

  const seekUp = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'FM Radio not available' };
  }, []);

  const seekDown = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'FM Radio not available' };
  }, []);

  const scan = useCallback(async (_band?: FMBandType): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'FM Radio not available' };
  }, []);

  const addFavorite = useCallback(async (station: RadioStation): Promise<void> => {
    const existingIndex = stations.findIndex(
      s => s.frequency === station.frequency && s.bandType === station.bandType
    );
    
    if (existingIndex === -1) {
      const newStation: RadioStation = {
        ...station,
        id: `${station.bandType}-${station.frequency}-${Date.now()}`,
        isFavorite: true,
      };
      
      const updatedStations = [...stations, newStation];
      setStations(updatedStations);
      await saveFavorites(updatedStations);
    }
  }, [stations]);

  const removeFavorite = useCallback(async (stationId: string): Promise<void> => {
    const updatedStations = stations.filter(s => s.id !== stationId);
    setStations(updatedStations);
    await saveFavorites(updatedStations);
  }, [stations]);

  const getAudioSessionId = useCallback((): number => {
    return 0;
  }, []);

  const release = useCallback(async (): Promise<void> => {
  }, []);

  return (
    <RadioContext.Provider value={{
      isAvailable: false,
      isInitialized: false,
      capabilities: null,
      currentFrequency: 98.3,
      bandType: 'fm',
      isPlaying: false,
      signalStrength: 0,
      rdsData: {},
      stations,
      scanResults: [],
      isScanning: false,
      needsHeadphoneAntenna: true,
      hasHeadphoneConnected: false,
      hasEffectsSupport: false,
      isEffectsAttached: false,
      error: null,
      initialize,
      tune,
      play,
      stop,
      seekUp,
      seekDown,
      scan,
      addFavorite,
      removeFavorite,
      getAudioSessionId,
      release,
    }}>
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error('useRadio must be used within a RadioProvider');
  }
  return context;
}
