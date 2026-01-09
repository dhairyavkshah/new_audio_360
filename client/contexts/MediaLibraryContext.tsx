import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, mockSongs } from '@/lib/data';
import { 
  getSelectedFolders as loadSelectedFoldersFromStorage, 
  setSelectedFolders as saveSelectedFoldersToStorage,
  getWebFolderData,
  WebFolderSong
} from '@/lib/storage';
import { getSessionWebFolders } from '@/lib/webFolderCache';

const HIDDEN_SONGS_KEY = '@new_audio_360_hidden_songs';
const ONBOARDING_COMPLETE_KEY = '@new_audio_360_onboarding_complete';

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

  const loadHiddenSongs = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(HIDDEN_SONGS_KEY);
      if (data) {
        setHiddenSongIds(JSON.parse(data));
      }
    } catch (err) {
      console.error('Error loading hidden songs:', err);
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

  const setSelectedFolders = useCallback((folders: string[]) => {
    setSelectedFoldersState(folders);
    saveSelectedFoldersToStorage(folders);
  }, []);

  const setWebAudioFiles = useCallback((files: WebFolderSong[]) => {
    if (Platform.OS !== 'web') return;
    
    const webSongs: DeviceSong[] = files.map(file => ({
      id: file.id,
      title: file.title,
      artist: 'Unknown Artist',
      album: 'Local Folder',
      duration: 0,
      artwork: `https://picsum.photos/seed/${file.id}/400/400`,
      uri: file.blobUrl || file.path,
      filename: file.filename,
      modificationTime: Date.now(),
      isFromDevice: true,
    }));
    
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
    if (Platform.OS === 'web') {
      const sessionFolders = getSessionWebFolders();
      const webFolders = sessionFolders.length > 0 ? sessionFolders : await getWebFolderData();
      
      if (webFolders.length > 0) {
        const allWebSongs = webFolders.flatMap(folder => folder.songs);
        const playableSongs = allWebSongs.filter(song => song.blobUrl);
        
        if (playableSongs.length === 0) {
          setUsingMockData(true);
          const mockDeviceSongs: DeviceSong[] = mockSongs.map(song => ({
            ...song,
            uri: '',
            filename: `${song.title}.mp3`,
            modificationTime: Date.now(),
            isFromDevice: false,
          }));
          const filtered = mockDeviceSongs.filter(s => !hiddenIds.includes(s.id));
          setSongs(filtered);
          setAllSongsIncludingHidden(mockDeviceSongs);
          return;
        }
        
        const webSongs: DeviceSong[] = playableSongs.map(song => ({
          id: song.id,
          title: song.title,
          artist: 'Unknown Artist',
          album: 'Local Folder',
          duration: 0,
          artwork: `https://picsum.photos/seed/${song.id}/400/400`,
          uri: song.blobUrl!,
          filename: song.filename,
          modificationTime: Date.now(),
          isFromDevice: true,
        }));
        const filtered = webSongs.filter(s => !hiddenIds.includes(s.id));
        setSongs(filtered);
        setAllSongsIncludingHidden(webSongs);
        setUsingMockData(false);
        setProgress({ loaded: filtered.length, total: webSongs.length });
        return;
      }
      
      const mockDeviceSongs: DeviceSong[] = mockSongs.map(song => ({
        ...song,
        uri: '',
        filename: `${song.title}.mp3`,
        modificationTime: Date.now(),
        isFromDevice: false,
      }));
      const filtered = mockDeviceSongs.filter(s => !hiddenIds.includes(s.id));
      setSongs(filtered);
      setAllSongsIncludingHidden(mockDeviceSongs);
      setUsingMockData(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress({ loaded: 0, total: 0 });

    try {
      let allAssets: MediaLibrary.Asset[] = [];
      
      if (folderIds.length > 0) {
        for (const albumId of folderIds) {
          let hasNextPage = true;
          let endCursor: string | undefined;
          
          while (hasNextPage) {
            const result = await MediaLibrary.getAssetsAsync({
              album: albumId,
              mediaType: MediaLibrary.MediaType.audio,
              first: 100,
              after: endCursor,
              sortBy: [MediaLibrary.SortBy.modificationTime],
            });

            allAssets = [...allAssets, ...result.assets];
            hasNextPage = result.hasNextPage;
            endCursor = result.endCursor;
            
            setProgress({ loaded: allAssets.length, total: allAssets.length });
          }
        }
      } else {
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
      }

      if (allAssets.length === 0) {
        const mockDeviceSongs: DeviceSong[] = mockSongs.map(song => ({
          ...song,
          uri: '',
          filename: `${song.title}.mp3`,
          modificationTime: Date.now(),
          isFromDevice: false,
        }));
        const filtered = mockDeviceSongs.filter(s => !hiddenIds.includes(s.id));
        setSongs(filtered);
        setAllSongsIncludingHidden(mockDeviceSongs);
        setUsingMockData(true);
        setProgress({ loaded: mockDeviceSongs.length, total: mockDeviceSongs.length });
        return;
      }

      const deviceSongs: DeviceSong[] = allAssets.map((asset) => ({
        id: asset.id,
        title: extractTitle(asset.filename),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        duration: Math.floor(asset.duration),
        artwork: `https://picsum.photos/seed/${asset.id}/400/400`,
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
    } catch (err) {
      console.error('Error fetching audio files:', err);
      setError('Failed to fetch audio files from device');
      const mockDeviceSongs: DeviceSong[] = mockSongs.map(song => ({
        ...song,
        uri: '',
        filename: `${song.title}.mp3`,
        modificationTime: Date.now(),
        isFromDevice: false,
      }));
      const filtered = mockDeviceSongs.filter(s => !hiddenIds.includes(s.id));
      setSongs(filtered);
      setAllSongsIncludingHidden(mockDeviceSongs);
      setUsingMockData(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSongs = useCallback(async () => {
    if (Platform.OS === 'web') {
      await fetchAudioFiles(hiddenSongIds, []);
      return;
    }
    
    const granted = await checkPermission();
    if (granted) {
      await fetchAudioFiles(hiddenSongIds, selectedFolders);
    } else {
      const mockDeviceSongs: DeviceSong[] = mockSongs.map(song => ({
        ...song,
        uri: '',
        filename: `${song.title}.mp3`,
        modificationTime: Date.now(),
        isFromDevice: false,
      }));
      const filtered = mockDeviceSongs.filter(s => !hiddenSongIds.includes(s.id));
      setSongs(filtered);
      setAllSongsIncludingHidden(mockDeviceSongs);
      setUsingMockData(true);
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
      const mockDeviceSongs: DeviceSong[] = mockSongs.map(song => ({
        ...song,
        uri: '',
        filename: `${song.title}.mp3`,
        modificationTime: Date.now(),
        isFromDevice: false,
      }));
      const filtered = mockDeviceSongs.filter(s => !hiddenSongIds.includes(s.id));
      setSongs(filtered);
      setAllSongsIncludingHidden(mockDeviceSongs);
      setUsingMockData(true);
    } catch (err) {
      console.error('Error skipping onboarding:', err);
    }
  }, [hiddenSongIds]);

  useEffect(() => {
    const initialize = async () => {
      await loadHiddenSongs();
      await loadOnboardingStatus();
      await loadSelectedFolders();
      await checkPermission();
      setInitialized(true);
    };
    initialize();
  }, [loadHiddenSongs, loadOnboardingStatus, loadSelectedFolders, checkPermission]);

  useEffect(() => {
    if (initialized && isOnboardingComplete) {
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
