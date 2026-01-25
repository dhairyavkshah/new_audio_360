// Web fallback for native audio effects modules
// These modules only work on Android with native development builds

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
}

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

export interface BassBoostAttachResult {
  success: boolean;
  error?: string;
  strengthSupported?: boolean;
}

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
}

// Web stub for PlaybackEngineModule
export const PlaybackEngineModule = {
  isAvailable: () => false,
  initialize: async (): Promise<PlaybackResult> => ({ success: false, error: 'Not available on web' }),
  setQueue: async (): Promise<PlaybackResult> => ({ success: false, error: 'Not available on web' }),
  loadTrack: async (): Promise<PlaybackResult> => ({ success: false, error: 'Not available on web' }),
  play: async (): Promise<PlaybackResult> => ({ success: false, error: 'Not available on web' }),
  pause: async (): Promise<PlaybackResult> => ({ success: false, error: 'Not available on web' }),
  stop: async (): Promise<PlaybackResult> => ({ success: false, error: 'Not available on web' }),
  seekTo: async (): Promise<PlaybackResult> => ({ success: false, error: 'Not available on web' }),
  skipToIndex: async (): Promise<PlaybackResult> => ({ success: false, error: 'Not available on web' }),
  skipToNext: async (): Promise<PlaybackResult> => ({ success: false, error: 'Not available on web' }),
  skipToPrevious: async (): Promise<PlaybackResult> => ({ success: false, error: 'Not available on web' }),
  setVolume: () => ({ success: false, volume: 1 }),
  setPlaybackSpeed: () => ({ success: false, speed: 1 }),
  setRepeatMode: () => ({ success: false, mode: 'off' }),
  setShuffleMode: () => ({ success: false, shuffle: false }),
  getStatus: (): PlaybackStatus => ({
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
    audioSessionId: 0,
  }),
  getAudioSessionId: () => 0,
  getCurrentPosition: () => 0,
  getDuration: () => 0,
  release: async (): Promise<PlaybackResult> => ({ success: true }),
};

// Web stub for EqualizerModule
export const EqualizerModule = {
  isAvailable: () => false,
  attach: async (): Promise<EqualizerAttachResult> => ({ success: false, error: 'Not available on web' }),
  setEnabled: () => ({ success: false, error: 'Not available on web' }),
  setBandLevel: () => ({ success: false, error: 'Not available on web' }),
  getBandLevel: () => 0,
  usePreset: () => ({ success: false, error: 'Not available on web' }),
  getCurrentPreset: () => -1,
  setCustomBands: () => ({ success: false, error: 'Not available on web' }),
  getAllBandLevels: () => [],
  getProperties: () => ({ enabled: false, numberOfBands: 0, currentPreset: -1, minLevel: 0, maxLevel: 0 }),
  release: async () => ({ success: true }),
};

// Web stub for BassBoostModule
export const BassBoostModule = {
  isAvailable: () => false,
  attach: async (): Promise<BassBoostAttachResult> => ({ success: false, error: 'Not available on web' }),
  setEnabled: () => ({ success: false, error: 'Not available on web' }),
  setStrength: () => ({ success: false, error: 'Not available on web' }),
  getStrength: () => 0,
  getProperties: () => ({ enabled: false, strengthSupported: false, strength: 0 }),
  release: async () => ({ success: true }),
};

// Web stub for WaveformAnalyzerModule
export const WaveformAnalyzerModule = {
  isAvailable: () => false,
  attach: async (): Promise<WaveformAttachResult> => ({ success: false, error: 'Not available on web' }),
  startCapture: async () => ({ success: false }),
  stopCapture: async () => ({ success: false }),
  getWaveformSnapshot: (): WaveformData | null => null,
  getFftSnapshot: (): FftData | null => null,
  getMeasurements: () => null,
  setCaptureSize: () => ({ success: false, error: 'Not available on web' }),
  getProperties: () => ({ enabled: false, captureSize: 0, samplingRate: 0, audioSessionId: 0, isCapturing: false }),
  release: async () => ({ success: true }),
};

// Immersive Mode Types
export type ImmersiveMode = 
  | 'off'
  | 'music'
  | '360_reality'
  | 'gaming'
  | 'podcast'
  | 'movie'
  | 'sports'
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
  loudnessEnhancerAvailable?: boolean;
}

export interface ImmersiveModeResult {
  success: boolean;
  error?: string;
  mode?: ImmersiveMode;
  settings?: ImmersiveModeSettings;
}

// Web stub for ImmersiveModeEngineModule
export const ImmersiveModeEngineModule = {
  isAvailable: () => false,
  attach: async (): Promise<ImmersiveModeAttachResult> => ({ success: false, error: 'Not available on web' }),
  setMode: async (): Promise<ImmersiveModeResult> => ({ success: false, error: 'Not available on web' }),
  getCurrentMode: () => ({
    mode: 'off' as ImmersiveMode,
    isAttached: false,
    settings: {
      equalizerEnabled: false,
      bassBoostEnabled: false,
      bassBoostStrength: 0,
      loudnessEnhancerEnabled: false,
      loudnessGain: 0,
      equalizerBandLevels: []
    }
  }),
  getAvailableModes: (): ImmersiveModeInfo[] => [
    { id: 'off', name: 'Off', description: 'No audio enhancement', icon: 'volume-off' },
    { id: 'music', name: 'Music', description: 'Optimized for music listening', icon: 'music' },
    { id: '360_reality', name: '360 Reality', description: 'Immersive 3D spatial audio', icon: 'surround-sound' },
    { id: 'gaming', name: 'Gaming', description: 'Enhanced positional audio for gaming', icon: 'gamepad-variant' },
    { id: 'podcast', name: 'Podcast', description: 'Voice clarity enhancement', icon: 'podcast' },
    { id: 'movie', name: 'Movie', description: 'Cinematic audio enhancement', icon: 'movie-open' },
    { id: 'sports', name: 'Sports', description: 'Stadium broadcast clarity', icon: 'stadium' },
    { id: 'custom', name: 'Custom', description: 'Custom audio settings', icon: 'tune' }
  ],
  setCustomParameters: async (): Promise<ImmersiveModeResult> => ({ success: false, error: 'Not available on web' }),
  release: async () => ({ success: true }),
};

export const IMMERSIVE_MODE_INFO: Record<ImmersiveMode, { name: string; description: string; icon: string }> = {
  off: { name: 'Off', description: 'No audio enhancement', icon: 'volume-off' },
  music: { name: 'Music', description: 'Optimized for music listening with enhanced clarity and bass', icon: 'music' },
  '360_reality': { name: '360 Reality', description: 'Immersive 3D spatial audio experience', icon: 'surround-sound' },
  gaming: { name: 'Gaming', description: 'Enhanced positional audio for gaming with boosted footsteps and effects', icon: 'gamepad-variant' },
  podcast: { name: 'Podcast', description: 'Voice clarity enhancement for podcasts and audiobooks', icon: 'podcast' },
  movie: { name: 'Movie', description: 'Cinematic audio with enhanced dialogue and surround effects', icon: 'movie-open' },
  sports: { name: 'Sports', description: 'Stadium broadcast clarity with enhanced commentary', icon: 'stadium' },
  custom: { name: 'Custom', description: 'Custom audio settings', icon: 'tune' }
};
