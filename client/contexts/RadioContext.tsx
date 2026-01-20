import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FMRadioModule, EqualizerModule } from 'audio-effects';

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
  const [isAvailable, setIsAvailable] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [capabilities, setCapabilities] = useState<FMCapabilities | null>(null);
  const [currentFrequency, setCurrentFrequency] = useState(98.3);
  const [bandType, setBandType] = useState<FMBandType>('fm');
  const [isPlaying, setIsPlaying] = useState(false);
  const [signalStrength, setSignalStrength] = useState(0);
  const [rdsData, setRdsData] = useState<RDSData>({});
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [scanResults, setScanResults] = useState<RadioStation[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasEffectsSupport, setHasEffectsSupport] = useState(false);
  const [isEffectsAttached, setIsEffectsAttached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioSessionIdRef = useRef<number>(0);

  useEffect(() => {
    checkAvailability();
    loadFavorites();
  }, []);

  const checkAvailability = useCallback(() => {
    if (Platform.OS === 'android') {
      const available = FMRadioModule.isAvailable();
      setIsAvailable(available);
      console.log('[RadioContext] FM Radio available:', available);
    } else {
      setIsAvailable(false);
    }
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_FAVORITES);
      if (data) {
        setStations(JSON.parse(data));
      }
    } catch (err) {
      console.error('[RadioContext] Error loading radio favorites:', err);
    }
  };

  const saveFavorites = async (favorites: RadioStation[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
    } catch (err) {
      console.error('[RadioContext] Error saving radio favorites:', err);
    }
  };

  const initialize = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS !== 'android') {
      return { success: false, error: 'FM Radio only available on Android' };
    }

    try {
      console.log('[RadioContext] Initializing FM Radio...');
      const result = await FMRadioModule.initialize();
      
      if (!result.success) {
        setError(result.error || 'Failed to initialize FM Radio');
        return { success: false, error: result.error };
      }

      if (!result.hasFMHardware) {
        setIsAvailable(false);
        return { success: false, error: 'FM Radio hardware not available on this device' };
      }

      setIsInitialized(true);
      audioSessionIdRef.current = result.audioSessionId || 0;
      
      if (result.capabilities) {
        setCapabilities({
          hasRDS: result.capabilities.hasRDS,
          hasStereo: result.capabilities.hasStereo,
          hasAM: result.capabilities.hasAM,
          hasFM: result.capabilities.hasFM,
          hasEffectsSupport: result.capabilities.hasEffectsSupport,
          minFrequency: result.capabilities.minFMFrequency,
          maxFrequency: result.capabilities.maxFMFrequency
        });
        setHasEffectsSupport(result.capabilities.hasEffectsSupport);
      }

      // Attach DSP effects to FM radio audio session
      if (audioSessionIdRef.current > 0 && EqualizerModule.isAvailable()) {
        try {
          const eqResult = await EqualizerModule.attach(audioSessionIdRef.current);
          if (eqResult.success) {
            setIsEffectsAttached(true);
            console.log('[RadioContext] DSP effects attached to FM Radio');
          }
        } catch (eqErr) {
          console.warn('[RadioContext] Failed to attach DSP effects:', eqErr);
        }
      }

      console.log('[RadioContext] FM Radio initialized successfully');
      return { success: true };
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[RadioContext] Initialize error:', err);
      return { success: false, error: message };
    }
  }, []);

  const tune = useCallback(async (frequency: number, band?: FMBandType): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'FM Radio not initialized' };
    }

    try {
      const targetBand = band || bandType;
      const result = await FMRadioModule.tune(frequency, targetBand);
      
      if (result.success) {
        setCurrentFrequency(result.frequency || frequency);
        if (band) setBandType(band);
        setSignalStrength(result.signalStrength || 0);
        setError(null);
      } else {
        setError(result.error || 'Tune failed');
      }
      
      return { success: result.success, error: result.error };
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tune failed';
      setError(message);
      return { success: false, error: message };
    }
  }, [isInitialized, bandType]);

  const play = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'FM Radio not initialized' };
    }

    try {
      const result = await FMRadioModule.play();
      
      if (result.success) {
        setIsPlaying(true);
        setError(null);
      } else {
        setError(result.error || 'Play failed');
      }
      
      return { success: result.success, error: result.error };
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Play failed';
      setError(message);
      return { success: false, error: message };
    }
  }, [isInitialized]);

  const stop = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await FMRadioModule.stop();
      
      if (result.success) {
        setIsPlaying(false);
        setError(null);
      }
      
      return { success: result.success, error: result.error };
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Stop failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const seekUp = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'FM Radio not initialized' };
    }

    try {
      const result = await FMRadioModule.seekUp();
      
      if (result.success && result.frequency) {
        setCurrentFrequency(result.frequency);
        setSignalStrength(result.signalStrength || 0);
        setError(null);
      }
      
      return { success: result.success, error: result.error };
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Seek failed';
      setError(message);
      return { success: false, error: message };
    }
  }, [isInitialized]);

  const seekDown = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'FM Radio not initialized' };
    }

    try {
      const result = await FMRadioModule.seekDown();
      
      if (result.success && result.frequency) {
        setCurrentFrequency(result.frequency);
        setSignalStrength(result.signalStrength || 0);
        setError(null);
      }
      
      return { success: result.success, error: result.error };
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Seek failed';
      setError(message);
      return { success: false, error: message };
    }
  }, [isInitialized]);

  const scan = useCallback(async (band?: FMBandType): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'FM Radio not initialized' };
    }

    try {
      setIsScanning(true);
      const targetBand = band || bandType;
      const result = await FMRadioModule.scan(targetBand);
      
      if (result.success && result.stations) {
        const formattedStations: RadioStation[] = result.stations.map((s, index) => ({
          id: `scan-${targetBand}-${s.frequency}-${index}`,
          frequency: s.frequency * (targetBand === 'fm' ? 1000000 : 1000),
          frequencyMHz: s.frequency,
          bandType: targetBand,
          signalStrength: s.signalStrength,
          isFavorite: false
        }));
        setScanResults(formattedStations);
        setError(null);
      } else {
        setError(result.error || 'Scan failed');
      }
      
      setIsScanning(false);
      return { success: result.success, error: result.error };
      
    } catch (err) {
      setIsScanning(false);
      const message = err instanceof Error ? err.message : 'Scan failed';
      setError(message);
      return { success: false, error: message };
    }
  }, [isInitialized, bandType]);

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
    return audioSessionIdRef.current;
  }, []);

  const release = useCallback(async (): Promise<void> => {
    try {
      await FMRadioModule.release();
      setIsInitialized(false);
      setIsPlaying(false);
      setIsEffectsAttached(false);
      audioSessionIdRef.current = 0;
    } catch (err) {
      console.error('[RadioContext] Release error:', err);
    }
  }, []);

  return (
    <RadioContext.Provider value={{
      isAvailable,
      isInitialized,
      capabilities,
      currentFrequency,
      bandType,
      isPlaying,
      signalStrength,
      rdsData,
      stations,
      scanResults,
      isScanning,
      needsHeadphoneAntenna: true,
      hasHeadphoneConnected: false,
      hasEffectsSupport,
      isEffectsAttached,
      error,
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
