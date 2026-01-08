import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, mockSongs } from '@/lib/data';
import { saveMusicFolderUri, getMusicFolderUri } from '@/lib/storage';

const SAF = (FileSystem as any).StorageAccessFramework;

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
  musicFolderUri: string | null;
  requestPermission: () => Promise<boolean>;
  refreshSongs: () => Promise<void>;
  hideSong: (songId: string) => Promise<void>;
  unhideSong: (songId: string) => Promise<void>;
  hiddenSongIds: string[];
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  selectMusicFolder: () => Promise<boolean>;
  skipFolderSelection: () => Promise<void>;
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
  const [musicFolderUri, setMusicFolderUri] = useState<string | null>(null);

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

  const loadMusicFolderUri = useCallback(async () => {
    try {
      const uri = await getMusicFolderUri();
      setMusicFolderUri(uri);
    } catch (err) {
      console.error('Error loading music folder URI:', err);
    }
  }, []);

  const selectMusicFolder = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setError('Folder selection is not available on web.');
      return false;
    }

    try {
      const permissions = await SAF.requestDirectoryPermissionsAsync();
      
      if (permissions.granted) {
        const uri = permissions.directoryUri;
        setMusicFolderUri(uri);
        await saveMusicFolderUri(uri);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error selecting music folder:', err);
      setError('Failed to select music folder');
      return false;
    }
  }, []);

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

  const fetchAudioFiles = useCallback(async (hiddenIds: string[], folderUri: string | null) => {
    if (Platform.OS === 'web') {
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

    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];

    try {
      if (folderUri) {
        const files = await SAF.readDirectoryAsync(folderUri);
        const audioFiles = files.filter((file: string) => {
          const lowerFile = file.toLowerCase();
          return audioExtensions.some(ext => lowerFile.endsWith(ext));
        });

        if (audioFiles.length === 0) {
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

        const deviceSongs: DeviceSong[] = audioFiles.map((fileUri: string, index: number) => {
          const decodedUri = decodeURIComponent(fileUri);
          const pathParts = decodedUri.split('/');
          const encodedParts = decodedUri.split('%2F');
          const filename = pathParts.pop() || encodedParts.pop() || `track_${index}`;
          const cleanFilename = decodeURIComponent(filename);
          const stableId = `saf_${simpleHash(fileUri)}`;
          
          return {
            id: stableId,
            title: extractTitle(cleanFilename),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            duration: 0,
            artwork: `https://picsum.photos/seed/${stableId}/400/400`,
            uri: fileUri,
            filename: cleanFilename,
            modificationTime: Date.now(),
            isFromDevice: true,
          };
        });

        const filtered = deviceSongs.filter(s => !hiddenIds.includes(s.id));
        setSongs(filtered);
        setAllSongsIncludingHidden(deviceSongs);
        setUsingMockData(false);
        setProgress({ loaded: filtered.length, total: deviceSongs.length });
      } else {
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
      }
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
    if (musicFolderUri) {
      await fetchAudioFiles(hiddenSongIds, musicFolderUri);
    } else {
      const granted = await checkPermission();
      if (granted) {
        await fetchAudioFiles(hiddenSongIds, null);
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
    }
  }, [checkPermission, fetchAudioFiles, hiddenSongIds, musicFolderUri]);

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

  const skipFolderSelection = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      setIsOnboardingComplete(true);
      await saveMusicFolderUri('mock_data');
      setMusicFolderUri('mock_data');
      const mockDeviceSongs: DeviceSong[] = mockSongs.map(song => ({
        ...song,
        uri: song.audioUrl || '',
        filename: `${song.title}.mp3`,
        modificationTime: Date.now(),
        isFromDevice: false,
      }));
      const filtered = mockDeviceSongs.filter(s => !hiddenSongIds.includes(s.id));
      setSongs(filtered);
      setAllSongsIncludingHidden(mockDeviceSongs);
      setUsingMockData(true);
    } catch (err) {
      console.error('Error skipping folder selection:', err);
    }
  }, [hiddenSongIds]);

  useEffect(() => {
    const initialize = async () => {
      await loadHiddenSongs();
      await loadOnboardingStatus();
      await loadMusicFolderUri();
      await checkPermission();
      setInitialized(true);
    };
    initialize();
  }, [loadHiddenSongs, loadOnboardingStatus, loadMusicFolderUri, checkPermission]);

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
    musicFolderUri,
    requestPermission,
    refreshSongs,
    hideSong,
    unhideSong,
    hiddenSongIds,
    completeOnboarding,
    skipOnboarding,
    selectMusicFolder,
    skipFolderSelection,
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

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
