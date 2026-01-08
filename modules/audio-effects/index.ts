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

let ReverbModuleNative: ReverbModuleInterface | null = null;
let NoiseReductionModuleNative: NoiseReductionModuleInterface | null = null;
let AudioMixerModuleNative: AudioMixerModuleInterface | null = null;

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
      return await AudioMixerModuleNative.mixAndExport(
        backingTrackUri,
        voiceTrackUri,
        outputFileName,
        musicVolume / 100,
        voiceVolume / 100,
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
