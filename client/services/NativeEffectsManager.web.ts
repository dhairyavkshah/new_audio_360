import type { EQBands, SoundLabMode } from '@/contexts/SoundLabContext';

interface ImmersiveEffect {
  reverb: number;
  delay: number;
  stereoWidth: number;
}

export type AudioSessionSource = 'music' | 'radio' | 'none';

const IMMERSIVE_MODE_EQ_BANDS: Record<string, number[]> = {
  music: [60, 10, -60, 10, -20],
  '360_reality': [18, -12, -32, -12, 38],
  gaming: [-14, -94, 16, 56, 36],
  podcast: [-140, -40, 60, 80, 40],
  movie: [58, -12, -62, -12, 28],
  off: [0, 0, 0, 0, 0],
};

class NativeEffectsManagerClass {
  private currentMode: SoundLabMode = 'off';
  private currentImmersiveMode: string = 'off';
  private currentSource: AudioSessionSource = 'none';

  isAvailable(): boolean {
    return false;
  }

  async attach(_audioSessionId: number): Promise<boolean> {
    console.log('[Web] NativeEffectsManager attach (simulated)');
    this.currentSource = 'music';
    return false;
  }

  async attachToRadioSession(_sessionId: number): Promise<boolean> {
    console.log('[Web] NativeEffectsManager attachToRadioSession (simulated)');
    this.currentSource = 'radio';
    return false;
  }

  async detachFromRadioSession(): Promise<void> {
    console.log('[Web] NativeEffectsManager detachFromRadioSession (simulated)');
    this.currentSource = 'none';
  }

  getCurrentSource(): AudioSessionSource {
    return this.currentSource;
  }

  isAttachedToRadio(): boolean {
    return this.currentSource === 'radio';
  }

  isEffectsActive(): boolean {
    return false;
  }

  applySettings(mode: SoundLabMode, eqBands: EQBands, immersiveEffect: ImmersiveEffect): void {
    this.currentMode = mode;
    
    if (mode === 'equalizer') {
      const bands = this.balanceEQBands(eqBands);
      console.log('[Web] EQ Preset applied (simulated):', bands);
    } else if (mode === 'immersive') {
      console.log('[Web] Immersive mode applied (simulated):', immersiveEffect);
    }
  }

  setImmersiveMode(modeName: string): void {
    this.currentImmersiveMode = modeName;
    const bands = IMMERSIVE_MODE_EQ_BANDS[modeName] || IMMERSIVE_MODE_EQ_BANDS.off;
    const sum = bands.reduce((a, b) => a + b, 0);
    console.log(`[Web] Immersive mode "${modeName}" EQ bands:`, bands, `sum=${sum}`);
  }

  private balanceEQBands(eqBands: EQBands): number[] {
    const rawBands = [
      (eqBands.sub + eqBands.bass) / 2,
      eqBands.lowMid,
      eqBands.mid,
      eqBands.highMid,
      (eqBands.treble + eqBands.brilliance) / 2,
    ];
    
    const sum = rawBands.reduce((acc, v) => acc + v, 0);
    const offset = sum / rawBands.length;
    return rawBands.map(v => Math.round((v - offset) * 35));
  }

  getEqualizerInfo(): null {
    return null;
  }

  /**
   * Apply 5-band EQ with gain staging (web stub)
   */
  applyFiveBandEQWithGainStaging(bands: number[], bassControlLevel: number = 0, trebleControlLevel: number = 0): void {
    console.log('[Web] applyFiveBandEQWithGainStaging (simulated):', { bands, bassControlLevel, trebleControlLevel });
  }

  /**
   * Apply 5-band EQ (web stub)
   */
  applyFiveBandEQ(bands: number[]): void {
    console.log('[Web] applyFiveBandEQ (simulated):', bands);
  }

  /**
   * Disable EQ (web stub)
   */
  disableEQ(): void {
    console.log('[Web] disableEQ (simulated)');
  }

  /**
   * Apply bass control (web stub)
   */
  applyBassControl(level: number): void {
    console.log('[Web] applyBassControl (simulated):', level);
  }

  /**
   * Apply treble control (web stub)
   */
  applyTrebleControl(level: number): void {
    console.log('[Web] applyTrebleControl (simulated):', level);
  }

  async release(): Promise<void> {
    console.log('[Web] NativeEffectsManager released');
  }
}

export const NativeEffectsManager = new NativeEffectsManagerClass();
