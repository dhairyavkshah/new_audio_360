import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  FMRadioModule, 
  FMBandType, 
  FMStation, 
  FMCapabilities,
  FMRadioState,
} from '../../modules/audio-effects';
import { NativeEffectsManager } from '@/services/NativeEffectsManager';

const STORAGE_KEY_FAVORITES = '@new_audio_360_radio_favorites';

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
  const [needsHeadphoneAntenna, setNeedsHeadphoneAntenna] = useState(true);
  const [hasHeadphoneConnected, setHasHeadphoneConnected] = useState(false);
  const [hasEffectsSupport, setHasEffectsSupport] = useState(false);
  const [isEffectsAttached, setIsEffectsAttached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioSessionIdRef = useRef<number>(0);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadFavorites();
    const available = Platform.OS === 'android' && FMRadioModule.isAvailable();
    setIsAvailable(available);
  }, []);

  useEffect(() => {
    if (!isInitialized || !isPlaying) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }
    
    pollingIntervalRef.current = setInterval(() => {
      const state = FMRadioModule.getCurrentState();
      
      const freqMHz = state.frequencyMHz ?? (state.frequency ? state.frequency / 1000000 : currentFrequency);
      if (freqMHz !== currentFrequency) {
        setCurrentFrequency(freqMHz);
      }
      if (state.bandType !== bandType) {
        setBandType(state.bandType);
      }
      if (state.signalStrength !== signalStrength) {
        setSignalStrength(state.signalStrength);
      }
      if (state.isPlaying !== isPlaying) {
        setIsPlaying(state.isPlaying);
      }
      if (state.hasHeadphoneAntenna !== hasHeadphoneConnected) {
        setHasHeadphoneConnected(state.hasHeadphoneAntenna);
      }
      
      if (state.rdsData && Object.keys(state.rdsData).length > 0) {
        setRdsData({
          stationName: state.rdsData.programService,
          radioText: state.rdsData.radioText,
          title: state.rdsData.title,
          artist: state.rdsData.artist,
        });
      }
    }, 500);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isInitialized, isPlaying, currentFrequency, bandType, signalStrength, hasHeadphoneConnected]);

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
    if (!isAvailable) {
      return { success: false, error: 'FM Radio not available on this device' };
    }
    
    try {
      setError(null);
      const initResult = await FMRadioModule.initialize();
      
      if (!initResult.success) {
        setError(initResult.error || 'Failed to initialize radio');
        return { success: false, error: initResult.error };
      }
      
      audioSessionIdRef.current = initResult.audioSessionId;
      setNeedsHeadphoneAntenna(initResult.needsHeadphoneAntenna);
      setHasHeadphoneConnected(initResult.hasHeadphoneAntenna);
      setIsInitialized(true);
      
      const caps = await FMRadioModule.getCapabilities();
      setCapabilities(caps);
      setHasEffectsSupport(caps.hasEffectsSupport);
      
      const state = FMRadioModule.getCurrentState();
      setCurrentFrequency(state.frequencyMHz);
      setBandType(state.bandType);
      setSignalStrength(state.signalStrength);
      setIsPlaying(state.isPlaying);
      
      return { success: true };
    } catch (err) {
      const errorMsg = String(err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isAvailable]);

  const tune = useCallback(async (frequency: number, band?: FMBandType): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'Radio not initialized' };
    }
    
    try {
      setError(null);
      const targetBand = band || bandType;
      
      const frequencyHz = targetBand === 'fm' 
        ? Math.round(frequency * 1000000)
        : Math.round(frequency * 1000);
      
      const result = await FMRadioModule.tune(frequencyHz, targetBand);
      
      if (result.success) {
        const freqMHz = result.frequencyMHz ?? (result.frequency ? result.frequency / 1000000 : frequency);
        setCurrentFrequency(freqMHz);
        if (result.bandType) {
          setBandType(result.bandType as FMBandType);
        }
      } else {
        setError(result.error || 'Failed to tune');
      }
      
      return { success: result.success, error: result.error };
    } catch (err) {
      const errorMsg = String(err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isInitialized, bandType]);

  const play = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'Radio not initialized' };
    }
    
    try {
      setError(null);
      const result = await FMRadioModule.play();
      
      if (result.success) {
        setIsPlaying(true);
        if (result.audioSessionId) {
          audioSessionIdRef.current = result.audioSessionId;
        }
        
        const sessionId = result.audioSessionId || audioSessionIdRef.current;
        if (sessionId > 0 && hasEffectsSupport) {
          const attached = await NativeEffectsManager.attachToRadioSession(sessionId);
          setIsEffectsAttached(attached);
          if (!attached) {
            console.warn('[RadioContext] Failed to attach Sound Lab effects to radio');
          } else {
            console.log('[RadioContext] Sound Lab effects attached to radio');
          }
        }
      } else {
        setError(result.error || 'Failed to play');
      }
      
      return { success: result.success, error: result.error };
    } catch (err) {
      const errorMsg = String(err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isInitialized, hasEffectsSupport]);

  const stop = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'Radio not initialized' };
    }
    
    try {
      setError(null);
      const result = await FMRadioModule.stop();
      
      if (result.success) {
        setIsPlaying(false);
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        if (isEffectsAttached) {
          await NativeEffectsManager.detachFromRadioSession();
          setIsEffectsAttached(false);
          console.log('[RadioContext] Sound Lab effects detached from radio');
        }
      } else {
        setError(result.error || 'Failed to stop');
      }
      
      return { success: result.success, error: result.error };
    } catch (err) {
      const errorMsg = String(err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isInitialized, isEffectsAttached]);

  const seekUp = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'Radio not initialized' };
    }
    
    try {
      setError(null);
      const result = await FMRadioModule.seekUp();
      
      if (result.success) {
        const freqMHz = result.frequencyMHz ?? (result.frequency ? result.frequency / 1000000 : null);
        if (freqMHz !== null) {
          setCurrentFrequency(freqMHz);
        }
      } else {
        setError(result.error || 'Failed to seek');
      }
      
      return { success: result.success, error: result.error };
    } catch (err) {
      const errorMsg = String(err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isInitialized]);

  const seekDown = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'Radio not initialized' };
    }
    
    try {
      setError(null);
      const result = await FMRadioModule.seekDown();
      
      if (result.success) {
        const freqMHz = result.frequencyMHz ?? (result.frequency ? result.frequency / 1000000 : null);
        if (freqMHz !== null) {
          setCurrentFrequency(freqMHz);
        }
      } else {
        setError(result.error || 'Failed to seek');
      }
      
      return { success: result.success, error: result.error };
    } catch (err) {
      const errorMsg = String(err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isInitialized]);

  const scan = useCallback(async (band?: FMBandType): Promise<{ success: boolean; error?: string }> => {
    if (!isInitialized) {
      return { success: false, error: 'Radio not initialized' };
    }
    
    try {
      setError(null);
      setIsScanning(true);
      setScanResults([]);
      
      const targetBand = band || bandType;
      const result = await FMRadioModule.scan(targetBand);
      
      setIsScanning(false);
      
      if (result.success) {
        const scannedStations: RadioStation[] = result.stations.map((station, index) => ({
          id: `${station.bandType}-${station.frequency}-${index}`,
          frequency: station.frequency,
          frequencyMHz: station.frequencyMHz,
          bandType: station.bandType,
          signalStrength: station.signalStrength,
          isFavorite: stations.some(s => 
            s.frequency === station.frequency && s.bandType === station.bandType
          ),
        }));
        
        setScanResults(scannedStations);
        return { success: true };
      } else {
        setError(result.error || 'Failed to scan');
        return { success: false, error: result.error };
      }
    } catch (err) {
      setIsScanning(false);
      const errorMsg = String(err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isInitialized, bandType, stations]);

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
    if (!isInitialized) {
      return 0;
    }
    return FMRadioModule.getAudioSessionId() || audioSessionIdRef.current;
  }, [isInitialized]);

  const release = useCallback(async (): Promise<void> => {
    try {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (isEffectsAttached) {
        await NativeEffectsManager.detachFromRadioSession();
        setIsEffectsAttached(false);
      }
      
      await FMRadioModule.release();
      
      setIsInitialized(false);
      setIsPlaying(false);
      setSignalStrength(0);
      setRdsData({});
      audioSessionIdRef.current = 0;
    } catch (err) {
      console.error('Error releasing radio:', err);
    }
  }, [isEffectsAttached]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
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
      needsHeadphoneAntenna,
      hasHeadphoneConnected,
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
