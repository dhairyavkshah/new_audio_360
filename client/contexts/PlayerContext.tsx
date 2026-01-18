import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { createAudioPlayer, AudioPlayer, AudioStatus, setAudioModeAsync } from 'expo-audio';
import { Song } from '@/lib/data';
import { DeviceSong } from '@/contexts/MediaLibraryContext';
import { savePlayerState, getPlayerState, getFavorites, saveFavorites, getRecentlyPlayed, addToRecentlyPlayed, getMostPlayed, incrementPlayCount } from '@/lib/storage';
import { useSoundLab, EQBands } from '@/contexts/SoundLabContext';
import { PlaybackEngineModule, PlaybackStatus, ImmersiveModeEngineModule, AudioSessionBridgeModule } from 'audio-effects';
import { NativeEffectsManager } from '@/services/NativeEffectsManager';
import { TrackPlayerService, State, TrackMetadata, PlaybackSource } from '@/services/TrackPlayerService';
import { AudioCoordinator } from '@/services/AudioCoordinator';
import { setMusicPlaying } from '@/lib/playbackState';

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
      const pan = soundLabMode === 'immersive' ? (immersiveEffect.stereoWidth - 1) * 0.3 : 0;
      stereoWidenerRef.current.pan.value = Math.max(-1, Math.min(1, pan));
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

        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
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
          const pan = (immersiveEffect.stereoWidth - 1) * 0.3;
          stereoWidenerRef.current.pan.value = Math.max(-1, Math.min(1, pan));
        }

        // Create limiter (DynamicsCompressorNode configured as brickwall limiter)
        // This prevents clipping when bass/treble boost pushes signal too hot
        limiterRef.current = ctx.createDynamicsCompressor();
        limiterRef.current.threshold.value = -1;    // Start limiting at -1 dB (just before clipping)
        limiterRef.current.knee.value = 0;          // Hard knee for brickwall limiting
        limiterRef.current.ratio.value = 20;        // 20:1 ratio = hard limiting
        limiterRef.current.attack.value = 0.001;    // 1ms attack to catch transients
        limiterRef.current.release.value = 0.1;     // 100ms release for smooth recovery

        mediaSourceRef.current.connect(gainNodeRef.current);
        
        if (eqChain.length > 0) {
          gainNodeRef.current.connect(eqChain[0]);
          // EQ chain -> Bass Boost -> Treble Boost -> Stereo Widener
          // (createEQChain already connects EQ -> Bass -> Treble)
          if (trebleBoostFilterRef.current) {
            trebleBoostFilterRef.current.connect(stereoWidenerRef.current);
          } else {
            eqChain[eqChain.length - 1].connect(stereoWidenerRef.current);
          }
        } else {
          gainNodeRef.current.connect(stereoWidenerRef.current);
        }

        // Stereo Widener -> Limiter -> Destination (prevents clipping)
        stereoWidenerRef.current.connect(limiterRef.current);
        limiterRef.current.connect(ctx.destination);
        // Delay/reverb path also goes through limiter
        stereoWidenerRef.current.connect(delayNodeRef.current);
        delayNodeRef.current.connect(delayGainRef.current);
        delayGainRef.current.connect(limiterRef.current);

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
        if (!trackPlayerInitializedRef.current) {
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
        }

        // Stop any current playback first (radio or previous music)
        await TrackPlayerService.stop();

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
        
        const currentQueue = queueRef.current;
        const songIndex = currentQueue.findIndex(s => s.id === song.id);
        
        const trackMetadataList: TrackMetadata[] = currentQueue
          .map(s => convertSongToTrackMetadata(s))
          .filter((t): t is TrackMetadata => t !== null);
        
        if (trackMetadataList.length === 0) {
          setError('No valid tracks in queue');
          setIsLoading(false);
          return;
        }

        await TrackPlayerService.setQueue(trackMetadataList);
        
        const trackIndex = trackMetadataList.findIndex(t => t.id === song.id);
        if (trackIndex >= 0) {
          await TrackPlayerService.skipToTrack(trackIndex);
        }
        
        await TrackPlayerService.play();
        
        setIsPlaying(true);
        setIsLoading(false);
        AudioCoordinator.notifyPlaybackStarted('music');
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
    };
  }, [cleanupPlayer]);

  useEffect(() => {
    if (currentSong) {
      savePlayerState({
        currentSongId: currentSong.id,
        isPlaying,
        currentTime,
        shuffle,
        repeat,
        queue: queue.map(s => s.id),
      });
    }
  }, [currentSong, isPlaying, currentTime, shuffle, repeat, queue]);

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
    if (Platform.OS === 'web' && audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        // Request playback to stop any playing radio first
        await AudioCoordinator.requestPlayback('music');
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        audioElementRef.current.play().catch(console.error);
        setIsPlaying(true);
        AudioCoordinator.notifyPlaybackStarted('music');
      }
      return;
    }

    if (useTrackPlayerRef.current) {
      if (isPlaying) {
        TrackPlayerService.pause().then(() => {
          setIsPlaying(false);
        });
      } else {
        if (!currentSong) return;
        // Request playback to stop any playing radio first
        await AudioCoordinator.requestPlayback('music');
        // Restore playback source before playing so callbacks work correctly
        TrackPlayerService.setPlaybackSource('music');
        try {
          await TrackPlayerService.play();
          setIsPlaying(true);
          AudioCoordinator.notifyPlaybackStarted('music');
        } catch (error) {
          console.warn('[PlayerContext] Failed to resume playback:', error);
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
    if (!currentSong) return;

    if (useTrackPlayerRef.current) {
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

      if (nextIndex === 0 && currentRepeat === 'off' && !currentShuffle) {
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }

      TrackPlayerService.skipToTrack(nextIndex).then(() => {
        TrackPlayerService.play();
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

    if (nextIndex === 0 && repeat === 'off' && !shuffle) {
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const nextSong = queue[nextIndex];
    if (nextSong) {
      loadAndPlaySong(nextSong);
    }
  }, [currentSong, queue, shuffle, repeat, loadAndPlaySong]);

  const handlePrevious = useCallback(() => {
    if (!currentSong) return;

    if (currentTime > 3) {
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
      const currentQueue = queueRef.current;
      const currentIndex = currentQueue.findIndex((s) => s.id === currentSong.id);
      const prevIndex = currentIndex === 0 ? currentQueue.length - 1 : currentIndex - 1;
      
      TrackPlayerService.skipToTrack(prevIndex).then(() => {
        TrackPlayerService.play();
      });
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    const prevSong = queue[prevIndex];
    if (prevSong) {
      loadAndPlaySong(prevSong);
    }
  }, [currentSong, queue, currentTime, loadAndPlaySong]);

  const seek = useCallback((time: number) => {
    const targetTime = Math.max(0, Math.min(time, duration || currentSong?.duration || 0));
    setCurrentTime(targetTime);
    if (Platform.OS === 'web' && audioElementRef.current) {
      audioElementRef.current.currentTime = targetTime;
    } else if (useTrackPlayerRef.current) {
      TrackPlayerService.seekTo(targetTime);
    } else if (useNativePlaybackRef.current) {
      PlaybackEngineModule.seekTo(targetTime * 1000);
    } else if (playerRef.current) {
      playerRef.current.seekTo(targetTime);
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
