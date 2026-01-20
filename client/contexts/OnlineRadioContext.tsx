import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OnlineRadioService,
  OnlineRadioStation,
  OnlineRadioCountry,
} from '@/services/OnlineRadioService';
import { AudioCoordinator } from '@/services/AudioCoordinator';
import { PlaybackEngineModule } from '../../modules/audio-effects';
import { WebAudioEffectsEngine } from '@/services/WebAudioEffectsEngine';

const STORAGE_KEY_COUNTRY = '@new_audio_360_online_radio_country';
const STORAGE_KEY_STATIONS_CACHE = '@new_audio_360_online_radio_stations';
const STORAGE_KEY_POPULAR_CACHE = '@new_audio_360_online_radio_popular';

const DEFAULT_COUNTRY_CODE = 'US';
const DEFAULT_COUNTRY = 'United States';

interface OnlineRadioContextType {
  isLoading: boolean;
  error: string | null;
  detectedCountry: string | null;
  detectedCountryCode: string | null;
  availableCountries: OnlineRadioCountry[];
  stations: OnlineRadioStation[];
  popularStations: OnlineRadioStation[];
  currentStation: OnlineRadioStation | null;
  isPlaying: boolean;
  isBuffering: boolean;
  volume: number;

  detectLocation: () => Promise<{ countryCode: string | null; country: string | null }>;
  loadCountries: () => Promise<void>;
  setCountryManual: (countryCode: string, countryName: string) => Promise<void>;
  loadStations: (countryCode: string) => Promise<void>;
  loadPopularStations: (countryCode?: string) => Promise<void>;
  searchStations: (query: string) => Promise<void>;
  playStation: (station: OnlineRadioStation) => Promise<void>;
  stopPlayback: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  clearError: () => void;
}

const OnlineRadioContext = createContext<OnlineRadioContextType | undefined>(undefined);

export function OnlineRadioProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [detectedCountryCode, setDetectedCountryCode] = useState<string | null>(null);
  const [availableCountries, setAvailableCountries] = useState<OnlineRadioCountry[]>([]);
  const [stations, setStations] = useState<OnlineRadioStation[]>([]);
  const [popularStations, setPopularStations] = useState<OnlineRadioStation[]>([]);
  const [currentStation, setCurrentStation] = useState<OnlineRadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolumeState] = useState(1.0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const currentStationRef = useRef<OnlineRadioStation | null>(currentStation);
  
  // Web Audio API refs for DSP processing
  const webAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const webMediaSourceRef = useRef<any>(null);

  useEffect(() => {
    currentStationRef.current = currentStation;
  }, [currentStation]);

  useEffect(() => {
    loadCachedData();
    return () => {
      cleanupSound();
    };
  }, []);

  const loadCachedData = async () => {
    try {
      const [cachedCountry, cachedStations, cachedPopular] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_COUNTRY),
        AsyncStorage.getItem(STORAGE_KEY_STATIONS_CACHE),
        AsyncStorage.getItem(STORAGE_KEY_POPULAR_CACHE),
      ]);

      if (cachedCountry) {
        const { countryCode, country } = JSON.parse(cachedCountry);
        setDetectedCountryCode(countryCode);
        setDetectedCountry(country);
      }

      if (cachedStations) {
        setStations(JSON.parse(cachedStations));
      }

      if (cachedPopular) {
        setPopularStations(JSON.parse(cachedPopular));
      }
    } catch (err) {
      console.warn('[OnlineRadioContext] Error loading cached data:', err);
    }
  };

  const cleanupSound = async () => {
    // Cleanup expo-av sound (used as fallback)
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (err) {
        console.warn('[OnlineRadioContext] Error cleaning up expo-av sound:', err);
      }
      soundRef.current = null;
    }
    
    // Cleanup Web Audio API elements
    if (webAudioElementRef.current) {
      try {
        webAudioElementRef.current.pause();
        webAudioElementRef.current.src = '';
        if (webMediaSourceRef.current) {
          WebAudioEffectsEngine.disconnectMediaElementSource(webMediaSourceRef.current);
        }
      } catch (err) {
        console.warn('[OnlineRadioContext] Error cleaning up web audio:', err);
      }
      webAudioElementRef.current = null;
      webMediaSourceRef.current = null;
    }
  };

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('[OnlineRadioContext] Playback error:', status.error);
        setError('Streaming source unavailable. The station may be temporarily offline.');
        setIsPlaying(false);
        setIsBuffering(false);
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    setIsBuffering(status.isBuffering);
  }, []);

  const detectLocation = useCallback(async (): Promise<{
    countryCode: string | null;
    country: string | null;
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[OnlineRadioContext] Location permission denied, using default');
        const fallback = { countryCode: DEFAULT_COUNTRY_CODE, country: DEFAULT_COUNTRY };
        await cacheCountry(fallback.countryCode, fallback.country);
        return fallback;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      const { latitude, longitude } = location.coords;
      const result = await OnlineRadioService.getCountryFromCoords(latitude, longitude);

      if (result.countryCode && result.country) {
        setDetectedCountryCode(result.countryCode);
        setDetectedCountry(result.country);
        await cacheCountry(result.countryCode, result.country);
        return result;
      }

      const fallback = { countryCode: DEFAULT_COUNTRY_CODE, country: DEFAULT_COUNTRY };
      setDetectedCountryCode(fallback.countryCode);
      setDetectedCountry(fallback.country);
      await cacheCountry(fallback.countryCode, fallback.country);
      return fallback;
    } catch (err) {
      console.error('[OnlineRadioContext] Location detection error:', err);
      const fallback = { countryCode: DEFAULT_COUNTRY_CODE, country: DEFAULT_COUNTRY };
      setDetectedCountryCode(fallback.countryCode);
      setDetectedCountry(fallback.country);
      await cacheCountry(fallback.countryCode, fallback.country);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cacheCountry = async (countryCode: string, country: string) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_COUNTRY,
        JSON.stringify({ countryCode, country })
      );
    } catch (err) {
      console.warn('[OnlineRadioContext] Error caching country:', err);
    }
  };

  const loadStations = useCallback(async (countryCode: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedStations = await OnlineRadioService.getStationsByCountryCode(
        countryCode,
        250
      );
      setStations(fetchedStations);

      try {
        await AsyncStorage.setItem(
          STORAGE_KEY_STATIONS_CACHE,
          JSON.stringify(fetchedStations)
        );
      } catch (cacheErr) {
        console.warn('[OnlineRadioContext] Error caching stations:', cacheErr);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load stations';
      setError(message);
      console.error('[OnlineRadioContext] loadStations error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPopularStations = useCallback(async (countryCode?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedStations = await OnlineRadioService.getPopularStations(
        countryCode,
        250
      );
      setPopularStations(fetchedStations);

      try {
        await AsyncStorage.setItem(
          STORAGE_KEY_POPULAR_CACHE,
          JSON.stringify(fetchedStations)
        );
      } catch (cacheErr) {
        console.warn('[OnlineRadioContext] Error caching popular stations:', cacheErr);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load popular stations';
      setError(message);
      console.error('[OnlineRadioContext] loadPopularStations error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCountries = useCallback(async (): Promise<void> => {
    if (availableCountries.length > 0) return;
    
    try {
      const countries = await OnlineRadioService.getCountries();
      setAvailableCountries(countries);
    } catch (err) {
      console.error('[OnlineRadioContext] loadCountries error:', err);
    }
  }, [availableCountries.length]);

  const setCountryManual = useCallback(async (countryCode: string, countryName: string): Promise<void> => {
    // Clear old popular stations immediately when country changes
    setPopularStations([]);
    setDetectedCountryCode(countryCode);
    setDetectedCountry(countryName);
    await cacheCountry(countryCode, countryName);
    // Clear cached popular stations to force refresh
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_POPULAR_CACHE);
    } catch (err) {
      console.warn('[OnlineRadioContext] Error clearing popular cache:', err);
    }
    await loadPopularStations(countryCode);
  }, [loadPopularStations]);

  const searchStations = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedStations = await OnlineRadioService.searchStations(query, 250);
      setStations(fetchedStations);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      console.error('[OnlineRadioContext] searchStations error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const playStation = useCallback(async (station: OnlineRadioStation): Promise<void> => {
    if (currentStation?.stationuuid === station.stationuuid && isPlaying) {
      console.log('[OnlineRadioContext] Station already playing:', station.name);
      setError('This station is already playing');
      setTimeout(() => setError(null), 2000);
      return;
    }

    setError(null);
    setIsBuffering(true);

    try {
      await AudioCoordinator.requestPlayback('radio');

      const streamUrl = station.url_resolved || station.url;
      if (!streamUrl) {
        throw new Error('Streaming source unavailable');
      }

      if (Platform.OS === 'android' && PlaybackEngineModule.isAvailable()) {
        try {
          console.log('[OnlineRadioContext] Using PlaybackEngineModule for radio stream on Android');
          
          await PlaybackEngineModule.stop();
          
          const initResult = await PlaybackEngineModule.initialize();
          if (!initResult.success) {
            throw new Error(initResult.error || 'Failed to initialize PlaybackEngineModule');
          }
          
          const loadResult = await PlaybackEngineModule.loadTrack(streamUrl);
          if (!loadResult.success) {
            throw new Error(loadResult.error || 'Failed to load radio stream');
          }
          
          const playResult = await PlaybackEngineModule.play();
          if (!playResult.success) {
            throw new Error(playResult.error || 'Failed to start radio playback');
          }
          
          currentStationRef.current = station;
          setCurrentStation(station);
          setIsPlaying(true);
          setIsBuffering(false);
          AudioCoordinator.notifyPlaybackStarted('radio');

          OnlineRadioService.reportStationClick(station.stationuuid).catch(() => {});
          console.log('[OnlineRadioContext] Radio stream started via PlaybackEngineModule:', station.name);
          return;
        } catch (nativeErr) {
          console.warn('[OnlineRadioContext] PlaybackEngineModule failed, falling back to expo-av:', nativeErr);
        }
      }

      await cleanupSound();

      // Web platform: Use Web Audio API with DSP processing
      if (Platform.OS === 'web') {
        try {
          console.log('[OnlineRadioContext] Using Web Audio API with DSP for radio stream on Web');
          
          // Initialize WebAudioEffectsEngine if needed
          await WebAudioEffectsEngine.initialize();
          
          // Create HTML5 Audio element (use window.Audio to avoid TypeScript conflict with expo-av Audio)
          const AudioConstructor = (window as any).Audio || HTMLAudioElement;
          const audioElement = new AudioConstructor() as HTMLAudioElement;
          audioElement.crossOrigin = 'anonymous';
          audioElement.src = streamUrl;
          audioElement.volume = volume;
          webAudioElementRef.current = audioElement;
          
          // Use WebAudioEffectsEngine to create and connect the media source
          // This ensures the same AudioContext is used throughout the DSP chain
          const result = WebAudioEffectsEngine.createMediaElementSource(audioElement);
          if (result && result.connected) {
            webMediaSourceRef.current = result.source;
            console.log('[OnlineRadioContext] Radio stream connected to WebAudioEffectsEngine DSP chain');
          } else {
            // DSP not available, will use HTML5 Audio directly (no DSP effects)
            console.warn('[OnlineRadioContext] DSP not available, using HTML5 Audio directly');
          }
          
          // Set up event handlers
          audioElement.oncanplay = () => {
            setIsBuffering(false);
          };
          
          audioElement.onwaiting = () => {
            setIsBuffering(true);
          };
          
          audioElement.onerror = () => {
            setError('Streaming source unavailable');
            setIsPlaying(false);
            setIsBuffering(false);
            currentStationRef.current = null;
            setCurrentStation(null);
          };
          
          // Start playback
          await audioElement.play();
          
          currentStationRef.current = station;
          setCurrentStation(station);
          setIsPlaying(true);
          setIsBuffering(false);
          AudioCoordinator.notifyPlaybackStarted('radio');
          
          OnlineRadioService.reportStationClick(station.stationuuid).catch(() => {});
          console.log('[OnlineRadioContext] Radio stream started via Web Audio API with DSP:', station.name);
          return;
        } catch (webErr) {
          console.warn('[OnlineRadioContext] Web Audio API failed, falling back to expo-av:', webErr);
        }
      }

      // Fallback: expo-av for iOS or when Web Audio fails
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('[OnlineRadioContext] Loading stream via expo-av:', streamUrl);
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { 
          shouldPlay: true, 
          volume,
          progressUpdateIntervalMillis: 1000,
          positionMillis: 0,
          isLooping: false,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      currentStationRef.current = station;
      setCurrentStation(station);
      setIsPlaying(true);
      setIsBuffering(false);
      console.log('[OnlineRadioContext] Stream loaded successfully via expo-av:', station.name);
      AudioCoordinator.notifyPlaybackStarted('radio');

      OnlineRadioService.reportStationClick(station.stationuuid).catch(() => {});
    } catch (err) {
      console.error('[OnlineRadioContext] playStation error:', err);
      const rawMessage = err instanceof Error ? err.message : 'Failed to play station';
      const message = rawMessage.toLowerCase().includes('network') || rawMessage.toLowerCase().includes('timeout')
        ? 'Streaming source unavailable. Check your internet connection.'
        : rawMessage.toLowerCase().includes('url') || rawMessage.toLowerCase().includes('stream')
          ? 'Streaming source unavailable'
          : `Stream playback failed: ${rawMessage}`;
      setError(message);
      setIsPlaying(false);
      setIsBuffering(false);
      currentStationRef.current = null;
      setCurrentStation(null);
    }
  }, [volume, onPlaybackStatusUpdate, currentStation, isPlaying]);

  const stopPlayback = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'android' && PlaybackEngineModule.isAvailable()) {
        try {
          await PlaybackEngineModule.stop();
          console.log('[OnlineRadioContext] Radio stopped via PlaybackEngineModule');
        } catch (nativeErr) {
          console.warn('[OnlineRadioContext] PlaybackEngineModule.stop() failed:', nativeErr);
        }
      }

      // Stop Web Audio API playback
      if (webAudioElementRef.current) {
        try {
          webAudioElementRef.current.pause();
          webAudioElementRef.current.src = '';
          if (webMediaSourceRef.current) {
            WebAudioEffectsEngine.disconnectMediaElementSource(webMediaSourceRef.current);
          }
          console.log('[OnlineRadioContext] Radio stopped via Web Audio API');
        } catch (webErr) {
          console.warn('[OnlineRadioContext] Web Audio cleanup failed:', webErr);
        }
        webAudioElementRef.current = null;
        webMediaSourceRef.current = null;
      }

      // Stop expo-av sound
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      
      setIsPlaying(false);
      setIsBuffering(false);
      currentStationRef.current = null;
      setCurrentStation(null);
      AudioCoordinator.notifyPlaybackStopped('radio');
    } catch (err) {
      console.error('[OnlineRadioContext] stopPlayback error:', err);
    }
  }, []);

  useEffect(() => {
    AudioCoordinator.registerRadioStopCallback(stopPlayback);
  }, [stopPlayback]);

  useEffect(() => {
    if (Platform.OS === 'android' && PlaybackEngineModule.isAvailable()) {
      const handleError = (event: { code: number; message: string }) => {
        if (currentStationRef.current) {
          console.error('[OnlineRadioContext] PlaybackEngineModule error during radio playback:', event);
          setError(`Stream error: ${event.message || 'Connection lost'}`);
          setIsPlaying(false);
          setIsBuffering(false);
          currentStationRef.current = null;
          setCurrentStation(null);
          AudioCoordinator.notifyPlaybackStopped('radio');
        }
      };
      
      const subscription = PlaybackEngineModule.subscribeToError(handleError);
      return () => {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        }
      };
    }
  }, []);

  const setVolume = useCallback(async (newVolume: number): Promise<void> => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    if (Platform.OS === 'android' && PlaybackEngineModule.isAvailable()) {
      try {
        PlaybackEngineModule.setVolume(clampedVolume);
      } catch (err) {
        console.warn('[OnlineRadioContext] PlaybackEngineModule.setVolume error:', err);
      }
    }

    // Web Audio API volume control
    if (webAudioElementRef.current) {
      try {
        webAudioElementRef.current.volume = clampedVolume;
      } catch (err) {
        console.warn('[OnlineRadioContext] Web Audio setVolume error:', err);
      }
    }

    // expo-av volume control
    if (soundRef.current) {
      try {
        await soundRef.current.setVolumeAsync(clampedVolume);
      } catch (err) {
        console.warn('[OnlineRadioContext] expo-av setVolume error:', err);
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <OnlineRadioContext.Provider
      value={{
        isLoading,
        error,
        detectedCountry,
        detectedCountryCode,
        availableCountries,
        stations,
        popularStations,
        currentStation,
        isPlaying,
        isBuffering,
        volume,
        detectLocation,
        loadCountries,
        setCountryManual,
        loadStations,
        loadPopularStations,
        searchStations,
        playStation,
        stopPlayback,
        setVolume,
        clearError,
      }}
    >
      {children}
    </OnlineRadioContext.Provider>
  );
}

export function useOnlineRadio() {
  const context = useContext(OnlineRadioContext);
  if (!context) {
    throw new Error('useOnlineRadio must be used within an OnlineRadioProvider');
  }
  return context;
}

export type { OnlineRadioStation };
