import { Platform } from 'react-native';
import { 
  EqualizerModule, 
  BassBoostModule, 
  VirtualizerModule,
  EqualizerAttachResult 
} from 'audio-effects';
import type { EQBands, SoundLabMode } from '@/contexts/SoundLabContext';

interface ImmersiveEffect {
  reverb: number;
  delay: number;
  stereoWidth: number;
}

export type AudioSessionSource = 'music' | 'radio' | 'none';

// EQ constants
const MB_PER_UNIT = 35; // millibels per EQ unit

class NativeEffectsManagerClass {
  private isInitialized = false;
  private audioSessionId: number = 0;
  private equalizerAttached = false;
  private bassBoostAttached = false;
  private virtualizerAttached = false;
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

    // Session ID 0 = global audio output mix (applies to all audio)
    // Session ID > 0 = specific player's audio session
    this.audioSessionId = audioSessionId;
    this.musicSessionId = audioSessionId;
    this.currentSource = 'music';

    const [eqResult, bassResult, virtResult] = await Promise.all([
      EqualizerModule.attach(audioSessionId),
      BassBoostModule.attach(audioSessionId),
      VirtualizerModule.attach(audioSessionId)
    ]);

    this.equalizerAttached = eqResult.success;
    this.bassBoostAttached = bassResult.success;
    this.virtualizerAttached = virtResult.success;
    this.equalizerInfo = eqResult;
    this.isInitialized = true;

    console.log('[NativeEffectsManager] Attached effects:', {
      equalizer: this.equalizerAttached,
      bassBoost: this.bassBoostAttached,
      virtualizer: this.virtualizerAttached,
      bands: eqResult.numberOfBands,
      presets: eqResult.presets,
      source: this.currentSource
    });

    return this.equalizerAttached || this.bassBoostAttached || this.virtualizerAttached;
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
      const [eqResult, bassResult, virtResult] = await Promise.all([
        EqualizerModule.attach(sessionId),
        BassBoostModule.attach(sessionId),
        VirtualizerModule.attach(sessionId)
      ]);

      this.equalizerAttached = eqResult.success;
      this.bassBoostAttached = bassResult.success;
      this.virtualizerAttached = virtResult.success;
      this.equalizerInfo = eqResult;

      const anyAttached = this.equalizerAttached || this.bassBoostAttached || this.virtualizerAttached;

      if (anyAttached) {
        this.audioSessionId = sessionId;
        this.radioSessionId = sessionId;
        this.currentSource = 'radio';
        this.isInitialized = true;

        console.log('[NativeEffectsManager] Attached to radio session:', {
          sessionId,
          equalizer: this.equalizerAttached,
          bassBoost: this.bassBoostAttached,
          virtualizer: this.virtualizerAttached,
          bands: eqResult.numberOfBands
        });
      } else {
        console.log('[NativeEffectsManager] Failed to attach any effects to radio session');
        this.audioSessionId = 0;
        this.radioSessionId = 0;
        this.currentSource = 'none';
        this.isInitialized = false;
      }

      return anyAttached;
    } catch (error) {
      console.error('[NativeEffectsManager] Error attaching to radio session:', error);
      this.audioSessionId = 0;
      this.radioSessionId = 0;
      this.currentSource = 'none';
      this.isInitialized = false;
      this.equalizerAttached = false;
      this.bassBoostAttached = false;
      this.virtualizerAttached = false;
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
    await Promise.all([
      EqualizerModule.release(),
      BassBoostModule.release(),
      VirtualizerModule.release()
    ]);
    this.isInitialized = false;
    this.equalizerAttached = false;
    this.bassBoostAttached = false;
    this.virtualizerAttached = false;
    this.audioSessionId = 0;
  }

  getCurrentSource(): AudioSessionSource {
    return this.currentSource;
  }

  isAttachedToRadio(): boolean {
    return this.currentSource === 'radio' && this.isInitialized;
  }

  isEffectsActive(): boolean {
    return this.isInitialized && (this.equalizerAttached || this.bassBoostAttached || this.virtualizerAttached);
  }

  applySettings(mode: SoundLabMode, eqBands: EQBands, immersiveEffect: ImmersiveEffect): void {
    if (!this.isInitialized || !this.isAvailable()) return;

    if (mode === 'equalizer' && this.equalizerAttached) {
      this.applyEqualizer(eqBands);
      this.disableImmersive();
    } else if (mode === 'immersive') {
      this.applyImmersive(immersiveEffect);
      this.disableEqualizer();
    } else {
      this.disableEqualizer();
      this.disableImmersive();
    }
  }

  private applyEqualizer(eqBands: EQBands): void {
    if (!this.equalizerAttached) return;

    EqualizerModule.setEnabled(true);

    const numBands = this.equalizerInfo?.numberOfBands || 5;
    const MB_PER_UNIT = 35;

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

    const sum = rawBands.reduce((acc, v) => acc + v, 0);
    const offset = sum / rawBands.length;
    const balancedBands = rawBands.map(v => v - offset);

    const bandValues = balancedBands.map(v => {
      const millibels = v * MB_PER_UNIT;
      return Math.max(-300, Math.min(150, millibels));
    });

    EqualizerModule.setCustomBands(bandValues);
  }

  private disableEqualizer(): void {
    if (this.equalizerAttached) {
      EqualizerModule.setEnabled(false);
    }
  }

  private applyImmersive(effect: ImmersiveEffect): void {
    if (this.bassBoostAttached) {
      BassBoostModule.setEnabled(true);
      const bassStrength = Math.round((effect.stereoWidth - 1.0) * 1000);
      BassBoostModule.setStrength(Math.max(0, Math.min(1000, bassStrength)));
    }

    if (this.virtualizerAttached) {
      VirtualizerModule.setEnabled(true);
      const virtStrength = Math.round((effect.stereoWidth - 1.0) * 1666);
      VirtualizerModule.setStrength(Math.max(0, Math.min(1000, virtStrength)));
    }
  }

  private disableImmersive(): void {
    if (this.bassBoostAttached) {
      BassBoostModule.setEnabled(false);
    }
    if (this.virtualizerAttached) {
      VirtualizerModule.setEnabled(false);
    }
  }

  getEqualizerInfo(): EqualizerAttachResult | null {
    return this.equalizerInfo;
  }

  /**
   * Apply 5-band EQ with intelligent zero-sum bass/treble redistribution.
   * 
   * When bass control is increased, bass bands are boosted and treble bands 
   * are proportionally reduced to maintain zero sum (no volume change).
   * When treble control is increased, treble bands are boosted and bass bands
   * are proportionally reduced.
   * 
   * This ensures no clipping or volume changes - just intelligent EQ curve shaping.
   * 
   * @param bands - Base EQ band values in range -8 to +8
   * @param bassControlLevel - Bass adjustment (-5 to +5), 0 = no change
   * @param trebleControlLevel - Treble adjustment (-5 to +5), 0 = no change
   */
  applyFiveBandEQWithGainStaging(bands: number[], bassControlLevel: number = 0, trebleControlLevel: number = 0): void {
    if (!this.isAvailable() || !this.equalizerAttached) {
      console.log('[NativeEffectsManager] Cannot apply EQ - not available or not attached');
      return;
    }

    EqualizerModule.setEnabled(true);

    const numBands = this.equalizerInfo?.numberOfBands || 5;

    // Copy and pad if needed
    const baseBands = [...bands];
    while (baseBands.length < numBands) {
      baseBands.push(0);
    }

    // Band weights for bass/treble distribution (5-band: 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz)
    // Bass affects low bands positively, high bands negatively
    // Treble affects high bands positively, low bands negatively
    const bassWeights = [1.0, 0.6, 0.0, -0.4, -0.8];   // Full bass at band 0, counter at band 4
    const trebleWeights = [-0.8, -0.4, 0.0, 0.6, 1.0]; // Full treble at band 4, counter at band 0

    // Apply bass/treble adjustments with zero-sum redistribution
    const adjustedBands = baseBands.map((bandValue, index) => {
      // Each unit of bass/treble control = ~0.8dB adjustment at peak band
      const bassAdjustment = bassControlLevel * 0.8 * (bassWeights[index] || 0);
      const trebleAdjustment = trebleControlLevel * 0.8 * (trebleWeights[index] || 0);
      return bandValue + bassAdjustment + trebleAdjustment;
    });

    // Apply zero-sum balancing to ensure no net volume change
    const sum = adjustedBands.reduce((acc, v) => acc + v, 0);
    const offset = sum / adjustedBands.length;
    const balancedBands = adjustedBands.map(v => v - offset);

    // Convert to millibels and clamp to safe EQ range
    const bandValues = balancedBands.map(v => {
      const millibels = v * MB_PER_UNIT;
      return Math.max(-300, Math.min(300, millibels));
    });

    console.log('[NativeEffectsManager] Zero-sum EQ applied:', { 
      baseBands: bands, 
      bassControl: bassControlLevel,
      trebleControl: trebleControlLevel,
      adjusted: adjustedBands.map(v => v.toFixed(1)),
      balanced: balancedBands.map(v => v.toFixed(1)),
      millibels: bandValues
    });
    
    EqualizerModule.setCustomBands(bandValues);
  }

  /**
   * Apply 5-band EQ values directly (no bass/treble adjustment)
   * Band values should be in range -8 to +8 (user units)
   */
  applyFiveBandEQ(bands: number[]): void {
    this.applyFiveBandEQWithGainStaging(bands, 0, 0);
  }

  /**
   * Disable the equalizer
   */
  disableEQ(): void {
    this.disableEqualizer();
  }
  
  /**
   * Apply bass control through EQ redistribution (no separate bass boost module)
   * This is a no-op as bass is now handled via EQ redistribution in applyFiveBandEQWithGainStaging
   */
  applyBassControl(_level: number): void {
    // Bass control is now integrated into the EQ via zero-sum redistribution
    // No separate bass boost module needed - this prevents stacking/distortion
    console.log('[NativeEffectsManager] Bass control via EQ redistribution');
  }

  /**
   * Apply treble control through EQ redistribution (no separate treble module)
   * This is a no-op as treble is now handled via EQ redistribution in applyFiveBandEQWithGainStaging
   */
  applyTrebleControl(_level: number): void {
    // Treble control is now integrated into the EQ via zero-sum redistribution
    // No separate treble module needed - this prevents stacking/distortion
    console.log('[NativeEffectsManager] Treble control via EQ redistribution');
  }

  async release(): Promise<void> {
    await this.releaseInternal();
    this.musicSessionId = 0;
    this.radioSessionId = 0;
    this.currentSource = 'none';
  }
}

export const NativeEffectsManager = new NativeEffectsManagerClass();
