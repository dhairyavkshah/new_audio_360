import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, AudioPlayer, AudioStatus, setAudioModeAsync } from 'expo-audio';
import { mockSongs, Song } from '@/lib/data';
import { DeviceSong } from '@/contexts/MediaLibraryContext';
import { savePlayerState, getPlayerState, getFavorites, saveFavorites, getRecentlyPlayed, addToRecentlyPlayed, getMostPlayed, incrementPlayCount } from '@/lib/storage';
import { useSoundLab, EQBands } from '@/contexts/SoundLabContext';

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
  const { mode: soundLabMode, eqBands, immersiveEffect } = useSoundLab();
  
  const [currentSong, setCurrentSong] = useState<PlayableSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'one' | 'all'>('off');
  const [queue, setQueueState] = useState<PlayableSong[]>(mockSongs);
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
  const queueRef = useRef<PlayableSong[]>(mockSongs);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<'off' | 'one' | 'all'>('off');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const stereoWidenerRef = useRef<StereoPannerNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayGainRef = useRef<GainNode | null>(null);

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
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(console.error);
  }, []);

  useEffect(() => {
    getPlayerState().then((state) => {
      if (state && state.currentSongId) {
        const song = mockSongs.find(s => s.id === state.currentSongId);
        if (song) {
          setCurrentSong(song);
          setCurrentTime(state.currentTime || 0);
          setShuffle(state.shuffle || false);
          setRepeat(state.repeat || 'off');
        }
      }
    });
    getFavorites().then(setFavorites);
    getRecentlyPlayed().then(setRecentlyPlayed);
    getMostPlayed(10).then(setMostPlayed);
  }, []);

  const handleTrackEnd = useCallback(() => {
    const song = currentSongRef.current;
    const currentQueue = queueRef.current;
    const currentRepeat = repeatRef.current;
    const currentShuffle = shuffleRef.current;

    if (!song) return;

    if (currentRepeat === 'one') {
      if (playerRef.current) {
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
      if (stereoWidenerRef.current) { try { stereoWidenerRef.current.disconnect(); } catch {} }
      if (delayNodeRef.current) { try { delayNodeRef.current.disconnect(); } catch {} }
      if (delayGainRef.current) { try { delayGainRef.current.disconnect(); } catch {} }
    }
  }, []);
  
  const createEQChain = useCallback((ctx: AudioContext): BiquadFilterNode[] => {
    eqFiltersRef.current.forEach(f => { try { f.disconnect(); } catch {} });
    eqFiltersRef.current = [];

    const bands = Object.keys(EQ_FREQUENCIES) as (keyof EQBands)[];
    
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
      filter.gain.value = soundLabMode === 'equalizer' ? eqBands[band] * 2 : 0;
      
      eqFiltersRef.current.push(filter);
    });

    for (let i = 0; i < eqFiltersRef.current.length - 1; i++) {
      eqFiltersRef.current[i].connect(eqFiltersRef.current[i + 1]);
    }

    return eqFiltersRef.current;
  }, [soundLabMode, eqBands]);
  
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const bands = Object.keys(EQ_FREQUENCIES) as (keyof EQBands)[];
    eqFiltersRef.current.forEach((filter, index) => {
      const band = bands[index];
      if (band) {
        filter.gain.value = soundLabMode === 'equalizer' ? eqBands[band] * 2 : 0;
      }
    });
    
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
  }, [soundLabMode, eqBands, immersiveEffect]);

  const loadAndPlaySong = useCallback(async (song: PlayableSong) => {
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(song.duration || 0);
    setCurrentSong(song);

    cleanupPlayer();

    try {
      let audioSource: string | null = null;

      if (isDeviceSong(song) && song.isFromDevice && song.uri) {
        audioSource = song.uri;
      } else if ('audioUrl' in song && song.audioUrl) {
        audioSource = song.audioUrl;
      } else {
        if (Platform.OS === 'web') {
          audioSource = 'https://cdn.jsdelivr.net/npm/ion-sound@3.0.7/sounds/water_droplet.mp3';
        } else {
          setError('No audio file available for this song');
          setIsLoading(false);
          return;
        }
      }

      if (!audioSource) {
        setError('No audio source available');
        setIsLoading(false);
        return;
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.src = audioSource;
        audioElementRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => resolve();
          audio.onerror = () => reject(new Error('Failed to load audio'));
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

        mediaSourceRef.current.connect(gainNodeRef.current);
        
        if (eqChain.length > 0) {
          gainNodeRef.current.connect(eqChain[0]);
          eqChain[eqChain.length - 1].connect(stereoWidenerRef.current);
        } else {
          gainNodeRef.current.connect(stereoWidenerRef.current);
        }

        stereoWidenerRef.current.connect(ctx.destination);
        stereoWidenerRef.current.connect(delayNodeRef.current);
        delayNodeRef.current.connect(delayGainRef.current);
        delayGainRef.current.connect(ctx.destination);

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
      } else {
        const newPlayer = createAudioPlayer(audioSource, { updateInterval: 0.1 });
        playerRef.current = newPlayer;

        statusListenerRef.current = newPlayer.addListener('playbackStatusUpdate', handleStatusUpdate);

        newPlayer.play();
        setIsPlaying(true);
        setIsLoading(false);
      }

      addToRecentlyPlayed(song.id).then(() => {
        getRecentlyPlayed().then(setRecentlyPlayed);
      });
      incrementPlayCount(song.id).then(() => {
        getMostPlayed(10).then(setMostPlayed);
      });

    } catch (e) {
      console.error('Error loading song:', e);
      setError('Failed to load audio');
      setIsLoading(false);
    }
  }, [cleanupPlayer, handleStatusUpdate, createEQChain, handleTrackEnd, soundLabMode, immersiveEffect]);

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

  const togglePlayPause = useCallback(() => {
    if (Platform.OS === 'web' && audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        audioElementRef.current.play().catch(console.error);
        setIsPlaying(true);
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
      playerRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, currentSong, loadAndPlaySong]);

  const handleNext = useCallback(() => {
    if (!currentSong) return;

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
      } else if (playerRef.current) {
        playerRef.current.seekTo(0);
        setCurrentTime(0);
      }
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
      const newQueue = prev.filter(s => !songIds.includes(s.id));
      if (newQueue.length === 0) {
        return mockSongs;
      }
      return newQueue;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState(mockSongs);
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
      if (playerRef.current) {
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
