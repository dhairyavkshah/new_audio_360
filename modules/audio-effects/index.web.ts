// Web fallback for native audio effects modules
// These modules only work on Android with native development builds

export type ReverbPreset = 
  | 'none'
  | 'small_studio'
  | 'medium_studio'
  | 'large_studio'
  | 'open_theatre'
  | 'auditorium';

export type NoiseReductionLevel = 'off' | 'light' | 'medium' | 'strong';

export interface MixExportResult {
  success: boolean;
  uri?: string;
  fileName?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

export interface RecordingFile {
  name: string;
  uri: string;
  size: number;
  lastModified: number;
}

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

export interface VirtualizerAttachResult {
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

// Web stub for ReverbModule
export const ReverbModule = {
  isAvailable: () => false,
  initialize: async () => ({ success: false, error: 'Not available on web' }),
  setPreset: async () => ({ success: false, error: 'Not available on web' }),
  setWetDryMix: async () => ({ success: false, error: 'Not available on web' }),
  enable: async () => ({ success: false, error: 'Not available on web' }),
  getCurrentPreset: async () => ({ preset: 'none', enabled: false }),
  getAvailablePresets: async () => [],
  release: async () => ({ success: true }),
};

// Web stub for NoiseReductionModule
export const NoiseReductionModule = {
  isAvailable: async () => ({ noiseSuppressor: false, automaticGainControl: false }),
  initialize: async () => ({ success: false, error: 'Not available on web' }),
  setLevel: async () => ({ success: false, error: 'Not available on web' }),
  getCurrentLevel: async () => ({ success: false, level: 'off' }),
  getAvailableLevels: async () => ['off'],
  release: async () => ({ success: true }),
};

// Web stub for AudioMixerModule
export const AudioMixerModule = {
  isAvailable: () => false,
  mixAndExport: async () => ({ success: false, error: 'Not available on web' }),
  cancelExport: async () => ({ success: true }),
  getExportProgress: () => 0,
};

// Web stub for LiveRecordingModule
export const LiveRecordingModule = {
  isAvailable: () => false,
  getAudioCapabilities: async () => ({
    hasEchoCanceler: false,
    hasNoiseSuppressor: false,
    hasAutomaticGainControl: false,
  }),
  initializeRecording: async () => ({ success: false, error: 'Not available on web' }),
  startRecording: async () => ({ success: false, error: 'Not available on web' }),
  pauseRecording: async () => ({ success: false, error: 'Not available on web' }),
  resumeRecording: async () => ({ success: false, error: 'Not available on web' }),
  stopRecording: async () => ({ success: false, error: 'Not available on web' }),
  setRecordingEffects: async () => ({ success: false, error: 'Not available on web' }),
  getRecordingStatus: () => ({
    isInitialized: false,
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    audioSessionId: 0,
  }),
  listRecordings: async () => [],
  deleteRecording: async () => ({ success: false, error: 'Not available on web' }),
  release: async () => ({ success: true }),
  getAudioSessionId: () => 0,
};

// Web stub for BackingTrackModule
export const BackingTrackModule = {
  isAvailable: () => false,
  loadTrack: async () => ({ success: false, error: 'Not available on web' }),
  play: async () => ({ success: false, error: 'Not available on web' }),
  pause: async () => ({ success: false, error: 'Not available on web' }),
  stop: async () => ({ success: false, error: 'Not available on web' }),
  seekTo: async () => ({ success: false, error: 'Not available on web' }),
  setVolume: () => ({ success: false, volume: 0 }),
  getStatus: () => ({
    isLoaded: false,
    isPlaying: false,
    currentPositionMs: 0,
    durationMs: 0,
    volume: 0,
    audioSessionId: 0,
  }),
  release: async () => ({ success: true }),
  getDuration: () => 0,
  getCurrentPosition: () => 0,
  getAudioSessionId: () => 0,
};

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

// Web stub for VirtualizerModule
export const VirtualizerModule = {
  isAvailable: () => false,
  attach: async (): Promise<VirtualizerAttachResult> => ({ success: false, error: 'Not available on web' }),
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
