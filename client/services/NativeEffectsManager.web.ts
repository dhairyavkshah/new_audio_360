// Web fallback for NativeEffectsManager
// Native effects only work on Android with development builds

import type { EQBands, SoundLabMode, ImmersiveEffect } from '@/contexts/SoundLabContext';

class NativeEffectsManagerClass {
  isAvailable(): boolean {
    return false;
  }

  async attach(_audioSessionId: number): Promise<boolean> {
    return false;
  }

  applySettings(_mode: SoundLabMode, _eqBands: EQBands, _immersiveEffect: ImmersiveEffect): void {
    // No-op on web
  }

  getEqualizerInfo(): null {
    return null;
  }

  async release(): Promise<void> {
    // No-op on web
  }
}

export const NativeEffectsManager = new NativeEffectsManagerClass();
