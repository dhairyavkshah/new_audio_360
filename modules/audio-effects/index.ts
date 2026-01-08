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
