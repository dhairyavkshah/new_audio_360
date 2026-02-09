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
import { getDeviceCapabilities } from '@/lib/deviceCapabilities';

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
      if (result.success && result.audioSessionId) {
        this.audioSessionId = result.audioSessionId;
        this.isInitialized = true;

        if (this.isImmersiveModeAvailable()) {
          await ImmersiveModeEngineModule.attach(this.audioSessionId);
        }

        if (this.isWaveformAvailable()) {
          console.log('[NativeAudioService] Waveform analyzer available, will attach when capture starts');
        }

        return { success: true, audioSessionId: this.audioSessionId };
      }
      return { success: false, error: result.error };
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

  setVolume(volume: number): { success: boolean; volume: number } {
    if (!this.isNativeAvailable()) {
      return { success: false, volume };
    }
    return PlaybackEngineModule.setVolume(volume);
  }

  setPlaybackSpeed(speed: number): { success: boolean; speed: number } {
    if (!this.isNativeAvailable()) {
      return { success: false, speed };
    }
    return PlaybackEngineModule.setPlaybackSpeed(speed);
  }

  setRepeatMode(mode: 'off' | 'one' | 'all'): { success: boolean; mode: string } {
    if (!this.isNativeAvailable()) {
      return { success: false, mode };
    }
    return PlaybackEngineModule.setRepeatMode(mode);
  }

  setShuffleMode(enabled: boolean): { success: boolean; shuffle: boolean } {
    if (!this.isNativeAvailable()) {
      return { success: false, shuffle: enabled };
    }
    return PlaybackEngineModule.setShuffleMode(enabled);
  }

  getStatus(): PlaybackStatus {
    if (!this.isNativeAvailable()) {
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
        audioSessionId: 0,
        sampleBasedPositionMs: 0,
        trackEnded: false,
      };
    }
    return PlaybackEngineModule.getStatus();
  }

  getAudioSessionId(): number {
    if (!this.isNativeAvailable()) {
      return 0;
    }
    return this.audioSessionId || PlaybackEngineModule.getAudioSessionId();
  }

  getCurrentPosition(): number {
    if (!this.isNativeAvailable()) {
      return 0;
    }
    return PlaybackEngineModule.getCurrentPosition();
  }

  getDuration(): number {
    if (!this.isNativeAvailable()) {
      return 0;
    }
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
    loudnessGain: number,
    eqPreset: number = -1
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isImmersiveModeAvailable()) {
      return { success: false, error: 'Immersive mode not available' };
    }

    try {
      const result = await ImmersiveModeEngineModule.setCustomParameters(
        bassStrength,
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

  async startWaveformCapture(rateHz?: number): Promise<{ success: boolean; error?: string }> {
    if (!this.isWaveformAvailable()) {
      return { success: false, error: 'Waveform analyzer not available on this platform' };
    }

    try {
      const status = this.getStatus();
      if (!status.isPlaying) {
        return { success: false, error: 'Cannot start waveform capture: audio not playing' };
      }

      const sessionId = this.getAudioSessionId();
      if (sessionId > 0) {
        await WaveformAnalyzerModule.attach(sessionId);
      }

      let captureRate = rateHz;
      
      if (captureRate === undefined) {
        const capabilities = await getDeviceCapabilities();
        captureRate = capabilities.recommendedWaveformRate;
        
        if (capabilities.memory.memoryClass === 'low') {
          console.warn('[NativeAudioService] Low-memory device detected: using adaptive waveform rate of 20Hz to conserve resources');
        }
      }
      
      const result = await WaveformAnalyzerModule.startCapture(captureRate);
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

  getState(): AudioServiceState {
    const status = this.getStatus();
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

      if (this.isImmersiveModeAvailable() && Platform.OS === 'android') {
        await ImmersiveModeEngineModule.release();
      }

      if (this.isNativeAvailable()) {
        await PlaybackEngineModule.release();
      }

      this.isInitialized = false;
      this.audioSessionId = 0;
      this.immersiveMode = 'off';

      return { success: true };
    } catch (error) {
      console.error('NativeAudioService.release error:', error);
      return { success: false };
    }
  }
}

export const NativeAudioService = new NativeAudioServiceClass();
export default NativeAudioService;
