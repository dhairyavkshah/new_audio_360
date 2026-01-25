import { Platform } from 'react-native';
import { 
  EqualizerModule, 
  EqualizerAttachResult 
} from 'audio-effects';
import type { EQBands, SoundLabMode } from '@/contexts/SoundLabContext';

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

    // Only attach Equalizer
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
      // Only attach Equalizer
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

    const numBands = this.equalizerInfo?.numberOfBands || 5;

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

    // Check if all bands are zero - disable EQ entirely for pure passthrough
    const allZero = rawBands.every(v => v === 0);
    if (allZero) {
      EqualizerModule.setEnabled(false);
      console.log('[NativeEffectsManager] All EQ bands at 0 - EQ disabled (pure passthrough)');
      return;
    }

    EqualizerModule.setEnabled(true);

    // ZERO-SUM BALANCE RULE:
    // Subtract the average from each band so the total sum equals zero
    // This ensures no net volume change - only frequency balance adjustment
    const sum = rawBands.reduce((acc, v) => acc + v, 0);
    const average = sum / rawBands.length;
    const zeroSumBands = rawBands.map(v => v - average);

    // Conservative conversion: user units to millibels
    // Using 100 millibels per unit for stronger, more noticeable effect (2.5x increase)
    const MB_PER_UNIT = 100;

    // Convert to millibels with clamping using hardware limits
    const minLevel = this.equalizerInfo?.minLevel ?? -1500;
    const maxLevel = this.equalizerInfo?.maxLevel ?? 1500;
    
    const bandValues = zeroSumBands.map(v => {
      const millibels = Math.round(v * MB_PER_UNIT);
      return Math.max(minLevel, Math.min(maxLevel, millibels));
    });

    console.log('[NativeEffectsManager] Applying EQ (zero-sum balanced, 2.5x strength increase):', { input: rawBands, zeroSum: zeroSumBands, millibels: bandValues });
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
   * Apply EQ band values directly (for use with Sound Lab presets and custom EQ)
   * Band values should be in range -8 to +8 (user units)
   * Uses ZERO-SUM BALANCE rule: sum of all bands equals zero (no net volume change)
   * No other audio processing is applied - pure EQ only
   * Note: This method accepts any number of bands and maps to hardware EQ
   */
  applyFiveBandEQ(bands: number[]): void {
    if (!this.isAvailable() || !this.equalizerAttached) {
      console.log('[NativeEffectsManager] Cannot apply 5-band EQ - not available or not attached');
      return;
    }

    const numBands = this.equalizerInfo?.numberOfBands || 5;

    // Copy and pad if needed
    const rawBands = [...bands];
    while (rawBands.length < numBands) {
      rawBands.push(0);
    }

    // Check if all bands are zero - disable EQ entirely for pure passthrough
    const allZero = rawBands.every(v => v === 0);
    if (allZero) {
      EqualizerModule.setEnabled(false);
      console.log('[NativeEffectsManager] All EQ bands at 0 - EQ disabled (pure passthrough)');
      return;
    }

    EqualizerModule.setEnabled(true);

    // ZERO-SUM BALANCE RULE:
    // Subtract the average from each band so the total sum equals zero
    // This ensures no net volume change - only frequency balance adjustment
    const sum = rawBands.reduce((acc, v) => acc + v, 0);
    const average = sum / rawBands.length;
    const zeroSumBands = rawBands.map(v => v - average);

    // Conservative conversion: user units to millibels
    // Using 100 millibels per unit for stronger, more noticeable effect (2.5x increase)
    const MB_PER_UNIT = 100;

    // Convert to millibels with clamping using hardware limits
    const minLevel = this.equalizerInfo?.minLevel ?? -1500;
    const maxLevel = this.equalizerInfo?.maxLevel ?? 1500;
    
    const bandValues = zeroSumBands.map(v => {
      const millibels = Math.round(v * MB_PER_UNIT);
      return Math.max(minLevel, Math.min(maxLevel, millibels));
    });

    console.log('[NativeEffectsManager] Applying 5-band EQ (zero-sum balanced, 2.5x strength increase):', { 
      input: bands, 
      average: average.toFixed(2),
      zeroSum: zeroSumBands.map(v => v.toFixed(2)), 
      millibels: bandValues 
    });
    EqualizerModule.setCustomBands(bandValues);
  }

  /**
   * Apply 10-band EQ values directly (for Custom EQ with full 10-band control)
   * Frequencies: 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz
   * Band values should be in range -8 to +8 (user units)
   * Uses ZERO-SUM BALANCE rule: sum of all bands equals zero (no net volume change)
   * Note: Maps 10 bands to available hardware EQ bands
   */
  applyTenBandEQ(bands: number[]): void {
    if (!this.isAvailable() || !this.equalizerAttached) {
      console.log('[NativeEffectsManager] Cannot apply 10-band EQ - not available or not attached');
      return;
    }

    const numBands = this.equalizerInfo?.numberOfBands || 5;

    // Map 10 bands to hardware EQ bands
    let rawBands: number[];
    if (numBands >= 10) {
      // Hardware supports 10+ bands - use directly
      rawBands = [...bands];
      while (rawBands.length < numBands) {
        rawBands.push(0);
      }
    } else if (numBands >= 5) {
      // Map 10 bands to 5 bands by averaging adjacent pairs
      rawBands = [
        (bands[0] + bands[1]) / 2,  // 60Hz + 170Hz -> Low bass
        (bands[2] + bands[3]) / 2,  // 310Hz + 600Hz -> Mid-bass
        (bands[4] + bands[5]) / 2,  // 1kHz + 3kHz -> Mids
        (bands[6] + bands[7]) / 2,  // 6kHz + 12kHz -> High-mids
        (bands[8] + bands[9]) / 2,  // 14kHz + 16kHz -> Treble
      ];
      while (rawBands.length < numBands) {
        rawBands.push(0);
      }
    } else {
      rawBands = bands.slice(0, numBands);
    }

    // Check if all bands are zero - disable EQ entirely for pure passthrough
    const allZero = rawBands.every(v => v === 0);
    if (allZero) {
      EqualizerModule.setEnabled(false);
      console.log('[NativeEffectsManager] All EQ bands at 0 - EQ disabled (pure passthrough)');
      return;
    }

    EqualizerModule.setEnabled(true);

    // ZERO-SUM BALANCE RULE
    const sum = rawBands.reduce((acc, v) => acc + v, 0);
    const average = sum / rawBands.length;
    const zeroSumBands = rawBands.map(v => v - average);

    const MB_PER_UNIT = 100;
    const minLevel = this.equalizerInfo?.minLevel ?? -1500;
    const maxLevel = this.equalizerInfo?.maxLevel ?? 1500;
    
    const bandValues = zeroSumBands.map(v => {
      const millibels = Math.round(v * MB_PER_UNIT);
      return Math.max(minLevel, Math.min(maxLevel, millibels));
    });

    console.log('[NativeEffectsManager] Applying 10-band EQ (zero-sum balanced):', { 
      input: bands.slice(0, 10), 
      mappedTo: rawBands.length,
      average: average.toFixed(2),
      millibels: bandValues 
    });
    EqualizerModule.setCustomBands(bandValues);
  }

  /**
   * Disable the equalizer
   */
  disableEQ(): void {
    this.disableEqualizer();
  }

  /**
   * Apply 7-band EQ values directly (for use with software DSP)
   * Band order: Sub (32Hz), Bass (64Hz), Low-Mid (125Hz), Mid (500Hz), High-Mid (2kHz), Treble (8kHz), Brilliance (16kHz)
   * Uses the new software DSP which applies biquad filters directly
   */
  applySevenBandEQ(bands: { sub: number; bass: number; lowMid: number; mid: number; highMid: number; treble: number; brilliance: number }): void {
    if (!this.isAvailable() || !this.equalizerAttached) {
      console.log('[NativeEffectsManager] Cannot apply 7-band EQ - not available or not attached');
      return;
    }

    const bandArray = [
      bands.sub,
      bands.bass,
      bands.lowMid,
      bands.mid,
      bands.highMid,
      bands.treble,
      bands.brilliance
    ];

    const allZero = bandArray.every(v => v === 0);
    if (allZero) {
      EqualizerModule.setEnabled(false);
      console.log('[NativeEffectsManager] All EQ bands at 0 - EQ disabled (pure passthrough)');
      return;
    }

    EqualizerModule.setEnabled(true);
    EqualizerModule.setEqBands(bandArray);
    console.log('[NativeEffectsManager] Applied 7-band EQ via software DSP:', bandArray);
  }

  /**
   * Set bass boost using software DSP shelf filter at 150Hz
   * @param gain Gain in user units (-5 to +5)
   */
  setBassBoost(gain: number): void {
    if (!this.isAvailable() || !this.equalizerAttached) {
      return;
    }
    EqualizerModule.setBassBoost(gain);
    console.log('[NativeEffectsManager] Set bass boost:', gain);
  }

  /**
   * Set treble boost using software DSP shelf filter at 6kHz
   * @param gain Gain in user units (-5 to +5)
   */
  setTrebleBoost(gain: number): void {
    if (!this.isAvailable() || !this.equalizerAttached) {
      return;
    }
    EqualizerModule.setTrebleBoost(gain);
    console.log('[NativeEffectsManager] Set treble boost:', gain);
  }

  async release(): Promise<void> {
    await this.releaseInternal();
    this.musicSessionId = 0;
    this.radioSessionId = 0;
    this.currentSource = 'none';
  }
}

export const NativeEffectsManager = new NativeEffectsManagerClass();
