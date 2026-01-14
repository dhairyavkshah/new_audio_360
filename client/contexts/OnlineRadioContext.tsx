import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OnlineRadioService,
  OnlineRadioStation,
} from '@/services/OnlineRadioService';
import { TrackPlayerService, TrackMetadata, State } from '@/services/TrackPlayerService';

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
  stations: OnlineRadioStation[];
  popularStations: OnlineRadioStation[];
  currentStation: OnlineRadioStation | null;
  isPlaying: boolean;
  isBuffering: boolean;
  volume: number;

  detectLocation: () => Promise<{ countryCode: string | null; country: string | null }>;
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
  const [stations, setStations] = useState<OnlineRadioStation[]>([]);
  const [popularStations, setPopularStations] = useState<OnlineRadioStation[]>([]);
  const [currentStation, setCurrentStation] = useState<OnlineRadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolumeState] = useState(1.0);

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadCachedData();
    initializeTrackPlayer();
    return () => {
      cleanupSound();
    };
  }, []);

  const initializeTrackPlayer = async () => {
    if (!TrackPlayerService.isAvailable()) {
      console.log('[OnlineRadioContext] TrackPlayerService not available (web platform)');
      return;
    }

    try {
      const initialized = await TrackPlayerService.initialize();
      if (initialized) {
        setupTrackPlayerCallbacks();
        console.log('[OnlineRadioContext] TrackPlayerService initialized');
      }
    } catch (err) {
      console.warn('[OnlineRadioContext] Failed to initialize TrackPlayerService:', err);
    }
  };

  const setupTrackPlayerCallbacks = () => {
    TrackPlayerService.setCallbacks({
      onPlay: () => {
        setIsPlaying(true);
        setIsBuffering(false);
      },
      onPause: () => {
        setIsPlaying(false);
      },
      onStop: () => {
        setIsPlaying(false);
        setCurrentStation(null);
        setIsBuffering(false);
      },
      onStateChange: (state: State) => {
        if (state === State.Buffering) {
          setIsBuffering(true);
        } else if (state === State.Playing) {
          setIsBuffering(false);
          setIsPlaying(true);
        } else if (state === State.Paused) {
          setIsPlaying(false);
        }
      },
    });
  };

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
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (err) {
        console.warn('[OnlineRadioContext] Error cleaning up sound:', err);
      }
      soundRef.current = null;
    }
  };

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('[OnlineRadioContext] Playback error:', status.error);
        setError('Stream playback failed. The station may be temporarily unavailable.');
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
        100
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
        50
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

  const searchStations = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedStations = await OnlineRadioService.searchStations(query, 50);
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
    setError(null);
    setIsBuffering(true);

    try {
      const streamUrl = station.url_resolved || station.url;
      if (!streamUrl) {
        throw new Error('No stream URL available for this station');
      }

      // Try to use TrackPlayerService on native platforms
      if (TrackPlayerService.isAvailable()) {
        try {
          const trackMetadata: TrackMetadata = {
            id: station.stationuuid,
            url: streamUrl,
            title: station.name,
            artist: station.country || 'Online Radio',
            artwork: station.favicon || undefined,
            isLiveStream: true,
          };

          await TrackPlayerService.setQueue([trackMetadata]);
          await TrackPlayerService.play();
          setCurrentStation(station);
          setIsPlaying(true);
          setIsBuffering(false);

          OnlineRadioService.reportStationClick(station.stationuuid).catch(() => {});
          return;
        } catch (nativeErr) {
          console.warn('[OnlineRadioContext] TrackPlayerService failed, falling back to expo-av:', nativeErr);
        }
      }

      // Fallback to expo-av for web platform
      await cleanupSound();

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true, volume },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setCurrentStation(station);
      setIsPlaying(true);
      setIsBuffering(false);

      OnlineRadioService.reportStationClick(station.stationuuid).catch(() => {});
    } catch (err) {
      console.error('[OnlineRadioContext] playStation error:', err);
      const message = err instanceof Error ? err.message : 'Failed to play station';
      setError(message);
      setIsPlaying(false);
      setIsBuffering(false);
      setCurrentStation(null);
    }
  }, [volume, onPlaybackStatusUpdate]);

  const stopPlayback = useCallback(async (): Promise<void> => {
    try {
      if (TrackPlayerService.isAvailable()) {
        try {
          await TrackPlayerService.stop();
        } catch (nativeErr) {
          console.warn('[OnlineRadioContext] TrackPlayerService.stop() failed:', nativeErr);
        }
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
      setIsBuffering(false);
      setCurrentStation(null);
    } catch (err) {
      console.error('[OnlineRadioContext] stopPlayback error:', err);
    }
  }, []);

  const setVolume = useCallback(async (newVolume: number): Promise<void> => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    if (TrackPlayerService.isAvailable()) {
      try {
        await TrackPlayerService.setVolume(clampedVolume);
      } catch (err) {
        console.warn('[OnlineRadioContext] TrackPlayerService.setVolume error:', err);
      }
    }

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
        stations,
        popularStations,
        currentStation,
        isPlaying,
        isBuffering,
        volume,
        detectLocation,
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
