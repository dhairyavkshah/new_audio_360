import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMusicMetadata } from '@/lib/musicInfo';
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
      
      setIsLoading(true);
      setProgress({ loaded: 0, total: testSongs.length });
      
      const songsWithArt: DeviceSong[] = await Promise.all(
        testSongs.map(async (song, index) => {
          try {
            const result = await extractAlbumArt(song.uri);
            setProgress({ loaded: index + 1, total: testSongs.length });
            return {
              ...song,
              artwork: result.dataUrl || song.artwork,
            };
          } catch {
            setProgress({ loaded: index + 1, total: testSongs.length });
            return song;
          }
        })
      );
      
      const filtered = songsWithArt.filter(s => !hiddenIds.includes(s.id));
      setSongs(filtered);
      setAllSongsIncludingHidden(songsWithArt);
      setUsingMockData(false);
      setIsLoading(false);
      setProgress({ loaded: filtered.length, total: songsWithArt.length });
      return;
    }

    console.log('[MediaLibrary] Android: Starting audio file scan...');
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

      console.log('[MediaLibrary] Android: Found', allAssets.length, 'audio assets');
      
      if (allAssets.length === 0) {
        console.log('[MediaLibrary] Android: No assets found, clearing songs');
        setSongs([]);
        setAllSongsIncludingHidden([]);
        setUsingMockData(false);
        setProgress({ loaded: 0, total: 0 });
        return;
      }

      // Cache for album names - stores promises to avoid duplicate concurrent fetches
      const albumPromiseCache = new Map<string, Promise<string>>();
      
      const getAlbumName = (albumId: string | undefined): Promise<string> => {
        if (!albumId) return Promise.resolve('Unknown Album');
        
        if (albumPromiseCache.has(albumId)) {
          return albumPromiseCache.get(albumId)!;
        }
        
        const promise = (async () => {
          try {
            const album = await MediaLibrary.getAlbumAsync(albumId);
            return album?.title || 'Unknown Album';
          } catch {
            return 'Unknown Album';
          }
        })();
        
        albumPromiseCache.set(albumId, promise);
        return promise;
      };

      console.log('[MediaLibrary] Starting metadata extraction for', allAssets.length, 'assets...');
      
      const deviceSongs: DeviceSong[] = await Promise.all(allAssets.map(async (asset, index) => {
        let artist = 'Unknown Artist';
        let album = 'Unknown Album';
        let title = extractTitle(asset.filename);
        let artwork: string | undefined = undefined;
        
        try {
          if (index < 3) console.log('[MediaLibrary] Processing asset', index, ':', asset.filename);
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
          if (index < 3) console.log('[MediaLibrary] Got assetInfo for', index, ', localUri:', assetInfo.localUri?.substring(0, 50));
          
          if (assetInfo.localUri) {
            const metadata = await getMusicMetadata(assetInfo.localUri);
            
            if (metadata) {
              if (index < 3) console.log('[MediaLibrary] Got metadata for', index, ':', {
                title: metadata.title,
                artist: metadata.artist,
                hasArt: !!metadata.albumArt
              });
              if (metadata.title) title = metadata.title;
              if (metadata.artist) artist = metadata.artist;
              if (metadata.album) album = metadata.album;
              if (metadata.albumArt) artwork = metadata.albumArt;
            } else {
              if (index < 3) console.log('[MediaLibrary] No metadata returned for', index);
            }
          } else {
            if (index < 3) console.log('[MediaLibrary] No localUri for', index);
          }
        } catch (err) {
          console.warn('[MediaLibrary] Error extracting metadata for:', asset.filename, err);
        }
        
        if (artist === 'Unknown Artist') {
          const parsedArtist = parseArtistFromFilename(asset.filename);
          if (parsedArtist) artist = parsedArtist;
        }
        
        if (album === 'Unknown Album') {
          const albumName = await getAlbumName(asset.albumId);
          if (albumName && albumName !== 'Unknown Album') {
            album = albumName;
          }
        }
        
        if ((index + 1) % 10 === 0 || index === allAssets.length - 1) {
          setProgress({ loaded: index + 1, total: allAssets.length });
        }
        
        return {
          id: asset.id,
          title,
          artist,
          album,
          duration: Math.floor(asset.duration),
          artwork: artwork || undefined,
          uri: asset.uri,
          filename: asset.filename,
          modificationTime: asset.modificationTime,
          isFromDevice: true,
        };
      }));

      const filtered = deviceSongs.filter(s => !hiddenIds.includes(s.id));
      setSongs(filtered);
      setAllSongsIncludingHidden(deviceSongs);
      setUsingMockData(false);
      setProgress({ loaded: filtered.length, total: deviceSongs.length });
    } catch (err) {
      console.error('Error fetching audio files:', err);
      setError('Failed to fetch audio files from device');
      setSongs([]);
      setAllSongsIncludingHidden([]);
      setUsingMockData(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      await loadHiddenSongs();
      await loadOnboardingStatus();
      await loadSelectedFolders();
      await checkPermission();
      // Validate that onboarding complete matches actual permission status
      await validateOnboardingStatus();
      setInitialized(true);
      console.log('[MediaLibrary] Initialization complete');
    };
    initialize();
  }, [loadHiddenSongs, loadOnboardingStatus, loadSelectedFolders, checkPermission, validateOnboardingStatus]);

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
