import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '@/lib/data';
import { testSongs } from '@/lib/testSongs';
import { extractAlbumArt } from '@/lib/extractAlbumArt';
import { 
  getSelectedFolders as loadSelectedFoldersFromStorage, 
  setSelectedFolders as saveSelectedFoldersToStorage,
  getWebFolderData,
  WebFolderSong
} from '@/lib/storage';
import { getSessionWebFolders } from '@/lib/webFolderCache';
import { MediaStoreScannerModule } from 'audio-effects';

const HIDDEN_SONGS_KEY = '@new_audio_360_hidden_songs';
const ONBOARDING_COMPLETE_KEY = '@new_audio_360_onboarding_complete';
const SONGS_CACHE_KEY = '@new_audio_360_songs_cache';
const SONGS_CACHE_TIMESTAMP_KEY = '@new_audio_360_songs_cache_timestamp';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface DeviceSong extends Song {
  uri: string;
  filename: string;
  modificationTime: number;
  isFromDevice: boolean;
}

interface MediaLibraryContextValue {
  songs: DeviceSong[];
  allSongsIncludingHidden: DeviceSong[];
  isLoading: boolean;
  hasPermission: boolean | null;
  permissionStatus: MediaLibrary.PermissionStatus | null;
  error: string | null;
  progress: { loaded: number; total: number };
  isOnboardingComplete: boolean;
  usingMockData: boolean;
  selectedFolders: string[];
  requestPermission: () => Promise<boolean>;
  refreshSongs: () => Promise<void>;
  hideSong: (songId: string) => Promise<void>;
  unhideSong: (songId: string) => Promise<void>;
  hiddenSongIds: string[];
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  setSelectedFolders: (folders: string[]) => void;
  setWebAudioFiles: (files: WebFolderSong[]) => void;
}

const MediaLibraryContext = createContext<MediaLibraryContextValue | null>(null);

export function useMediaLibraryContext() {
  const context = useContext(MediaLibraryContext);
  if (!context) {
    throw new Error('useMediaLibraryContext must be used within MediaLibraryProvider');
  }
  return context;
}

interface MediaLibraryProviderProps {
  children: ReactNode;
}

export function MediaLibraryProvider({ children }: MediaLibraryProviderProps) {
  const [songs, setSongs] = useState<DeviceSong[]>([]);
  const [allSongsIncludingHidden, setAllSongsIncludingHidden] = useState<DeviceSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<MediaLibrary.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [hiddenSongIds, setHiddenSongIds] = useState<string[]>([]);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [usingMockData, setUsingMockData] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [selectedFolders, setSelectedFoldersState] = useState<string[]>([]);

  const loadHiddenSongs = useCallback(async (): Promise<string[]> => {
    try {
      const data = await AsyncStorage.getItem(HIDDEN_SONGS_KEY);
      if (data) {
        const ids = JSON.parse(data);
        setHiddenSongIds(ids);
        return ids;
      }
      return [];
    } catch (err) {
      console.error('Error loading hidden songs:', err);
      return [];
    }
  }, []);

  const saveHiddenSongs = useCallback(async (ids: string[]) => {
    try {
      await AsyncStorage.setItem(HIDDEN_SONGS_KEY, JSON.stringify(ids));
    } catch (err) {
      console.error('Error saving hidden songs:', err);
    }
  }, []);

  const loadOnboardingStatus = useCallback(async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      setIsOnboardingComplete(value === 'true');
    } catch {
      setIsOnboardingComplete(false);
    }
  }, []);

  const loadSelectedFolders = useCallback(async () => {
    try {
      const folders = await loadSelectedFoldersFromStorage();
      setSelectedFoldersState(folders);
    } catch (err) {
      console.error('Error loading selected folders:', err);
    }
  }, []);

  const loadCachedSongs = useCallback(async (): Promise<DeviceSong[] | null> => {
    if (Platform.OS === 'web') return null;
    
    try {
      const [cachedData, timestampStr] = await Promise.all([
        AsyncStorage.getItem(SONGS_CACHE_KEY),
        AsyncStorage.getItem(SONGS_CACHE_TIMESTAMP_KEY),
      ]);
      
      if (!cachedData || !timestampStr) return null;
      
      const timestamp = parseInt(timestampStr, 10);
      const age = Date.now() - timestamp;
      
      if (age > CACHE_MAX_AGE_MS) {
        console.log('[MediaLibrary] Song cache expired, will refresh');
        return null;
      }
      
      const songs = JSON.parse(cachedData) as DeviceSong[];
      console.log('[MediaLibrary] Loaded', songs.length, 'songs from cache');
      return songs;
    } catch (err) {
      console.error('[MediaLibrary] Error loading cached songs:', err);
      return null;
    }
  }, []);

  const saveSongsToCache = useCallback(async (songsToCache: DeviceSong[]) => {
    if (Platform.OS === 'web') return;
    
    try {
      await Promise.all([
        AsyncStorage.setItem(SONGS_CACHE_KEY, JSON.stringify(songsToCache)),
        AsyncStorage.setItem(SONGS_CACHE_TIMESTAMP_KEY, Date.now().toString()),
      ]);
      console.log('[MediaLibrary] Saved', songsToCache.length, 'songs to cache');
    } catch (err) {
      console.error('[MediaLibrary] Error saving songs to cache:', err);
    }
  }, []);

  const setSelectedFolders = useCallback((folders: string[]) => {
    setSelectedFoldersState(folders);
    saveSelectedFoldersToStorage(folders);
  }, []);

  const setWebAudioFiles = useCallback((files: WebFolderSong[]) => {
    if (Platform.OS !== 'web') return;
    
    const webSongs: DeviceSong[] = files.map(file => {
      const artist = parseArtistFromFilename(file.filename);
      return {
        id: file.id,
        title: file.title,
        artist: artist || 'Unknown Artist',
        album: 'Local Folder',
        duration: 0,
        artwork: `https://picsum.photos/seed/${file.id}/400/400`,
        uri: file.blobUrl || file.path,
        filename: file.filename,
        modificationTime: Date.now(),
        isFromDevice: true,
      };
    });
    
    const filtered = webSongs.filter(s => !hiddenSongIds.includes(s.id));
    setSongs(filtered);
    setAllSongsIncludingHidden(webSongs);
    setUsingMockData(false);
    setProgress({ loaded: filtered.length, total: webSongs.length });
  }, [hiddenSongIds]);

  const checkPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setHasPermission(false);
      setPermissionStatus(null);
      return false;
    }

    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      setPermissionStatus(status);
      const granted = status === MediaLibrary.PermissionStatus.GRANTED;
      setHasPermission(granted);
      return granted;
    } catch (err) {
      console.error('Error checking permission:', err);
      setHasPermission(false);
      return false;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setError('Media library access is not available on web. Please use Expo Go on your device.');
      return false;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setPermissionStatus(status);
      const granted = status === MediaLibrary.PermissionStatus.GRANTED;
      setHasPermission(granted);
      return granted;
    } catch (err) {
      console.error('Error requesting permission:', err);
      setError('Failed to request media library permission');
      return false;
    }
  }, []);

  const fetchAudioFiles = useCallback(async (hiddenIds: string[], folderIds: string[]) => {
    console.log('[MediaLibrary] fetchAudioFiles called', { platform: Platform.OS, folderCount: folderIds.length });
    
    if (Platform.OS === 'web') {
      const sessionFolders = getSessionWebFolders();
      const webFolders = sessionFolders.length > 0 ? sessionFolders : await getWebFolderData();
      
      if (webFolders.length > 0) {
        const allWebSongs = webFolders.flatMap(folder => folder.songs);
        const playableSongs = allWebSongs.filter(song => song.blobUrl);
        
        if (playableSongs.length === 0) {
          setUsingMockData(false);
          setSongs([]);
          setAllSongsIncludingHidden([]);
          return;
        }
        
        const webSongs: DeviceSong[] = playableSongs.map(song => {
          const artist = parseArtistFromFilename(song.filename);
          return {
            id: song.id,
            title: song.title,
            artist: artist || 'Unknown Artist',
            album: 'Local Folder',
            duration: 0,
            artwork: `https://picsum.photos/seed/${song.id}/400/400`,
            uri: song.blobUrl!,
            filename: song.filename,
            modificationTime: Date.now(),
            isFromDevice: true,
          };
        });
        const filtered = webSongs.filter(s => !hiddenIds.includes(s.id));
        setSongs(filtered);
        setAllSongsIncludingHidden(webSongs);
        setUsingMockData(false);
        setProgress({ loaded: filtered.length, total: webSongs.length });
        return;
      }
      
      // On web dev mode, use test songs for development
      console.log('[MediaLibrary] Web: Using test songs for development');
      const filtered = testSongs.filter(s => !hiddenIds.includes(s.id));
      setSongs(filtered);
      setAllSongsIncludingHidden(testSongs);
      setUsingMockData(false);
      setIsLoading(false);
      setProgress({ loaded: filtered.length, total: testSongs.length });
      return;
    }

    console.log('[MediaLibrary] Android: Starting MediaStore audio scan...');
    setIsLoading(true);
    setError(null);
    setProgress({ loaded: 0, total: 0 });

    try {
      if (MediaStoreScannerModule.isAvailable()) {
        console.log('[MediaLibrary] Using native MediaStoreScannerModule');
        const result = await MediaStoreScannerModule.scanAllAudio();
        
        console.log('[MediaLibrary] MediaStore scan result:', {
          success: result.success,
          count: result.count,
          error: result.error
        });
        
        if (!result.success) {
          console.error('[MediaLibrary] MediaStore scan failed:', result.error);
          setError(result.error || 'Failed to scan audio files');
          setSongs([]);
          setAllSongsIncludingHidden([]);
          setUsingMockData(false);
          setIsLoading(false);
          return;
        }
        
        const deviceSongs: DeviceSong[] = result.songs.map(song => ({
          id: song.id,
          title: song.title || extractTitle(song.filename),
          artist: song.artist || parseArtistFromFilename(song.filename) || 'Unknown Artist',
          album: song.album || 'Unknown Album',
          duration: Math.floor(song.duration || 0),
          artwork: song.albumArt || undefined,
          uri: song.uri,
          filename: song.filename,
          modificationTime: song.dateModified * 1000,
          isFromDevice: true,
        }));
        
        console.log('[MediaLibrary] Processed', deviceSongs.length, 'songs with metadata');
        if (deviceSongs.length > 0) {
          console.log('[MediaLibrary] Sample song:', {
            title: deviceSongs[0].title,
            artist: deviceSongs[0].artist,
            hasArt: !!deviceSongs[0].artwork
          });
        }
        
        const filtered = deviceSongs.filter(s => !hiddenIds.includes(s.id));
        setSongs(filtered);
        setAllSongsIncludingHidden(deviceSongs);
        setUsingMockData(false);
        setProgress({ loaded: filtered.length, total: deviceSongs.length });
        
        saveSongsToCache(deviceSongs);
        
        setIsLoading(false);
        return;
      }
      
      console.log('[MediaLibrary] MediaStoreScannerModule not available, falling back to expo-media-library');
      
      let allAssets: MediaLibrary.Asset[] = [];
      let hasNextPage = true;
      let endCursor: string | undefined;
      
      while (hasNextPage) {
        const result = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: 100,
          after: endCursor,
          sortBy: [MediaLibrary.SortBy.modificationTime],
        });

        allAssets = [...allAssets, ...result.assets];
        hasNextPage = result.hasNextPage;
        endCursor = result.endCursor;
        setProgress({ loaded: allAssets.length, total: result.totalCount });
      }

      console.log('[MediaLibrary] Fallback: Found', allAssets.length, 'audio assets');
      
      const deviceSongs: DeviceSong[] = allAssets.map(asset => ({
        id: asset.id,
        title: extractTitle(asset.filename),
        artist: parseArtistFromFilename(asset.filename) || 'Unknown Artist',
        album: 'Unknown Album',
        duration: Math.floor(asset.duration * 1000),
        artwork: undefined,
        uri: asset.uri,
        filename: asset.filename,
        modificationTime: asset.modificationTime,
        isFromDevice: true,
      }));

      const filtered = deviceSongs.filter(s => !hiddenIds.includes(s.id));
      setSongs(filtered);
      setAllSongsIncludingHidden(deviceSongs);
      setUsingMockData(false);
      setProgress({ loaded: filtered.length, total: deviceSongs.length });
      
      saveSongsToCache(deviceSongs);
    } catch (err) {
      console.error('Error fetching audio files:', err);
      setError('Failed to fetch audio files from device');
      setSongs([]);
      setAllSongsIncludingHidden([]);
      setUsingMockData(false);
    } finally {
      setIsLoading(false);
    }
  }, [saveSongsToCache]);

  const refreshSongs = useCallback(async () => {
    console.log('[MediaLibrary] refreshSongs called', { platform: Platform.OS });
    
    if (Platform.OS === 'web') {
      await fetchAudioFiles(hiddenSongIds, []);
      return;
    }
    
    const granted = await checkPermission();
    console.log('[MediaLibrary] Permission check result:', granted);
    
    if (granted) {
      await fetchAudioFiles(hiddenSongIds, selectedFolders);
    } else {
      console.log('[MediaLibrary] Permission not granted, clearing songs');
      setSongs([]);
      setAllSongsIncludingHidden([]);
      setUsingMockData(false);
    }
  }, [checkPermission, fetchAudioFiles, hiddenSongIds, selectedFolders]);

  const hideSong = useCallback(async (songId: string) => {
    const newHidden = [...hiddenSongIds, songId];
    setHiddenSongIds(newHidden);
    await saveHiddenSongs(newHidden);
    setSongs(prev => prev.filter(s => s.id !== songId));
  }, [hiddenSongIds, saveHiddenSongs]);

  const unhideSong = useCallback(async (songId: string) => {
    const newHidden = hiddenSongIds.filter(id => id !== songId);
    setHiddenSongIds(newHidden);
    await saveHiddenSongs(newHidden);
    const songToUnhide = allSongsIncludingHidden.find(s => s.id === songId);
    if (songToUnhide) {
      setSongs(prev => [...prev, songToUnhide]);
    }
  }, [hiddenSongIds, saveHiddenSongs, allSongsIncludingHidden]);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      setIsOnboardingComplete(true);
      await refreshSongs();
    } catch (err) {
      console.error('Error completing onboarding:', err);
    }
  }, [refreshSongs]);

  const skipOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      setIsOnboardingComplete(true);
      setSongs([]);
      setAllSongsIncludingHidden([]);
      setUsingMockData(false);
    } catch (err) {
      console.error('Error skipping onboarding:', err);
    }
  }, []);

  // Reset onboarding if permissions were revoked
  const validateOnboardingStatus = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    try {
      const storedOnboarding = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      if (storedOnboarding === 'true') {
        // Check if permissions are actually granted
        const { status } = await MediaLibrary.getPermissionsAsync();
        if (status !== MediaLibrary.PermissionStatus.GRANTED) {
          // Permissions were revoked - reset onboarding
          console.log('Permissions revoked, resetting onboarding status');
          await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
          setIsOnboardingComplete(false);
          return;
        }
      }
    } catch (err) {
      console.error('Error validating onboarding status:', err);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      console.log('[MediaLibrary] Starting initialization...');
      
      const [hiddenIds, , , cachedSongs] = await Promise.all([
        loadHiddenSongs(),
        loadOnboardingStatus(),
        loadSelectedFolders(),
        loadCachedSongs(),
      ]);
      
      if (cachedSongs && cachedSongs.length > 0) {
        const filtered = cachedSongs.filter((s: DeviceSong) => !hiddenIds.includes(s.id));
        setSongs(filtered);
        setAllSongsIncludingHidden(cachedSongs);
        setUsingMockData(false);
        console.log('[MediaLibrary] Loaded', filtered.length, 'songs from cache (fresh scan follows)');
      }
      
      await Promise.all([checkPermission(), validateOnboardingStatus()]);
      setInitialized(true);
      console.log('[MediaLibrary] Initialization complete');
    };
    initialize();
  }, [loadHiddenSongs, loadOnboardingStatus, loadSelectedFolders, checkPermission, validateOnboardingStatus, loadCachedSongs]);

  useEffect(() => {
    console.log('[MediaLibrary] Check refresh trigger:', { initialized, isOnboardingComplete });
    if (initialized && isOnboardingComplete) {
      console.log('[MediaLibrary] Triggering refreshSongs...');
      refreshSongs();
    }
  }, [initialized, isOnboardingComplete]);

  const value: MediaLibraryContextValue = {
    songs,
    allSongsIncludingHidden,
    isLoading,
    hasPermission,
    permissionStatus,
    error,
    progress,
    isOnboardingComplete,
    usingMockData,
    selectedFolders,
    requestPermission,
    refreshSongs,
    hideSong,
    unhideSong,
    hiddenSongIds,
    completeOnboarding,
    skipOnboarding,
    setSelectedFolders,
    setWebAudioFiles,
  };

  return (
    <MediaLibraryContext.Provider value={value}>
      {children}
    </MediaLibraryContext.Provider>
  );
}

function extractTitle(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleaned = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Unknown Title';
}

function parseArtistFromFilename(filename: string): string | null {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  const patterns = [
    /^(?:\d+[\.\s-]*)?(.+?)\s*-\s*.+$/,
    /^(?:\d+[\.\s-]*)?(.+?)_-_.+$/,
  ];
  
  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern);
    if (match && match[1]) {
      const artist = match[1].replace(/[-_]/g, ' ').trim();
      if (artist && artist.length > 0) {
        return artist;
      }
    }
  }
  return null;
}
