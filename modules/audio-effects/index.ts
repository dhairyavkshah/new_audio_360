import { NativeModule, requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

// Playback Engine Module Types
export interface PlaybackStatus {
  isInitialized: boolean;
  isPlaying: boolean;
  currentPositionMs: number;
  durationMs: number;
  bufferedPositionMs: number;
  currentIndex: number;
  queueLength: number;
  playbackState: 'idle' | 'buffering' | 'ready' | 'ended' | 'unknown';
  repeatMode: 'off' | 'one' | 'all';
  shuffleEnabled: boolean;
  audioSessionId: number;
}

export interface PlaybackResult {
  success: boolean;
  error?: string;
  audioSessionId?: number;
  alreadyInitialized?: boolean;
  queueLength?: number;
  currentIndex?: number;
  index?: number;
  positionMs?: number;
  seekToStart?: boolean;
  reason?: string;
}

interface PlaybackEngineModuleInterface extends NativeModule {
  isAvailable(): boolean;
  initialize(): Promise<PlaybackResult>;
  setQueue(uris: string[], startIndex: number): Promise<PlaybackResult>;
  loadTrack(uri: string): Promise<PlaybackResult>;
  play(): Promise<PlaybackResult>;
  pause(): Promise<PlaybackResult>;
  stop(): Promise<PlaybackResult>;
  seekTo(positionMs: number): Promise<PlaybackResult>;
  skipToIndex(index: number): Promise<PlaybackResult>;
  skipToNext(): Promise<PlaybackResult>;
  skipToPrevious(): Promise<PlaybackResult>;
  setVolume(volume: number): { success: boolean; volume: number };
  setPlaybackSpeed(speed: number): { success: boolean; speed: number };
  setRepeatMode(mode: string): { success: boolean; mode: string };
  setShuffleMode(enabled: boolean): { success: boolean; shuffle: boolean };
  getStatus(): PlaybackStatus;
  getAudioSessionId(): number;
  getCurrentPosition(): number;
  getDuration(): number;
  release(): Promise<PlaybackResult>;
}

// Equalizer Module Types
export interface EqualizerBandInfo {
  band: number;
  centerFreq: number;
  minLevel: number;
  maxLevel: number;
}

export interface EqualizerAttachResult {
  success: boolean;
  error?: string;
  numberOfBands?: number;
  minLevel?: number;
  maxLevel?: number;
  bands?: EqualizerBandInfo[];
  presets?: string[];
}

interface EqualizerModuleInterface extends NativeModule {
  isAvailable(): boolean;
  attach(sessionId: number): Promise<EqualizerAttachResult>;
  setEnabled(enabled: boolean): { success: boolean; enabled?: boolean; error?: string };
  setBandLevel(band: number, level: number): { success: boolean; band?: number; level?: number; error?: string };
  getBandLevel(band: number): number;
  usePreset(preset: number): { success: boolean; preset?: number; error?: string };
  getCurrentPreset(): number;
  setCustomBands(levels: number[]): { success: boolean; error?: string };
  getAllBandLevels(): number[];
  getProperties(): { enabled: boolean; numberOfBands: number; currentPreset: number; minLevel: number; maxLevel: number };
  release(): Promise<{ success: boolean }>;
}

// BassBoost Module Types
export interface BassBoostAttachResult {
  success: boolean;
  error?: string;
  strengthSupported?: boolean;
  minStrength?: number;
  maxStrength?: number;
}

interface BassBoostModuleInterface extends NativeModule {
  isAvailable(): boolean;
  attach(sessionId: number): Promise<BassBoostAttachResult>;
  setEnabled(enabled: boolean): { success: boolean; enabled?: boolean; error?: string };
  setStrength(strength: number): { success: boolean; strength?: number; error?: string };
  getStrength(): number;
  getProperties(): { enabled: boolean; strengthSupported: boolean; strength: number };
  release(): Promise<{ success: boolean }>;
}

// Virtualizer Module Types
export interface VirtualizerAttachResult {
  success: boolean;
  error?: string;
  strengthSupported?: boolean;
  minStrength?: number;
  maxStrength?: number;
}

interface VirtualizerModuleInterface extends NativeModule {
  isAvailable(): boolean;
  attach(sessionId: number): Promise<VirtualizerAttachResult>;
  setEnabled(enabled: boolean): { success: boolean; enabled?: boolean; error?: string };
  setStrength(strength: number): { success: boolean; strength?: number; error?: string };
  getStrength(): number;
  getProperties(): { enabled: boolean; strengthSupported: boolean; strength: number };
  release(): Promise<{ success: boolean }>;
}

// Waveform Analyzer Module Types
export interface WaveformData {
  waveform: number[];
  rms: number;
  peak: number;
  samplingRate?: number;
  captureSize?: number;
}

export interface FftData {
  magnitudes: number[];
  samplingRate?: number;
  captureSize?: number;
}

export interface WaveformAttachResult {
  success: boolean;
  error?: string;
  captureSize?: number;
  samplingRate?: number;
  minCaptureSize?: number;
  maxCaptureSize?: number;
  maxCaptureRate?: number;
}

interface WaveformAnalyzerModuleInterface extends NativeModule {
  isAvailable(): boolean;
  attach(sessionId: number): Promise<WaveformAttachResult>;
  startCapture(rateHz: number): Promise<{ success: boolean; captureRate?: number }>;
  stopCapture(): Promise<{ success: boolean }>;
  getWaveformSnapshot(): WaveformData | { error: string };
  getFftSnapshot(): FftData | { error: string };
  getMeasurements(): { peak: number; rms: number } | { error: string };
  setCaptureSize(size: number): { success: boolean; captureSize?: number; error?: string };
  getProperties(): { enabled: boolean; captureSize: number; samplingRate: number; audioSessionId: number; isCapturing: boolean };
  release(): Promise<{ success: boolean }>;
}

// Immersive Mode Engine Types
export type ImmersiveMode = 
  | 'off'
  | 'music'
  | '360_reality'
  | 'gaming'
  | 'podcast'
  | 'movie'
  | 'custom';

export interface ImmersiveModeInfo {
  id: ImmersiveMode;
  name: string;
  description: string;
  icon: string;
}

export interface ImmersiveModeSettings {
  equalizerEnabled: boolean;
  bassBoostEnabled: boolean;
  bassBoostStrength: number;
  virtualizerEnabled: boolean;
  virtualizerStrength: number;
  loudnessEnhancerEnabled: boolean;
  loudnessGain: number;
  equalizerBandLevels: number[];
}

export interface ImmersiveModeAttachResult {
  success: boolean;
  error?: string;
  audioSessionId?: number;
  equalizerBands?: number;
  bassBoostSupported?: boolean;
  virtualizerSupported?: boolean;
  loudnessEnhancerAvailable?: boolean;
}

export interface ImmersiveModeResult {
  success: boolean;
  error?: string;
  mode?: ImmersiveMode;
  settings?: ImmersiveModeSettings;
}

interface ImmersiveModeEngineModuleInterface extends NativeModule {
  isAvailable(): boolean;
  attach(sessionId: number): Promise<ImmersiveModeAttachResult>;
  setMode(mode: string): Promise<ImmersiveModeResult>;
  getCurrentMode(): { mode: ImmersiveMode; isAttached: boolean; settings: ImmersiveModeSettings };
  getAvailableModes(): ImmersiveModeInfo[];
  setCustomParameters(
    bassStrength: number,
    virtualizerStrength: number,
    loudnessGain: number,
    eqPreset: number
  ): Promise<ImmersiveModeResult>;
  release(): Promise<{ success: boolean }>;
}

// Native Module Instances
let PlaybackEngineModuleNative: PlaybackEngineModuleInterface | null = null;
let EqualizerModuleNative: EqualizerModuleInterface | null = null;
let BassBoostModuleNative: BassBoostModuleInterface | null = null;
let VirtualizerModuleNative: VirtualizerModuleInterface | null = null;
let WaveformAnalyzerModuleNative: WaveformAnalyzerModuleInterface | null = null;
let ImmersiveModeEngineModuleNative: ImmersiveModeEngineModuleInterface | null = null;

if (Platform.OS === 'android') {
  try {
    PlaybackEngineModuleNative = requireNativeModule<PlaybackEngineModuleInterface>('PlaybackEngineModule');
  } catch (e) {
    console.warn('PlaybackEngineModule not available:', e);
  }
  
  try {
    EqualizerModuleNative = requireNativeModule<EqualizerModuleInterface>('EqualizerModule');
  } catch (e) {
    console.warn('EqualizerModule not available:', e);
  }
  
  try {
    BassBoostModuleNative = requireNativeModule<BassBoostModuleInterface>('BassBoostModule');
  } catch (e) {
    console.warn('BassBoostModule not available:', e);
  }
  
  try {
    VirtualizerModuleNative = requireNativeModule<VirtualizerModuleInterface>('VirtualizerModule');
  } catch (e) {
    console.warn('VirtualizerModule not available:', e);
  }
  
  try {
    WaveformAnalyzerModuleNative = requireNativeModule<WaveformAnalyzerModuleInterface>('WaveformAnalyzerModule');
  } catch (e) {
    console.warn('WaveformAnalyzerModule not available:', e);
  }
  
  try {
    ImmersiveModeEngineModuleNative = requireNativeModule<ImmersiveModeEngineModuleInterface>('ImmersiveModeEngineModule');
  } catch (e) {
    console.warn('ImmersiveModeEngineModule not available:', e);
  }
}

// PlaybackEngine Module Export
export const PlaybackEngineModule = {
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && PlaybackEngineModuleNative !== null;
  },

  initialize: async (): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, error: 'Playback engine not available on this platform' };
    }
    try {
      return await PlaybackEngineModuleNative.initialize();
    } catch (error) {
      console.error('PlaybackEngineModule.initialize error:', error);
      return { success: false, error: String(error) };
    }
  },

  setQueue: async (uris: string[], startIndex: number = 0): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, error: 'Playback engine not available' };
    }
    try {
      return await PlaybackEngineModuleNative.setQueue(uris, startIndex);
    } catch (error) {
      console.error('PlaybackEngineModule.setQueue error:', error);
      return { success: false, error: String(error) };
    }
  },

  loadTrack: async (uri: string): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, error: 'Playback engine not available' };
    }
    try {
      return await PlaybackEngineModuleNative.loadTrack(uri);
    } catch (error) {
      console.error('PlaybackEngineModule.loadTrack error:', error);
      return { success: false, error: String(error) };
    }
  },

  play: async (): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, error: 'Playback engine not available' };
    }
    try {
      return await PlaybackEngineModuleNative.play();
    } catch (error) {
      console.error('PlaybackEngineModule.play error:', error);
      return { success: false, error: String(error) };
    }
  },

  pause: async (): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, error: 'Playback engine not available' };
    }
    try {
      return await PlaybackEngineModuleNative.pause();
    } catch (error) {
      console.error('PlaybackEngineModule.pause error:', error);
      return { success: false, error: String(error) };
    }
  },

  stop: async (): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, error: 'Playback engine not available' };
    }
    try {
      return await PlaybackEngineModuleNative.stop();
    } catch (error) {
      console.error('PlaybackEngineModule.stop error:', error);
      return { success: false, error: String(error) };
    }
  },

  seekTo: async (positionMs: number): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, error: 'Playback engine not available' };
    }
    try {
      return await PlaybackEngineModuleNative.seekTo(positionMs);
    } catch (error) {
      console.error('PlaybackEngineModule.seekTo error:', error);
      return { success: false, error: String(error) };
    }
  },

  skipToIndex: async (index: number): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, error: 'Playback engine not available' };
    }
    try {
      return await PlaybackEngineModuleNative.skipToIndex(index);
    } catch (error) {
      console.error('PlaybackEngineModule.skipToIndex error:', error);
      return { success: false, error: String(error) };
    }
  },

  skipToNext: async (): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, error: 'Playback engine not available' };
    }
    try {
      return await PlaybackEngineModuleNative.skipToNext();
    } catch (error) {
      console.error('PlaybackEngineModule.skipToNext error:', error);
      return { success: false, error: String(error) };
    }
  },

  skipToPrevious: async (): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, error: 'Playback engine not available' };
    }
    try {
      return await PlaybackEngineModuleNative.skipToPrevious();
    } catch (error) {
      console.error('PlaybackEngineModule.skipToPrevious error:', error);
      return { success: false, error: String(error) };
    }
  },

  setVolume: (volume: number): { success: boolean; volume: number } => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, volume: 1 };
    }
    try {
      return PlaybackEngineModuleNative.setVolume(volume);
    } catch (error) {
      console.error('PlaybackEngineModule.setVolume error:', error);
      return { success: false, volume: 1 };
    }
  },

  setPlaybackSpeed: (speed: number): { success: boolean; speed: number } => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, speed: 1 };
    }
    try {
      return PlaybackEngineModuleNative.setPlaybackSpeed(speed);
    } catch (error) {
      console.error('PlaybackEngineModule.setPlaybackSpeed error:', error);
      return { success: false, speed: 1 };
    }
  },

  setRepeatMode: (mode: 'off' | 'one' | 'all'): { success: boolean; mode: string } => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, mode: 'off' };
    }
    try {
      return PlaybackEngineModuleNative.setRepeatMode(mode);
    } catch (error) {
      console.error('PlaybackEngineModule.setRepeatMode error:', error);
      return { success: false, mode: 'off' };
    }
  },

  setShuffleMode: (enabled: boolean): { success: boolean; shuffle: boolean } => {
    if (!PlaybackEngineModuleNative) {
      return { success: false, shuffle: false };
    }
    try {
      return PlaybackEngineModuleNative.setShuffleMode(enabled);
    } catch (error) {
      console.error('PlaybackEngineModule.setShuffleMode error:', error);
      return { success: false, shuffle: false };
    }
  },

  getStatus: (): PlaybackStatus => {
    if (!PlaybackEngineModuleNative) {
      return {
        isInitialized: false,
        isPlaying: false,
        currentPositionMs: 0,
        durationMs: 0,
        bufferedPositionMs: 0,
        currentIndex: 0,
        queueLength: 0,
        playbackState: 'idle',
        repeatMode: 'off',
        shuffleEnabled: false,
        audioSessionId: 0
      };
    }
    try {
      return PlaybackEngineModuleNative.getStatus();
    } catch (error) {
      console.error('PlaybackEngineModule.getStatus error:', error);
      return {
        isInitialized: false,
        isPlaying: false,
        currentPositionMs: 0,
        durationMs: 0,
        bufferedPositionMs: 0,
        currentIndex: 0,
        queueLength: 0,
        playbackState: 'idle',
        repeatMode: 'off',
        shuffleEnabled: false,
        audioSessionId: 0
      };
    }
  },

  getAudioSessionId: (): number => {
    if (!PlaybackEngineModuleNative) {
      return 0;
    }
    try {
      return PlaybackEngineModuleNative.getAudioSessionId();
    } catch (error) {
      console.error('PlaybackEngineModule.getAudioSessionId error:', error);
      return 0;
    }
  },

  getCurrentPosition: (): number => {
    if (!PlaybackEngineModuleNative) {
      return 0;
    }
    try {
      return PlaybackEngineModuleNative.getCurrentPosition();
    } catch (error) {
      console.error('PlaybackEngineModule.getCurrentPosition error:', error);
      return 0;
    }
  },

  getDuration: (): number => {
    if (!PlaybackEngineModuleNative) {
      return 0;
    }
    try {
      return PlaybackEngineModuleNative.getDuration();
    } catch (error) {
      console.error('PlaybackEngineModule.getDuration error:', error);
      return 0;
    }
  },

  release: async (): Promise<PlaybackResult> => {
    if (!PlaybackEngineModuleNative) {
      return { success: true };
    }
    try {
      return await PlaybackEngineModuleNative.release();
    } catch (error) {
      console.error('PlaybackEngineModule.release error:', error);
      return { success: false, error: String(error) };
    }
  }
};

// Equalizer Module Export
export const EqualizerModule = {
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && EqualizerModuleNative !== null;
  },

  attach: async (audioSessionId: number): Promise<EqualizerAttachResult> => {
    if (!EqualizerModuleNative) {
      return { success: false, error: 'Equalizer not available on this platform' };
    }
    try {
      return await EqualizerModuleNative.attach(audioSessionId);
    } catch (error) {
      console.error('EqualizerModule.attach error:', error);
      return { success: false, error: String(error) };
    }
  },

  setEnabled: (enabled: boolean): { success: boolean; enabled?: boolean; error?: string } => {
    if (!EqualizerModuleNative) {
      return { success: false, error: 'Equalizer not available' };
    }
    try {
      return EqualizerModuleNative.setEnabled(enabled);
    } catch (error) {
      console.error('EqualizerModule.setEnabled error:', error);
      return { success: false, error: String(error) };
    }
  },

  setBandLevel: (band: number, level: number): { success: boolean; error?: string } => {
    if (!EqualizerModuleNative) {
      return { success: false, error: 'Equalizer not available' };
    }
    try {
      return EqualizerModuleNative.setBandLevel(band, level);
    } catch (error) {
      console.error('EqualizerModule.setBandLevel error:', error);
      return { success: false, error: String(error) };
    }
  },

  getBandLevel: (band: number): number => {
    if (!EqualizerModuleNative) {
      return 0;
    }
    try {
      return EqualizerModuleNative.getBandLevel(band);
    } catch (error) {
      console.error('EqualizerModule.getBandLevel error:', error);
      return 0;
    }
  },

  usePreset: (preset: number): { success: boolean; error?: string } => {
    if (!EqualizerModuleNative) {
      return { success: false, error: 'Equalizer not available' };
    }
    try {
      return EqualizerModuleNative.usePreset(preset);
    } catch (error) {
      console.error('EqualizerModule.usePreset error:', error);
      return { success: false, error: String(error) };
    }
  },

  getCurrentPreset: (): number => {
    if (!EqualizerModuleNative) {
      return -1;
    }
    try {
      return EqualizerModuleNative.getCurrentPreset();
    } catch (error) {
      console.error('EqualizerModule.getCurrentPreset error:', error);
      return -1;
    }
  },

  setCustomBands: (levels: number[]): { success: boolean; error?: string } => {
    if (!EqualizerModuleNative) {
      return { success: false, error: 'Equalizer not available' };
    }
    try {
      return EqualizerModuleNative.setCustomBands(levels);
    } catch (error) {
      console.error('EqualizerModule.setCustomBands error:', error);
      return { success: false, error: String(error) };
    }
  },

  getAllBandLevels: (): number[] => {
    if (!EqualizerModuleNative) {
      return [];
    }
    try {
      return EqualizerModuleNative.getAllBandLevels();
    } catch (error) {
      console.error('EqualizerModule.getAllBandLevels error:', error);
      return [];
    }
  },

  getProperties: (): { enabled: boolean; numberOfBands: number; currentPreset: number; minLevel: number; maxLevel: number } => {
    if (!EqualizerModuleNative) {
      return { enabled: false, numberOfBands: 0, currentPreset: -1, minLevel: 0, maxLevel: 0 };
    }
    try {
      return EqualizerModuleNative.getProperties();
    } catch (error) {
      console.error('EqualizerModule.getProperties error:', error);
      return { enabled: false, numberOfBands: 0, currentPreset: -1, minLevel: 0, maxLevel: 0 };
    }
  },

  release: async (): Promise<{ success: boolean }> => {
    if (!EqualizerModuleNative) {
      return { success: true };
    }
    try {
      return await EqualizerModuleNative.release();
    } catch (error) {
      console.error('EqualizerModule.release error:', error);
      return { success: false };
    }
  }
};

// BassBoost Module Export
export const BassBoostModule = {
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && BassBoostModuleNative !== null;
  },

  attach: async (audioSessionId: number): Promise<BassBoostAttachResult> => {
    if (!BassBoostModuleNative) {
      return { success: false, error: 'BassBoost not available on this platform' };
    }
    try {
      return await BassBoostModuleNative.attach(audioSessionId);
    } catch (error) {
      console.error('BassBoostModule.attach error:', error);
      return { success: false, error: String(error) };
    }
  },

  setEnabled: (enabled: boolean): { success: boolean; error?: string } => {
    if (!BassBoostModuleNative) {
      return { success: false, error: 'BassBoost not available' };
    }
    try {
      return BassBoostModuleNative.setEnabled(enabled);
    } catch (error) {
      console.error('BassBoostModule.setEnabled error:', error);
      return { success: false, error: String(error) };
    }
  },

  setStrength: (strength: number): { success: boolean; error?: string } => {
    if (!BassBoostModuleNative) {
      return { success: false, error: 'BassBoost not available' };
    }
    try {
      return BassBoostModuleNative.setStrength(strength);
    } catch (error) {
      console.error('BassBoostModule.setStrength error:', error);
      return { success: false, error: String(error) };
    }
  },

  getStrength: (): number => {
    if (!BassBoostModuleNative) {
      return 0;
    }
    try {
      return BassBoostModuleNative.getStrength();
    } catch (error) {
      console.error('BassBoostModule.getStrength error:', error);
      return 0;
    }
  },

  getProperties: (): { enabled: boolean; strengthSupported: boolean; strength: number } => {
    if (!BassBoostModuleNative) {
      return { enabled: false, strengthSupported: false, strength: 0 };
    }
    try {
      return BassBoostModuleNative.getProperties();
    } catch (error) {
      console.error('BassBoostModule.getProperties error:', error);
      return { enabled: false, strengthSupported: false, strength: 0 };
    }
  },

  release: async (): Promise<{ success: boolean }> => {
    if (!BassBoostModuleNative) {
      return { success: true };
    }
    try {
      return await BassBoostModuleNative.release();
    } catch (error) {
      console.error('BassBoostModule.release error:', error);
      return { success: false };
    }
  }
};

// Virtualizer Module Export
export const VirtualizerModule = {
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && VirtualizerModuleNative !== null;
  },

  attach: async (audioSessionId: number): Promise<VirtualizerAttachResult> => {
    if (!VirtualizerModuleNative) {
      return { success: false, error: 'Virtualizer not available on this platform' };
    }
    try {
      return await VirtualizerModuleNative.attach(audioSessionId);
    } catch (error) {
      console.error('VirtualizerModule.attach error:', error);
      return { success: false, error: String(error) };
    }
  },

  setEnabled: (enabled: boolean): { success: boolean; error?: string } => {
    if (!VirtualizerModuleNative) {
      return { success: false, error: 'Virtualizer not available' };
    }
    try {
      return VirtualizerModuleNative.setEnabled(enabled);
    } catch (error) {
      console.error('VirtualizerModule.setEnabled error:', error);
      return { success: false, error: String(error) };
    }
  },

  setStrength: (strength: number): { success: boolean; error?: string } => {
    if (!VirtualizerModuleNative) {
      return { success: false, error: 'Virtualizer not available' };
    }
    try {
      return VirtualizerModuleNative.setStrength(strength);
    } catch (error) {
      console.error('VirtualizerModule.setStrength error:', error);
      return { success: false, error: String(error) };
    }
  },

  getStrength: (): number => {
    if (!VirtualizerModuleNative) {
      return 0;
    }
    try {
      return VirtualizerModuleNative.getStrength();
    } catch (error) {
      console.error('VirtualizerModule.getStrength error:', error);
      return 0;
    }
  },

  getProperties: (): { enabled: boolean; strengthSupported: boolean; strength: number } => {
    if (!VirtualizerModuleNative) {
      return { enabled: false, strengthSupported: false, strength: 0 };
    }
    try {
      return VirtualizerModuleNative.getProperties();
    } catch (error) {
      console.error('VirtualizerModule.getProperties error:', error);
      return { enabled: false, strengthSupported: false, strength: 0 };
    }
  },

  release: async (): Promise<{ success: boolean }> => {
    if (!VirtualizerModuleNative) {
      return { success: true };
    }
    try {
      return await VirtualizerModuleNative.release();
    } catch (error) {
      console.error('VirtualizerModule.release error:', error);
      return { success: false };
    }
  }
};

// WaveformAnalyzer Module Export
export const WaveformAnalyzerModule = {
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && WaveformAnalyzerModuleNative !== null;
  },

  attach: async (audioSessionId: number): Promise<WaveformAttachResult> => {
    if (!WaveformAnalyzerModuleNative) {
      return { success: false, error: 'Waveform analyzer not available on this platform' };
    }
    try {
      return await WaveformAnalyzerModuleNative.attach(audioSessionId);
    } catch (error) {
      console.error('WaveformAnalyzerModule.attach error:', error);
      return { success: false, error: String(error) };
    }
  },

  startCapture: async (rateHz: number = 60): Promise<{ success: boolean; captureRate?: number }> => {
    if (!WaveformAnalyzerModuleNative) {
      return { success: false };
    }
    try {
      return await WaveformAnalyzerModuleNative.startCapture(rateHz);
    } catch (error) {
      console.error('WaveformAnalyzerModule.startCapture error:', error);
      return { success: false };
    }
  },

  stopCapture: async (): Promise<{ success: boolean }> => {
    if (!WaveformAnalyzerModuleNative) {
      return { success: false };
    }
    try {
      return await WaveformAnalyzerModuleNative.stopCapture();
    } catch (error) {
      console.error('WaveformAnalyzerModule.stopCapture error:', error);
      return { success: false };
    }
  },

  getWaveformSnapshot: (): WaveformData | null => {
    if (!WaveformAnalyzerModuleNative) {
      return null;
    }
    try {
      const result = WaveformAnalyzerModuleNative.getWaveformSnapshot();
      if ('error' in result) {
        console.warn('WaveformAnalyzerModule.getWaveformSnapshot:', result.error);
        return null;
      }
      return result as WaveformData;
    } catch (error) {
      console.error('WaveformAnalyzerModule.getWaveformSnapshot error:', error);
      return null;
    }
  },

  getFftSnapshot: (): FftData | null => {
    if (!WaveformAnalyzerModuleNative) {
      return null;
    }
    try {
      const result = WaveformAnalyzerModuleNative.getFftSnapshot();
      if ('error' in result) {
        console.warn('WaveformAnalyzerModule.getFftSnapshot:', result.error);
        return null;
      }
      return result as FftData;
    } catch (error) {
      console.error('WaveformAnalyzerModule.getFftSnapshot error:', error);
      return null;
    }
  },

  getMeasurements: (): { peak: number; rms: number } | null => {
    if (!WaveformAnalyzerModuleNative) {
      return null;
    }
    try {
      const result = WaveformAnalyzerModuleNative.getMeasurements();
      if ('error' in result) {
        console.warn('WaveformAnalyzerModule.getMeasurements:', result.error);
        return null;
      }
      return result as { peak: number; rms: number };
    } catch (error) {
      console.error('WaveformAnalyzerModule.getMeasurements error:', error);
      return null;
    }
  },

  setCaptureSize: (size: number): { success: boolean; error?: string } => {
    if (!WaveformAnalyzerModuleNative) {
      return { success: false, error: 'Waveform analyzer not available' };
    }
    try {
      return WaveformAnalyzerModuleNative.setCaptureSize(size);
    } catch (error) {
      console.error('WaveformAnalyzerModule.setCaptureSize error:', error);
      return { success: false, error: String(error) };
    }
  },

  getProperties: (): { enabled: boolean; captureSize: number; samplingRate: number; audioSessionId: number; isCapturing: boolean } => {
    if (!WaveformAnalyzerModuleNative) {
      return { enabled: false, captureSize: 0, samplingRate: 0, audioSessionId: 0, isCapturing: false };
    }
    try {
      return WaveformAnalyzerModuleNative.getProperties();
    } catch (error) {
      console.error('WaveformAnalyzerModule.getProperties error:', error);
      return { enabled: false, captureSize: 0, samplingRate: 0, audioSessionId: 0, isCapturing: false };
    }
  },

  release: async (): Promise<{ success: boolean }> => {
    if (!WaveformAnalyzerModuleNative) {
      return { success: true };
    }
    try {
      return await WaveformAnalyzerModuleNative.release();
    } catch (error) {
      console.error('WaveformAnalyzerModule.release error:', error);
      return { success: false };
    }
  }
};

// ImmersiveModeEngine Module Export
export const ImmersiveModeEngineModule = {
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && ImmersiveModeEngineModuleNative !== null;
  },

  attach: async (audioSessionId: number): Promise<ImmersiveModeAttachResult> => {
    if (!ImmersiveModeEngineModuleNative) {
      return { success: false, error: 'Immersive mode engine not available on this platform' };
    }
    try {
      return await ImmersiveModeEngineModuleNative.attach(audioSessionId);
    } catch (error) {
      console.error('ImmersiveModeEngineModule.attach error:', error);
      return { success: false, error: String(error) };
    }
  },

  setMode: async (mode: ImmersiveMode): Promise<ImmersiveModeResult> => {
    if (!ImmersiveModeEngineModuleNative) {
      return { success: false, error: 'Immersive mode engine not available' };
    }
    try {
      return await ImmersiveModeEngineModuleNative.setMode(mode);
    } catch (error) {
      console.error('ImmersiveModeEngineModule.setMode error:', error);
      return { success: false, error: String(error) };
    }
  },

  getCurrentMode: (): { mode: ImmersiveMode; isAttached: boolean; settings: ImmersiveModeSettings } => {
    if (!ImmersiveModeEngineModuleNative) {
      return {
        mode: 'off',
        isAttached: false,
        settings: {
          equalizerEnabled: false,
          bassBoostEnabled: false,
          bassBoostStrength: 0,
          virtualizerEnabled: false,
          virtualizerStrength: 0,
          loudnessEnhancerEnabled: false,
          loudnessGain: 0,
          equalizerBandLevels: []
        }
      };
    }
    try {
      return ImmersiveModeEngineModuleNative.getCurrentMode();
    } catch (error) {
      console.error('ImmersiveModeEngineModule.getCurrentMode error:', error);
      return {
        mode: 'off',
        isAttached: false,
        settings: {
          equalizerEnabled: false,
          bassBoostEnabled: false,
          bassBoostStrength: 0,
          virtualizerEnabled: false,
          virtualizerStrength: 0,
          loudnessEnhancerEnabled: false,
          loudnessGain: 0,
          equalizerBandLevels: []
        }
      };
    }
  },

  getAvailableModes: (): ImmersiveModeInfo[] => {
    if (!ImmersiveModeEngineModuleNative) {
      return [
        { id: 'off', name: 'Off', description: 'No audio enhancement', icon: 'volume-off' },
        { id: 'music', name: 'Music', description: 'Optimized for music listening', icon: 'music' },
        { id: '360_reality', name: '360 Reality', description: 'Immersive 3D spatial audio', icon: 'surround-sound' },
        { id: 'gaming', name: 'Gaming', description: 'Enhanced positional audio', icon: 'gamepad-variant' },
        { id: 'podcast', name: 'Podcast', description: 'Voice clarity enhancement', icon: 'podcast' },
        { id: 'movie', name: 'Movie', description: 'Cinematic audio experience', icon: 'movie-open' },
        { id: 'custom', name: 'Custom', description: 'Custom audio settings', icon: 'tune' }
      ];
    }
    try {
      return ImmersiveModeEngineModuleNative.getAvailableModes() as ImmersiveModeInfo[];
    } catch (error) {
      console.error('ImmersiveModeEngineModule.getAvailableModes error:', error);
      return [];
    }
  },

  setCustomParameters: async (
    bassStrength: number,
    virtualizerStrength: number,
    loudnessGain: number,
    eqPreset: number = -1
  ): Promise<ImmersiveModeResult> => {
    if (!ImmersiveModeEngineModuleNative) {
      return { success: false, error: 'Immersive mode engine not available' };
    }
    try {
      return await ImmersiveModeEngineModuleNative.setCustomParameters(
        bassStrength,
        virtualizerStrength,
        loudnessGain,
        eqPreset
      );
    } catch (error) {
      console.error('ImmersiveModeEngineModule.setCustomParameters error:', error);
      return { success: false, error: String(error) };
    }
  },

  release: async (): Promise<{ success: boolean }> => {
    if (!ImmersiveModeEngineModuleNative) {
      return { success: true };
    }
    try {
      return await ImmersiveModeEngineModuleNative.release();
    } catch (error) {
      console.error('ImmersiveModeEngineModule.release error:', error);
      return { success: false };
    }
  }
};

// Immersive Mode Presets Info
export const IMMERSIVE_MODE_INFO: Record<ImmersiveMode, { name: string; description: string; icon: string }> = {
  off: { name: 'Off', description: 'No audio enhancement', icon: 'volume-off' },
  music: { name: 'Music', description: 'Optimized for music listening with enhanced clarity and bass', icon: 'music' },
  '360_reality': { name: '360 Reality', description: 'Immersive 3D spatial audio experience', icon: 'surround-sound' },
  gaming: { name: 'Gaming', description: 'Enhanced positional audio for gaming with boosted footsteps and effects', icon: 'gamepad-variant' },
  podcast: { name: 'Podcast', description: 'Voice clarity enhancement for podcasts and audiobooks', icon: 'podcast' },
  movie: { name: 'Movie', description: 'Cinematic audio with enhanced dialogue and surround effects', icon: 'movie-open' },
  custom: { name: 'Custom', description: 'Custom audio settings', icon: 'tune' }
};
