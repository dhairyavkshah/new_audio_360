import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '@/lib/data';

const HIDDEN_SONGS_KEY = '@new_audio_360_hidden_songs';
const ONBOARDING_COMPLETE_KEY = '@new_audio_360_onboarding_complete';

export interface DeviceSong extends Song {
  uri: string;
  filename: string;
  modificationTime: number;
}

interface UseMediaLibraryResult {
  songs: DeviceSong[];
  isLoading: boolean;
  hasPermission: boolean | null;
  permissionStatus: MediaLibrary.PermissionStatus | null;
  error: string | null;
  progress: { loaded: number; total: number };
  requestPermission: () => Promise<boolean>;
  refreshSongs: () => Promise<void>;
  hideSong: (songId: string) => Promise<void>;
  unhideSong: (songId: string) => Promise<void>;
  hiddenSongIds: string[];
}

export function useMediaLibrary(): UseMediaLibraryResult {
  const [songs, setSongs] = useState<DeviceSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<MediaLibrary.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [hiddenSongIds, setHiddenSongIds] = useState<string[]>([]);

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
  }, [hiddenSongIds, saveHiddenSongs]);

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
      
      if (granted) {
        await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      }
      
      return granted;
    } catch (err) {
      console.error('Error requesting permission:', err);
      setError('Failed to request media library permission');
      return false;
    }
  }, []);

  const fetchAudioFiles = useCallback(async () => {
    if (Platform.OS === 'web') {
      setError('Media library is not available on web');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress({ loaded: 0, total: 0 });

    try {
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

      const deviceSongs: DeviceSong[] = allAssets
        .filter(asset => !hiddenSongIds.includes(asset.id))
        .map((asset, index) => ({
          id: asset.id,
          title: extractTitle(asset.filename),
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          duration: Math.floor(asset.duration),
          artwork: `https://picsum.photos/seed/${asset.id}/400/400`,
          uri: asset.uri,
          filename: asset.filename,
          modificationTime: asset.modificationTime,
        }));

      setSongs(deviceSongs);
      setProgress({ loaded: deviceSongs.length, total: deviceSongs.length });
    } catch (err) {
      console.error('Error fetching audio files:', err);
      setError('Failed to fetch audio files from device');
    } finally {
      setIsLoading(false);
    }
  }, [hiddenSongIds]);

  const refreshSongs = useCallback(async () => {
    const granted = await checkPermission();
    if (granted) {
      await fetchAudioFiles();
    }
  }, [checkPermission, fetchAudioFiles]);

  useEffect(() => {
    loadHiddenSongs();
    checkPermission();
  }, [loadHiddenSongs, checkPermission]);

  return {
    songs,
    isLoading,
    hasPermission,
    permissionStatus,
    error,
    progress,
    requestPermission,
    refreshSongs,
    hideSong,
    unhideSong,
    hiddenSongIds,
  };
}

function extractTitle(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleaned = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Unknown Title';
}

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(complete: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, complete ? 'true' : 'false');
  } catch (err) {
    console.error('Error setting onboarding complete:', err);
  }
}
