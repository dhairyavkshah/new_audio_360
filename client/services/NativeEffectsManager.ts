import { Platform } from 'react-native';
import { 
  EqualizerModule, 
  EqualizerAttachResult 
} from 'audio-effects';
import type { EQBands, SoundLabMode } from '@/contexts/SoundLabContext';

export type AudioSessionSource = 'music' | 'radio' | 'none';

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

    // Only attach Equalizer - NO BassBoost or Virtualizer
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
      // Only attach Equalizer - NO BassBoost or Virtualizer
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
    // Only release Equalizer - no other effects
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

  applySettings(mode: SoundLabMode, eqBands: EQBands): void {
    if (!this.isInitialized || !this.isAvailable()) return;

    if (mode === 'equalizer' && this.equalizerAttached) {
      this.applyEqualizer(eqBands);
    } else {
      this.disableEqualizer();
    }
  }

  private applyEqualizer(eqBands: EQBands): void {
    if (!this.equalizerAttached) return;

    EqualizerModule.setEnabled(true);

    const numBands = this.equalizerInfo?.numberOfBands || 5;
    // Conservative conversion: user units (-8 to +8) to millibels
    // Using 50 millibels per unit gives range of -400 to +400 millibels
    // which is well within typical hardware limits of -1500 to +1500
    const MB_PER_UNIT = 50;

    const rawBands: number[] = [];
    
    if (numBands >= 5) {
      rawBands.push((eqBands.sub + eqBands.bass) / 2);
      rawBands.push(eqBands.lowMid);
      rawBands.push(eqBands.mid);
      rawBands.push(eqBands.highMid);
      rawBands.push((eqBands.treble + eqBands.brilliance) / 2);
    }

    for (let i = 5; i < numBands; i++) {
      rawBands.push(0);
    }

    // Zero-sum balancing to prevent overall volume change
    const sum = rawBands.reduce((acc, v) => acc + v, 0);
    const offset = sum / rawBands.length;
    const balancedBands = rawBands.map(v => v - offset);

    // Convert to millibels with symmetric clamping
    // Use hardware limits if available, otherwise conservative defaults
    const minLevel = this.equalizerInfo?.minLevel ?? -1500;
    const maxLevel = this.equalizerInfo?.maxLevel ?? 1500;
    
    const bandValues = balancedBands.map(v => {
      const millibels = Math.round(v * MB_PER_UNIT);
      return Math.max(minLevel, Math.min(maxLevel, millibels));
    });

    console.log('[NativeEffectsManager] Applying EQ:', { input: rawBands, balanced: balancedBands, millibels: bandValues });
    EqualizerModule.setCustomBands(bandValues);
  }

  private disableEqualizer(): void {
    if (this.equalizerAttached) {
      EqualizerModule.setEnabled(false);
    }
  }

  getEqualizerInfo(): EqualizerAttachResult | null {
    return this.equalizerInfo;
  }

  /**
   * Apply 5-band EQ values directly (for use with Sound Lab presets and custom EQ)
   * Band values should be in range -8 to +8 (user units)
   */
  applyFiveBandEQ(bands: number[]): void {
    if (!this.isAvailable() || !this.equalizerAttached) {
      console.log('[NativeEffectsManager] Cannot apply 5-band EQ - not available or not attached');
      return;
    }

    EqualizerModule.setEnabled(true);

    // Conservative conversion: user units (-8 to +8) to millibels
    // Using 50 millibels per unit gives range of -400 to +400 millibels
    const MB_PER_UNIT = 50;
    const numBands = this.equalizerInfo?.numberOfBands || 5;

    // Copy and pad if needed
    const rawBands = [...bands];
    while (rawBands.length < numBands) {
      rawBands.push(0);
    }

    // Zero-sum balancing to prevent overall volume change
    const sum = rawBands.reduce((acc, v) => acc + v, 0);
    const offset = sum / rawBands.length;
    const balancedBands = rawBands.map(v => v - offset);

    // Convert to millibels with symmetric clamping using hardware limits
    const minLevel = this.equalizerInfo?.minLevel ?? -1500;
    const maxLevel = this.equalizerInfo?.maxLevel ?? 1500;
    
    const bandValues = balancedBands.map(v => {
      const millibels = Math.round(v * MB_PER_UNIT);
      return Math.max(minLevel, Math.min(maxLevel, millibels));
    });

    console.log('[NativeEffectsManager] Applying 5-band EQ:', { input: bands, balanced: balancedBands, millibels: bandValues });
    EqualizerModule.setCustomBands(bandValues);
  }

  /**
   * Disable the equalizer
   */
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
