import { useRef, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useSoundLab, EQBands } from '@/contexts/SoundLabContext';

interface WebAudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  isBuffering: boolean;
  error: string | null;
}

interface WebAudioPlayerControls {
  load: (url: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  stop: () => void;
  cleanup: () => void;
}

const EQ_FREQUENCIES: Record<keyof EQBands, number> = {
  sub: 32,
  bass: 64,
  lowMid: 250,
  mid: 1000,
  highMid: 4000,
  treble: 8000,
  brilliance: 16000,
};

export function useWebAudioPlayer(onTrackEnd?: () => void): [WebAudioPlayerState, WebAudioPlayerControls] {
  const { mode, eqBands, immersiveEffect } = useSoundLab();
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const stereoWidenerRef = useRef<StereoPannerNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayGainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [state, setState] = useState<WebAudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    isBuffering: false,
    error: null,
  });

  const dbToGain = (db: number): number => {
    return Math.pow(10, db / 20);
  };

  const initializeAudioContext = useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const createEQChain = useCallback((ctx: AudioContext) => {
    eqFiltersRef.current.forEach(f => f.disconnect());
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
      filter.gain.value = eqBands[band] * 2;
      
      eqFiltersRef.current.push(filter);
    });

    for (let i = 0; i < eqFiltersRef.current.length - 1; i++) {
      eqFiltersRef.current[i].connect(eqFiltersRef.current[i + 1]);
    }

    return eqFiltersRef.current;
  }, [eqBands]);

  const updateEQGains = useCallback(() => {
    const bands = Object.keys(EQ_FREQUENCIES) as (keyof EQBands)[];
    eqFiltersRef.current.forEach((filter, index) => {
      const band = bands[index];
      if (band && mode === 'equalizer') {
        filter.gain.value = eqBands[band] * 2;
      } else {
        filter.gain.value = 0;
      }
    });
  }, [eqBands, mode]);

  const updateImmersiveEffects = useCallback(() => {
    if (stereoWidenerRef.current) {
      const pan = mode === 'immersive' ? (immersiveEffect.stereoWidth - 1) * 0.3 : 0;
      stereoWidenerRef.current.pan.value = Math.max(-1, Math.min(1, pan));
    }
    if (delayNodeRef.current && delayGainRef.current) {
      if (mode === 'immersive') {
        delayNodeRef.current.delayTime.value = immersiveEffect.delay / 1000;
        delayGainRef.current.gain.value = immersiveEffect.reverb * 0.3;
      } else {
        delayGainRef.current.gain.value = 0;
      }
    }
  }, [mode, immersiveEffect]);

  useEffect(() => {
    updateEQGains();
    updateImmersiveEffects();
  }, [updateEQGains, updateImmersiveEffects]);

  const load = useCallback(async (url: string) => {
    if (Platform.OS !== 'web') return;

    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      const ctx = initializeAudioContext();
      if (!ctx) throw new Error('AudioContext not available');

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      if (mediaSourceRef.current) {
        mediaSourceRef.current.disconnect();
      }

      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = url;
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
      delayGainRef.current.gain.value = 0;

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

      updateEQGains();
      updateImmersiveEffects();

      audio.onended = () => {
        setState(s => ({ ...s, isPlaying: false }));
        onTrackEnd?.();
      };

      audio.ontimeupdate = () => {
        setState(s => ({
          ...s,
          currentTime: audio.currentTime,
          duration: audio.duration || 0,
        }));
      };

      setState(s => ({
        ...s,
        isLoading: false,
        duration: audio.duration || 0,
        currentTime: 0,
      }));

    } catch (error) {
      console.error('Error loading audio:', error);
      setState(s => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load audio',
      }));
    }
  }, [initializeAudioContext, createEQChain, updateEQGains, updateImmersiveEffects, onTrackEnd]);

  const play = useCallback(() => {
    if (audioElementRef.current) {
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      audioElementRef.current.play().catch(console.error);
      setState(s => ({ ...s, isPlaying: true }));
    }
  }, []);

  const pause = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setState(s => ({ ...s, isPlaying: false }));
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
    }
  }, []);

  const stop = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setState(s => ({ ...s, isPlaying: false, currentTime: 0 }));
    }
  }, []);

  const cleanup = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
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
    if (stereoWidenerRef.current) { try { stereoWidenerRef.current.disconnect(); } catch {} }
    if (delayNodeRef.current) { try { delayNodeRef.current.disconnect(); } catch {} }
    if (delayGainRef.current) { try { delayGainRef.current.disconnect(); } catch {} }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return [state, { load, play, pause, seek, stop, cleanup }];
}
