import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  uri: string;
  albumArt?: string;
  isFavorite?: boolean;
}

interface AudioState {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  queue: Song[];
  shuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
  playbackSpeed: number;
}

interface AudioContextType extends AudioState {
  playSong: (song: Song) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  nextSong: () => void;
  previousSong: () => void;
  seekTo: (position: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setPlaybackSpeed: (speed: number) => void;
  addToQueue: (song: Song) => void;
  setQueue: (songs: Song[]) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AudioState>({
    currentSong: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    queue: [],
    shuffle: false,
    repeatMode: 'off',
    playbackSpeed: 1.0,
  });

  const playSong = useCallback((song: Song) => {
    setState(prev => ({
      ...prev,
      currentSong: song,
      isPlaying: true,
      progress: 0,
      duration: song.duration,
    }));
  }, []);

  const pauseSong = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const resumeSong = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const nextSong = useCallback(() => {
    setState(prev => {
      const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);
      const nextIndex = (currentIndex + 1) % prev.queue.length;
      const next = prev.queue[nextIndex];
      return next ? { ...prev, currentSong: next, progress: 0, duration: next.duration } : prev;
    });
  }, []);

  const previousSong = useCallback(() => {
    setState(prev => {
      const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : prev.queue.length - 1;
      const song = prev.queue[prevIndex];
      return song ? { ...prev, currentSong: song, progress: 0, duration: song.duration } : prev;
    });
  }, []);

  const seekTo = useCallback((position: number) => {
    setState(prev => ({ ...prev, progress: position }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(prev => ({ ...prev, shuffle: !prev.shuffle }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(prev => ({
      ...prev,
      repeatMode: prev.repeatMode === 'off' ? 'all' : prev.repeatMode === 'all' ? 'one' : 'off',
    }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setState(prev => ({ ...prev, queue: [...prev.queue, song] }));
  }, []);

  const setQueue = useCallback((songs: Song[]) => {
    setState(prev => ({ ...prev, queue: songs }));
  }, []);

  return (
    <AudioContext.Provider
      value={{
        ...state,
        playSong,
        pauseSong,
        resumeSong,
        nextSong,
        previousSong,
        seekTo,
        toggleShuffle,
        toggleRepeat,
        setPlaybackSpeed,
        addToQueue,
        setQueue,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}
