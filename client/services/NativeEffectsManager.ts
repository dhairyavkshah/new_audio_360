import { Platform } from 'react-native';
import { 
  EqualizerModule, 
  EqualizerAttachResult 
} from 'audio-effects';
import type { SoundLabMode } from '@/contexts/SoundLabContext';

export type AudioSessionSource = 'music' | 'radio' | 'software' | 'none';

class NativeEffectsManagerClass {
  private isInitialized = false;
  private audioSessionId: number = 0;
  private equalizerAttached = false;
  private equalizerInfo: EqualizerAttachResult | null = null;
  private currentSource: AudioSessionSource = 'none';
  private musicSessionId: number = 0;
  private radioSessionId: number = 0;

  isAvailable(): boolean {
    return Platform.OS === 'android' && EqualizerModule.isAvailable();
  }

  async attach(audioSessionId: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    this.audioSessionId = audioSessionId;
    this.musicSessionId = audioSessionId;
    this.currentSource = 'music';

    const eqResult = await EqualizerModule.attach(audioSessionId);

    this.equalizerAttached = eqResult.success;
    this.equalizerInfo = eqResult;
    this.isInitialized = true;

    console.log('[NativeEffectsManager] Attached equalizer only:', {
      equalizer: this.equalizerAttached,
      bands: eqResult.numberOfBands,
      presets: eqResult.presets,
      source: this.currentSource
    });

    return this.equalizerAttached;
  }

  async attachToRadioSession(sessionId: number): Promise<boolean> {
    if (!this.isAvailable() || sessionId === 0) {
      console.log('[NativeEffectsManager] Cannot attach to radio session - not available or invalid session');
      return false;
    }

    if (this.currentSource === 'radio' && this.radioSessionId === sessionId && this.isInitialized) {
      console.log('[NativeEffectsManager] Already attached to this radio session');
      return true;
    }

    if (this.isInitialized && this.currentSource === 'music') {
      console.log('[NativeEffectsManager] Switching from music to radio session');
    }

    await this.releaseInternal();

    try {
      const eqResult = await EqualizerModule.attach(sessionId);

      this.equalizerAttached = eqResult.success;
      this.equalizerInfo = eqResult;

      if (this.equalizerAttached) {
        this.audioSessionId = sessionId;
        this.radioSessionId = sessionId;
        this.currentSource = 'radio';
        this.isInitialized = true;

        console.log('[NativeEffectsManager] Attached to radio session:', {
          sessionId,
          equalizer: this.equalizerAttached,
          bands: eqResult.numberOfBands
        });
      } else {
        console.log('[NativeEffectsManager] Failed to attach equalizer to radio session');
        this.audioSessionId = 0;
        this.radioSessionId = 0;
        this.currentSource = 'none';
        this.isInitialized = false;
      }

      return this.equalizerAttached;
    } catch (error) {
      console.error('[NativeEffectsManager] Error attaching to radio session:', error);
      this.audioSessionId = 0;
      this.radioSessionId = 0;
      this.currentSource = 'none';
      this.isInitialized = false;
      this.equalizerAttached = false;
      return false;
    }
  }

  async detachFromRadioSession(): Promise<void> {
    if (this.currentSource !== 'radio') {
      console.log('[NativeEffectsManager] Not attached to radio session');
      return;
    }

    console.log('[NativeEffectsManager] Detaching from radio session');
    await this.releaseInternal();
    this.radioSessionId = 0;
    this.currentSource = 'none';

    if (this.musicSessionId > 0) {
      console.log('[NativeEffectsManager] Re-attaching to music session:', this.musicSessionId);
      await this.attach(this.musicSessionId);
    }
  }

  private async releaseInternal(): Promise<void> {
    await EqualizerModule.release();
    this.isInitialized = false;
    this.equalizerAttached = false;
    this.audioSessionId = 0;
  }

  getCurrentSource(): AudioSessionSource {
    return this.currentSource;
  }

  isAttachedToRadio(): boolean {
    return this.currentSource === 'radio' && this.isInitialized;
  }

  isEffectsActive(): boolean {
    return this.isInitialized && this.equalizerAttached;
  }

  applySettings(mode: SoundLabMode, eqBands: number[]): void {
    if (!this.isInitialized || !this.isAvailable()) return;

    if (mode === 'equalizer' && this.equalizerAttached) {
      this.applyTenBandEQ(eqBands);
    } else {
      this.disableEqualizer();
    }
  }

  private applyTenBandEQ(bands: number[]): void {
    if (!this.equalizerAttached) return;

    const allZero = bands.every(v => v === 0);
    if (allZero) {
      EqualizerModule.setEnabled(false);
      console.log('[NativeEffectsManager] All EQ bands at 0 - EQ disabled (pure passthrough)');
      return;
    }

    EqualizerModule.setEnabled(true);
    EqualizerModule.setEqBands(bands);
    console.log('[NativeEffectsManager] Applied 10-band EQ:', bands);
  }

  private disableEqualizer(): void {
    if (this.equalizerAttached) {
      EqualizerModule.setEnabled(false);
    }
  }

  getEqualizerInfo(): EqualizerAttachResult | null {
    return this.equalizerInfo;
  }

  applyFiveBandEQ(bands: number[]): void {
    if (!this.isAvailable() || !this.equalizerAttached) {
      console.log('[NativeEffectsManager] Cannot apply 5-band EQ - not available or not attached');
      return;
    }

    const tenBand = [
      bands[0] || 0,
      bands[0] || 0,
      bands[1] || 0,
      bands[1] || 0,
      bands[2] || 0,
      bands[2] || 0,
      bands[3] || 0,
      bands[3] || 0,
      bands[4] || 0,
      bands[4] || 0,
    ];

    const allZero = tenBand.every(v => v === 0);
    if (allZero) {
      EqualizerModule.setEnabled(false);
      console.log('[NativeEffectsManager] All EQ bands at 0 - EQ disabled (pure passthrough)');
      return;
    }

    EqualizerModule.setEnabled(true);
    EqualizerModule.setEqBands(tenBand);
    console.log('[NativeEffectsManager] Applied 5-band EQ mapped to 10-band:', tenBand);
  }

  disableEQ(): void {
    this.disableEqualizer();
  }

  async release(): Promise<void> {
    await this.releaseInternal();
    this.musicSessionId = 0;
    this.radioSessionId = 0;
    this.currentSource = 'none';
  }
}

export const NativeEffectsManager = new NativeEffectsManagerClass();
