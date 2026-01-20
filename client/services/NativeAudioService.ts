import { Platform } from 'react-native';
import { 
  PlaybackEngineModule, 
  WaveformAnalyzerModule, 
  ImmersiveModeEngineModule,
  EqualizerModule,
  PlaybackStatus,
  WaveformData,
  FftData,
  ImmersiveMode,
  ImmersiveModeSettings,
  ImmersiveModeInfo
} from '../../modules/audio-effects';

export interface AudioServiceState {
  isInitialized: boolean;
  isPlaying: boolean;
  currentPositionMs: number;
  durationMs: number;
  currentIndex: number;
  queueLength: number;
  repeatMode: 'off' | 'one' | 'all';
  shuffleEnabled: boolean;
  audioSessionId: number;
  immersiveMode: ImmersiveMode;
  isWaveformCapturing: boolean;
}

export interface WaveformCallback {
  (data: WaveformData): void;
}

export interface FftCallback {
  (data: FftData): void;
}

const IS_DEV_MODE = __DEV__ || process.env.NODE_ENV === 'development';

class NativeAudioServiceClass {
  private audioSessionId: number = 0;
  private isInitialized: boolean = false;
  private immersiveMode: ImmersiveMode = 'off';
  private isWaveformCapturing: boolean = false;
  private waveformCallbacks: Set<WaveformCallback> = new Set();
  private fftCallbacks: Set<FftCallback> = new Set();
  private waveformPollingInterval: NodeJS.Timeout | null = null;

  isNativeAvailable(): boolean {
    return Platform.OS === 'android' && PlaybackEngineModule.isAvailable();
  }

  isImmersiveModeAvailable(): boolean {
    if (Platform.OS === 'web' && IS_DEV_MODE) {
      return true;
    }
    return Platform.OS === 'android' && ImmersiveModeEngineModule.isAvailable();
  }

  isWaveformAvailable(): boolean {
    return Platform.OS === 'android' && WaveformAnalyzerModule.isAvailable();
  }

  async initialize(): Promise<{ success: boolean; audioSessionId?: number; error?: string }> {
    if (!this.isNativeAvailable()) {
      return { success: false, error: 'Native audio not available on this platform' };
    }

    try {
      const result = await PlaybackEngineModule.initialize();
      if (result.success) {
        // Get audioSessionId from result, or fetch it if not provided
        if (result.audioSessionId) {
          this.audioSessionId = result.audioSessionId;
        } else {
          // Fallback: get from getStatus if initialize didn't return it
          try {
            const status = await PlaybackEngineModule.getStatus();
            this.audioSessionId = status.audioSessionId || 0;
          } catch {
            this.audioSessionId = 0;
          }
        }
        
        this.isInitialized = true;

        if (this.isImmersiveModeAvailable() && this.audioSessionId > 0) {
          try {
            await ImmersiveModeEngineModule.attach(this.audioSessionId);
          } catch (attachError) {
            console.warn('NativeAudioService: Failed to attach ImmersiveModeEngine:', attachError);
          }
        }

        if (this.isWaveformAvailable() && this.audioSessionId > 0) {
          try {
            await WaveformAnalyzerModule.attach(this.audioSessionId);
          } catch (attachError) {
            console.warn('NativeAudioService: Failed to attach WaveformAnalyzer:', attachError);
          }
        }

        return { success: true, audioSessionId: this.audioSessionId };
      }
      return { success: false, error: result.error || 'Initialization failed' };
    } catch (error) {
      console.error('NativeAudioService.initialize error:', error);
      return { success: false, error: String(error) };
    }
  }

  async setQueue(uris: string[], startIndex: number = 0): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized) {
      const initResult = await this.initialize();
      if (!initResult.success) return initResult;
    }

    try {
      const result = await PlaybackEngineModule.setQueue(uris, startIndex);
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('NativeAudioService.setQueue error:', error);
      return { success: false, error: String(error) };
    }
  }

  async loadTrack(uri: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized) {
      const initResult = await this.initialize();
      if (!initResult.success) return initResult;
    }

    try {
      const result = await PlaybackEngineModule.loadTrack(uri);
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('NativeAudioService.loadTrack error:', error);
      return { success: false, error: String(error) };
    }
  }

  async play(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await PlaybackEngineModule.play();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('NativeAudioService.play error:', error);
      return { success: false, error: String(error) };
    }
  }

  async pause(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await PlaybackEngineModule.pause();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('NativeAudioService.pause error:', error);
      return { success: false, error: String(error) };
    }
  }

  async stop(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await PlaybackEngineModule.stop();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('NativeAudioService.stop error:', error);
      return { success: false, error: String(error) };
    }
  }

  async seekTo(positionMs: number): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await PlaybackEngineModule.seekTo(positionMs);
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('NativeAudioService.seekTo error:', error);
      return { success: false, error: String(error) };
    }
  }

  async skipToNext(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await PlaybackEngineModule.skipToNext();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('NativeAudioService.skipToNext error:', error);
      return { success: false, error: String(error) };
    }
  }

  async skipToPrevious(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await PlaybackEngineModule.skipToPrevious();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('NativeAudioService.skipToPrevious error:', error);
      return { success: false, error: String(error) };
    }
  }

  async skipToIndex(index: number): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await PlaybackEngineModule.skipToIndex(index);
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('NativeAudioService.skipToIndex error:', error);
      return { success: false, error: String(error) };
    }
  }

  async setVolume(volume: number): Promise<{ success: boolean; volume: number }> {
    return PlaybackEngineModule.setVolume(volume);
  }

  async setPlaybackSpeed(speed: number): Promise<{ success: boolean; speed: number }> {
    return PlaybackEngineModule.setPlaybackSpeed(speed);
  }

  async setRepeatMode(mode: 'off' | 'one' | 'all'): Promise<{ success: boolean; mode: string }> {
    return PlaybackEngineModule.setRepeatMode(mode);
  }

  async setShuffleMode(enabled: boolean): Promise<{ success: boolean; shuffle: boolean }> {
    return PlaybackEngineModule.setShuffleMode(enabled);
  }

  async getStatus(): Promise<PlaybackStatus> {
    return PlaybackEngineModule.getStatus();
  }

  getAudioSessionId(): number {
    // Use cached audioSessionId if available, otherwise call sync version
    return this.audioSessionId || 0;
  }

  async getCurrentPosition(): Promise<number> {
    return PlaybackEngineModule.getCurrentPosition();
  }

  async getDuration(): Promise<number> {
    return PlaybackEngineModule.getDuration();
  }

  async setImmersiveMode(mode: ImmersiveMode): Promise<{ success: boolean; error?: string; settings?: ImmersiveModeSettings }> {
    if (!this.isImmersiveModeAvailable()) {
      return { success: false, error: 'Immersive mode not available on this platform' };
    }

    if (Platform.OS === 'web' && IS_DEV_MODE) {
      console.log('[DEV] Simulating immersive mode change to:', mode);
      this.immersiveMode = mode;
      return { 
        success: true, 
        settings: {
          equalizerEnabled: mode !== 'off',
          equalizerBandLevels: []
        }
      };
    }

    try {
      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return { success: false, error: `Failed to initialize audio engine: ${initResult.error || 'Unknown error'}` };
        }
      }

      // Use session ID 0 (global audio output) if no specific session available
      // This allows effects to work with react-native-track-player which doesn't expose its session ID
      const sessionId = this.getAudioSessionId() || 0;

      const currentMode = ImmersiveModeEngineModule.getCurrentMode();
      if (!currentMode.isAttached) {
        const attachResult = await ImmersiveModeEngineModule.attach(sessionId);
        if (!attachResult.success) {
          return { success: false, error: `Failed to attach immersive mode engine: ${attachResult.error || 'Unknown error'}` };
        }
      }

      const result = await ImmersiveModeEngineModule.setMode(mode);
      if (result.success) {
        this.immersiveMode = mode;
      }
      return { success: result.success, error: result.error, settings: result.settings };
    } catch (error) {
      console.error('NativeAudioService.setImmersiveMode error:', error);
      return { success: false, error: String(error) };
    }
  }

  getCurrentImmersiveMode(): { mode: ImmersiveMode; isAttached: boolean; settings: ImmersiveModeSettings } {
    if (Platform.OS === 'web' && IS_DEV_MODE) {
      return {
        mode: this.immersiveMode,
        isAttached: true,
        settings: {
          equalizerEnabled: this.immersiveMode !== 'off',
          equalizerBandLevels: []
        }
      };
    }
    if (!this.isImmersiveModeAvailable()) {
      return {
        mode: 'off',
        isAttached: false,
        settings: {
          equalizerEnabled: false,
          equalizerBandLevels: []
        }
      };
    }
    return ImmersiveModeEngineModule.getCurrentMode();
  }

  getAvailableImmersiveModes(): ImmersiveModeInfo[] {
    if (Platform.OS === 'web' && IS_DEV_MODE) {
      return [
        { id: 'off', name: 'Off', description: 'No audio enhancement', icon: 'volume-off' },
        { id: 'music', name: 'Music', description: 'Balanced for music listening', icon: 'music' },
        { id: '360_reality', name: '360 Reality', description: 'Immersive spatial audio', icon: 'surround-sound' },
        { id: 'gaming', name: 'Gaming', description: 'Enhanced for gaming audio', icon: 'gamepad-variant' },
        { id: 'podcast', name: 'Podcast', description: 'Optimized for voice clarity', icon: 'podcast' },
        { id: 'movie', name: 'Movie', description: 'Cinematic audio experience', icon: 'movie-open' },
      ];
    }
    return ImmersiveModeEngineModule.getAvailableModes();
  }

  async setCustomAudioParameters(
    bassStrength: number,
    virtualizerStrength: number,
    loudnessGain: number,
    eqPreset: number = -1
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isImmersiveModeAvailable()) {
      return { success: false, error: 'Immersive mode not available' };
    }

    try {
      const result = await ImmersiveModeEngineModule.setCustomParameters(
        bassStrength,
        virtualizerStrength,
        loudnessGain,
        eqPreset
      );
      if (result.success) {
        this.immersiveMode = 'custom';
      }
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('NativeAudioService.setCustomAudioParameters error:', error);
      return { success: false, error: String(error) };
    }
  }

  async startWaveformCapture(rateHz: number = 30): Promise<{ success: boolean; error?: string }> {
    if (!this.isWaveformAvailable()) {
      return { success: false, error: 'Waveform analyzer not available on this platform' };
    }

    try {
      const result = await WaveformAnalyzerModule.startCapture(rateHz);
      if (result.success) {
        this.isWaveformCapturing = true;
        this.startWaveformPolling();
      }
      return { success: result.success };
    } catch (error) {
      console.error('NativeAudioService.startWaveformCapture error:', error);
      return { success: false, error: String(error) };
    }
  }

  async stopWaveformCapture(): Promise<{ success: boolean }> {
    this.stopWaveformPolling();
    this.isWaveformCapturing = false;

    if (!this.isWaveformAvailable()) {
      return { success: true };
    }

    try {
      return await WaveformAnalyzerModule.stopCapture();
    } catch (error) {
      console.error('NativeAudioService.stopWaveformCapture error:', error);
      return { success: false };
    }
  }

  private startWaveformPolling(): void {
    if (this.waveformPollingInterval) {
      clearInterval(this.waveformPollingInterval);
    }

    this.waveformPollingInterval = setInterval(() => {
      if (!this.isWaveformCapturing) {
        this.stopWaveformPolling();
        return;
      }

      const waveformData = WaveformAnalyzerModule.getWaveformSnapshot();
      if (waveformData) {
        this.waveformCallbacks.forEach(callback => callback(waveformData));
      }

      const fftData = WaveformAnalyzerModule.getFftSnapshot();
      if (fftData) {
        this.fftCallbacks.forEach(callback => callback(fftData));
      }
    }, 33);
  }

  private stopWaveformPolling(): void {
    if (this.waveformPollingInterval) {
      clearInterval(this.waveformPollingInterval);
      this.waveformPollingInterval = null;
    }
  }

  subscribeToWaveform(callback: WaveformCallback): () => void {
    this.waveformCallbacks.add(callback);
    return () => {
      this.waveformCallbacks.delete(callback);
    };
  }

  subscribeToFft(callback: FftCallback): () => void {
    this.fftCallbacks.add(callback);
    return () => {
      this.fftCallbacks.delete(callback);
    };
  }

  getWaveformSnapshot(): WaveformData | null {
    if (!this.isWaveformAvailable()) {
      return null;
    }
    return WaveformAnalyzerModule.getWaveformSnapshot();
  }

  getFftSnapshot(): FftData | null {
    if (!this.isWaveformAvailable()) {
      return null;
    }
    return WaveformAnalyzerModule.getFftSnapshot();
  }

  async getState(): Promise<AudioServiceState> {
    const status = await this.getStatus();
    const immersiveModeState = this.getCurrentImmersiveMode();

    return {
      isInitialized: this.isInitialized,
      isPlaying: status.isPlaying,
      currentPositionMs: status.currentPositionMs,
      durationMs: status.durationMs,
      currentIndex: status.currentIndex,
      queueLength: status.queueLength,
      repeatMode: status.repeatMode,
      shuffleEnabled: status.shuffleEnabled,
      audioSessionId: status.audioSessionId,
      immersiveMode: immersiveModeState.mode,
      isWaveformCapturing: this.isWaveformCapturing
    };
  }

  async release(): Promise<{ success: boolean }> {
    try {
      this.stopWaveformPolling();
      this.waveformCallbacks.clear();
      this.fftCallbacks.clear();
      this.isWaveformCapturing = false;

      if (this.isWaveformAvailable()) {
        await WaveformAnalyzerModule.release();
      }

      if (this.isImmersiveModeAvailable()) {
        await ImmersiveModeEngineModule.release();
      }

      const result = await PlaybackEngineModule.release();

      this.isInitialized = false;
      this.audioSessionId = 0;
      this.immersiveMode = 'off';

      return result;
    } catch (error) {
      console.error('NativeAudioService.release error:', error);
      return { success: false };
    }
  }
}

export const NativeAudioService = new NativeAudioServiceClass();
export default NativeAudioService;
