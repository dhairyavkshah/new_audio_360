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
  OnlineRadioCountry,
} from '@/services/OnlineRadioService';
import { TrackPlayerService, TrackMetadata, State, PlaybackSource } from '@/services/TrackPlayerService';
import { AudioCoordinator } from '@/services/AudioCoordinator';

const STORAGE_KEY_COUNTRY = '@new_audio_360_online_radio_country';
const STORAGE_KEY_STATIONS_CACHE = '@new_audio_360_online_radio_stations';
const STORAGE_KEY_POPULAR_CACHE = '@new_audio_360_online_radio_popular';
const STORAGE_KEY_CACHE_VERSION = '@new_audio_360_radio_cache_version';
const STORAGE_KEY_FAVORITES = '@new_audio_360_radio_favorites';

const CURRENT_CACHE_VERSION = '2'; // Increment to invalidate old cache
const CURATED_COUNTRIES = ['IN']; // Countries that use curated stations
const MAX_FAVORITES_PER_COUNTRY = 25;

const DEFAULT_COUNTRY_CODE = 'US';
const DEFAULT_COUNTRY = 'United States';

// Type for storing favorites per country
interface CountryFavorites {
  [countryCode: string]: OnlineRadioStation[];
}

interface OnlineRadioContextType {
  isLoading: boolean;
  error: string | null;
  detectedCountry: string | null;
  detectedCountryCode: string | null;
  availableCountries: OnlineRadioCountry[];
  stations: OnlineRadioStation[];
  popularStations: OnlineRadioStation[];
  favoriteStations: OnlineRadioStation[];
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
  addStationToFavorites: (station: OnlineRadioStation) => Promise<boolean>;
  removeStationFromFavorites: (stationUuid: string) => Promise<void>;
  isStationFavorite: (stationUuid: string) => boolean;
  getFavoriteCount: () => number;
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
  const [favoriteStations, setFavoriteStations] = useState<OnlineRadioStation[]>([]);
  const [allFavorites, setAllFavorites] = useState<CountryFavorites>({});
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
        if (TrackPlayerService.getPlaybackSource() === 'radio') {
          setIsPlaying(true);
          setIsBuffering(false);
        }
      },
      onPause: () => {
        if (TrackPlayerService.getPlaybackSource() === 'radio') {
          setIsPlaying(false);
        }
      },
      onStop: () => {
        if (TrackPlayerService.getPlaybackSource() === 'radio') {
          setIsPlaying(false);
          setCurrentStation(null);
          setIsBuffering(false);
        }
      },
      onStateChange: (state: typeof State) => {
        if (TrackPlayerService.getPlaybackSource() !== 'radio') return;
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
      // Check cache version - invalidate if outdated
      const cachedVersion = await AsyncStorage.getItem(STORAGE_KEY_CACHE_VERSION);
      const needsCacheInvalidation = cachedVersion !== CURRENT_CACHE_VERSION;
      
      if (needsCacheInvalidation) {
        console.log('[OnlineRadioContext] Cache version changed, invalidating old cache');
        await Promise.all([
          AsyncStorage.removeItem(STORAGE_KEY_STATIONS_CACHE),
          AsyncStorage.removeItem(STORAGE_KEY_POPULAR_CACHE),
          AsyncStorage.setItem(STORAGE_KEY_CACHE_VERSION, CURRENT_CACHE_VERSION),
        ]);
        // Continue to load country info even after invalidation
      }
      
      const cachedCountry = await AsyncStorage.getItem(STORAGE_KEY_COUNTRY);

      if (cachedCountry) {
        const { countryCode, country } = JSON.parse(cachedCountry);
        setDetectedCountryCode(countryCode);
        setDetectedCountry(country);
        
        // For curated countries, don't load cached stations - will be loaded fresh
        if (CURATED_COUNTRIES.includes(countryCode)) {
          console.log(`[OnlineRadioContext] Curated country ${countryCode}, will load fresh curated stations`);
          return; // Skip loading cached stations for curated countries
        }
      }

      // Only load cached stations for non-curated countries and when cache wasn't invalidated
      if (!needsCacheInvalidation) {
        const [cachedStations, cachedPopular] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_STATIONS_CACHE),
          AsyncStorage.getItem(STORAGE_KEY_POPULAR_CACHE),
        ]);

        if (cachedStations) {
          setStations(JSON.parse(cachedStations));
        }

        if (cachedPopular) {
          setPopularStations(JSON.parse(cachedPopular));
        }
      }
    } catch (err) {
      console.warn('[OnlineRadioContext] Error loading cached data:', err);
    }
  };

  const cleanupSound = async () => {
    if (soundRef.current) {
      try {
        // Stop playback first, then unload
        await soundRef.current.stopAsync();
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
        throw new Error('No stream URL available for this station');
      }

      if (TrackPlayerService.isAvailable()) {
        try {
          await TrackPlayerService.stop();
          
          TrackPlayerService.setPlaybackSource('radio');
          
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
          AudioCoordinator.notifyPlaybackStarted('radio');

          OnlineRadioService.reportStationClick(station.stationuuid).catch(() => {});
          return;
        } catch (nativeErr) {
          console.warn('[OnlineRadioContext] TrackPlayerService failed, falling back to expo-av:', nativeErr);
        }
      }

      await cleanupSound();

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('[OnlineRadioContext] Loading stream:', streamUrl);
      
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
      setCurrentStation(station);
      setIsPlaying(true);
      setIsBuffering(false);
      console.log('[OnlineRadioContext] Stream loaded successfully:', station.name);
      AudioCoordinator.notifyPlaybackStarted('radio');

      OnlineRadioService.reportStationClick(station.stationuuid).catch(() => {});
    } catch (err) {
      console.error('[OnlineRadioContext] playStation error:', err);
      const message = err instanceof Error ? err.message : 'Failed to play station';
      setError(message);
      setIsPlaying(false);
      setIsBuffering(false);
      setCurrentStation(null);
    }
  }, [volume, onPlaybackStatusUpdate, currentStation, isPlaying]);

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
      AudioCoordinator.notifyPlaybackStopped('radio');
    } catch (err) {
      console.error('[OnlineRadioContext] stopPlayback error:', err);
    }
  }, []);

  useEffect(() => {
    AudioCoordinator.registerRadioStopCallback(stopPlayback);
  }, [stopPlayback]);

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

  const loadFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_FAVORITES);
      if (stored) {
        const parsed: CountryFavorites = JSON.parse(stored);
        setAllFavorites(parsed);
      }
    } catch (err) {
      console.warn('[OnlineRadioContext] Error loading favorites:', err);
    }
  }, []);

  const saveFavorites = useCallback(async (favorites: CountryFavorites) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
    } catch (err) {
      console.warn('[OnlineRadioContext] Error saving favorites:', err);
    }
  }, []);

  const addStationToFavorites = useCallback(async (station: OnlineRadioStation): Promise<boolean> => {
    const countryCode = detectedCountryCode || DEFAULT_COUNTRY_CODE;
    
    return new Promise((resolve) => {
      setAllFavorites((prev) => {
        const currentFavorites = prev[countryCode] || [];
        
        if (currentFavorites.length >= MAX_FAVORITES_PER_COUNTRY) {
          setError(`Maximum ${MAX_FAVORITES_PER_COUNTRY} favorites per country reached`);
          resolve(false);
          return prev;
        }
        
        if (currentFavorites.some(s => s.stationuuid === station.stationuuid)) {
          resolve(false);
          return prev;
        }
        
        const updatedCountryFavorites = [...currentFavorites, station];
        const updatedAllFavorites = {
          ...prev,
          [countryCode]: updatedCountryFavorites,
        };
        
        saveFavorites(updatedAllFavorites);
        console.log(`[OnlineRadioContext] Added ${station.name} to favorites for ${countryCode}`);
        resolve(true);
        return updatedAllFavorites;
      });
    });
  }, [detectedCountryCode, saveFavorites]);

  const removeStationFromFavorites = useCallback(async (stationUuid: string): Promise<void> => {
    const countryCode = detectedCountryCode || DEFAULT_COUNTRY_CODE;
    
    setAllFavorites((prev) => {
      const currentFavorites = prev[countryCode] || [];
      const updatedCountryFavorites = currentFavorites.filter(s => s.stationuuid !== stationUuid);
      const updatedAllFavorites = {
        ...prev,
        [countryCode]: updatedCountryFavorites,
      };
      
      saveFavorites(updatedAllFavorites);
      console.log(`[OnlineRadioContext] Removed station from favorites for ${countryCode}`);
      return updatedAllFavorites;
    });
  }, [detectedCountryCode, saveFavorites]);

  const isStationFavorite = useCallback((stationUuid: string): boolean => {
    const countryCode = detectedCountryCode || DEFAULT_COUNTRY_CODE;
    const currentFavorites = allFavorites[countryCode] || [];
    return currentFavorites.some(s => s.stationuuid === stationUuid);
  }, [detectedCountryCode, allFavorites]);

  const getFavoriteCount = useCallback((): number => {
    const countryCode = detectedCountryCode || DEFAULT_COUNTRY_CODE;
    return (allFavorites[countryCode] || []).length;
  }, [detectedCountryCode, allFavorites]);

  useEffect(() => {
    if (detectedCountryCode) {
      const countryFavorites = allFavorites[detectedCountryCode] || [];
      setFavoriteStations(countryFavorites);
    }
  }, [detectedCountryCode, allFavorites]);

  useEffect(() => {
    loadFavorites();
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
        favoriteStations,
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
        addStationToFavorites,
        removeStationFromFavorites,
        isStationFavorite,
        getFavoriteCount,
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
