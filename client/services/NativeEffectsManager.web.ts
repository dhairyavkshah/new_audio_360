import type { EQBands, SoundLabMode } from '@/contexts/SoundLabContext';

interface ImmersiveEffect {
  reverb: number;
  delay: number;
  stereoWidth: number;
}

const IMMERSIVE_MODE_EQ_BANDS: Record<string, number[]> = {
  music: [60, 10, -60, 10, -20],
  '360_reality': [18, -12, -32, -12, 38],
  signature_360: [52, 2, -68, -18, 32],
  gaming: [-14, -94, 16, 56, 36],
  podcast: [-140, -40, 60, 80, 40],
  movie: [58, -12, -62, -12, 28],
  off: [0, 0, 0, 0, 0],
};

class NativeEffectsManagerClass {
  private currentMode: SoundLabMode = 'off';
  private currentImmersiveMode: string = 'off';

  isAvailable(): boolean {
    return false;
  }

  async attach(_audioSessionId: number): Promise<boolean> {
    console.log('[Web] NativeEffectsManager attach (simulated)');
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
    return rawBands.map(v => Math.round(v - offset));
  }

  getEqualizerInfo(): null {
    return null;
  }

  async release(): Promise<void> {
    console.log('[Web] NativeEffectsManager released');
  }
}

export const NativeEffectsManager = new NativeEffectsManagerClass();
