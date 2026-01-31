import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus, InteractionManager } from 'react-native';
import { createAudioPlayer, AudioPlayer, AudioStatus, setAudioModeAsync } from 'expo-audio';
import { Song, mockSongs } from '@/lib/data';
import { DeviceSong, useMediaLibraryContext } from '@/contexts/MediaLibraryContext';
import { savePlayerState, getPlayerState, getFavorites, saveFavorites, getRecentlyPlayed, addToRecentlyPlayed, getMostPlayed, incrementPlayCount } from '@/lib/storage';
import { useSoundLab, EQBands } from '@/contexts/SoundLabContext';
import { PlaybackEngineModule, PlaybackStatus, ImmersiveModeEngineModule, AudioSessionBridgeModule, PlaybackStateChangedEvent } from 'audio-effects';
import { NativeEffectsManager } from '@/services/NativeEffectsManager';
import { TrackPlayerService, State, TrackMetadata, PlaybackSource } from '@/services/TrackPlayerService';
import { AudioCoordinator } from '@/services/AudioCoordinator';
import { setMusicPlaying } from '@/lib/playbackState';
import { soundCloudWidgetPlayer } from '@/services/SoundCloudWidgetPlayer';
import SoundCloudService from '@/services/SoundCloudService';

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

const normalizeDurationToSeconds = (dur: number): number => {
  if (!dur || dur <= 0) return 0;
  if (dur > 36000) return Math.floor(dur / 1000);
  return Math.floor(dur);
};

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
  const playbackEngineInitializedRef = useRef<boolean>(false);
  const playbackEngineInitPromiseRef = useRef<Promise<boolean> | null>(null);
  const progressPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativeProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackEndHandledRef = useRef<boolean>(false);
  const lastKnownPositionRef = useRef<number>(0);
  const wasPlayingBeforeBackgroundRef = useRef<boolean>(false);
  const handleNextInternalRef = useRef<() => void>(() => {});
  // Ref to break circular dependency: handleTrackEnd (empty deps) needs loadAndPlaySong
  // Updated via useEffect after loadAndPlaySong is defined
  const loadAndPlaySongRef = useRef<(song: PlayableSong) => void>(() => {});
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

  const convertSongToTrackMetadata = useCallback((song: PlayableSong, soundCloudToken?: string | null): TrackMetadata | null => {
    let url: string | undefined;
    
    if (isDeviceSong(song) && song.uri) {
      url = song.uri;
    } else if ('audioUrl' in song && song.audioUrl) {
      url = song.audioUrl;
    }
    
    if (!url) return null;
    
    const isSoundCloudTrack = ('source' in song && song.source === 'soundcloud') || song.id.startsWith('sc_');
    
    const trackMetadata: TrackMetadata = {
      id: song.id,
      url: url,
      title: song.title,
      artist: song.artist,
      album: song.album,
      artwork: song.artwork,
      duration: song.duration,
    };
    
    if (isSoundCloudTrack && soundCloudToken) {
      trackMetadata.headers = {
        'Authorization': `OAuth ${soundCloudToken}`,
      };
      console.log('[PlayerContext] Added OAuth header for SoundCloud track:', song.id);
    }
    
    return trackMetadata;
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
        
        // Update position - allow position to reach or slightly exceed duration for proper end detection
        // Industry standard: position should reflect actual playback progress without artificial capping
        if (progress.duration > 0) {
          // Allow position up to duration + small tolerance for timing precision
          const effectivePosition = Math.min(progress.position, progress.duration);
          setCurrentTime(effectivePosition);
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
        } else if (state === State.Error || state === 'error') {
          setIsPlaying(false);
          setIsBuffering(false);
          console.log('[PlayerContext] TrackPlayer error state - stopping waveform animation');
        }
      },
    });
  }, []);

  const restoreTrackPlayerQueue = useCallback(async (savedPosition?: number, wasPlaying?: boolean) => {
    const queue = queueRef.current;
    const currentSongId = currentSongRef.current?.id;
    
    if (queue.length === 0) return;
    
    const hasSoundCloudTracks = queue.some(song => 
      ('source' in song && song.source === 'soundcloud') || song.id.startsWith('sc_')
    );
    
    let soundCloudToken: string | null = null;
    if (hasSoundCloudTracks) {
      soundCloudToken = await SoundCloudService.getAccessToken();
      
      // If restoring SoundCloud tracks but token expired, skip restore to avoid silent 401
      if (!soundCloudToken) {
        console.log('[PlayerContext] Cannot restore SoundCloud tracks - session expired');
        return;
      }
    }
    
    const trackMetadataList = queue
      .map(song => convertSongToTrackMetadata(song, soundCloudToken))
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

  // Serialized PlaybackEngineModule initialization to avoid concurrent init calls
  const ensurePlaybackEngineInitialized = useCallback(async (): Promise<boolean> => {
    // Already initialized - skip
    if (playbackEngineInitializedRef.current) {
      return true;
    }
    
    // Init in progress - wait for it
    if (playbackEngineInitPromiseRef.current) {
      return playbackEngineInitPromiseRef.current;
    }
    
    // Start initialization and store promise to prevent concurrent calls
    playbackEngineInitPromiseRef.current = (async () => {
      try {
        const initResult = await PlaybackEngineModule.initialize();
        if (initResult.success && initResult.audioSessionId) {
          nativeAudioSessionIdRef.current = initResult.audioSessionId;
          playbackEngineInitializedRef.current = true;
          console.log('[PlayerContext] PlaybackEngineModule initialized with audioSessionId:', initResult.audioSessionId);
          
          const attached = await NativeEffectsManager.attach(initResult.audioSessionId);
          if (attached) {
            console.log('[PlayerContext] NativeEffectsManager attached to audio session');
          }
          return true;
        } else if (initResult.alreadyInitialized) {
          playbackEngineInitializedRef.current = true;
          return true;
        } else if (initResult.error) {
          console.warn('[PlayerContext] PlaybackEngineModule initialization failed:', initResult.error);
          return false;
        }
        return false;
      } catch (err) {
        console.warn('[PlayerContext] PlaybackEngineModule init error:', err);
        return false;
      } finally {
        playbackEngineInitPromiseRef.current = null;
      }
    })();
    
    return playbackEngineInitPromiseRef.current;
  }, []);

  useEffect(() => {
    if (useNativePlaybackRef.current && !useTrackPlayerRef.current) {
      // Defer heavy audio initialization until after UI transitions complete
      // This prevents blocking the main thread during navigation/rendering
      const interactionHandle = InteractionManager.runAfterInteractions(() => {
        ensurePlaybackEngineInitialized();
      });
      
      return () => {
        interactionHandle.cancel();
      };
    }
  }, [ensurePlaybackEngineInitialized]);
  
  useEffect(() => {
    return () => {
      if (useNativePlaybackRef.current && !useTrackPlayerRef.current) {
        NativeEffectsManager.release();
        PlaybackEngineModule.release();
        playbackEngineInitializedRef.current = false;
        playbackEngineInitPromiseRef.current = null;
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
          setDuration(normalizeDurationToSeconds(currentSongToRestore.duration || 0));
          
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

  // Ensure progress polling is active when playing on native Android
  // This handles cases where playback resumes without going through loadAndPlaySong
  // (e.g., togglePlayPause after pause, restore from background)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (useTrackPlayerRef.current) return;
    if (!useNativePlaybackRef.current) return;

    if (isPlaying && currentSong && !nativeProgressIntervalRef.current) {
      // Start progress polling if not already running
      nativeProgressIntervalRef.current = setInterval(() => {
        const currentStatus = PlaybackEngineModule.getStatus();
        
        // Stop polling if playback has ended
        if (currentStatus.playbackState === 'ended') {
          if (nativeProgressIntervalRef.current) {
            clearInterval(nativeProgressIntervalRef.current);
            nativeProgressIntervalRef.current = null;
          }
          return;
        }
        
        if (currentStatus.isPlaying) {
          setCurrentTime(currentStatus.currentPositionMs / 1000);
          if (currentStatus.durationMs > 0) {
            setDuration(currentStatus.durationMs / 1000);
          }
        }
        
        setIsBuffering(currentStatus.playbackState === 'buffering');
      }, 1000);
    }
    // Note: We don't clear the interval when isPlaying becomes false
    // because the interval self-manages based on playback state
  }, [isPlaying, currentSong]);

  const handleTrackEnd = useCallback(() => {
    // Guard against double-handling (both polling and event listener can trigger)
    if (trackEndHandledRef.current) {
      console.log('[PlayerContext] Track end already handled, skipping');
      return;
    }
    trackEndHandledRef.current = true;
    
    const song = currentSongRef.current;
    const currentQueue = queueRef.current;
    const currentRepeat = repeatRef.current;
    const currentShuffle = shuffleRef.current;

    if (!song) {
      trackEndHandledRef.current = false; // Reset if no song
      return;
    }

    if (currentRepeat === 'one') {
      // Reset guard for repeat-one since same track will end again
      trackEndHandledRef.current = false;
      
      if (Platform.OS === 'web' && audioElementRef.current) {
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.play().catch(console.error);
        setIsPlaying(true);
      } else if (useTrackPlayerRef.current) {
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
      console.log('[PlayerContext] Auto-advancing to next song:', nextSong.id);
      loadAndPlaySongRef.current(nextSong);
    }
  }, []);

  // Subscribe to native playback state changes for auto-advance
  useEffect(() => {
    if (Platform.OS !== 'android' || useTrackPlayerRef.current) {
      return;
    }
    
    const subscription = PlaybackEngineModule.addPlaybackStateListener((event: PlaybackStateChangedEvent) => {
      console.log('[PlayerContext] Native playback state changed:', event.state);
      if (event.state === 'ended') {
        console.log('[PlayerContext] Track ended via native event, calling handleTrackEnd');
        handleTrackEnd();
      }
    });
    
    return () => {
      subscription?.remove();
    };
  }, [handleTrackEnd]);

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
    
    if (nativeProgressIntervalRef.current) {
      clearInterval(nativeProgressIntervalRef.current);
      nativeProgressIntervalRef.current = null;
    }
    
    if (Platform.OS === 'android' && useNativePlaybackRef.current) {
      // Only try to stop if the player has been initialized (audioSessionId > 0)
      if (nativeAudioSessionIdRef.current > 0) {
        PlaybackEngineModule.stop().catch((err) => {
          // Ignore "not initialized" errors during cleanup
          if (!String(err).includes('not initialized')) {
            console.error('PlaybackEngineModule.stop error:', err);
          }
        });
      }
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
    // Reset track end guard for new track
    trackEndHandledRef.current = false;
    
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(normalizeDurationToSeconds(song.duration || 0));
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

        // Check if external stream - cors.archive.org streams have CORS support so can use DSP
        const isArchiveStream = webAudioSource.includes('cors.archive.org');
        const isExternalStream = webAudioSource.startsWith('http') && !webAudioSource.includes(window.location.host) && !isArchiveStream;

        const audio = new Audio();
        // Enable crossOrigin for local files and CORS-enabled external streams (archive.org)
        if (!isExternalStream || isArchiveStream) {
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
          console.log('[PlayerContext] External stream without CORS - using direct playback (no DSP processing)');
        } else {
          if (isArchiveStream) {
            console.log('[PlayerContext] Internet Archive stream with CORS - enabling DSP processing');
          }
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
      } else if (Platform.OS === 'android' && useNativePlaybackRef.current) {
        // Clean up existing progress interval before starting new track
        if (nativeProgressIntervalRef.current) {
          clearInterval(nativeProgressIntervalRef.current);
          nativeProgressIntervalRef.current = null;
        }
        
        // On Android, use PlaybackEngineModule which has DSP processing integrated
        // This applies to both local files and streaming (SoundCloud, Archive.org)
        const isSoundCloudTrack = ('source' in song && song.source === 'soundcloud') || song.id.startsWith('sc_');
        const isStreamingTrack = isSoundCloudTrack || audioSource.startsWith('http');
        
        console.log('[PlayerContext] Using PlaybackEngineModule with DSP for playback', { isStreamingTrack });
        
        // Ensure PlaybackEngineModule is initialized (uses serialized init to avoid race conditions)
        const initSuccess = await ensurePlaybackEngineInitialized();
        if (!initSuccess) {
          setError('Failed to initialize audio player');
          setIsLoading(false);
          return;
        }
        
        // For SoundCloud streaming, we need to resolve the final stream URL with token
        let finalAudioSource = audioSource;
        if (isSoundCloudTrack && audioSource.includes('api.soundcloud.com')) {
          const soundCloudToken = await SoundCloudService.getAccessToken();
          if (!soundCloudToken) {
            setError('SoundCloud session expired. Please sign in again.');
            setIsLoading(false);
            return;
          }
          // Append OAuth token for ExoPlayer to handle redirects
          finalAudioSource = audioSource.includes('?') 
            ? `${audioSource}&oauth_token=${soundCloudToken}`
            : `${audioSource}?oauth_token=${soundCloudToken}`;
          console.log('[PlayerContext] SoundCloud stream URL prepared for DSP playback');
        }
        
        // Load track with metadata for notification/lockscreen display
        const trackTitle = song.title || 'Unknown Track';
        const trackArtist = song.artist || 'Unknown Artist';
        const trackArtwork: string | null = 
          ('artwork' in song && typeof song.artwork === 'string' && song.artwork) ? song.artwork :
          ('albumArt' in song && typeof song.albumArt === 'string' && song.albumArt) ? song.albumArt :
          ('cover' in song && typeof song.cover === 'string' && song.cover) ? song.cover :
          null;
        
        const loadResult = await PlaybackEngineModule.loadTrackWithMetadata(
          finalAudioSource,
          trackTitle,
          trackArtist,
          trackArtwork
        );
        
        if (!loadResult.success) {
          setError(loadResult.error || 'Failed to load audio with native DSP player');
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

        // Reset current time to 0 for new track
        setCurrentTime(0);
        
        // Wait for actual playback to start before setting isPlaying
        // This prevents the waveform from starting before audio
        const waitForPlayback = () => {
          return new Promise<void>((resolve) => {
            let attempts = 0;
            const maxAttempts = 20; // 2 seconds max wait
            const checkPlaying = setInterval(() => {
              attempts++;
              const status = PlaybackEngineModule.getStatus();
              
              // Set duration as soon as we have it
              if (status.durationMs > 0) {
                setDuration(status.durationMs / 1000);
              }
              
              // Check if actually playing or if we've waited long enough
              if (status.isPlaying || status.currentPositionMs > 0 || attempts >= maxAttempts) {
                clearInterval(checkPlaying);
                resolve();
              }
            }, 100);
          });
        };
        
        await waitForPlayback();
        
        const status = PlaybackEngineModule.getStatus();
        if (status.durationMs > 0) {
          setDuration(status.durationMs / 1000);
        }
        
        // Sync currentTime with actual position
        if (status.currentPositionMs > 0) {
          setCurrentTime(status.currentPositionMs / 1000);
        }

        setIsPlaying(true);
        setIsLoading(false);
        AudioCoordinator.notifyPlaybackStarted('music');
        
        // Start progress polling for DSP playback
        if (!nativeProgressIntervalRef.current) {
          nativeProgressIntervalRef.current = setInterval(() => {
            const currentStatus = PlaybackEngineModule.getStatus();
            
            // Stop polling if playback has ended
            if (currentStatus.playbackState === 'ended') {
              if (nativeProgressIntervalRef.current) {
                clearInterval(nativeProgressIntervalRef.current);
                nativeProgressIntervalRef.current = null;
              }
              return;
            }
            
            if (currentStatus.isPlaying) {
              setCurrentTime(currentStatus.currentPositionMs / 1000);
              if (currentStatus.durationMs > 0) {
                setDuration(currentStatus.durationMs / 1000);
              }
            }
          }, 1000);
        }
      } else if (useTrackPlayerRef.current) {
        // Fallback to TrackPlayer if PlaybackEngineModule is not available
        console.log('[PlayerContext] Using TrackPlayer for playback (no DSP for streaming)');
        
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
            } else if (state === State.Error || state === 'error') {
              setIsPlaying(false);
              setIsBuffering(false);
              console.log('[PlayerContext] TrackPlayer error state - stopping waveform animation');
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
        
        // Check if any tracks are SoundCloud tracks and get OAuth token
        const isSoundCloudTrack = ('source' in song && song.source === 'soundcloud') || song.id.startsWith('sc_');
        const hasSoundCloudTracks = isSoundCloudTrack || currentQueue.some(s => 
          ('source' in s && s.source === 'soundcloud') || s.id.startsWith('sc_')
        );
        
        let soundCloudToken: string | null = null;
        if (hasSoundCloudTracks) {
          soundCloudToken = await SoundCloudService.getAccessToken();
          console.log('[PlayerContext] Got SoundCloud token for streaming:', soundCloudToken ? 'yes' : 'no');
          
          // If playing a SoundCloud track but no token, show auth error
          if (isSoundCloudTrack && !soundCloudToken) {
            setError('SoundCloud session expired. Please sign in again.');
            setIsLoading(false);
            return;
          }
        }
        
        const trackMetadataList: TrackMetadata[] = currentQueue
          .map(s => convertSongToTrackMetadata(s, soundCloudToken))
          .filter((t): t is TrackMetadata => t !== null);
        
        console.log('[PlayerContext] Valid tracks for TrackPlayer:', trackMetadataList.length);
        
        if (trackMetadataList.length === 0) {
          // Last resort: try to create metadata from current song directly
          const singleTrack = convertSongToTrackMetadata(song, soundCloudToken);
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
        
        // Load track with metadata for notification/lockscreen display
        const trackTitle = song.title || 'Unknown Track';
        const trackArtist = song.artist || 'Unknown Artist';
        const trackArtwork: string | null = 
          ('artwork' in song && typeof song.artwork === 'string' && song.artwork) ? song.artwork :
          ('albumArt' in song && typeof song.albumArt === 'string' && song.albumArt) ? song.albumArt :
          ('cover' in song && typeof song.cover === 'string' && song.cover) ? song.cover :
          null;
        
        const loadResult = await PlaybackEngineModule.loadTrackWithMetadata(
          audioSource,
          trackTitle,
          trackArtist,
          trackArtwork
        );
        
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
  }, [cleanupPlayer, handleStatusUpdate, createEQChain, handleTrackEnd, soundLabMode, immersiveEffect, convertSongToTrackMetadata, ensurePlaybackEngineInitialized]);

  useEffect(() => {
    loadAndPlaySongRef.current = loadAndPlaySong;
  }, [loadAndPlaySong]);

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

    // On Android, use PlaybackEngineModule which has DSP processing
    if (Platform.OS === 'android' && useNativePlaybackRef.current) {
      console.log('[PlayerContext] PlaybackEngineModule togglePlayPause, isPlaying:', isPlaying);
      try {
        const status = PlaybackEngineModule.getStatus();
        if (status.isPlaying) {
          console.log('[PlayerContext] Pausing PlaybackEngineModule...');
          await PlaybackEngineModule.pause();
          setIsPlaying(false);
        } else {
          if (!currentSong) {
            console.log('[PlayerContext] No current song to play');
            return;
          }
          await AudioCoordinator.requestPlayback('music');
          
          // Check if a track is loaded
          if (status.durationMs === 0) {
            console.log('[PlayerContext] No track loaded, reloading current song');
            loadAndPlaySong(currentSong);
            return;
          }
          
          console.log('[PlayerContext] Playing PlaybackEngineModule...');
          await PlaybackEngineModule.play();
          setIsPlaying(true);
          AudioCoordinator.notifyPlaybackStarted('music');
        }
      } catch (error) {
        console.warn('[PlayerContext] PlaybackEngineModule toggle failed:', error);
        if (currentSong) {
          loadAndPlaySong(currentSong);
        }
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
      useNativePlayback: useNativePlaybackRef.current,
      useTrackPlayer: useTrackPlayerRef.current,
    });

    if (!currentSong) {
      console.log('[PlayerContext] handleNext: No current song');
      return;
    }

    const currentQueue = queueRef.current;
    const currentIndex = currentQueue.findIndex((s) => s.id === currentSong.id);
    const currentShuffle = shuffleRef.current;
    const currentRepeat = repeatRef.current;
    
    let nextIndex: number;
    if (currentShuffle) {
      nextIndex = Math.floor(Math.random() * currentQueue.length);
    } else {
      nextIndex = (currentIndex + 1) % currentQueue.length;
    }

    console.log('[PlayerContext] handleNext: currentIndex=', currentIndex, 'nextIndex=', nextIndex);

    if (nextIndex === 0 && currentRepeat === 'off' && !currentShuffle) {
      console.log('[PlayerContext] handleNext: Reached end of queue, stopping');
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const nextSong = currentQueue[nextIndex];
    if (!nextSong) {
      console.log('[PlayerContext] handleNext: No next song found');
      return;
    }

    // On Android, use PlaybackEngineModule (has DSP processing)
    if (Platform.OS === 'android' && useNativePlaybackRef.current) {
      console.log('[PlayerContext] handleNext with PlaybackEngineModule:', nextSong.title);
      loadAndPlaySong(nextSong);
      return;
    }

    // On iOS/other, use TrackPlayer
    if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
      console.log('[PlayerContext] handleNext with TrackPlayer, skipping to:', nextIndex);
      TrackPlayerService.skipToTrack(nextIndex).then(() => {
        console.log('[PlayerContext] Playing after skip');
        TrackPlayerService.play();
      }).catch((err) => {
        console.error('[PlayerContext] Skip/play error:', err);
      });
      return;
    }

    // Fallback - load and play song directly
    console.log('[PlayerContext] handleNext: Loading next song:', nextSong.title);
    loadAndPlaySong(nextSong);
  }, [currentSong, queue, shuffle, repeat, loadAndPlaySong]);

  const handlePrevious = useCallback(() => {
    console.log('[PlayerContext] handlePrevious called', {
      platform: Platform.OS,
      hasCurrentSong: !!currentSong,
      currentTime,
      queueLength: queue.length,
      useNativePlayback: useNativePlaybackRef.current,
      useTrackPlayer: useTrackPlayerRef.current,
    });

    if (!currentSong) {
      console.log('[PlayerContext] handlePrevious: No current song');
      return;
    }

    // If more than 3 seconds in, seek to start instead of previous track
    if (currentTime > 3) {
      console.log('[PlayerContext] handlePrevious: Seeking to start (currentTime > 3)');
      if (Platform.OS === 'web' && audioElementRef.current) {
        audioElementRef.current.currentTime = 0;
        setCurrentTime(0);
      } else if (Platform.OS === 'android' && useNativePlaybackRef.current) {
        PlaybackEngineModule.seekTo(0);
        setCurrentTime(0);
      } else if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
        TrackPlayerService.seekTo(0);
        setCurrentTime(0);
      } else if (playerRef.current) {
        playerRef.current.seekTo(0);
        setCurrentTime(0);
      }
      return;
    }

    const currentQueue = queueRef.current;
    const currentIndex = currentQueue.findIndex((s) => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? currentQueue.length - 1 : currentIndex - 1;
    const prevSong = currentQueue[prevIndex];

    console.log('[PlayerContext] handlePrevious: currentIndex=', currentIndex, 'prevIndex=', prevIndex);

    if (!prevSong) {
      console.log('[PlayerContext] handlePrevious: No previous song found');
      return;
    }

    // On Android, use PlaybackEngineModule (has DSP processing)
    if (Platform.OS === 'android' && useNativePlaybackRef.current) {
      console.log('[PlayerContext] handlePrevious with PlaybackEngineModule:', prevSong.title);
      loadAndPlaySong(prevSong);
      return;
    }

    // On iOS/other, use TrackPlayer
    if (useTrackPlayerRef.current && trackPlayerInitializedRef.current) {
      console.log('[PlayerContext] handlePrevious with TrackPlayer, skipping to:', prevIndex);
      TrackPlayerService.skipToTrack(prevIndex).then(() => {
        console.log('[PlayerContext] Playing after skip to previous');
        TrackPlayerService.play();
      }).catch((err) => {
        console.error('[PlayerContext] Skip to previous error:', err);
      });
      return;
    }

    // Fallback - load and play song directly
    console.log('[PlayerContext] handlePrevious: Loading previous song:', prevSong.title);
    loadAndPlaySong(prevSong);
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
      } else if (Platform.OS === 'android' && useNativePlaybackRef.current) {
        // On Android, use PlaybackEngineModule which has DSP processing
        console.log('[PlayerContext] PlaybackEngineModule: Seeking to', targetTime * 1000, 'ms');
        PlaybackEngineModule.seekTo(targetTime * 1000);
      } else if (useTrackPlayerRef.current) {
        console.log('[PlayerContext] TrackPlayer: Seeking to', targetTime);
        TrackPlayerService.seekTo(targetTime).catch((err) => {
          console.error('[PlayerContext] TrackPlayer seek error:', err);
        });
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
