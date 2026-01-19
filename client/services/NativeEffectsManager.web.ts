import type { SoundLabMode } from '@/contexts/SoundLabContext';

export type AudioSessionSource = 'music' | 'radio' | 'software' | 'none';

class NativeEffectsManagerClass {
  private currentMode: SoundLabMode = 'off';
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

  applySettings(mode: SoundLabMode, eqBands: number[]): void {
    this.currentMode = mode;
    if (mode === 'equalizer') {
      console.log('[Web] EQ Preset applied (simulated):', eqBands);
    }
  }

  getEqualizerInfo(): null {
    return null;
  }

  applyFiveBandEQ(bands: number[]): void {
    console.log('[Web] applyFiveBandEQ (simulated):', bands);
  }

  disableEQ(): void {
    console.log('[Web] disableEQ (simulated)');
  }

  async release(): Promise<void> {
    console.log('[Web] NativeEffectsManager released');
  }
}

export const NativeEffectsManager = new NativeEffectsManagerClass();
