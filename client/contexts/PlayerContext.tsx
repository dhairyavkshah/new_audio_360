import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { createAudioPlayer, AudioPlayer, AudioStatus, setAudioModeAsync } from 'expo-audio';
import { Song, mockSongs } from '@/lib/data';
import { DeviceSong, useMediaLibraryContext } from '@/contexts/MediaLibraryContext';
import { savePlayerState, getPlayerState, getFavorites, saveFavorites, getRecentlyPlayed, addToRecentlyPlayed, getMostPlayed, incrementPlayCount } from '@/lib/storage';
import { useSoundLab, EQBands } from '@/contexts/SoundLabContext';
import { PlaybackEngineModule, PlaybackStatus, ImmersiveModeEngineModule, AudioSessionBridgeModule } from 'audio-effects';
import { NativeEffectsManager } from '@/services/NativeEffectsManager';
import { TrackPlayerService, State, TrackMetadata, PlaybackSource } from '@/services/TrackPlayerService';
import { AudioCoordinator } from '@/services/AudioCoordinator';
import { setMusicPlaying } from '@/lib/playbackState';
import { soundCloudWidgetPlayer } from '@/services/SoundCloudWidgetPlayer';

const EQ_FREQUENCIES: Record<keyof EQBands, number> = {
  sub: 32,
  bass: 64,
  lowMid: 250,
  mid: 1000,
  highMid: 4000,
  treble: 8000,
  brilliance: 16000,
};

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
  const { mode: soundLabMode, eqBands, immersiveEffect, bassBoost, trebleBoost } = useSoundLab();
  const { songs: mediaLibrarySongs, isLoading: mediaLibraryLoading } = useMediaLibraryContext();
  
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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const bassBoostFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleBoostFilterRef = useRef<BiquadFilterNode | null>(null);
  const stereoWidenerRef = useRef<StereoPannerNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayGainRef = useRef<GainNode | null>(null);

  const useNativePlaybackRef = useRef(Platform.OS === 'android' && PlaybackEngineModule.isAvailable());
  const useTrackPlayerRef = useRef(TrackPlayerService.isAvailable());
  const trackPlayerInitializedRef = useRef(false);
  const nativeAudioSessionIdRef = useRef<number>(0);
  const progressPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastKnownPositionRef = useRef<number>(0);
  const wasPlayingBeforeBackgroundRef = useRef<boolean>(false);
  const handleNextInternalRef = useRef<() => void>(() => {});
  const usingSoundCloudWidgetRef = useRef<boolean>(false);
  const soundCloudTrackIdRef = useRef<number | null>(null);
  const handlePreviousInternalRef = useRef<() => void>(() => {});
  const lastSaveTimeRef = useRef<number>(0);
  const progressSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTimeRef = useRef<number>(0);
  const playbackRestoredRef = useRef<boolean>(false);
  const lastProgressUpdateRef = useRef<number>(0);
  const progressThrottleMs = 1000; // Throttle progress updates to 1/sec to reduce re-renders

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
    currentTimeRef.current = currentTime;
  }, [currentTime]);

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
        // PlaybackService already called skipToNext - onTrackChange handles UI update
        console.log('[PlayerContext] Remote next callback - UI will update via onTrackChange');
      },
      onPrevious: () => {
        // PlaybackService already called skipToPrevious - onTrackChange handles UI update
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
            // Reset position immediately to prevent slider flash
            setCurrentTime(0);
            setCurrentSong(currentQueue[trackIndex]);
            const track = await TrackPlayerService.getCurrentTrack();
            if (track?.duration) {
              setDuration(track.duration);
            } else {
              // Fallback to song duration from queue
              setDuration(currentQueue[trackIndex].duration || 0);
            }
          }
        }
      },
      onProgress: (progress) => {
        if (TrackPlayerService.getPlaybackSource() !== 'music') return;
        // Throttle progress updates to reduce React re-renders and prevent lag
        const now = Date.now();
        if (now - lastProgressUpdateRef.current < progressThrottleMs) return;
        lastProgressUpdateRef.current = now;
        
        // Only update position if it's reasonable (not greater than duration)
        // This prevents slider flash during track transitions
        if (progress.duration > 0 && progress.position <= progress.duration) {
          setCurrentTime(progress.position);
          setDuration(progress.duration);
        } else if (progress.duration > 0) {
          // Track just started, use new duration but reset position
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
            // Service not ready
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

  useEffect(() => {
    if (useTrackPlayerRef.current && !trackPlayerInitializedRef.current) {
      TrackPlayerService.initialize().then(async (initialized) => {
        if (initialized) {
          trackPlayerInitializedRef.current = true;
          console.log('[PlayerContext] TrackPlayerService initialized');
          
          setupTrackPlayerCallbacks();
          TrackPlayerService.setRepeatMode(repeat);
          
          if (Platform.OS === 'android' && NativeEffectsManager.isAvailable()) {
            try {
              let audioSessionId = 0;
              
              // Try to get TrackPlayer's audio session ID
              if (AudioSessionBridgeModule.isAvailable()) {
                const trackPlayerResult = await AudioSessionBridgeModule.getTrackPlayerSessionId();
                if (trackPlayerResult.success && trackPlayerResult.sessionId > 0) {
                  audioSessionId = trackPlayerResult.sessionId;
                  console.log('[PlayerContext] Got TrackPlayer audio session ID:', audioSessionId);
                } else {
                  // Fallback: generate a new audio session ID
                  audioSessionId = AudioSessionBridgeModule.generateAudioSessionId();
                  if (audioSessionId > 0) {
                    console.log('[PlayerContext] Generated audio session ID:', audioSessionId);
                  } else {
                    // Last resort: use session 0 (global)
                    audioSessionId = 0;
                    console.log('[PlayerContext] Using global audio session (0)');
                  }
                }
              }
              
              const attached = await NativeEffectsManager.attach(audioSessionId);
              if (attached) {
                console.log('[PlayerContext] NativeEffectsManager attached to audio session:', audioSessionId);
              } else {
                console.log('[PlayerContext] NativeEffectsManager attachment returned false - effects may not work');
              }
              
              if (ImmersiveModeEngineModule.isAvailable()) {
                const immersiveResult = await ImmersiveModeEngineModule.attach(audioSessionId);
                if (immersiveResult.success) {
                  console.log('[PlayerContext] ImmersiveModeEngineModule attached to audio session:', audioSessionId);
                }
              }
            } catch (err) {
              console.warn('[PlayerContext] Failed to attach audio effects:', err);
            }
          }
        }
      });
    }
    
    return () => {
      if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
        TrackPlayerService.destroy();
        NativeEffectsManager.release();
        if (Platform.OS === 'android' && ImmersiveModeEngineModule.isAvailable()) {
          ImmersiveModeEngineModule.release();
        }
        trackPlayerInitializedRef.current = false;
      }
    };
  }, [setupTrackPlayerCallbacks]);

  useEffect(() => {
    if (useNativePlaybackRef.current && !useTrackPlayerRef.current) {
      PlaybackEngineModule.initialize().then(async (initResult) => {
        if (initResult.success && initResult.audioSessionId) {
          nativeAudioSessionIdRef.current = initResult.audioSessionId;
          console.log('PlaybackEngineModule initialized with audioSessionId:', initResult.audioSessionId);
          
          const attached = await NativeEffectsManager.attach(initResult.audioSessionId);
          if (attached) {
            console.log('NativeEffectsManager attached to audio session');
          }
        } else if (initResult.error) {
          console.warn('PlaybackEngineModule initialization failed:', initResult.error);
        }
      });
    }
    
    return () => {
      if (useNativePlaybackRef.current && !useTrackPlayerRef.current) {
        NativeEffectsManager.release();
        PlaybackEngineModule.release();
      }
    };
  }, []);

  useEffect(() => {
    getPlayerState().then((state) => {
      if (state) {
        setCurrentTime(state.currentTime || 0);
        setShuffle(state.shuffle || false);
        setRepeat(state.repeat || 'off');
      }
    });
    getFavorites().then(setFavorites);
    getRecentlyPlayed().then(setRecentlyPlayed);
    getMostPlayed(10).then(setMostPlayed);
  }, []);

  // Full playback state restoration when media library is available
  useEffect(() => {
    // Only restore once
    if (playbackRestoredRef.current) return;
    
    // Wait for media library to finish loading
    if (mediaLibraryLoading) return;
    
    const restorePlaybackState = async () => {
      try {
        const state = await getPlayerState();
        if (!state || !state.currentSongId) {
          playbackRestoredRef.current = true;
          return;
        }
        
        console.log('[PlayerContext] Restoring playback state:', {
          currentSongId: state.currentSongId,
          queueLength: state.queue?.length || 0,
          currentTime: state.currentTime
        });
        
        // Helper function to find a song by ID
        const findSongById = (id: string): PlayableSong | undefined => {
          // First check media library songs
          const deviceSong = mediaLibrarySongs.find(s => s.id === id);
          if (deviceSong) return deviceSong;
          
          // Fallback to mock songs
          const mockSong = mockSongs.find(s => s.id === id);
          if (mockSong) return mockSong;
          
          return undefined;
        };
        
        // Restore queue from saved song IDs
        let restoredQueue: PlayableSong[] = [];
        if (state.queue && state.queue.length > 0) {
          restoredQueue = state.queue
            .map(id => findSongById(id))
            .filter((song): song is PlayableSong => song !== undefined);
        }
        
        // Find the current song
        const currentSongToRestore = findSongById(state.currentSongId);
        
        if (currentSongToRestore) {
          console.log('[PlayerContext] Restored song:', currentSongToRestore.title);
          
          // If queue is empty but we have a current song, create a queue with just that song
          if (restoredQueue.length === 0) {
            restoredQueue = [currentSongToRestore];
          }
          
          // Set the queue and current song without auto-playing
          setQueueState(restoredQueue);
          setCurrentSong(currentSongToRestore);
          setDuration(currentSongToRestore.duration || 0);
          
          // currentTime was already restored in the previous effect
          console.log('[PlayerContext] Playback state restored successfully (paused at', state.currentTime, 'seconds)');
        } else {
          console.log('[PlayerContext] Could not find saved song in library:', state.currentSongId);
        }
        
        playbackRestoredRef.current = true;
      } catch (error) {
        console.error('[PlayerContext] Error restoring playback state:', error);
        playbackRestoredRef.current = true;
      }
    };
    
    restorePlaybackState();
  }, [mediaLibraryLoading, mediaLibrarySongs]);

  useEffect(() => {
    if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
      TrackPlayerService.setRepeatMode(repeat);
    }
  }, [repeat]);

  useEffect(() => {
    const appStateRef = { current: AppState.currentState };
    
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/) && appStateRef.current === 'active') {
        console.log('[PlayerContext] App going to background - saving state');
        let positionToSave = currentTimeRef.current;
        let wasPlaying = false;
        
        if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
          try {
            const progress = await TrackPlayerService.getProgress();
            const state = await TrackPlayerService.getState();
            if (progress) {
              lastKnownPositionRef.current = progress.position;
              positionToSave = progress.position;
            }
            wasPlayingBeforeBackgroundRef.current = state === State.Playing;
            wasPlaying = state === State.Playing;
          } catch {
            lastKnownPositionRef.current = currentTimeRef.current;
            wasPlayingBeforeBackgroundRef.current = false;
          }
        } else {
          lastKnownPositionRef.current = currentTimeRef.current;
          wasPlayingBeforeBackgroundRef.current = false;
        }
        
        if (currentSongRef.current) {
          savePlayerState({
            currentSongId: currentSongRef.current.id,
            isPlaying: wasPlaying,
            currentTime: positionToSave,
            shuffle: shuffleRef.current,
            repeat: repeatRef.current,
            queue: queueRef.current.map(s => s.id),
          });
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
            
            if (trackPlayerInitializedRef.current && TrackPlayerService.getPlaybackSource() === 'music') {
              // Batch state and progress calls to reduce lag on foreground return
              const [state, progress] = await Promise.all([
                TrackPlayerService.getState(),
                TrackPlayerService.getProgress()
              ]);
              
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
  }, [setupTrackPlayerCallbacks, restoreTrackPlayerQueue]);

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
      if (useTrackPlayerRef.current) {
        TrackPlayerService.seekTo(0).then(() => {
          TrackPlayerService.play();
        });
      } else if (useNativePlaybackRef.current) {
        PlaybackEngineModule.seekTo(0).then(() => {
          PlaybackEngineModule.play();
        });
      } else if (playerRef.current) {
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
    
    if (useTrackPlayerRef.current) {
      TrackPlayerService.stop().catch(console.error);
    } else if (useNativePlaybackRef.current) {
      PlaybackEngineModule.stop().catch(console.error);
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
      if (usingSoundCloudWidgetRef.current) {
        soundCloudWidgetPlayer.pause();
        soundCloudWidgetPlayer.clearCallbacks();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      if (mediaSourceRef.current) {
        try { mediaSourceRef.current.disconnect(); } catch {}
      }
      eqFiltersRef.current.forEach(f => { try { f.disconnect(); } catch {} });
      if (gainNodeRef.current) { try { gainNodeRef.current.disconnect(); } catch {} }
      if (limiterRef.current) { try { limiterRef.current.disconnect(); } catch {} }
      if (stereoWidenerRef.current) { try { stereoWidenerRef.current.disconnect(); } catch {} }
      if (delayNodeRef.current) { try { delayNodeRef.current.disconnect(); } catch {} }
      if (delayGainRef.current) { try { delayGainRef.current.disconnect(); } catch {} }
    }
    AudioCoordinator.notifyPlaybackStopped('music');
  }, []);

  const stopMusicForCoordinator = useCallback(async (): Promise<void> => {
    // Stop playback but preserve the queue and position for resumption
    // This allows resuming playback when switching back from radio
    if (useTrackPlayerRef.current) {
      try {
        const progress = await TrackPlayerService.getProgress();
        if (progress) {
          lastKnownPositionRef.current = progress.position;
        }
        await TrackPlayerService.stopPreservingQueue();
      } catch (error) {
        console.warn('[PlayerContext] Failed to stop for coordinator:', error);
      }
    } else if (useNativePlaybackRef.current) {
      PlaybackEngineModule.pause().catch(console.error);
    } else if (Platform.OS === 'web' && audioElementRef.current) {
      audioElementRef.current.pause();
    } else if (playerRef.current) {
      playerRef.current.pause();
    }
    
    setIsPlaying(false);
    AudioCoordinator.notifyPlaybackStopped('music');
  }, []);

  useEffect(() => {
    AudioCoordinator.registerMusicStopCallback(stopMusicForCoordinator);
  }, [stopMusicForCoordinator]);
  
  const createEQChain = useCallback((ctx: AudioContext): BiquadFilterNode[] => {
    eqFiltersRef.current.forEach(f => { try { f.disconnect(); } catch {} });
    eqFiltersRef.current = [];
    
    // Disconnect old bass/treble filters
    if (bassBoostFilterRef.current) { try { bassBoostFilterRef.current.disconnect(); } catch {} }
    if (trebleBoostFilterRef.current) { try { trebleBoostFilterRef.current.disconnect(); } catch {} }

    const bands = Object.keys(EQ_FREQUENCIES) as (keyof EQBands)[];
    const bandValues = bands.map(band => eqBands[band]);
    const sum = bandValues.reduce((acc, v) => acc + v, 0);
    const average = sum / bandValues.length;
    const zeroSumBands = bandValues.map(v => v - average);
    
    const DB_PER_UNIT = 2.4;
    const MAX_DB = 12;
    
    // Create EQ band filters (only apply preset, no bass/treble boost here)
    bands.forEach((band, index) => {
      const filter = ctx.createBiquadFilter();
      
      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === bands.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.5;
      }
      
      filter.frequency.value = EQ_FREQUENCIES[band];
      
      if (soundLabMode === 'equalizer') {
        const dbValue = zeroSumBands[index] * DB_PER_UNIT;
        filter.gain.value = Math.max(-MAX_DB, Math.min(MAX_DB, dbValue));
      } else {
        filter.gain.value = 0;
      }
      
      eqFiltersRef.current.push(filter);
    });

    // Create dedicated Bass Boost filter (lowshelf at 150Hz for full bass range)
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 150; // Boosts ALL frequencies below 150Hz
    bassFilter.gain.value = soundLabMode === 'equalizer' ? bassBoost * DB_PER_UNIT : 0;
    bassBoostFilterRef.current = bassFilter;
    
    // Create dedicated Treble Boost filter (highshelf at 6kHz for full treble range)
    const trebleFilter = ctx.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 6000; // Boosts ALL frequencies above 6kHz
    trebleFilter.gain.value = soundLabMode === 'equalizer' ? trebleBoost * DB_PER_UNIT : 0;
    trebleBoostFilterRef.current = trebleFilter;

    // Connect EQ chain
    for (let i = 0; i < eqFiltersRef.current.length - 1; i++) {
      eqFiltersRef.current[i].connect(eqFiltersRef.current[i + 1]);
    }
    
    // Connect: last EQ -> Bass Boost -> Treble Boost
    if (eqFiltersRef.current.length > 0) {
      eqFiltersRef.current[eqFiltersRef.current.length - 1].connect(bassFilter);
    }
    bassFilter.connect(trebleFilter);

    return eqFiltersRef.current;
  }, [soundLabMode, eqBands, bassBoost, trebleBoost]);
  
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const bands = Object.keys(EQ_FREQUENCIES) as (keyof EQBands)[];
    const bandValues = bands.map(band => eqBands[band]);
    const sum = bandValues.reduce((acc, v) => acc + v, 0);
    const average = sum / bandValues.length;
    const zeroSumBands = bandValues.map(v => v - average);
    
    const DB_PER_UNIT = 2.4;
    const MAX_DB = 12;
    
    // Update EQ band filters (preset only, no bass/treble boost)
    eqFiltersRef.current.forEach((filter, index) => {
      if (soundLabMode === 'equalizer') {
        const dbValue = zeroSumBands[index] * DB_PER_UNIT;
        filter.gain.value = Math.max(-MAX_DB, Math.min(MAX_DB, dbValue));
      } else {
        filter.gain.value = 0;
      }
    });
    
    // Limiter is used instead of fixed gain compensation
    // The DynamicsCompressorNode configured as a limiter handles distortion prevention intelligently
    
    // Update dedicated Bass Boost filter
    if (bassBoostFilterRef.current) {
      bassBoostFilterRef.current.gain.value = soundLabMode === 'equalizer' 
        ? Math.max(-MAX_DB, Math.min(MAX_DB, bassBoost * DB_PER_UNIT)) 
        : 0;
    }
    
    // Update dedicated Treble Boost filter
    if (trebleBoostFilterRef.current) {
      trebleBoostFilterRef.current.gain.value = soundLabMode === 'equalizer' 
        ? Math.max(-MAX_DB, Math.min(MAX_DB, trebleBoost * DB_PER_UNIT)) 
        : 0;
    }
    
    if (stereoWidenerRef.current) {
      stereoWidenerRef.current.pan.value = 0;
    }
    if (delayGainRef.current) {
      delayGainRef.current.gain.value = soundLabMode === 'immersive' ? immersiveEffect.reverb * 0.3 : 0;
    }
    if (delayNodeRef.current && soundLabMode === 'immersive') {
      delayNodeRef.current.delayTime.value = immersiveEffect.delay / 1000;
    }
  }, [soundLabMode, eqBands, immersiveEffect, bassBoost, trebleBoost]);

  useEffect(() => {
    if (Platform.OS === 'android' && nativeAudioSessionIdRef.current > 0) {
      NativeEffectsManager.applySettings(soundLabMode, eqBands);
    }
  }, [soundLabMode, eqBands, immersiveEffect]);

  const loadAndPlaySong = useCallback(async (song: PlayableSong) => {
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(song.duration || 0);
    setCurrentSong(song);

    try {
      await AudioCoordinator.requestPlayback('music');

      let audioSource: string | null = null;

      if (isDeviceSong(song) && song.uri) {
        audioSource = song.uri;
      } else if ('audioUrl' in song && song.audioUrl) {
        audioSource = song.audioUrl;
      } else {
        const demoMessage = Platform.OS === 'web' 
          ? 'Demo mode - add real audio files from your device'
          : 'No audio file available for this song';
        setError(demoMessage);
        setIsLoading(false);
        setCurrentSong(song);
        return;
      }

      if (!audioSource) {
        setError('No audio source available');
        setIsLoading(false);
        return;
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        cleanupPlayer();
        
        const isSoundCloudTrack = ('source' in song && song.source === 'soundcloud') || song.id.startsWith('sc_');
        
        if (isSoundCloudTrack) {
          console.log('[PlayerContext] Using SoundCloud Widget for track:', song.id);
          usingSoundCloudWidgetRef.current = true;
          const trackId = parseInt(song.id.replace('sc_', ''), 10);
          soundCloudTrackIdRef.current = trackId;
          
          soundCloudWidgetPlayer.onPlay(() => {
            setIsPlaying(true);
            setIsLoading(false);
          });
          
          soundCloudWidgetPlayer.onPause(() => {
            setIsPlaying(false);
          });
          
          soundCloudWidgetPlayer.onFinish(() => {
            setIsPlaying(false);
            handleTrackEnd();
          });
          
          soundCloudWidgetPlayer.onProgress((data) => {
            setCurrentTime(data.position / 1000);
            if (data.duration > 0) {
              setDuration(data.duration / 1000);
            }
          });
          
          soundCloudWidgetPlayer.onError((err) => {
            console.error('[PlayerContext] SoundCloud Widget error:', err);
            setError('Failed to play SoundCloud track');
            setIsLoading(false);
          });
          
          try {
            await soundCloudWidgetPlayer.initialize();
            await soundCloudWidgetPlayer.loadTrackById(trackId, true);
            setIsPlaying(true);
            setIsLoading(false);
            AudioCoordinator.notifyPlaybackStarted('music');
          } catch (err) {
            console.error('[PlayerContext] Failed to load SoundCloud track:', err);
            setError('Failed to load SoundCloud track');
            setIsLoading(false);
          }
          return;
        }
        
        usingSoundCloudWidgetRef.current = false;
        soundCloudTrackIdRef.current = null;
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        let webAudioSource = audioSource;
        if (audioSource.startsWith('/') && !audioSource.startsWith('//')) {
          webAudioSource = `${window.location.origin}${audioSource}`;
        }

        const isExternalStream = webAudioSource.startsWith('http') && !webAudioSource.includes(window.location.host);

        const audio = new Audio();
        if (!isExternalStream) {
          audio.crossOrigin = 'anonymous';
        }
        audio.src = webAudioSource;
        audioElementRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => resolve();
          audio.onerror = (e) => {
            const errorCode = audio.error?.code;
            const errorMessage = audio.error?.message || 'Unknown error';
            console.error('[PlayerContext] Audio load error:', errorCode, errorMessage, 'URL:', webAudioSource);
            reject(new Error(`Failed to load audio: ${errorMessage} (code: ${errorCode})`));
          };
          audio.load();
        });

        if (isExternalStream) {
          console.log('[PlayerContext] External stream - using direct playback (no DSP processing)');
        } else {
          mediaSourceRef.current = ctx.createMediaElementSource(audio);

          gainNodeRef.current = ctx.createGain();
          gainNodeRef.current.gain.value = 1;

          const eqChain = createEQChain(ctx);

          stereoWidenerRef.current = ctx.createStereoPanner();
          delayNodeRef.current = ctx.createDelay(0.5);
          delayGainRef.current = ctx.createGain();
          delayGainRef.current.gain.value = soundLabMode === 'immersive' ? immersiveEffect.reverb * 0.3 : 0;
          if (soundLabMode === 'immersive') {
            delayNodeRef.current.delayTime.value = immersiveEffect.delay / 1000;
            stereoWidenerRef.current.pan.value = 0;
          }

          limiterRef.current = ctx.createDynamicsCompressor();
          limiterRef.current.threshold.value = -1;
          limiterRef.current.knee.value = 0;
          limiterRef.current.ratio.value = 20;
          limiterRef.current.attack.value = 0.001;
          limiterRef.current.release.value = 0.1;

          mediaSourceRef.current.connect(gainNodeRef.current);
          
          if (eqChain.length > 0) {
            gainNodeRef.current.connect(eqChain[0]);
            if (trebleBoostFilterRef.current) {
              trebleBoostFilterRef.current.connect(stereoWidenerRef.current);
            } else {
              eqChain[eqChain.length - 1].connect(stereoWidenerRef.current);
            }
          } else {
            gainNodeRef.current.connect(stereoWidenerRef.current);
          }

          stereoWidenerRef.current.connect(limiterRef.current);
          limiterRef.current.connect(ctx.destination);
          stereoWidenerRef.current.connect(delayNodeRef.current);
          delayNodeRef.current.connect(delayGainRef.current);
          delayGainRef.current.connect(limiterRef.current);
        }

        audio.onended = () => {
          setIsPlaying(false);
          handleTrackEnd();
        };

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
          if (audio.duration && !isNaN(audio.duration)) {
            setDuration(audio.duration);
          }
        };

        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
        AudioCoordinator.notifyPlaybackStarted('music');
      } else if (useTrackPlayerRef.current) {
        console.log('[PlayerContext] Using TrackPlayer for playback');
        
        if (!trackPlayerInitializedRef.current) {
          console.log('[PlayerContext] Initializing TrackPlayer...');
          const initialized = await TrackPlayerService.initialize();
          if (!initialized) {
            console.warn('[PlayerContext] TrackPlayer failed to initialize, falling back to expo-av');
            cleanupPlayer();
            
            const source = audioSource.startsWith('file://') || audioSource.startsWith('content://') 
              ? { uri: audioSource } 
              : audioSource;
            const newPlayer = createAudioPlayer(source);
            playerRef.current = newPlayer;

            statusListenerRef.current = newPlayer.addListener('playbackStatusUpdate', handleStatusUpdate);

            newPlayer.play();
            setIsPlaying(true);
            setIsLoading(false);
            return;
          }
          trackPlayerInitializedRef.current = true;
          console.log('[PlayerContext] TrackPlayer initialized successfully');
        }

        // Stop and reset current playback before loading new track
        // This prevents lag from old track continuing in background
        try {
          await TrackPlayerService.stop();
        } catch (e) {
          console.log('[PlayerContext] Stop before load failed (may be normal):', e);
        }

        // Set source to music
        TrackPlayerService.setPlaybackSource('music');
        
        // Register music callbacks fresh to prevent overwrites from other contexts
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
            // PlaybackService already called skipToNext - onTrackChange handles UI update
            console.log('[PlayerContext] Remote next callback - UI will update via onTrackChange');
          },
          onPrevious: () => {
            // PlaybackService already called skipToPrevious - onTrackChange handles UI update
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
                setCurrentSong(currentQueue[trackIndex]);
                const track = await TrackPlayerService.getCurrentTrack();
                if (track?.duration) {
                  setDuration(track.duration);
                }
              }
            }
          },
          onProgress: (progress) => {
            if (TrackPlayerService.getPlaybackSource() !== 'music') return;
            // Throttle progress updates to reduce React re-renders and prevent lag
            const now = Date.now();
            if (now - lastProgressUpdateRef.current < progressThrottleMs) return;
            lastProgressUpdateRef.current = now;
            
            setCurrentTime(progress.position);
            if (progress.duration > 0) {
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
        
        let currentQueue = queueRef.current;
        console.log('[PlayerContext] Current queue length:', currentQueue.length);
        
        // If queue is empty, add the current song as a single-track queue
        if (currentQueue.length === 0 && song) {
          console.log('[PlayerContext] Queue empty, adding current song');
          currentQueue = [song];
          setQueueState([song]);
        }
        
        const trackMetadataList: TrackMetadata[] = currentQueue
          .map(s => convertSongToTrackMetadata(s))
          .filter((t): t is TrackMetadata => t !== null);
        
        console.log('[PlayerContext] Valid tracks for TrackPlayer:', trackMetadataList.length);
        
        if (trackMetadataList.length === 0) {
          // Last resort: try to create metadata from current song directly
          const singleTrack = convertSongToTrackMetadata(song);
          if (singleTrack) {
            console.log('[PlayerContext] Using single track fallback');
            trackMetadataList.push(singleTrack);
          } else {
            setError('No valid audio source for this song');
            setIsLoading(false);
            return;
          }
        }

        try {
          console.log('[PlayerContext] Setting TrackPlayer queue...');
          await TrackPlayerService.setQueue(trackMetadataList);
          
          const trackIndex = trackMetadataList.findIndex(t => t.id === song.id);
          console.log('[PlayerContext] Track index in queue:', trackIndex);
          
          if (trackIndex >= 0) {
            await TrackPlayerService.skipToTrack(trackIndex);
          }
          
          console.log('[PlayerContext] Starting TrackPlayer playback...');
          await TrackPlayerService.play();
          
          setIsPlaying(true);
          setIsLoading(false);
          AudioCoordinator.notifyPlaybackStarted('music');
          console.log('[PlayerContext] TrackPlayer playback started successfully');
        } catch (trackPlayerError) {
          console.error('[PlayerContext] TrackPlayer error:', trackPlayerError);
          setError('Failed to start playback');
          setIsLoading(false);
        }
      } else if (useNativePlaybackRef.current) {
        cleanupPlayer();
        
        const loadResult = await PlaybackEngineModule.loadTrack(audioSource);
        
        if (!loadResult.success) {
          setError(loadResult.error || 'Failed to load audio with native player');
          setIsLoading(false);
          return;
        }

        if (loadResult.audioSessionId) {
          nativeAudioSessionIdRef.current = loadResult.audioSessionId;
        }

        const playResult = await PlaybackEngineModule.play();
        
        if (!playResult.success) {
          setError(playResult.error || 'Failed to play audio');
          setIsLoading(false);
          return;
        }

        const status = PlaybackEngineModule.getStatus();
        if (status.durationMs > 0) {
          setDuration(status.durationMs / 1000);
        }

        setIsPlaying(true);
        setIsLoading(false);
        AudioCoordinator.notifyPlaybackStarted('music');
      } else {
        cleanupPlayer();
        
        const source = audioSource.startsWith('file://') || audioSource.startsWith('content://') 
          ? { uri: audioSource } 
          : audioSource;
        const newPlayer = createAudioPlayer(source);
        playerRef.current = newPlayer;

        statusListenerRef.current = newPlayer.addListener('playbackStatusUpdate', handleStatusUpdate);

        newPlayer.play();
        setIsPlaying(true);
        setIsLoading(false);
        AudioCoordinator.notifyPlaybackStarted('music');
      }

      addToRecentlyPlayed(song.id).then(() => {
        getRecentlyPlayed().then(setRecentlyPlayed);
      });
      incrementPlayCount(song.id).then(() => {
        getMostPlayed(10).then(setMostPlayed);
      });

    } catch (e: any) {
      console.error('Error loading song:', e?.message || e);
      setError(e?.message || 'Audio unavailable - use development build for playback');
      setIsLoading(false);
      // Still set the song so UI displays correctly
      setCurrentSong(song);
    }
  }, [cleanupPlayer, handleStatusUpdate, createEQChain, handleTrackEnd, soundLabMode, immersiveEffect, convertSongToTrackMetadata]);

  useEffect(() => {
    return () => {
      cleanupPlayer();
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
    };
  }, [cleanupPlayer]);

  useEffect(() => {
    if (currentSong) {
      lastSaveTimeRef.current = Date.now();
      savePlayerState({
        currentSongId: currentSong.id,
        isPlaying,
        currentTime: currentTimeRef.current,
        shuffle,
        repeat,
        queue: queue.map(s => s.id),
      });
    }
  }, [currentSong, isPlaying, shuffle, repeat, queue]);

  useEffect(() => {
    if (isPlaying && currentSong) {
      progressSaveIntervalRef.current = setInterval(() => {
        const now = Date.now();
        if (now - lastSaveTimeRef.current >= 5000) {
          lastSaveTimeRef.current = now;
          savePlayerState({
            currentSongId: currentSongRef.current?.id || '',
            isPlaying: true,
            currentTime: currentTimeRef.current,
            shuffle: shuffleRef.current,
            repeat: repeatRef.current,
            queue: queueRef.current.map(s => s.id),
          });
        }
      }, 5000);
    }

    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
    };
  }, [isPlaying, currentSong]);

  const playSong = useCallback((song: PlayableSong) => {
    loadAndPlaySong(song);
  }, [loadAndPlaySong]);

  const isFavorite = useCallback((songId: string) => {
    return favorites.includes(songId);
  }, [favorites]);

  const toggleFavoriteHandler = useCallback((songId: string) => {
    const newFavorites = favorites.includes(songId)
      ? favorites.filter(id => id !== songId)
      : [...favorites, songId];
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  }, [favorites]);

  const handleNextInternal = useCallback(() => {
    const song = currentSongRef.current;
    const currentQueue = queueRef.current;
    const currentShuffle = shuffleRef.current;
    const currentRepeat = repeatRef.current;
    
    if (!song) return;

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
  }, [loadAndPlaySong]);

  const handlePreviousInternal = useCallback(() => {
    const song = currentSongRef.current;
    const currentQueue = queueRef.current;
    
    if (!song) return;

    const currentIndex = currentQueue.findIndex((s) => s.id === song.id);
    const prevIndex = currentIndex === 0 ? currentQueue.length - 1 : currentIndex - 1;
    const prevSong = currentQueue[prevIndex];
    if (prevSong) {
      loadAndPlaySong(prevSong);
    }
  }, [loadAndPlaySong]);

  useEffect(() => {
    handleNextInternalRef.current = handleNextInternal;
  }, [handleNextInternal]);

  useEffect(() => {
    handlePreviousInternalRef.current = handlePreviousInternal;
  }, [handlePreviousInternal]);

  const togglePlayPause = useCallback(async () => {
    console.log('[PlayerContext] togglePlayPause called', { 
      platform: Platform.OS, 
      isPlaying, 
      hasAudioElement: !!audioElementRef.current,
      hasCurrentSong: !!currentSong 
    });

    if (Platform.OS === 'web') {
      if (usingSoundCloudWidgetRef.current) {
        console.log('[PlayerContext] Using SoundCloud Widget for toggle');
        try {
          if (isPlaying) {
            soundCloudWidgetPlayer.pause();
            setIsPlaying(false);
          } else {
            await AudioCoordinator.requestPlayback('music');
            soundCloudWidgetPlayer.play();
            setIsPlaying(true);
            AudioCoordinator.notifyPlaybackStarted('music');
          }
        } catch (err) {
          console.error('[PlayerContext] SoundCloud Widget toggle error:', err);
        }
        return;
      }
      
      if (!audioElementRef.current) {
        console.log('[PlayerContext] No audio element on web, attempting to load current song');
        if (currentSong) {
          loadAndPlaySong(currentSong);
        }
        return;
      }
      
      try {
        if (isPlaying) {
          console.log('[PlayerContext] Web: Pausing audio');
          audioElementRef.current.pause();
          setIsPlaying(false);
        } else {
          console.log('[PlayerContext] Web: Playing audio');
          await AudioCoordinator.requestPlayback('music');
          if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          await audioElementRef.current.play();
          setIsPlaying(true);
          AudioCoordinator.notifyPlaybackStarted('music');
        }
      } catch (err) {
        console.error('[PlayerContext] Web togglePlayPause error:', err);
        setIsPlaying(false);
      }
      return;
    }

    if (useTrackPlayerRef.current) {
      console.log('[PlayerContext] TrackPlayer togglePlayPause, isPlaying:', isPlaying, 'initialized:', trackPlayerInitializedRef.current);
      
      // Check if TrackPlayer is actually initialized
      if (!trackPlayerInitializedRef.current) {
        console.log('[PlayerContext] TrackPlayer not initialized, loading song first');
        if (currentSong) {
          loadAndPlaySong(currentSong);
        }
        return;
      }
      
      // Verify actual player state before acting
      try {
        const actualState = await TrackPlayerService.getState();
        const isActuallyPlaying = actualState === State.Playing;
        console.log('[PlayerContext] Actual TrackPlayer state:', actualState, 'isActuallyPlaying:', isActuallyPlaying);
        
        if (isActuallyPlaying) {
          console.log('[PlayerContext] Pausing TrackPlayer...');
          await TrackPlayerService.pause();
          console.log('[PlayerContext] TrackPlayer paused');
          setIsPlaying(false);
        } else {
          if (!currentSong) {
            console.log('[PlayerContext] No current song to play');
            return;
          }
          // Request playback to stop any playing radio first
          await AudioCoordinator.requestPlayback('music');
          // Restore playback source before playing so callbacks work correctly
          TrackPlayerService.setPlaybackSource('music');
          
          // Check if player has a track loaded
          const currentTrack = await TrackPlayerService.getCurrentTrack();
          if (!currentTrack) {
            console.log('[PlayerContext] No track loaded, reloading current song');
            loadAndPlaySong(currentSong);
            return;
          }
          
          console.log('[PlayerContext] Playing TrackPlayer...');
          await TrackPlayerService.play();
          setIsPlaying(true);
          AudioCoordinator.notifyPlaybackStarted('music');
          console.log('[PlayerContext] TrackPlayer resumed');
        }
      } catch (error) {
        console.warn('[PlayerContext] TrackPlayer toggle failed:', error);
        // Try reloading the song as fallback
        if (currentSong) {
          console.log('[PlayerContext] Attempting to reload current song');
          loadAndPlaySong(currentSong);
        }
      }
      return;
    }

    if (useNativePlaybackRef.current) {
      if (isPlaying) {
        PlaybackEngineModule.pause().then((pauseResult) => {
          if (pauseResult.success) {
            setIsPlaying(false);
          }
        });
      } else {
        if (!currentSong) return;
        // Request playback to stop any playing radio first
        await AudioCoordinator.requestPlayback('music');
        PlaybackEngineModule.play().then((playResult) => {
          if (playResult.success) {
            setIsPlaying(true);
            AudioCoordinator.notifyPlaybackStarted('music');
          }
        });
      }
      return;
    }
    
    if (!playerRef.current) {
      if (currentSong) {
        loadAndPlaySong(currentSong);
      }
      return;
    }

    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      // Request playback to stop any playing radio first
      await AudioCoordinator.requestPlayback('music');
      playerRef.current.play();
      setIsPlaying(true);
      AudioCoordinator.notifyPlaybackStarted('music');
    }
  }, [isPlaying, currentSong, loadAndPlaySong]);

  const handleNext = useCallback(() => {
    console.log('[PlayerContext] handleNext called', {
      platform: Platform.OS,
      hasCurrentSong: !!currentSong,
      queueLength: queue.length,
      useTrackPlayer: useTrackPlayerRef.current,
    });

    if (!currentSong) {
      console.log('[PlayerContext] handleNext: No current song');
      return;
    }

    if (useTrackPlayerRef.current) {
      console.log('[PlayerContext] handleNext with TrackPlayer, initialized:', trackPlayerInitializedRef.current);
      
      if (!trackPlayerInitializedRef.current) {
        console.log('[PlayerContext] TrackPlayer not initialized for next');
        return;
      }
      
      const currentQueue = queueRef.current;
      const currentIndex = currentQueue.findIndex((s) => s.id === currentSong.id);
      const currentShuffle = shuffleRef.current;
      const currentRepeat = repeatRef.current;
      
      console.log('[PlayerContext] handleNext - currentIndex:', currentIndex, 'queueLength:', currentQueue.length);
      
      let nextIndex: number;
      if (currentShuffle) {
        nextIndex = Math.floor(Math.random() * currentQueue.length);
      } else {
        nextIndex = (currentIndex + 1) % currentQueue.length;
      }

      if (nextIndex === 0 && currentRepeat === 'off' && !currentShuffle) {
        console.log('[PlayerContext] End of queue, stopping');
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }

      console.log('[PlayerContext] Skipping to track:', nextIndex);
      TrackPlayerService.skipToTrack(nextIndex).then(() => {
        console.log('[PlayerContext] Playing after skip');
        TrackPlayerService.play();
      }).catch((err) => {
        console.error('[PlayerContext] Skip/play error:', err);
      });
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    let nextIndex: number;

    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }

    console.log('[PlayerContext] handleNext: currentIndex=', currentIndex, 'nextIndex=', nextIndex);

    if (nextIndex === 0 && repeat === 'off' && !shuffle) {
      console.log('[PlayerContext] handleNext: Reached end of queue, stopping');
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const nextSong = queue[nextIndex];
    if (nextSong) {
      console.log('[PlayerContext] handleNext: Loading next song:', nextSong.title);
      loadAndPlaySong(nextSong);
    }
  }, [currentSong, queue, shuffle, repeat, loadAndPlaySong]);

  const handlePrevious = useCallback(() => {
    console.log('[PlayerContext] handlePrevious called', {
      platform: Platform.OS,
      hasCurrentSong: !!currentSong,
      currentTime,
      queueLength: queue.length,
      useTrackPlayer: useTrackPlayerRef.current,
    });

    if (!currentSong) {
      console.log('[PlayerContext] handlePrevious: No current song');
      return;
    }

    if (currentTime > 3) {
      console.log('[PlayerContext] handlePrevious: Seeking to start (currentTime > 3)');
      if (Platform.OS === 'web' && audioElementRef.current) {
        audioElementRef.current.currentTime = 0;
        setCurrentTime(0);
      } else if (useTrackPlayerRef.current) {
        TrackPlayerService.seekTo(0);
        setCurrentTime(0);
      } else if (useNativePlaybackRef.current) {
        PlaybackEngineModule.seekTo(0);
        setCurrentTime(0);
      } else if (playerRef.current) {
        playerRef.current.seekTo(0);
        setCurrentTime(0);
      }
      return;
    }

    if (useTrackPlayerRef.current) {
      console.log('[PlayerContext] handlePrevious with TrackPlayer, initialized:', trackPlayerInitializedRef.current);
      
      if (!trackPlayerInitializedRef.current) {
        console.log('[PlayerContext] TrackPlayer not initialized for previous');
        return;
      }
      
      const currentQueue = queueRef.current;
      const currentIndex = currentQueue.findIndex((s) => s.id === currentSong.id);
      const prevIndex = currentIndex === 0 ? currentQueue.length - 1 : currentIndex - 1;
      
      console.log('[PlayerContext] handlePrevious - currentIndex:', currentIndex, 'prevIndex:', prevIndex);
      
      TrackPlayerService.skipToTrack(prevIndex).then(() => {
        console.log('[PlayerContext] Playing after skip to previous');
        TrackPlayerService.play();
      }).catch((err) => {
        console.error('[PlayerContext] Skip to previous error:', err);
      });
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    const prevSong = queue[prevIndex];
    console.log('[PlayerContext] handlePrevious: currentIndex=', currentIndex, 'prevIndex=', prevIndex);
    if (prevSong) {
      console.log('[PlayerContext] handlePrevious: Loading previous song:', prevSong.title);
      loadAndPlaySong(prevSong);
    }
  }, [currentSong, queue, currentTime, loadAndPlaySong]);

  const seek = useCallback((time: number) => {
    const maxDuration = duration || currentSong?.duration || 0;
    const targetTime = Math.max(0, Math.min(time, maxDuration));
    
    console.log('[PlayerContext] seek called', {
      platform: Platform.OS,
      requestedTime: time,
      targetTime,
      maxDuration,
      hasAudioElement: !!audioElementRef.current,
    });

    setCurrentTime(targetTime);
    
    try {
      if (Platform.OS === 'web') {
        if (usingSoundCloudWidgetRef.current) {
          console.log('[PlayerContext] SoundCloud Widget: Seeking to', targetTime * 1000, 'ms');
          soundCloudWidgetPlayer.seekTo(targetTime * 1000);
        } else if (audioElementRef.current) {
          console.log('[PlayerContext] Web: Setting currentTime to', targetTime);
          audioElementRef.current.currentTime = targetTime;
        } else {
          console.log('[PlayerContext] Web: No audio element for seeking');
        }
      } else if (useTrackPlayerRef.current) {
        console.log('[PlayerContext] TrackPlayer: Seeking to', targetTime);
        TrackPlayerService.seekTo(targetTime).catch((err) => {
          console.error('[PlayerContext] TrackPlayer seek error:', err);
        });
      } else if (useNativePlaybackRef.current) {
        PlaybackEngineModule.seekTo(targetTime * 1000);
      } else if (playerRef.current) {
        playerRef.current.seekTo(targetTime);
      }
    } catch (err) {
      console.error('[PlayerContext] Seek error:', err);
    }
  }, [duration, currentSong]);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const removeFromQueue = useCallback((songIds: string[]) => {
    setQueueState((prev) => {
      return prev.filter(s => !songIds.includes(s.id));
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState([]);
    setCurrentSong(null);
    setIsPlaying(false);
    setCurrentTime(0);
    cleanupPlayer();
  }, [cleanupPlayer]);

  const setQueue = useCallback((songs: PlayableSong[]) => {
    if (songs.length > 0) {
      setQueueState(songs);
    }
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    
    if (minutes === null) {
      setSleepTimerMinutesState(null);
      return;
    }
    
    setSleepTimerMinutesState(minutes);
    
    sleepTimerRef.current = setTimeout(() => {
      if (useTrackPlayerRef.current) {
        TrackPlayerService.pause();
      } else if (useNativePlaybackRef.current) {
        PlaybackEngineModule.pause();
      } else if (Platform.OS === 'web' && audioElementRef.current) {
        audioElementRef.current.pause();
      } else if (playerRef.current) {
        playerRef.current.pause();
      }
      setIsPlaying(false);
      setSleepTimerMinutesState(null);
      sleepTimerRef.current = null;
    }, minutes * 60 * 1000);
  }, []);

  const value: PlayerContextType = {
    currentSong,
    isPlaying,
    currentTime,
    duration: duration || currentSong?.duration || 0,
    shuffle,
    repeat,
    queue,
    progress: (duration || currentSong?.duration) ? currentTime / (duration || currentSong?.duration || 1) : 0,
    favorites,
    recentlyPlayed,
    mostPlayed,
    sleepTimerMinutes,
    isLoading,
    isBuffering,
    error,
    isFavorite,
    toggleFavorite: toggleFavoriteHandler,
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
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayerContext() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayerContext must be used within a PlayerProvider');
  }
  return context;
}
