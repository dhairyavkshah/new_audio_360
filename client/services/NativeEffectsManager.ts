import { Platform } from 'react-native';
import { 
  EqualizerModule, 
  BassBoostModule, 
  VirtualizerModule,
  EqualizerAttachResult 
} from '@/modules/audio-effects';
import type { EQBands, SoundLabMode } from '@/contexts/SoundLabContext';

interface ImmersiveEffect {
  reverb: number;
  delay: number;
  stereoWidth: number;
}

class NativeEffectsManagerClass {
  private isInitialized = false;
  private audioSessionId: number = 0;
  private equalizerAttached = false;
  private bassBoostAttached = false;
  private virtualizerAttached = false;
  private equalizerInfo: EqualizerAttachResult | null = null;

  isAvailable(): boolean {
    return Platform.OS === 'android' && EqualizerModule.isAvailable();
  }

  async attach(audioSessionId: number): Promise<boolean> {
    if (!this.isAvailable() || audioSessionId === 0) {
      return false;
    }

    this.audioSessionId = audioSessionId;

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
      presets: eqResult.presets
    });

    return this.equalizerAttached || this.bassBoostAttached || this.virtualizerAttached;
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
   * Apply 5-band EQ values directly (for use with Sound Lab presets and custom EQ)
   * Band values should be in range -8 to +8 (user units)
   */
  applyFiveBandEQ(bands: number[]): void {
    if (!this.isAvailable() || !this.equalizerAttached) {
      console.log('[NativeEffectsManager] Cannot apply 5-band EQ - not available or not attached');
      return;
    }

    EqualizerModule.setEnabled(true);

    const MB_PER_UNIT = 35;
    const numBands = this.equalizerInfo?.numberOfBands || 5;

    // Copy and pad if needed
    const rawBands = [...bands];
    while (rawBands.length < numBands) {
      rawBands.push(0);
    }

    // Zero-sum balancing
    const sum = rawBands.reduce((acc, v) => acc + v, 0);
    const offset = sum / rawBands.length;
    const balancedBands = rawBands.map(v => v - offset);

    // Convert to millibels and clamp
    const bandValues = balancedBands.map(v => {
      const millibels = v * MB_PER_UNIT;
      return Math.max(-300, Math.min(150, millibels));
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
}

export const NativeEffectsManager = new NativeEffectsManagerClass();
