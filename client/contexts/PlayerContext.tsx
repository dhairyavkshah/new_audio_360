import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { createAudioPlayer, AudioPlayer, AudioStatus, setAudioModeAsync } from 'expo-audio';
import { Song } from '@/lib/data';
import { DeviceSong } from '@/contexts/MediaLibraryContext';
import { savePlayerState, getPlayerState, getFavorites, saveFavorites, getRecentlyPlayed, addToRecentlyPlayed, getMostPlayed, incrementPlayCount } from '@/lib/storage';
import { useSoundLab } from '@/contexts/SoundLabContext';
import { PlaybackEngineModule, PlaybackStatus, ImmersiveModeEngineModule, AudioSessionBridgeModule } from 'audio-effects';
import { NativeEffectsManager } from '@/services/NativeEffectsManager';
import { TrackPlayerService, State, TrackMetadata, PlaybackSource } from '@/services/TrackPlayerService';
import { AudioCoordinator } from '@/services/AudioCoordinator';
import { setMusicPlaying } from '@/lib/playbackState';
import { mediaLibraryEvents, MediaLibraryEvent } from '@/lib/mediaLibraryEvents';
import { WebAudioEffectsEngine } from '@/services/WebAudioEffectsEngine';

export type PlayableSong = Song | DeviceSong;

function isDeviceSong(song: PlayableSong): song is DeviceSong {
  return 'uri' in song && 'isFromDevice' in song;
}

interface PlayerContextType {
  currentSong: PlayableSong | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  queue: PlayableSong[];
  progress: number;
  favorites: string[];
  recentlyPlayed: string[];
  mostPlayed: string[];
  sleepTimerMinutes: number | null;
  isLoading: boolean;
  isBuffering: boolean;
  error: string | null;
  isFavorite: (songId: string) => boolean;
  toggleFavorite: (songId: string) => void;
  playSong: (song: PlayableSong) => void;
  togglePlayPause: () => void;
  handleNext: () => void;
  handlePrevious: () => void;
  seek: (time: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  removeFromQueue: (songIds: string[]) => void;
  clearQueue: () => void;
  setSleepTimer: (minutes: number | null) => void;
  setQueue: (songs: PlayableSong[]) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { mode: soundLabMode, eqBands, immersiveModeName } = useSoundLab();
  
  const [currentSong, setCurrentSong] = useState<PlayableSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'one' | 'all'>('off');
  const [queue, setQueueState] = useState<PlayableSong[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([]);
  const [mostPlayed, setMostPlayed] = useState<string[]>([]);
  const [sleepTimerMinutes, setSleepTimerMinutesState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const playerRef = useRef<AudioPlayer | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusListenerRef = useRef<{ remove: () => void } | null>(null);
  const currentSongRef = useRef<PlayableSong | null>(null);
  const queueRef = useRef<PlayableSong[]>([]);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<'off' | 'one' | 'all'>('off');
  
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const webMediaSourceRef = useRef<any>(null);

  // Android: Use PlaybackEngineModule exclusively for DSP-enabled playback
  // iOS: Use TrackPlayerService for native playback
  // Web: Uses HTMLAudioElement with WebAudioEffectsEngine
  const useNativePlaybackRef = useRef(Platform.OS === 'android' && PlaybackEngineModule.isAvailable());
  const useTrackPlayerRef = useRef(Platform.OS === 'ios' && TrackPlayerService.isAvailable());
  const trackPlayerInitializedRef = useRef(false);
  const nativeAudioSessionIdRef = useRef<number>(0);
  const progressPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastKnownPositionRef = useRef<number>(0);
  const wasPlayingBeforeBackgroundRef = useRef<boolean>(false);
  const handleNextInternalRef = useRef<() => void>(() => {});
  const handlePreviousInternalRef = useRef<() => void>(() => {});

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);

  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    setMusicPlaying(isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(console.error);
  }, []);

  const convertSongToTrackMetadata = useCallback((song: PlayableSong): TrackMetadata | null => {
    let url: string | undefined;
    
    if (isDeviceSong(song) && song.uri) {
      url = song.uri;
    } else if ('audioUrl' in song && song.audioUrl) {
      url = song.audioUrl;
    }
    
    if (!url) return null;
    
    return {
      id: song.id,
      url: url,
      title: song.title,
      artist: song.artist,
      album: song.album,
      artwork: song.artwork,
      duration: song.duration,
    };
  }, []);

  const setupTrackPlayerCallbacks = useCallback(() => {
    TrackPlayerService.setCallbacks({
      onPlay: () => {
        if (TrackPlayerService.getPlaybackSource() === 'music') {
          setIsPlaying(true);
        }
      },
      onPause: () => {
        if (TrackPlayerService.getPlaybackSource() === 'music') {
          setIsPlaying(false);
        }
      },
      onStop: () => {
        if (TrackPlayerService.getPlaybackSource() === 'music') {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      },
      onNext: () => {
        console.log('[PlayerContext] Remote next callback - UI will update via onTrackChange');
      },
      onPrevious: () => {
        console.log('[PlayerContext] Remote previous callback - UI will update via onTrackChange');
      },
      onSeek: (position) => {
        if (TrackPlayerService.getPlaybackSource() === 'music') {
          setCurrentTime(position);
        }
      },
      onTrackChange: async (trackIndex) => {
        if (TrackPlayerService.getPlaybackSource() !== 'music') return;
        if (trackIndex !== null && trackIndex >= 0) {
          const currentQueue = queueRef.current;
          if (currentQueue[trackIndex]) {
            setCurrentTime(0);
            setCurrentSong(currentQueue[trackIndex]);
            const track = await TrackPlayerService.getCurrentTrack();
            if (track?.duration) {
              setDuration(track.duration);
            } else {
              setDuration(currentQueue[trackIndex].duration || 0);
            }
          }
        }
      },
      onProgress: (progress) => {
        if (TrackPlayerService.getPlaybackSource() !== 'music') return;
        if (progress.duration > 0 && progress.position <= progress.duration) {
          setCurrentTime(progress.position);
          setDuration(progress.duration);
        } else if (progress.duration > 0) {
          setCurrentTime(0);
          setDuration(progress.duration);
        }
        setIsBuffering(progress.buffered < progress.position);
      },
      onStateChange: (state) => {
        if (TrackPlayerService.getPlaybackSource() !== 'music') return;
        if (state === State.Playing) {
          setIsPlaying(true);
          setIsBuffering(false);
        } else if (state === State.Paused) {
          setIsPlaying(false);
          setIsBuffering(false);
        } else if (state === State.Buffering || state === State.Loading) {
          setIsBuffering(true);
        } else if (state === State.Stopped) {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      },
    });
  }, []);

  const restoreTrackPlayerQueue = useCallback(async (savedPosition?: number, wasPlaying?: boolean) => {
    const queue = queueRef.current;
    const currentSongId = currentSongRef.current?.id;
    
    if (queue.length === 0) return;
    
    const trackMetadataList = queue
      .map(song => convertSongToTrackMetadata(song))
      .filter((t): t is TrackMetadata => t !== null);
    
    if (trackMetadataList.length === 0) return;
    
    await TrackPlayerService.setQueue(trackMetadataList);
    
    if (currentSongId) {
      const currentIndex = queue.findIndex(s => s.id === currentSongId);
      if (currentIndex > 0) {
        await TrackPlayerService.skipToTrack(currentIndex);
      }
    }
    
    if (savedPosition !== undefined && savedPosition > 0) {
      await TrackPlayerService.seekTo(savedPosition);
    }
    
    if (wasPlaying) {
      const waitForReady = async (maxAttempts = 10): Promise<boolean> => {
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const state = await TrackPlayerService.getState();
            if (state === State.Ready || state === State.Paused || state === State.Playing) {
              return true;
            }
          } catch {
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
      };
      
      const isReady = await waitForReady();
      if (isReady) {
        await TrackPlayerService.play();
        setIsPlaying(true);
      }
    }
  }, [convertSongToTrackMetadata]);

  // TrackPlayerService initialization - iOS only
  useEffect(() => {
    if (useTrackPlayerRef.current && !trackPlayerInitializedRef.current) {
      TrackPlayerService.initialize().then(async (initialized) => {
        if (initialized) {
          trackPlayerInitializedRef.current = true;
          console.log('[PlayerContext] TrackPlayerService initialized for iOS');
          
          setupTrackPlayerCallbacks();
          TrackPlayerService.setRepeatMode(repeat);
        }
      });
    }
    
    return () => {
      if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
        TrackPlayerService.destroy();
        trackPlayerInitializedRef.current = false;
      }
    };
  }, [setupTrackPlayerCallbacks]);

  // PlaybackEngineModule initialization - Android only (with DSP chain)
  useEffect(() => {
    if (useNativePlaybackRef.current) {
      PlaybackEngineModule.initialize().then(async (initResult) => {
        if (initResult.success && initResult.audioSessionId) {
          nativeAudioSessionIdRef.current = initResult.audioSessionId;
          console.log('[PlayerContext] PlaybackEngineModule initialized with audioSessionId:', initResult.audioSessionId);
          
          // Attach NativeEffectsManager to the PlaybackEngineModule's audio session for DSP
          try {
            const attached = await NativeEffectsManager.attach(initResult.audioSessionId);
            if (attached) {
              console.log('[PlayerContext] NativeEffectsManager attached to PlaybackEngineModule audio session');
            }
            
            // Also attach ImmersiveModeEngine for immersive audio modes
            if (ImmersiveModeEngineModule.isAvailable()) {
              const immersiveResult = await ImmersiveModeEngineModule.attach(initResult.audioSessionId);
              if (immersiveResult.success) {
                console.log('[PlayerContext] ImmersiveModeEngineModule attached to PlaybackEngineModule audio session');
              }
            }
          } catch (err) {
            console.warn('[PlayerContext] Failed to attach audio effects to PlaybackEngineModule:', err);
          }
        } else if (initResult.error) {
          console.warn('[PlayerContext] PlaybackEngineModule initialization failed:', initResult.error);
        }
      });
    }
    
    return () => {
      if (useNativePlaybackRef.current) {
        NativeEffectsManager.release();
        if (ImmersiveModeEngineModule.isAvailable()) {
          ImmersiveModeEngineModule.release();
        }
        PlaybackEngineModule.release();
      }
    };
  }, []);

  useEffect(() => {
    getPlayerState().then((state) => {
      if (state) {
        setShuffle(state.shuffle || false);
        setRepeat(state.repeat || 'off');
        
        if (state.lastSong) {
          const restoredSong: PlayableSong = state.lastSong.isFromDevice 
            ? {
                id: state.lastSong.id,
                title: state.lastSong.title,
                artist: state.lastSong.artist,
                album: state.lastSong.album || '',
                duration: state.lastSong.duration,
                artwork: state.lastSong.artwork,
                uri: state.lastSong.uri || '',
                filename: state.lastSong.filename || '',
                modificationTime: state.lastSong.modificationTime || 0,
                isFromDevice: true,
              } as DeviceSong
            : {
                id: state.lastSong.id,
                title: state.lastSong.title,
                artist: state.lastSong.artist,
                album: state.lastSong.album || '',
                duration: state.lastSong.duration,
                artwork: state.lastSong.artwork,
                audioUrl: state.lastSong.audioUrl || state.lastSong.uri,
              } as Song;
          
          setCurrentSong(restoredSong);
          setCurrentTime(state.currentTime || 0);
          setDuration(state.lastDuration || state.lastSong.duration || 0);
          setIsPlaying(false);
          console.log('[PlayerContext] Restored last playing song:', state.lastSong.title, 'at position:', state.currentTime);
        }
      }
    });
    getFavorites().then(setFavorites);
    getRecentlyPlayed().then(setRecentlyPlayed);
    getMostPlayed(10).then(setMostPlayed);
  }, []);

  useEffect(() => {
    const handleLibraryChange = (event: MediaLibraryEvent) => {
      if (event.type === 'songRemoved' && event.songIds) {
        const removedSet = new Set(event.songIds);
        const availableSongIds = new Set(event.allSongIds);

        const current = currentSongRef.current;
        if (current && removedSet.has(current.id)) {
          console.log('[PlayerContext] Current song was removed, stopping playback');
          if (useNativePlaybackRef.current) {
            PlaybackEngineModule.stop();
          } else if (useTrackPlayerRef.current) {
            TrackPlayerService.stop();
          } else if (Platform.OS === 'web' && audioElementRef.current) {
            audioElementRef.current.pause();
          } else if (Platform.OS === 'ios' && playerRef.current) {
            playerRef.current.pause();
          }
          setCurrentSong(null);
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          currentSongRef.current = null;
        }

        const currentQueue = queueRef.current;
        const filteredQueue = currentQueue.filter(song => availableSongIds.has(song.id));
        if (filteredQueue.length !== currentQueue.length) {
          console.log('[PlayerContext] Queue updated - removed unavailable songs');
          setQueueState(filteredQueue);
          queueRef.current = filteredQueue;
        }
      }
    };

    const unsubscribe = mediaLibraryEvents.subscribe(handleLibraryChange);
    return () => {
      unsubscribe();
    };
  }, []);

  // Propagate repeat mode to the appropriate playback engine
  useEffect(() => {
    if (useNativePlaybackRef.current) {
      // Android: Use PlaybackEngineModule
      PlaybackEngineModule.setRepeatMode(repeat);
    } else if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
      // iOS: Use TrackPlayerService
      TrackPlayerService.setRepeatMode(repeat);
    }
  }, [repeat]);

  // Propagate shuffle mode to PlaybackEngineModule on Android
  useEffect(() => {
    if (useNativePlaybackRef.current) {
      PlaybackEngineModule.setShuffleMode(shuffle);
    }
  }, [shuffle]);

  useEffect(() => {
    const appStateRef = { current: AppState.currentState };
    
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/) && appStateRef.current === 'active') {
        console.log('[PlayerContext] App going to background - saving state');
        if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
          try {
            const progress = await TrackPlayerService.getProgress();
            const state = await TrackPlayerService.getState();
            if (progress) {
              lastKnownPositionRef.current = progress.position;
            }
            wasPlayingBeforeBackgroundRef.current = state === State.Playing;
          } catch {
            lastKnownPositionRef.current = currentTime;
            wasPlayingBeforeBackgroundRef.current = isPlaying;
          }
        } else {
          lastKnownPositionRef.current = currentTime;
          wasPlayingBeforeBackgroundRef.current = isPlaying;
        }
      }
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[PlayerContext] App returned to foreground - syncing state');
        
        if (useTrackPlayerRef.current) {
          try {
            const isAlive = await TrackPlayerService.isPlayerActive();
            
            if (!isAlive && trackPlayerInitializedRef.current) {
              console.log('[PlayerContext] TrackPlayer was killed - reinitializing');
              trackPlayerInitializedRef.current = false;
              
              const reinitialized = await TrackPlayerService.initialize();
              if (reinitialized) {
                trackPlayerInitializedRef.current = true;
                
                setupTrackPlayerCallbacks();
                TrackPlayerService.setRepeatMode(repeatRef.current);
                
                const savedPosition = lastKnownPositionRef.current;
                const wasPlaying = wasPlayingBeforeBackgroundRef.current;
                
                await restoreTrackPlayerQueue(savedPosition, wasPlaying);
                
                console.log('[PlayerContext] TrackPlayer reinitialized and queue restored');
              }
            } else {
              setupTrackPlayerCallbacks();
            }
            
            if (trackPlayerInitializedRef.current) {
              const state = await TrackPlayerService.getState();
              const progress = await TrackPlayerService.getProgress();
              
              if (TrackPlayerService.getPlaybackSource() === 'music') {
                const isCurrentlyPlaying = state === State.Playing;
                setIsPlaying(isCurrentlyPlaying);
                
                if (progress) {
                  setCurrentTime(progress.position);
                  if (progress.duration > 0) {
                    setDuration(progress.duration);
                  }
                }
                
                setIsBuffering(state === State.Buffering || state === State.Loading);
              }
            }
          } catch (err) {
            console.warn('[PlayerContext] Failed to sync state on foreground:', err);
          }
        }
      }
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [setupTrackPlayerCallbacks, restoreTrackPlayerQueue, currentTime, isPlaying]);

  useEffect(() => {
    if (useTrackPlayerRef.current) return;
    if (!useNativePlaybackRef.current) return;

    if (isPlaying && currentSong) {
      progressPollingRef.current = setInterval(() => {
        const status = PlaybackEngineModule.getStatus();
        
        if (status.currentPositionMs !== undefined) {
          setCurrentTime(status.currentPositionMs / 1000);
        }
        if (status.durationMs !== undefined && status.durationMs > 0) {
          setDuration(status.durationMs / 1000);
        }
        
        setIsBuffering(status.playbackState === 'buffering');
        
        if (status.playbackState === 'ended') {
          handleTrackEnd();
        }
        
        if (!status.isPlaying && isPlaying && status.playbackState !== 'buffering') {
          setIsPlaying(false);
        }
      }, 250);
    } else {
      if (progressPollingRef.current) {
        clearInterval(progressPollingRef.current);
        progressPollingRef.current = null;
      }
    }

    return () => {
      if (progressPollingRef.current) {
        clearInterval(progressPollingRef.current);
        progressPollingRef.current = null;
      }
    };
  }, [isPlaying, currentSong]);

  const handleTrackEnd = useCallback(() => {
    const song = currentSongRef.current;
    const currentQueue = queueRef.current;
    const currentRepeat = repeatRef.current;
    const currentShuffle = shuffleRef.current;

    if (!song) return;

    if (currentRepeat === 'one') {
      if (useNativePlaybackRef.current) {
        // Android: Use PlaybackEngineModule
        PlaybackEngineModule.seekTo(0).then(() => {
          PlaybackEngineModule.play();
        });
      } else if (useTrackPlayerRef.current) {
        // iOS: Use TrackPlayerService
        TrackPlayerService.seekTo(0).then(() => {
          TrackPlayerService.play();
        });
      } else if (Platform.OS === 'web' && audioElementRef.current) {
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.play();
      } else if (Platform.OS === 'ios' && playerRef.current) {
        // iOS fallback to expo-audio
        playerRef.current.seekTo(0);
        playerRef.current.play();
      }
      return;
    }

    const currentIndex = currentQueue.findIndex((s) => s.id === song.id);
    let nextIndex: number;

    if (currentShuffle) {
      nextIndex = Math.floor(Math.random() * currentQueue.length);
    } else {
      nextIndex = (currentIndex + 1) % currentQueue.length;
    }

    if (nextIndex === 0 && currentRepeat === 'off' && !currentShuffle) {
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const nextSong = currentQueue[nextIndex];
    if (nextSong) {
      loadAndPlaySong(nextSong);
    }
  }, []);

  const handleStatusUpdate = useCallback((status: AudioStatus) => {
    if (status.currentTime !== undefined) {
      setCurrentTime(status.currentTime);
    }
    if (status.duration !== undefined && status.duration > 0) {
      setDuration(status.duration);
    }
    
    setIsPlaying(status.playing);
    setIsBuffering(status.isBuffering || false);
    
    if (status.didJustFinish) {
      handleTrackEnd();
    }
  }, [handleTrackEnd]);

  const cleanupPlayer = useCallback(() => {
    if (progressPollingRef.current) {
      clearInterval(progressPollingRef.current);
      progressPollingRef.current = null;
    }
    
    if (useNativePlaybackRef.current) {
      PlaybackEngineModule.stop().catch(console.error);
    } else if (useTrackPlayerRef.current) {
      TrackPlayerService.stop().catch(console.error);
    }
    
    if (statusListenerRef.current) {
      statusListenerRef.current.remove();
      statusListenerRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.release();
      } catch (e) {
        console.error('Error releasing player:', e);
      }
      playerRef.current = null;
    }
    if (Platform.OS === 'web') {
      if (webMediaSourceRef.current) {
        try {
          WebAudioEffectsEngine.disconnectMediaElementSource(webMediaSourceRef.current);
        } catch {}
        webMediaSourceRef.current = null;
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current.onloadedmetadata = null;
        audioElementRef.current.ontimeupdate = null;
        audioElementRef.current.onended = null;
        audioElementRef.current.onerror = null;
        audioElementRef.current = null;
      }
    }
  }, []);

  const loadAndPlaySong = useCallback(async (song: PlayableSong) => {
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    
    cleanupPlayer();

    let audioUrl: string | undefined;
    if (isDeviceSong(song) && song.uri) {
      audioUrl = song.uri;
    } else if ('audioUrl' in song && song.audioUrl) {
      audioUrl = song.audioUrl;
    }

    if (!audioUrl) {
      setError('No audio source available');
      setIsLoading(false);
      return;
    }

    setCurrentSong(song);
    setDuration(song.duration || 0);

    try {
      await addToRecentlyPlayed(song.id);
      await incrementPlayCount(song.id);
      const updatedRecentlyPlayed = await getRecentlyPlayed();
      const updatedMostPlayed = await getMostPlayed(10);
      setRecentlyPlayed(updatedRecentlyPlayed);
      setMostPlayed(updatedMostPlayed);
    } catch {}

    if (useNativePlaybackRef.current) {
      try {
        console.log('[PlayerContext] Using PlaybackEngineModule with DSP for music playback');
        const loadResult = await PlaybackEngineModule.loadTrack(audioUrl);
        if (!loadResult.success) {
          throw new Error(loadResult.error || 'Failed to load track');
        }
        const playResult = await PlaybackEngineModule.play();
        if (playResult.success) {
          setIsPlaying(true);
          setIsLoading(false);
        } else {
          throw new Error(playResult.error || 'Playback failed');
        }
        return;
      } catch (err) {
        console.error('[PlayerContext] Native playback error:', err);
        setError('Playback failed');
        setIsLoading(false);
        return;
      }
    }

    if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
      try {
        const trackMetadata = convertSongToTrackMetadata(song);
        if (!trackMetadata) {
          setError('Invalid track data');
          setIsLoading(false);
          return;
        }

        const currentQueue = queueRef.current;
        const songIndex = currentQueue.findIndex(s => s.id === song.id);
        
        if (songIndex >= 0) {
          const currentTrackQueue = await TrackPlayerService.getQueue();
          if (currentTrackQueue.length === currentQueue.length) {
            await TrackPlayerService.skipToTrack(songIndex);
            await TrackPlayerService.play();
          } else {
            const trackMetadataList = currentQueue
              .map(s => convertSongToTrackMetadata(s))
              .filter((t): t is TrackMetadata => t !== null);
            await TrackPlayerService.setQueue(trackMetadataList);
            await TrackPlayerService.skipToTrack(songIndex);
            await TrackPlayerService.play();
          }
        } else {
          await TrackPlayerService.addTrack(trackMetadata);
          const newQueue = await TrackPlayerService.getQueue();
          await TrackPlayerService.skipToTrack(newQueue.length - 1);
          await TrackPlayerService.play();
        }
        
        setIsPlaying(true);
        setIsLoading(false);
        return;
      } catch (err) {
        console.error('[PlayerContext] TrackPlayer error:', err);
        setError('Playback failed');
        setIsLoading(false);
        return;
      }
    }

    if (Platform.OS === 'web') {
      try {
        await WebAudioEffectsEngine.initialize();
        
        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
          audioElementRef.current.crossOrigin = 'anonymous';
        }
        
        const audioElement = audioElementRef.current;
        audioElement.src = audioUrl;
        audioElement.load();
        
        if (!webMediaSourceRef.current) {
          const result = WebAudioEffectsEngine.createMediaElementSource(audioElement);
          if (result && result.connected) {
            webMediaSourceRef.current = result.source;
            console.log('[PlayerContext] Web music playback connected to DSP chain');
          } else {
            console.warn('[PlayerContext] Could not connect to WebAudioEffectsEngine, using direct playback');
          }
        }
        
        audioElement.onloadedmetadata = () => {
          setDuration(audioElement.duration || song.duration || 0);
        };
        
        audioElement.ontimeupdate = () => {
          setCurrentTime(audioElement.currentTime);
        };
        
        audioElement.onended = () => {
          handleTrackEnd();
        };
        
        audioElement.onerror = () => {
          setError('Failed to load audio');
          setIsLoading(false);
        };
        
        await audioElement.play();
        setIsPlaying(true);
        setIsLoading(false);
        
      } catch (err) {
        console.error('[PlayerContext] Web audio error:', err);
        setError('Playback failed');
        setIsLoading(false);
      }
      return;
    }

    // iOS fallback: Use expo-audio if TrackPlayerService isn't available
    // Android should never reach here - PlaybackEngineModule is the exclusive Android engine
    if (Platform.OS === 'ios') {
      try {
        console.log('[PlayerContext] Using expo-audio fallback for iOS');
        const player = createAudioPlayer({ uri: audioUrl });
        playerRef.current = player;
        
        statusListenerRef.current = player.addListener('playbackStatusUpdate', handleStatusUpdate);
        
        player.play();
        setIsPlaying(true);
        setIsLoading(false);
      } catch (err) {
        console.error('[PlayerContext] Expo audio error:', err);
        setError('Playback failed');
        setIsLoading(false);
      }
      return;
    }
    
    // Android without PlaybackEngineModule should not reach here
    if (Platform.OS === 'android') {
      console.error('[PlayerContext] Android playback failed - PlaybackEngineModule not available');
      setError('Native audio engine not available');
      setIsLoading(false);
    }
  }, [cleanupPlayer, convertSongToTrackMetadata, handleTrackEnd, handleStatusUpdate]);

  const togglePlayPause = useCallback(async () => {
    if (useNativePlaybackRef.current) {
      if (isPlaying) {
        await PlaybackEngineModule.pause();
        setIsPlaying(false);
      } else {
        await PlaybackEngineModule.play();
        setIsPlaying(true);
      }
      return;
    }

    if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
      if (isPlaying) {
        await TrackPlayerService.pause();
        setIsPlaying(false);
      } else {
        await TrackPlayerService.play();
        setIsPlaying(true);
      }
      return;
    }

    if (Platform.OS === 'web' && audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioElementRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    // iOS fallback to expo-audio (Android never reaches here)
    if (Platform.OS === 'ios' && playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        playerRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  const seek = useCallback(async (time: number) => {
    if (useNativePlaybackRef.current) {
      await PlaybackEngineModule.seekTo(Math.round(time * 1000));
      setCurrentTime(time);
      return;
    }

    if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
      await TrackPlayerService.seekTo(time);
      setCurrentTime(time);
      return;
    }

    if (Platform.OS === 'web' && audioElementRef.current) {
      audioElementRef.current.currentTime = time;
      setCurrentTime(time);
      return;
    }

    // iOS fallback to expo-audio (Android never reaches here)
    if (Platform.OS === 'ios' && playerRef.current) {
      playerRef.current.seekTo(time);
      setCurrentTime(time);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (useNativePlaybackRef.current) {
      PlaybackEngineModule.skipToNext();
      return;
    }

    if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
      TrackPlayerService.skipToNext();
      return;
    }

    const song = currentSongRef.current;
    const currentQueue = queueRef.current;
    const currentShuffle = shuffleRef.current;

    if (!song || currentQueue.length === 0) return;

    const currentIndex = currentQueue.findIndex((s) => s.id === song.id);
    let nextIndex: number;

    if (currentShuffle) {
      nextIndex = Math.floor(Math.random() * currentQueue.length);
    } else {
      nextIndex = (currentIndex + 1) % currentQueue.length;
    }

    const nextSong = currentQueue[nextIndex];
    if (nextSong) {
      loadAndPlaySong(nextSong);
    }
  }, [loadAndPlaySong]);

  const handlePrevious = useCallback(() => {
    if (useNativePlaybackRef.current) {
      if (currentTime > 3) {
        PlaybackEngineModule.seekTo(0);
      } else {
        PlaybackEngineModule.skipToPrevious();
      }
      return;
    }

    if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
      if (currentTime > 3) {
        TrackPlayerService.seekTo(0);
      } else {
        TrackPlayerService.skipToPrevious();
      }
      return;
    }

    if (currentTime > 3) {
      seek(0);
      return;
    }

    const song = currentSongRef.current;
    const currentQueue = queueRef.current;
    const currentShuffle = shuffleRef.current;

    if (!song || currentQueue.length === 0) return;

    const currentIndex = currentQueue.findIndex((s) => s.id === song.id);
    let prevIndex: number;

    if (currentShuffle) {
      prevIndex = Math.floor(Math.random() * currentQueue.length);
    } else {
      prevIndex = currentIndex > 0 ? currentIndex - 1 : currentQueue.length - 1;
    }

    const prevSong = currentQueue[prevIndex];
    if (prevSong) {
      loadAndPlaySong(prevSong);
    }
  }, [currentTime, seek, loadAndPlaySong]);

  useEffect(() => {
    handleNextInternalRef.current = handleNext;
    handlePreviousInternalRef.current = handlePrevious;
  }, [handleNext, handlePrevious]);

  const playSong = useCallback(async (song: PlayableSong) => {
    await AudioCoordinator.requestPlayback('music');
    loadAndPlaySong(song);
  }, [loadAndPlaySong]);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleFavorite = useCallback(async (songId: string) => {
    const newFavorites = favorites.includes(songId)
      ? favorites.filter(id => id !== songId)
      : [...favorites, songId];
    setFavorites(newFavorites);
    await saveFavorites(newFavorites);
  }, [favorites]);

  const isFavorite = useCallback((songId: string) => {
    return favorites.includes(songId);
  }, [favorites]);

  const removeFromQueue = useCallback((songIds: string[]) => {
    setQueueState(prev => prev.filter(song => !songIds.includes(song.id)));
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState([]);
  }, []);

  const setQueue = useCallback((songs: PlayableSong[]) => {
    setQueueState(songs);
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    setSleepTimerMinutesState(minutes);

    if (minutes !== null) {
      sleepTimerRef.current = setTimeout(() => {
        if (useNativePlaybackRef.current) {
          // Android: Use PlaybackEngineModule
          PlaybackEngineModule.pause();
        } else if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
          // iOS: Use TrackPlayerService
          TrackPlayerService.pause();
        } else if (Platform.OS === 'web' && audioElementRef.current) {
          audioElementRef.current.pause();
        } else if (Platform.OS === 'ios' && playerRef.current) {
          // iOS fallback to expo-audio
          playerRef.current.pause();
        }
        setIsPlaying(false);
        setSleepTimerMinutesState(null);
      }, minutes * 60 * 1000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentSong) {
      const songForStorage = isDeviceSong(currentSong) 
        ? {
            id: currentSong.id,
            title: currentSong.title,
            artist: currentSong.artist,
            album: currentSong.album,
            duration: currentSong.duration,
            artwork: currentSong.artwork,
            uri: currentSong.uri,
            isFromDevice: true,
            filename: currentSong.filename,
            modificationTime: currentSong.modificationTime,
          }
        : {
            id: currentSong.id,
            title: currentSong.title,
            artist: currentSong.artist,
            album: currentSong.album,
            duration: currentSong.duration,
            artwork: currentSong.artwork,
            audioUrl: currentSong.audioUrl,
            isFromDevice: false,
          };
      
      savePlayerState({
        currentSongId: currentSong.id,
        isPlaying,
        currentTime,
        shuffle,
        repeat,
        queue: queue.map(s => s.id),
        lastSong: songForStorage,
        lastDuration: duration,
      });
    }
  }, [currentSong, isPlaying, currentTime, shuffle, repeat, queue, duration]);

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        shuffle,
        repeat,
        queue,
        progress,
        favorites,
        recentlyPlayed,
        mostPlayed,
        sleepTimerMinutes,
        isLoading,
        isBuffering,
        error,
        isFavorite,
        toggleFavorite,
        playSong,
        togglePlayPause,
        handleNext,
        handlePrevious,
        seek,
        toggleShuffle,
        toggleRepeat,
        removeFromQueue,
        clearQueue,
        setSleepTimer,
        setQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}

// Alias for backward compatibility
export const usePlayerContext = usePlayer;
