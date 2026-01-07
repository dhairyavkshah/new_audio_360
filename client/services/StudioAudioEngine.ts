import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { Platform } from 'react-native';

export type ProgressCallback = (position: number, duration: number) => void;
export type RecordingProgressCallback = (durationMs: number) => void;
export type MeteringCallback = (level: number) => void;

interface AudioEngineState {
  backingTrackLoaded: boolean;
  voiceTrackLoaded: boolean;
  isPlaying: boolean;
  isRecording: boolean;
  isRecordingPaused: boolean;
  musicPosition: number;
  voicePosition: number;
  duration: number;
  musicVolume: number;
  voiceVolume: number;
  voiceGain: number;  // Voice boost/gain (0-200, where 100 is normal)
  syncOffset: number;
  headphonesConnected: boolean;
  peakVoiceLevel: number;  // Track peak level for normalization hints
}

export class StudioAudioEngine {
  private backingTrack: Audio.Sound | null = null;
  private voiceTrack: Audio.Sound | null = null;
  private recording: Audio.Recording | null = null;
  private recordedUri: string | null = null;

  private state: AudioEngineState = {
    backingTrackLoaded: false,
    voiceTrackLoaded: false,
    isPlaying: false,
    isRecording: false,
    isRecordingPaused: false,
    musicPosition: 0,
    voicePosition: 0,
    duration: 0,
    musicVolume: 70,
    voiceVolume: 100,
    voiceGain: 100,  // Normal gain
    syncOffset: 0,
    headphonesConnected: false,
    peakVoiceLevel: -160,
  };

  private progressCallback: ProgressCallback | null = null;
  private recordingProgressCallback: RecordingProgressCallback | null = null;
  private meteringCallback: MeteringCallback | null = null;
  private recordingInterval: NodeJS.Timeout | null = null;
  private meteringInterval: NodeJS.Timeout | null = null;
  private currentMeteringLevel: number = -160;
  private recordingStartTime: number = 0;
  private accumulatedRecordingTime: number = 0;

  async configureAudioMode(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.warn('Failed to configure audio mode:', error);
      if (Platform.OS === 'web') {
        console.log('Web platform: some audio features may be limited');
      }
    }
  }

  /**
   * Convert percentage volume (0-100) to linear audio volume (0-1)
   * Uses logarithmic/exponential curve for perceptually natural volume scaling
   * This is critical for proper mixing - linear scaling sounds unnatural
   */
  private volumeToPerceptual(volume: number, gain: number = 100): number {
    const normalized = Math.max(0, Math.min(100, volume)) / 100;
    const gainMultiplier = Math.max(0, Math.min(200, gain)) / 100;
    
    // Use exponential curve: volume^2 provides natural perceptual loudness
    // This matches how human hearing perceives loudness (Weber-Fechner law)
    const exponentialVolume = normalized * normalized;
    
    // Apply gain boost/cut (allows up to 2x amplification for quiet recordings)
    const finalVolume = exponentialVolume * gainMultiplier;
    
    // Clamp to prevent clipping
    return Math.max(0, Math.min(1, finalVolume));
  }
  
  /**
   * Legacy linear volume conversion for backward compatibility
   */
  private volumeToLinear(volume: number): number {
    return Math.max(0, Math.min(1, volume / 100));
  }

  private handleBackingTrackStatus = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const successStatus = status as AVPlaybackStatusSuccess;
      this.state.musicPosition = successStatus.positionMillis || 0;
      this.state.duration = successStatus.durationMillis || 0;
      this.state.isPlaying = successStatus.isPlaying || false;

      if (this.progressCallback) {
        this.progressCallback(this.state.musicPosition, this.state.duration);
      }

      if (successStatus.didJustFinish) {
        this.state.isPlaying = false;
      }
    }
  };

  private handleVoiceTrackStatus = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const successStatus = status as AVPlaybackStatusSuccess;
      this.state.voicePosition = successStatus.positionMillis || 0;
    }
  };

  async loadBackingTrack(uri: string): Promise<void> {
    try {
      if (this.backingTrack) {
        await this.backingTrack.unloadAsync();
        this.backingTrack = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: false,
          volume: this.volumeToLinear(this.state.musicVolume),
          progressUpdateIntervalMillis: 100,
        },
        this.handleBackingTrackStatus
      );

      this.backingTrack = sound;
      this.state.backingTrackLoaded = true;

      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        this.state.duration = status.durationMillis || 0;
      }
    } catch (error) {
      console.error('Failed to load backing track:', error);
      throw new Error('Failed to load backing track');
    }
  }

  async playBackingTrack(): Promise<void> {
    if (!this.backingTrack || !this.state.backingTrackLoaded) {
      console.warn('No backing track loaded');
      return;
    }

    try {
      await this.backingTrack.playAsync();
      this.state.isPlaying = true;
    } catch (error) {
      console.error('Failed to play backing track:', error);
    }
  }

  async pauseBackingTrack(): Promise<void> {
    if (!this.backingTrack) return;

    try {
      await this.backingTrack.pauseAsync();
      this.state.isPlaying = false;
    } catch (error) {
      console.error('Failed to pause backing track:', error);
    }
  }

  async stopBackingTrack(): Promise<void> {
    if (!this.backingTrack) return;

    try {
      await this.backingTrack.stopAsync();
      await this.backingTrack.setPositionAsync(0);
      this.state.isPlaying = false;
      this.state.musicPosition = 0;
    } catch (error) {
      console.error('Failed to stop backing track:', error);
    }
  }

  async seekBackingTrack(positionMs: number): Promise<void> {
    if (!this.backingTrack) return;

    try {
      const clampedPosition = Math.max(0, Math.min(positionMs, this.state.duration));
      await this.backingTrack.setPositionAsync(clampedPosition);
      this.state.musicPosition = clampedPosition;
    } catch (error) {
      console.error('Failed to seek backing track:', error);
    }
  }

  setMusicVolume(volume: number): void {
    this.state.musicVolume = Math.max(0, Math.min(100, volume));
    
    if (this.backingTrack) {
      this.backingTrack.setVolumeAsync(this.volumeToLinear(this.state.musicVolume)).catch((error) => {
        console.error('Failed to set music volume:', error);
      });
    }
  }

  async startRecording(): Promise<void> {
    try {
      await this.configureAudioMode();

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch {}
        this.recording = null;
      }

      // Optimized recording settings based on Smule/professional karaoke app research:
      // - Mono recording (voice only comes from single mic)
      // - 44.1kHz sample rate (CD quality)
      // - iOS bitrate capped at 64000 to prevent crashes (known expo-av issue)
      // - High quality AAC encoding for small file size with good quality
      const recordingOptions: Audio.RecordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,  // Mono for voice (single mic input)
          bitRate: 128000,      // 128kbps for high quality voice
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,  // Maximum quality
          sampleRate: 44100,
          numberOfChannels: 1,  // Mono for voice (single mic input)
          bitRate: 64000,       // iOS AAC crashes with bitRate > 64000
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      this.recording = recording;
      this.state.isRecording = true;
      this.state.isRecordingPaused = false;
      this.recordedUri = null;
      this.state.peakVoiceLevel = -160;  // Reset peak level for new recording

      this.recordingStartTime = Date.now();
      this.accumulatedRecordingTime = 0;
      
      if (this.recordingProgressCallback) {
        this.recordingInterval = setInterval(() => {
          const elapsed = this.accumulatedRecordingTime + (Date.now() - this.recordingStartTime);
          this.recordingProgressCallback?.(elapsed);
        }, 100);
      }

      this.startMeteringUpdates();

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.state.isRecording = false;
      throw error;
    }
  }

  private async startMeteringUpdates(): Promise<void> {
    if (this.meteringInterval) {
      clearInterval(this.meteringInterval);
    }

    this.meteringInterval = setInterval(async () => {
      if (this.recording && this.state.isRecording && !this.state.isRecordingPaused) {
        try {
          const status = await this.recording.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            this.currentMeteringLevel = status.metering;
            this.meteringCallback?.(status.metering);
            
            // Track peak level for normalization recommendations
            if (status.metering > this.state.peakVoiceLevel) {
              this.state.peakVoiceLevel = status.metering;
            }
          }
        } catch (error) {
          // Silent fail - metering is optional
        }
      }
    }, 50);
  }

  private stopMeteringUpdates(): void {
    if (this.meteringInterval) {
      clearInterval(this.meteringInterval);
      this.meteringInterval = null;
    }
    this.currentMeteringLevel = -160;
  }

  async pauseRecording(): Promise<void> {
    if (!this.recording || !this.state.isRecording) {
      console.warn('No active recording to pause');
      return;
    }

    try {
      this.accumulatedRecordingTime += Date.now() - this.recordingStartTime;
      
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }
      
      await this.recording.pauseAsync();
      this.state.isRecordingPaused = true;
      
      if (this.backingTrack) {
        await this.backingTrack.pauseAsync();
      }
      
      this.stopMeteringUpdates();
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  }

  async resumeRecording(): Promise<void> {
    if (!this.recording || !this.state.isRecording || !this.state.isRecordingPaused) {
      console.warn('No paused recording to resume');
      return;
    }

    try {
      await this.recording.startAsync();
      this.state.isRecordingPaused = false;
      this.recordingStartTime = Date.now();
      
      if (this.recordingProgressCallback) {
        this.recordingInterval = setInterval(() => {
          const elapsed = this.accumulatedRecordingTime + (Date.now() - this.recordingStartTime);
          this.recordingProgressCallback?.(elapsed);
        }, 100);
      }
      
      if (this.backingTrack) {
        await this.backingTrack.playAsync();
      }
      
      this.startMeteringUpdates();
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.recording) {
      throw new Error('No active recording');
    }

    try {
      this.stopMeteringUpdates();
      
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.recording = null;
      this.state.isRecording = false;
      this.state.isRecordingPaused = false;
      this.accumulatedRecordingTime = 0;
      this.recordingStartTime = 0;
      
      if (!uri) {
        throw new Error('Recording URI is null');
      }

      this.recordedUri = uri;
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.state.isRecording = false;
      this.state.isRecordingPaused = false;
      throw error;
    }
  }

  async loadVoiceTrack(uri: string): Promise<void> {
    try {
      if (this.voiceTrack) {
        await this.voiceTrack.unloadAsync();
        this.voiceTrack = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: false,
          volume: this.volumeToLinear(this.state.voiceVolume),
          progressUpdateIntervalMillis: 100,
        },
        this.handleVoiceTrackStatus
      );

      this.voiceTrack = sound;
      this.state.voiceTrackLoaded = true;
    } catch (error) {
      console.error('Failed to load voice track:', error);
      throw new Error('Failed to load voice track');
    }
  }

  async playMix(): Promise<void> {
    if (!this.backingTrack && !this.voiceTrack) {
      console.warn('No tracks loaded for mixing');
      return;
    }

    try {
      const offset = this.state.syncOffset;
      
      if (offset === 0) {
        const playPromises: Promise<AVPlaybackStatus>[] = [];
        if (this.backingTrack) playPromises.push(this.backingTrack.playAsync());
        if (this.voiceTrack) playPromises.push(this.voiceTrack.playAsync());
        await Promise.all(playPromises);
      } else if (offset > 0) {
        if (this.backingTrack) await this.backingTrack.playAsync();
        if (this.voiceTrack) {
          setTimeout(async () => {
            await this.voiceTrack?.playAsync();
          }, offset);
        }
      } else {
        if (this.voiceTrack) await this.voiceTrack.playAsync();
        if (this.backingTrack) {
          setTimeout(async () => {
            await this.backingTrack?.playAsync();
          }, Math.abs(offset));
        }
      }

      this.state.isPlaying = true;
    } catch (error) {
      console.error('Failed to play mix:', error);
    }
  }

  async pauseMix(): Promise<void> {
    try {
      const pausePromises: Promise<AVPlaybackStatus>[] = [];
      if (this.backingTrack) pausePromises.push(this.backingTrack.pauseAsync());
      if (this.voiceTrack) pausePromises.push(this.voiceTrack.pauseAsync());
      await Promise.all(pausePromises);
      this.state.isPlaying = false;
    } catch (error) {
      console.error('Failed to pause mix:', error);
    }
  }

  async stopMix(): Promise<void> {
    try {
      const stopPromises: Promise<AVPlaybackStatus>[] = [];
      
      if (this.backingTrack) {
        await this.backingTrack.stopAsync();
        stopPromises.push(this.backingTrack.setPositionAsync(0));
      }
      if (this.voiceTrack) {
        await this.voiceTrack.stopAsync();
        stopPromises.push(this.voiceTrack.setPositionAsync(0));
      }
      
      await Promise.all(stopPromises);
      this.state.isPlaying = false;
      this.state.musicPosition = 0;
      this.state.voicePosition = 0;
    } catch (error) {
      console.error('Failed to stop mix:', error);
    }
  }

  setVoiceVolume(volume: number): void {
    this.state.voiceVolume = Math.max(0, Math.min(100, volume));
    
    if (this.voiceTrack) {
      // Use perceptual volume scaling with voice gain for natural loudness
      const perceptualVolume = this.volumeToPerceptual(this.state.voiceVolume, this.state.voiceGain);
      this.voiceTrack.setVolumeAsync(perceptualVolume).catch((error) => {
        console.error('Failed to set voice volume:', error);
      });
    }
  }

  /**
   * Set voice gain/boost (0-200, where 100 is normal, 200 is 2x amplification)
   * Use this to boost quiet recordings so they're not drowned out by backing track
   */
  setVoiceGain(gain: number): void {
    this.state.voiceGain = Math.max(0, Math.min(200, gain));
    
    // Re-apply voice volume with new gain
    if (this.voiceTrack) {
      const perceptualVolume = this.volumeToPerceptual(this.state.voiceVolume, this.state.voiceGain);
      this.voiceTrack.setVolumeAsync(perceptualVolume).catch((error) => {
        console.error('Failed to apply voice gain:', error);
      });
    }
  }

  getVoiceGain(): number {
    return this.state.voiceGain;
  }

  /**
   * Set headphones connected status
   * When true, audio routes through headphones for monitoring
   * When false, backing track plays quieter through speaker to reduce mic bleed
   */
  setHeadphonesConnected(connected: boolean): void {
    this.state.headphonesConnected = connected;
    
    // Adjust backing track volume based on headphone state during recording
    // Without headphones, lower the music to reduce bleed into mic
    if (this.state.isRecording && this.backingTrack) {
      const musicVolume = connected 
        ? this.state.musicVolume 
        : Math.min(40, this.state.musicVolume); // Max 40% without headphones
      this.backingTrack.setVolumeAsync(this.volumeToLinear(musicVolume)).catch(console.error);
    }
  }

  isHeadphonesConnected(): boolean {
    return this.state.headphonesConnected;
  }

  /**
   * Get peak voice level detected during recording (for normalization hints)
   */
  getPeakVoiceLevel(): number {
    return this.state.peakVoiceLevel;
  }

  /**
   * Calculate recommended voice gain based on peak level during recording
   * Returns a gain value (100-200) to normalize quiet recordings
   */
  getRecommendedVoiceGain(): number {
    const peakDb = this.state.peakVoiceLevel;
    
    // Ideal peak level is around -6 to -3 dB (leaving headroom)
    // If peak is lower, calculate boost needed
    const targetPeak = -6;
    const boostNeeded = targetPeak - peakDb;
    
    if (boostNeeded <= 0) {
      return 100; // No boost needed, already loud enough
    }
    
    // Convert dB boost to linear gain multiplier
    // +6dB ≈ 2x volume, so max boost of 6dB = gain of 200
    const gainMultiplier = Math.pow(10, boostNeeded / 20);
    const gain = Math.min(200, Math.round(gainMultiplier * 100));
    
    return gain;
  }

  setSyncOffset(offsetMs: number): void {
    const clampedOffset = Math.max(-200, Math.min(200, offsetMs));
    const roundedOffset = Math.round(clampedOffset / 10) * 10;
    this.state.syncOffset = roundedOffset;
  }

  getMusicPosition(): number {
    return this.state.musicPosition;
  }

  getVoicePosition(): number {
    return this.state.voicePosition;
  }

  getDuration(): number {
    return this.state.duration;
  }

  getMusicVolume(): number {
    return this.state.musicVolume;
  }

  getVoiceVolume(): number {
    return this.state.voiceVolume;
  }

  getSyncOffset(): number {
    return this.state.syncOffset;
  }

  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  isRecording(): boolean {
    return this.state.isRecording;
  }

  isBackingTrackLoaded(): boolean {
    return this.state.backingTrackLoaded;
  }

  isVoiceTrackLoaded(): boolean {
    return this.state.voiceTrackLoaded;
  }

  getRecordedUri(): string | null {
    return this.recordedUri;
  }

  setProgressCallback(callback: ProgressCallback | null): void {
    this.progressCallback = callback;
  }

  setRecordingProgressCallback(callback: RecordingProgressCallback | null): void {
    this.recordingProgressCallback = callback;
  }

  setMeteringCallback(callback: MeteringCallback | null): void {
    this.meteringCallback = callback;
  }

  getCurrentMeteringLevel(): number {
    return this.currentMeteringLevel;
  }

  async seekMix(positionMs: number): Promise<void> {
    const clampedPosition = Math.max(0, Math.min(positionMs, this.state.duration));
    
    try {
      const seekPromises: Promise<AVPlaybackStatus>[] = [];
      
      if (this.backingTrack) {
        seekPromises.push(this.backingTrack.setPositionAsync(clampedPosition));
      }
      
      if (this.voiceTrack) {
        const voicePosition = Math.max(0, clampedPosition + this.state.syncOffset);
        seekPromises.push(this.voiceTrack.setPositionAsync(voicePosition));
      }
      
      await Promise.all(seekPromises);
      this.state.musicPosition = clampedPosition;
    } catch (error) {
      console.error('Failed to seek mix:', error);
    }
  }

  async unloadAll(): Promise<void> {
    try {
      this.stopMeteringUpdates();
      
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch {}
        this.recording = null;
      }

      if (this.backingTrack) {
        await this.backingTrack.unloadAsync();
        this.backingTrack = null;
      }

      if (this.voiceTrack) {
        await this.voiceTrack.unloadAsync();
        this.voiceTrack = null;
      }

      this.state = {
        backingTrackLoaded: false,
        voiceTrackLoaded: false,
        isPlaying: false,
        isRecording: false,
        isRecordingPaused: false,
        musicPosition: 0,
        voicePosition: 0,
        duration: 0,
        musicVolume: 70,
        voiceVolume: 100,
        voiceGain: 100,
        syncOffset: 0,
        headphonesConnected: false,
        peakVoiceLevel: -160,
      };

      this.progressCallback = null;
      this.recordingProgressCallback = null;
      this.recordedUri = null;
    } catch (error) {
      console.error('Failed to unload audio resources:', error);
    }
  }

  async startRecordingWithBackingTrack(): Promise<void> {
    await this.startRecording();
    await this.playBackingTrack();
  }

  async stopRecordingWithBackingTrack(): Promise<string> {
    await this.stopBackingTrack();
    return await this.stopRecording();
  }
}

export const studioAudioEngine = new StudioAudioEngine();
