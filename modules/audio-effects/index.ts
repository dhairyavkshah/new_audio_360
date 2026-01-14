import { NativeModule, requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type ReverbPreset = 
  | 'none'
  | 'small_studio'
  | 'medium_studio'
  | 'large_studio'
  | 'open_theatre'
  | 'auditorium';

export type NoiseReductionLevel = 'off' | 'light' | 'medium' | 'strong';

interface ReverbResult {
  success: boolean;
  error?: string;
  preset?: string;
  enabled?: boolean;
  sessionId?: number;
  params?: {
    decayTime: number;
    roomLevel: number;
    diffusion: number;
    density: number;
  };
}

interface NoiseReductionResult {
  success: boolean;
  error?: string;
  level?: string;
  sessionId?: number;
  noiseSuppressorAvailable?: boolean;
  agcAvailable?: boolean;
  noiseSuppressorEnabled?: boolean;
  agcEnabled?: boolean;
}

interface ReverbModuleInterface extends NativeModule {
  initialize(sessionId: number): Promise<ReverbResult>;
  setPreset(preset: string): Promise<ReverbResult>;
  setWetDryMix(wetPercent: number): Promise<ReverbResult>;
  enable(enabled: boolean): Promise<ReverbResult>;
  getCurrentPreset(): Promise<{ preset: string; enabled: boolean }>;
  getAvailablePresets(): Promise<string[]>;
  release(): Promise<ReverbResult>;
}

interface NoiseReductionModuleInterface extends NativeModule {
  isAvailable(): Promise<{ noiseSuppressor: boolean; automaticGainControl: boolean }>;
  initialize(sessionId: number): Promise<NoiseReductionResult>;
  setLevel(level: string): Promise<NoiseReductionResult>;
  getCurrentLevel(): Promise<NoiseReductionResult>;
  getAvailableLevels(): Promise<string[]>;
  release(): Promise<NoiseReductionResult>;
}

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

interface AudioMixerModuleInterface extends NativeModule {
  mixAndExport(
    backingTrackUri: string,
    voiceTrackUri: string,
    outputFileName: string,
    musicVolume: number,
    voiceVolume: number,
    syncOffsetMs: number,
    reverbPreset: string,
    noiseReduction: string
  ): Promise<MixExportResult>;
  copyVoiceRecording(sourceUri: string, outputFileName: string): Promise<MixExportResult>;
  getRecordingsDirectory(): string | null;
  listRecordings(): RecordingFile[];
  deleteRecording(uri: string): Promise<{ success: boolean }>;
}

export interface LiveRecordingResult {
  success: boolean;
  error?: string;
  audioSessionId?: number;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  echoCancelerEnabled?: boolean;
  noiseSuppressorEnabled?: boolean;
  agcEnabled?: boolean;
  uri?: string;
  durationMs?: number;
  fileSize?: number;
}

export interface RecordingStatus {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  bytesWritten: number;
}

export interface AudioEffectsAvailability {
  acousticEchoCanceler: boolean;
  noiseSuppressor: boolean;
  automaticGainControl: boolean;
}

interface LiveRecordingModuleInterface extends NativeModule {
  isAvailable(): boolean;
  getAudioEffectsAvailability(): AudioEffectsAvailability;
  startRecording(
    outputPath: string,
    enableEchoCanceler: boolean,
    enableNoiseSuppressor: boolean,
    enableAgc: boolean
  ): Promise<LiveRecordingResult>;
  pauseRecording(): Promise<{ success: boolean }>;
  resumeRecording(): Promise<{ success: boolean }>;
  stopRecording(): Promise<LiveRecordingResult>;
  setInputGain(gain: number): { success: boolean; gain: number };
  getRecordingStatus(): RecordingStatus;
  cancelRecording(): Promise<{ success: boolean }>;
}

export interface BackingTrackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  currentPositionMs: number;
  durationMs: number;
  uri: string;
}

export interface BackingTrackResult {
  success: boolean;
  error?: string;
  durationMs?: number;
  audioSessionId?: number;
  positionMs?: number;
  volume?: number;
}

interface BackingTrackModuleInterface extends NativeModule {
  isAvailable(): boolean;
  loadTrack(uri: string): Promise<BackingTrackResult>;
  play(): Promise<{ success: boolean }>;
  pause(): Promise<{ success: boolean }>;
  stop(): Promise<{ success: boolean }>;
  seekTo(positionMs: number): Promise<BackingTrackResult>;
  setVolume(volume: number): { success: boolean; volume: number };
  getStatus(): BackingTrackStatus;
  release(): Promise<{ success: boolean }>;
  getCurrentPosition(): number;
  getDuration(): number;
  getAudioSessionId(): number;
}

let ReverbModuleNative: ReverbModuleInterface | null = null;
let NoiseReductionModuleNative: NoiseReductionModuleInterface | null = null;
let AudioMixerModuleNative: AudioMixerModuleInterface | null = null;
let LiveRecordingModuleNative: LiveRecordingModuleInterface | null = null;
let BackingTrackModuleNative: BackingTrackModuleInterface | null = null;

if (Platform.OS === 'android') {
  try {
    ReverbModuleNative = requireNativeModule<ReverbModuleInterface>('ReverbModule');
  } catch (e) {
    console.warn('ReverbModule not available:', e);
  }
  
  try {
    NoiseReductionModuleNative = requireNativeModule<NoiseReductionModuleInterface>('NoiseReductionModule');
  } catch (e) {
    console.warn('NoiseReductionModule not available:', e);
  }
  
  try {
    AudioMixerModuleNative = requireNativeModule<AudioMixerModuleInterface>('AudioMixerModule');
  } catch (e) {
    console.warn('AudioMixerModule not available:', e);
  }
  
  try {
    LiveRecordingModuleNative = requireNativeModule<LiveRecordingModuleInterface>('LiveRecordingModule');
  } catch (e) {
    console.warn('LiveRecordingModule not available:', e);
  }
  
  try {
    BackingTrackModuleNative = requireNativeModule<BackingTrackModuleInterface>('BackingTrackModule');
  } catch (e) {
    console.warn('BackingTrackModule not available:', e);
  }
}

export const ReverbModule = {
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && ReverbModuleNative !== null;
  },

  initialize: async (audioSessionId: number): Promise<ReverbResult> => {
    if (!ReverbModuleNative) {
      return { success: false, error: 'Reverb module not available on this platform' };
    }
    try {
      return await ReverbModuleNative.initialize(audioSessionId);
    } catch (error) {
      console.error('ReverbModule.initialize error:', error);
      return { success: false, error: String(error) };
    }
  },

  setPreset: async (preset: ReverbPreset): Promise<ReverbResult> => {
    if (!ReverbModuleNative) {
      return { success: false, error: 'Reverb module not available' };
    }
    try {
      return await ReverbModuleNative.setPreset(preset);
    } catch (error) {
      console.error('ReverbModule.setPreset error:', error);
      return { success: false, error: String(error) };
    }
  },

  setWetDryMix: async (wetPercent: number): Promise<ReverbResult> => {
    if (!ReverbModuleNative) {
      return { success: false, error: 'Reverb module not available' };
    }
    try {
      return await ReverbModuleNative.setWetDryMix(wetPercent);
    } catch (error) {
      console.error('ReverbModule.setWetDryMix error:', error);
      return { success: false, error: String(error) };
    }
  },

  enable: async (enabled: boolean): Promise<ReverbResult> => {
    if (!ReverbModuleNative) {
      return { success: false, error: 'Reverb module not available' };
    }
    try {
      return await ReverbModuleNative.enable(enabled);
    } catch (error) {
      console.error('ReverbModule.enable error:', error);
      return { success: false, error: String(error) };
    }
  },

  getCurrentPreset: async (): Promise<{ preset: ReverbPreset; enabled: boolean }> => {
    if (!ReverbModuleNative) {
      return { preset: 'none', enabled: false };
    }
    try {
      const result = await ReverbModuleNative.getCurrentPreset();
      return { preset: result.preset as ReverbPreset, enabled: result.enabled };
    } catch (error) {
      console.error('ReverbModule.getCurrentPreset error:', error);
      return { preset: 'none', enabled: false };
    }
  },

  getAvailablePresets: async (): Promise<ReverbPreset[]> => {
    if (!ReverbModuleNative) {
      return ['none', 'small_studio', 'medium_studio', 'large_studio', 'open_theatre', 'auditorium'];
    }
    try {
      const presets = await ReverbModuleNative.getAvailablePresets();
      return presets as ReverbPreset[];
    } catch (error) {
      console.error('ReverbModule.getAvailablePresets error:', error);
      return ['none'];
    }
  },

  release: async (): Promise<ReverbResult> => {
    if (!ReverbModuleNative) {
      return { success: true };
    }
    try {
      return await ReverbModuleNative.release();
    } catch (error) {
      console.error('ReverbModule.release error:', error);
      return { success: false, error: String(error) };
    }
  }
};

export const NoiseReductionModule = {
  isAvailable: async (): Promise<{ noiseSuppressor: boolean; automaticGainControl: boolean }> => {
    if (!NoiseReductionModuleNative) {
      return { noiseSuppressor: false, automaticGainControl: false };
    }
    try {
      return await NoiseReductionModuleNative.isAvailable();
    } catch (error) {
      console.error('NoiseReductionModule.isAvailable error:', error);
      return { noiseSuppressor: false, automaticGainControl: false };
    }
  },

  initialize: async (audioSessionId: number): Promise<NoiseReductionResult> => {
    if (!NoiseReductionModuleNative) {
      return { success: false, error: 'Noise reduction module not available on this platform' };
    }
    try {
      return await NoiseReductionModuleNative.initialize(audioSessionId);
    } catch (error) {
      console.error('NoiseReductionModule.initialize error:', error);
      return { success: false, error: String(error) };
    }
  },

  setLevel: async (level: NoiseReductionLevel): Promise<NoiseReductionResult> => {
    if (!NoiseReductionModuleNative) {
      return { success: false, error: 'Noise reduction module not available' };
    }
    try {
      return await NoiseReductionModuleNative.setLevel(level);
    } catch (error) {
      console.error('NoiseReductionModule.setLevel error:', error);
      return { success: false, error: String(error) };
    }
  },

  getCurrentLevel: async (): Promise<NoiseReductionResult> => {
    if (!NoiseReductionModuleNative) {
      return { success: false, level: 'off' };
    }
    try {
      return await NoiseReductionModuleNative.getCurrentLevel();
    } catch (error) {
      console.error('NoiseReductionModule.getCurrentLevel error:', error);
      return { success: false, level: 'off' };
    }
  },

  getAvailableLevels: async (): Promise<NoiseReductionLevel[]> => {
    if (!NoiseReductionModuleNative) {
      return ['off', 'light', 'medium', 'strong'];
    }
    try {
      const levels = await NoiseReductionModuleNative.getAvailableLevels();
      return levels as NoiseReductionLevel[];
    } catch (error) {
      console.error('NoiseReductionModule.getAvailableLevels error:', error);
      return ['off'];
    }
  },

  release: async (): Promise<NoiseReductionResult> => {
    if (!NoiseReductionModuleNative) {
      return { success: true };
    }
    try {
      return await NoiseReductionModuleNative.release();
    } catch (error) {
      console.error('NoiseReductionModule.release error:', error);
      return { success: false, error: String(error) };
    }
  }
};

export const REVERB_PRESET_INFO: Record<ReverbPreset, { name: string; description: string; decayMs: number }> = {
  none: { name: 'None', description: 'No reverb effect', decayMs: 0 },
  small_studio: { name: 'Small Studio', description: 'Intimate recording booth feel', decayMs: 600 },
  medium_studio: { name: 'Medium Studio', description: 'Professional studio ambiance', decayMs: 1000 },
  large_studio: { name: 'Large Studio', description: 'Spacious recording room', decayMs: 1800 },
  open_theatre: { name: 'Open Theatre', description: 'Stage performance atmosphere', decayMs: 2300 },
  auditorium: { name: 'Auditorium', description: 'Grand concert hall reverb', decayMs: 2800 }
};

export const NOISE_REDUCTION_INFO: Record<NoiseReductionLevel, { name: string; description: string }> = {
  off: { name: 'Off', description: 'No noise reduction' },
  light: { name: 'Light', description: 'Subtle background noise reduction' },
  medium: { name: 'Medium', description: 'Balanced noise reduction with gain control' },
  strong: { name: 'Strong', description: 'Maximum noise suppression' }
};

export const AudioMixerModule = {
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && AudioMixerModuleNative !== null;
  },

  mixAndExport: async (
    backingTrackUri: string,
    voiceTrackUri: string,
    outputFileName: string,
    musicVolume: number,
    voiceVolume: number,
    syncOffsetMs: number,
    reverbPreset: ReverbPreset,
    noiseReduction: NoiseReductionLevel
  ): Promise<MixExportResult> => {
    if (!AudioMixerModuleNative) {
      return { success: false, error: 'Audio mixer module not available on this platform' };
    }
    try {
      const normalizedMusicVolume = Math.max(0, Math.min(1, musicVolume / 100));
      const normalizedVoiceVolume = Math.max(0, Math.min(1, voiceVolume / 100));
      return await AudioMixerModuleNative.mixAndExport(
        backingTrackUri,
        voiceTrackUri,
        outputFileName,
        normalizedMusicVolume,
        normalizedVoiceVolume,
        syncOffsetMs,
        reverbPreset,
        noiseReduction
      );
    } catch (error) {
      console.error('AudioMixerModule.mixAndExport error:', error);
      return { success: false, error: String(error) };
    }
  },

  copyVoiceRecording: async (sourceUri: string, outputFileName: string): Promise<MixExportResult> => {
    if (!AudioMixerModuleNative) {
      return { success: false, error: 'Audio mixer module not available on this platform' };
    }
    try {
      return await AudioMixerModuleNative.copyVoiceRecording(sourceUri, outputFileName);
    } catch (error) {
      console.error('AudioMixerModule.copyVoiceRecording error:', error);
      return { success: false, error: String(error) };
    }
  },

  getRecordingsDirectory: (): string | null => {
    if (!AudioMixerModuleNative) {
      return null;
    }
    try {
      return AudioMixerModuleNative.getRecordingsDirectory();
    } catch (error) {
      console.error('AudioMixerModule.getRecordingsDirectory error:', error);
      return null;
    }
  },

  listRecordings: (): RecordingFile[] => {
    if (!AudioMixerModuleNative) {
      return [];
    }
    try {
      return AudioMixerModuleNative.listRecordings();
    } catch (error) {
      console.error('AudioMixerModule.listRecordings error:', error);
      return [];
    }
  },

  deleteRecording: async (uri: string): Promise<{ success: boolean }> => {
    if (!AudioMixerModuleNative) {
      return { success: false };
    }
    try {
      return await AudioMixerModuleNative.deleteRecording(uri);
    } catch (error) {
      console.error('AudioMixerModule.deleteRecording error:', error);
      return { success: false };
    }
  }
};

export const LiveRecordingModule = {
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && LiveRecordingModuleNative !== null;
  },

  getAudioEffectsAvailability: (): AudioEffectsAvailability => {
    if (!LiveRecordingModuleNative) {
      return { acousticEchoCanceler: false, noiseSuppressor: false, automaticGainControl: false };
    }
    try {
      return LiveRecordingModuleNative.getAudioEffectsAvailability();
    } catch (error) {
      console.error('LiveRecordingModule.getAudioEffectsAvailability error:', error);
      return { acousticEchoCanceler: false, noiseSuppressor: false, automaticGainControl: false };
    }
  },

  startRecording: async (
    outputPath: string,
    options: {
      enableEchoCanceler?: boolean;
      enableNoiseSuppressor?: boolean;
      enableAgc?: boolean;
    } = {}
  ): Promise<LiveRecordingResult> => {
    if (!LiveRecordingModuleNative) {
      return { success: false, error: 'Live recording module not available on this platform' };
    }
    try {
      const { enableEchoCanceler = true, enableNoiseSuppressor = true, enableAgc = true } = options;
      return await LiveRecordingModuleNative.startRecording(
        outputPath,
        enableEchoCanceler,
        enableNoiseSuppressor,
        enableAgc
      );
    } catch (error) {
      console.error('LiveRecordingModule.startRecording error:', error);
      return { success: false, error: String(error) };
    }
  },

  pauseRecording: async (): Promise<{ success: boolean }> => {
    if (!LiveRecordingModuleNative) {
      return { success: false };
    }
    try {
      return await LiveRecordingModuleNative.pauseRecording();
    } catch (error) {
      console.error('LiveRecordingModule.pauseRecording error:', error);
      return { success: false };
    }
  },

  resumeRecording: async (): Promise<{ success: boolean }> => {
    if (!LiveRecordingModuleNative) {
      return { success: false };
    }
    try {
      return await LiveRecordingModuleNative.resumeRecording();
    } catch (error) {
      console.error('LiveRecordingModule.resumeRecording error:', error);
      return { success: false };
    }
  },

  stopRecording: async (): Promise<LiveRecordingResult> => {
    if (!LiveRecordingModuleNative) {
      return { success: false, error: 'Live recording module not available' };
    }
    try {
      return await LiveRecordingModuleNative.stopRecording();
    } catch (error) {
      console.error('LiveRecordingModule.stopRecording error:', error);
      return { success: false, error: String(error) };
    }
  },

  setInputGain: (gain: number): { success: boolean; gain: number } => {
    if (!LiveRecordingModuleNative) {
      return { success: false, gain: 1.0 };
    }
    try {
      const normalizedGain = Math.max(0, Math.min(3, gain / 100));
      return LiveRecordingModuleNative.setInputGain(normalizedGain);
    } catch (error) {
      console.error('LiveRecordingModule.setInputGain error:', error);
      return { success: false, gain: 1.0 };
    }
  },

  getRecordingStatus: (): RecordingStatus => {
    if (!LiveRecordingModuleNative) {
      return { isRecording: false, isPaused: false, durationMs: 0, bytesWritten: 0 };
    }
    try {
      return LiveRecordingModuleNative.getRecordingStatus();
    } catch (error) {
      console.error('LiveRecordingModule.getRecordingStatus error:', error);
      return { isRecording: false, isPaused: false, durationMs: 0, bytesWritten: 0 };
    }
  },

  cancelRecording: async (): Promise<{ success: boolean }> => {
    if (!LiveRecordingModuleNative) {
      return { success: false };
    }
    try {
      return await LiveRecordingModuleNative.cancelRecording();
    } catch (error) {
      console.error('LiveRecordingModule.cancelRecording error:', error);
      return { success: false };
    }
  }
};

export const BackingTrackModule = {
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && BackingTrackModuleNative !== null;
  },

  loadTrack: async (uri: string): Promise<BackingTrackResult> => {
    if (!BackingTrackModuleNative) {
      return { success: false, error: 'Backing track module not available on this platform' };
    }
    try {
      return await BackingTrackModuleNative.loadTrack(uri);
    } catch (error) {
      console.error('BackingTrackModule.loadTrack error:', error);
      return { success: false, error: String(error) };
    }
  },

  play: async (): Promise<{ success: boolean }> => {
    if (!BackingTrackModuleNative) {
      return { success: false };
    }
    try {
      return await BackingTrackModuleNative.play();
    } catch (error) {
      console.error('BackingTrackModule.play error:', error);
      return { success: false };
    }
  },

  pause: async (): Promise<{ success: boolean }> => {
    if (!BackingTrackModuleNative) {
      return { success: false };
    }
    try {
      return await BackingTrackModuleNative.pause();
    } catch (error) {
      console.error('BackingTrackModule.pause error:', error);
      return { success: false };
    }
  },

  stop: async (): Promise<{ success: boolean }> => {
    if (!BackingTrackModuleNative) {
      return { success: false };
    }
    try {
      return await BackingTrackModuleNative.stop();
    } catch (error) {
      console.error('BackingTrackModule.stop error:', error);
      return { success: false };
    }
  },

  seekTo: async (positionMs: number): Promise<BackingTrackResult> => {
    if (!BackingTrackModuleNative) {
      return { success: false, error: 'Backing track module not available' };
    }
    try {
      return await BackingTrackModuleNative.seekTo(positionMs);
    } catch (error) {
      console.error('BackingTrackModule.seekTo error:', error);
      return { success: false, error: String(error) };
    }
  },

  setVolume: (volume: number): { success: boolean; volume: number } => {
    if (!BackingTrackModuleNative) {
      return { success: false, volume: 0 };
    }
    try {
      const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
      return BackingTrackModuleNative.setVolume(normalizedVolume);
    } catch (error) {
      console.error('BackingTrackModule.setVolume error:', error);
      return { success: false, volume: 0 };
    }
  },

  getStatus: (): BackingTrackStatus => {
    if (!BackingTrackModuleNative) {
      return { isLoaded: false, isPlaying: false, currentPositionMs: 0, durationMs: 0, uri: '' };
    }
    try {
      return BackingTrackModuleNative.getStatus();
    } catch (error) {
      console.error('BackingTrackModule.getStatus error:', error);
      return { isLoaded: false, isPlaying: false, currentPositionMs: 0, durationMs: 0, uri: '' };
    }
  },

  release: async (): Promise<{ success: boolean }> => {
    if (!BackingTrackModuleNative) {
      return { success: false };
    }
    try {
      return await BackingTrackModuleNative.release();
    } catch (error) {
      console.error('BackingTrackModule.release error:', error);
      return { success: false };
    }
  },

  getCurrentPosition: (): number => {
    if (!BackingTrackModuleNative) {
      return 0;
    }
    try {
      return BackingTrackModuleNative.getCurrentPosition();
    } catch (error) {
      console.error('BackingTrackModule.getCurrentPosition error:', error);
      return 0;
    }
  },

  getDuration: (): number => {
    if (!BackingTrackModuleNative) {
      return 0;
    }
    try {
      return BackingTrackModuleNative.getDuration();
    } catch (error) {
      console.error('BackingTrackModule.getDuration error:', error);
      return 0;
    }
  },

  getAudioSessionId: (): number => {
    if (!BackingTrackModuleNative) {
      return 0;
    }
    try {
      return BackingTrackModuleNative.getAudioSessionId();
    } catch (error) {
      console.error('BackingTrackModule.getAudioSessionId error:', error);
      return 0;
    }
  }
};

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

// Native Module Instances
let PlaybackEngineModuleNative: PlaybackEngineModuleInterface | null = null;
let EqualizerModuleNative: EqualizerModuleInterface | null = null;
let BassBoostModuleNative: BassBoostModuleInterface | null = null;
let VirtualizerModuleNative: VirtualizerModuleInterface | null = null;

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

let WaveformAnalyzerModuleNative: WaveformAnalyzerModuleInterface | null = null;

if (Platform.OS === 'android') {
  try {
    WaveformAnalyzerModuleNative = requireNativeModule<WaveformAnalyzerModuleInterface>('WaveformAnalyzerModule');
  } catch (e) {
    console.warn('WaveformAnalyzerModule not available:', e);
  }
}

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

let ImmersiveModeEngineModuleNative: ImmersiveModeEngineModuleInterface | null = null;

if (Platform.OS === 'android') {
  try {
    ImmersiveModeEngineModuleNative = requireNativeModule<ImmersiveModeEngineModuleInterface>('ImmersiveModeEngineModule');
  } catch (e) {
    console.warn('ImmersiveModeEngineModule not available:', e);
  }
}

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
        { id: 'music', name: 'Music', description: 'Optimized for music listening with enhanced clarity and bass', icon: 'music' },
        { id: '360_reality', name: '360 Reality', description: 'Immersive 3D spatial audio experience', icon: 'surround-sound' },
        { id: 'gaming', name: 'Gaming', description: 'Enhanced positional audio for gaming with boosted footsteps and effects', icon: 'gamepad-variant' },
        { id: 'podcast', name: 'Podcast', description: 'Voice clarity enhancement for podcasts and audiobooks', icon: 'podcast' },
        { id: 'movie', name: 'Movie', description: 'Cinematic audio with enhanced dialogue and surround effects', icon: 'movie-open' }
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

// FM Radio Module Types
export type FMBandType = 'fm' | 'am';

export interface FMStation {
  frequency: number;
  frequencyMHz: number;
  signalStrength: number;
  bandType: FMBandType;
  simulated?: boolean;
}

export interface FMCapabilities {
  hasFM: boolean;
  hasAM: boolean;
  needsHeadphoneAntenna: boolean;
  hasHeadphoneAntenna: boolean;
  hasEffectsSupport: boolean;
  hasRecordPermission: boolean;
  hasLocationPermission: boolean;
  supportsRDS: boolean;
  frequencyRange: {
    fm: { min: number; max: number; spacing: number };
    am: { min: number; max: number; spacing: number };
  };
}

export interface FMRadioState {
  frequency: number;
  frequencyMHz: number;
  bandType: FMBandType;
  isPlaying: boolean;
  signalStrength: number;
  rdsData: Record<string, any>;
  audioSessionId: number;
  hasHeadphoneAntenna: boolean;
  useDirectPlayback: boolean;
}

export interface FMRadioResult {
  success: boolean;
  error?: string;
  frequency?: number;
  frequencyMHz?: number;
  bandType?: string;
  audioSessionId?: number;
  isPlaying?: boolean;
  alreadyPlaying?: boolean;
  useDirectPlayback?: boolean;
}

export interface FMScanResult {
  success: boolean;
  error?: string;
  stations: FMStation[];
  count: number;
  bandType: FMBandType;
}

export interface FMInitResult {
  success: boolean;
  error?: string;
  hasFMTuner: boolean;
  hasAMTuner: boolean;
  audioSessionId: number;
  needsHeadphoneAntenna: boolean;
  hasHeadphoneAntenna: boolean;
}

interface FMRadioModuleInterface extends NativeModule {
  isAvailable(): boolean;
  initialize(): Promise<FMInitResult>;
  getCapabilities(): Promise<FMCapabilities>;
  scan(bandType: string): Promise<FMScanResult>;
  tune(frequency: number, bandType: string): Promise<FMRadioResult>;
  seekUp(): Promise<FMRadioResult>;
  seekDown(): Promise<FMRadioResult>;
  play(): Promise<FMRadioResult>;
  stop(): Promise<FMRadioResult>;
  getAudioSessionId(): number;
  setVolume(volume: number): { success: boolean; volume: number };
  getCurrentState(): FMRadioState;
  release(): Promise<{ success: boolean }>;
}

let FMRadioModuleNative: FMRadioModuleInterface | null = null;

if (Platform.OS === 'android') {
  try {
    FMRadioModuleNative = requireNativeModule<FMRadioModuleInterface>('FMRadioModule');
  } catch (e) {
    console.warn('FMRadioModule not available:', e);
  }
}

// FMRadio Module Export
export const FMRadioModule = {
  isAvailable: (): boolean => {
    if (!FMRadioModuleNative) {
      return false;
    }
    try {
      return FMRadioModuleNative.isAvailable();
    } catch (error) {
      return false;
    }
  },

  initialize: async (): Promise<FMInitResult> => {
    if (!FMRadioModuleNative) {
      return { 
        success: false, 
        error: 'FM Radio module not available on this platform',
        hasFMTuner: false,
        hasAMTuner: false,
        audioSessionId: 0,
        needsHeadphoneAntenna: true,
        hasHeadphoneAntenna: false
      };
    }
    try {
      return await FMRadioModuleNative.initialize();
    } catch (error) {
      console.error('FMRadioModule.initialize error:', error);
      return { 
        success: false, 
        error: String(error),
        hasFMTuner: false,
        hasAMTuner: false,
        audioSessionId: 0,
        needsHeadphoneAntenna: true,
        hasHeadphoneAntenna: false
      };
    }
  },

  getCapabilities: async (): Promise<FMCapabilities> => {
    if (!FMRadioModuleNative) {
      return {
        hasFM: false,
        hasAM: false,
        needsHeadphoneAntenna: true,
        hasHeadphoneAntenna: false,
        hasEffectsSupport: false,
        hasRecordPermission: false,
        hasLocationPermission: false,
        supportsRDS: false,
        frequencyRange: {
          fm: { min: 87500000, max: 108000000, spacing: 100000 },
          am: { min: 531000, max: 1710000, spacing: 9000 }
        }
      };
    }
    try {
      return await FMRadioModuleNative.getCapabilities();
    } catch (error) {
      console.error('FMRadioModule.getCapabilities error:', error);
      return {
        hasFM: false,
        hasAM: false,
        needsHeadphoneAntenna: true,
        hasHeadphoneAntenna: false,
        hasEffectsSupport: false,
        hasRecordPermission: false,
        hasLocationPermission: false,
        supportsRDS: false,
        frequencyRange: {
          fm: { min: 87500000, max: 108000000, spacing: 100000 },
          am: { min: 531000, max: 1710000, spacing: 9000 }
        }
      };
    }
  },

  scan: async (bandType: FMBandType): Promise<FMScanResult> => {
    if (!FMRadioModuleNative) {
      return { success: false, error: 'FM Radio module not available', stations: [], count: 0, bandType };
    }
    try {
      return await FMRadioModuleNative.scan(bandType);
    } catch (error) {
      console.error('FMRadioModule.scan error:', error);
      return { success: false, error: String(error), stations: [], count: 0, bandType };
    }
  },

  tune: async (frequency: number, bandType: FMBandType): Promise<FMRadioResult> => {
    if (!FMRadioModuleNative) {
      return { success: false, error: 'FM Radio module not available' };
    }
    try {
      return await FMRadioModuleNative.tune(frequency, bandType);
    } catch (error) {
      console.error('FMRadioModule.tune error:', error);
      return { success: false, error: String(error) };
    }
  },

  seekUp: async (): Promise<FMRadioResult> => {
    if (!FMRadioModuleNative) {
      return { success: false, error: 'FM Radio module not available' };
    }
    try {
      return await FMRadioModuleNative.seekUp();
    } catch (error) {
      console.error('FMRadioModule.seekUp error:', error);
      return { success: false, error: String(error) };
    }
  },

  seekDown: async (): Promise<FMRadioResult> => {
    if (!FMRadioModuleNative) {
      return { success: false, error: 'FM Radio module not available' };
    }
    try {
      return await FMRadioModuleNative.seekDown();
    } catch (error) {
      console.error('FMRadioModule.seekDown error:', error);
      return { success: false, error: String(error) };
    }
  },

  play: async (): Promise<FMRadioResult> => {
    if (!FMRadioModuleNative) {
      return { success: false, error: 'FM Radio module not available' };
    }
    try {
      return await FMRadioModuleNative.play();
    } catch (error) {
      console.error('FMRadioModule.play error:', error);
      return { success: false, error: String(error) };
    }
  },

  stop: async (): Promise<FMRadioResult> => {
    if (!FMRadioModuleNative) {
      return { success: false, error: 'FM Radio module not available' };
    }
    try {
      return await FMRadioModuleNative.stop();
    } catch (error) {
      console.error('FMRadioModule.stop error:', error);
      return { success: false, error: String(error) };
    }
  },

  getAudioSessionId: (): number => {
    if (!FMRadioModuleNative) {
      return 0;
    }
    try {
      return FMRadioModuleNative.getAudioSessionId();
    } catch (error) {
      console.error('FMRadioModule.getAudioSessionId error:', error);
      return 0;
    }
  },

  setVolume: (volume: number): { success: boolean; volume: number } => {
    if (!FMRadioModuleNative) {
      return { success: false, volume: 0 };
    }
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      return FMRadioModuleNative.setVolume(clampedVolume);
    } catch (error) {
      console.error('FMRadioModule.setVolume error:', error);
      return { success: false, volume: 0 };
    }
  },

  getCurrentState: (): FMRadioState => {
    if (!FMRadioModuleNative) {
      return {
        frequency: 87500000,
        frequencyMHz: 87.5,
        bandType: 'fm',
        isPlaying: false,
        signalStrength: 0,
        rdsData: {},
        audioSessionId: 0,
        hasHeadphoneAntenna: false,
        useDirectPlayback: true
      };
    }
    try {
      return FMRadioModuleNative.getCurrentState();
    } catch (error) {
      console.error('FMRadioModule.getCurrentState error:', error);
      return {
        frequency: 87500000,
        frequencyMHz: 87.5,
        bandType: 'fm',
        isPlaying: false,
        signalStrength: 0,
        rdsData: {},
        audioSessionId: 0,
        hasHeadphoneAntenna: false,
        useDirectPlayback: true
      };
    }
  },

  release: async (): Promise<{ success: boolean }> => {
    if (!FMRadioModuleNative) {
      return { success: true };
    }
    try {
      return await FMRadioModuleNative.release();
    } catch (error) {
      console.error('FMRadioModule.release error:', error);
      return { success: false };
    }
  }
};
