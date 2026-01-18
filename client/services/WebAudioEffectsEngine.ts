import { Platform } from 'react-native';
import { AudioContext, BiquadFilterNode, GainNode } from 'react-native-audio-api';

export interface EQBandConfig {
  frequency: number;
  type: BiquadFilterType;
  gain: number;
  Q?: number;
}

export type BiquadFilterType = 'lowshelf' | 'peaking' | 'highshelf';

export interface ImmersiveMode {
  name: string;
  eqPreset: number[];
  bassBoost: number;
  trebleBoost: number;
  spatialWidth: number;
}

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

// Professional Immersive Mode Configurations
// Based on Samsung Dolby Atmos, Sony 360 Reality Audio, and professional audio engineering standards
// EQ bands: [60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz]
// Values in gain units (-5 to +5), where 1 unit = 2.4 dB
const IMMERSIVE_MODES: Record<string, ImmersiveMode> = {
  music: {
    // Balanced "smile curve" for enjoyable music listening
    // Warm bass, slight mid scoop, sparkly highs - Samsung Music mode inspired
    name: 'Music',
    eqPreset: [2.5, 1.5, 0.5, -0.5, 0, 0.5, 1.5, 2.0, 1.5, 1.0],
    bassBoost: 2,      // +4.8 dB at 150Hz (warm fullness)
    trebleBoost: 1.5,  // +3.6 dB at 6kHz (presence and air)
    spatialWidth: 0.35, // 35% - moderate widening for immersion
  },
  '360_reality': {
    // Flat/neutral EQ profile - Sony 360 Reality Audio & Samsung 360 Audio inspired
    // Preserves original sound for accurate spatial positioning in object-based audio
    // Reference: Sony MDR-MV1 professional monitoring standard (5Hz-80kHz flat response)
    name: '360 Reality',
    eqPreset: [0, 0, 0, 0, 0, 0.3, 0.5, 0.3, 0, 0],
    bassBoost: 0,      // 0 dB - neutral bass to preserve spatial cues and avoid masking
    trebleBoost: 0.5,  // +1.2 dB (subtle air for enhanced location perception)
    spatialWidth: 0.75, // 75% - maximum spatial width for immersive 360° soundfield
  },
  gaming: {
    // Competitive gaming EQ - cut bass, boost footstep frequencies (2-6kHz)
    // Based on professional gaming headset standards
    name: 'Gaming',
    eqPreset: [-2.0, -1.5, -1.0, 0, 2.0, 3.5, 3.0, 2.0, 1.5, 1.0],
    bassBoost: -1.0,   // -2.4 dB (reduce bass masking)
    trebleBoost: 2.5,  // +6 dB (enhanced detail and clarity)
    spatialWidth: 0.5, // 50% - directional awareness without blur
  },
  podcast: {
    // Voice clarity mode - enhanced 1-4kHz for speech intelligibility
    // Reduced bass/treble extremes, no spatial processing
    name: 'Podcast',
    eqPreset: [-2.0, -1.5, 0, 1.5, 2.5, 2.0, 1.0, 0, -0.5, -1.0],
    bassBoost: -1.5,   // -3.6 dB (removes rumble and boominess)
    trebleBoost: -0.5, // -1.2 dB (reduces sibilance)
    spatialWidth: 0,   // 0% - mono-focused for speech
  },
  movie: {
    // Cinematic experience - THX-inspired with strong LFE and dialogue clarity
    // Sub-bass for explosions, clear mids for dialogue, detailed highs
    name: 'Movie',
    eqPreset: [3.5, 2.5, 1.0, 0, 0.5, 1.0, 1.5, 2.0, 2.0, 1.5],
    bassBoost: 3.5,    // +8.4 dB (cinematic impact and rumble)
    trebleBoost: 2.0,  // +4.8 dB (effects detail and sparkle)
    spatialWidth: 0.45, // 45% - surround-like experience
  },
  sports: {
    // Stadium/broadcast mode - enhanced commentary clarity with crowd atmosphere
    // Boosted 500Hz-4kHz for commentator voices, moderate bass for stadium ambiance
    // Slight treble reduction to minimize whistle/crowd harshness
    name: 'Sports',
    eqPreset: [1.0, 0.5, 0.5, 2.0, 2.5, 2.0, 0.5, 0, -0.5, -0.5],
    bassBoost: 1.0,    // +2.4 dB (stadium atmosphere without overwhelming)
    trebleBoost: -0.5, // -1.2 dB (reduce whistle/crowd peak harshness)
    spatialWidth: 0.4, // 40% - stadium-like spatial experience
  },
};

class WebAudioEffectsEngineClass {
  private audioContext: AudioContext | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private masterGain: GainNode | null = null;
  private isInitialized = false;
  private currentEQValues: number[] = new Array(10).fill(0);
  private currentMode: string = 'off';

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      this.audioContext = new AudioContext();
      
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;

      this.eqFilters = EQ_FREQUENCIES.map((freq, index) => {
        const filter = this.audioContext!.createBiquadFilter();
        
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
        }
        
        filter.frequency.value = freq;
        filter.gain.value = 0;
        
        if (filter.type === 'peaking') {
          filter.Q.value = 1.4;
        }
        
        return filter;
      });

      let currentNode: any = this.eqFilters[0];
      for (let i = 1; i < this.eqFilters.length; i++) {
        currentNode.connect(this.eqFilters[i]);
        currentNode = this.eqFilters[i];
      }
      currentNode.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);

      this.isInitialized = true;
      console.log('[WebAudioEffectsEngine] Initialized successfully with 10-band EQ');
      return true;
    } catch (error) {
      console.error('[WebAudioEffectsEngine] Failed to initialize:', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return Platform.OS !== 'web' || typeof window !== 'undefined';
  }

  getInputNode(): BiquadFilterNode | null {
    return this.eqFilters[0] || null;
  }

  applyEQ(bands: number[], bassBoost: number = 0, trebleBoost: number = 0): void {
    if (!this.isInitialized || this.eqFilters.length === 0) {
      console.log('[WebAudioEffectsEngine] Not initialized, cannot apply EQ');
      return;
    }

    const paddedBands = [...bands];
    while (paddedBands.length < 10) {
      paddedBands.push(0);
    }

    const sum = paddedBands.reduce((acc, v) => acc + v, 0);
    const average = sum / paddedBands.length;
    const zeroSumBands = paddedBands.map(v => v - average);

    const DB_PER_UNIT = 2.4;
    const MAX_DB = 12;

    zeroSumBands.forEach((value, index) => {
      if (this.eqFilters[index]) {
        let dbValue = value * DB_PER_UNIT;
        
        // Bass: 60Hz, 170Hz (indices 0, 1) - true low frequencies
        if (index <= 1) {
          dbValue += bassBoost * DB_PER_UNIT;
        }
        // Treble: 7kHz, 12kHz, 14kHz, 16kHz (indices 6-9) - true high frequencies
        if (index >= 6) {
          dbValue += trebleBoost * DB_PER_UNIT;
        }
        
        const clampedDb = Math.max(-MAX_DB, Math.min(MAX_DB, dbValue));
        this.eqFilters[index].gain.value = clampedDb;
      }
    });

    // Limiter handles distortion prevention in PlayerContext
    // Master gain stays at 1.0 for maximum headroom
    if (this.masterGain) {
      this.masterGain.gain.value = 1.0;
    }

    this.currentEQValues = paddedBands;
  }

  applyFiveBandEQ(bands: number[]): void {
    if (bands.length < 5) return;

    const tenBandValues = [
      bands[0],
      bands[0],
      bands[1],
      bands[1],
      bands[2],
      bands[2],
      bands[3],
      bands[3],
      bands[4],
      bands[4],
    ];

    this.applyEQ(tenBandValues);
  }

  applySevenBandEQ(bands: { sub: number; bass: number; lowMid: number; mid: number; highMid: number; treble: number; brilliance: number }): void {
    const tenBandValues = [
      bands.sub,
      bands.bass,
      bands.lowMid,
      bands.lowMid,
      bands.mid,
      bands.mid,
      bands.highMid,
      bands.highMid,
      bands.treble,
      bands.brilliance,
    ];

    this.applyEQ(tenBandValues);
  }

  applyImmersiveMode(modeName: string): void {
    const mode = IMMERSIVE_MODES[modeName.toLowerCase()];
    if (!mode) {
      console.log('[WebAudioEffectsEngine] Unknown mode:', modeName);
      this.resetEQ();
      return;
    }

    // Immersive modes use their own dedicated settings WITHOUT zero-sum normalization
    // This allows for the full creative EQ curves designed for each mode
    // Limiter in PlayerContext still prevents distortion
    this.applyImmersiveEQ(mode.eqPreset, mode.bassBoost, mode.trebleBoost, mode.spatialWidth);
    this.currentMode = modeName;
  }

  /**
   * Apply EQ settings for immersive modes WITHOUT zero-sum normalization.
   * Immersive modes have their own creative curves that shouldn't be balanced.
   * The limiter in PlayerContext handles distortion prevention.
   */
  private applyImmersiveEQ(bands: number[], bassBoost: number, trebleBoost: number, spatialWidth: number): void {
    if (!this.isInitialized || this.eqFilters.length === 0) {
      console.log('[WebAudioEffectsEngine] Not initialized, cannot apply immersive EQ');
      return;
    }

    const paddedBands = [...bands];
    while (paddedBands.length < 10) {
      paddedBands.push(0);
    }

    // NO zero-sum normalization for immersive modes
    // Each mode has its own designed EQ curve applied directly
    const DB_PER_UNIT = 2.4;
    const MAX_DB = 12;

    paddedBands.forEach((value, index) => {
      if (this.eqFilters[index]) {
        let dbValue = value * DB_PER_UNIT;
        
        // Apply immersive mode's bass boost to low frequencies
        if (index <= 1) {
          dbValue += bassBoost * DB_PER_UNIT;
        }
        // Apply immersive mode's treble boost to high frequencies
        if (index >= 6) {
          dbValue += trebleBoost * DB_PER_UNIT;
        }
        
        const clampedDb = Math.max(-MAX_DB, Math.min(MAX_DB, dbValue));
        this.eqFilters[index].gain.value = clampedDb;
      }
    });

    // Master gain stays at 1.0 - limiter handles distortion prevention
    if (this.masterGain) {
      this.masterGain.gain.value = 1.0;
    }

    this.currentEQValues = paddedBands;
    console.log(`[WebAudioEffectsEngine] Applied immersive mode with bass:${bassBoost}, treble:${trebleBoost}, spatial:${spatialWidth}`);
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(2, volume));
    }
  }

  resetEQ(): void {
    this.eqFilters.forEach(filter => {
      filter.gain.value = 0;
    });
    this.currentEQValues = new Array(10).fill(0);
    this.currentMode = 'off';
    console.log('[WebAudioEffectsEngine] EQ reset to flat');
  }

  getCurrentEQValues(): number[] {
    return [...this.currentEQValues];
  }

  getCurrentMode(): string {
    return this.currentMode;
  }

  getFrequencies(): number[] {
    return [...EQ_FREQUENCIES];
  }

  async release(): Promise<void> {
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.error('[WebAudioEffectsEngine] Error closing context:', error);
      }
    }
    
    this.audioContext = null;
    this.eqFilters = [];
    this.masterGain = null;
    this.isInitialized = false;
    this.currentEQValues = new Array(10).fill(0);
    this.currentMode = 'off';
    
    console.log('[WebAudioEffectsEngine] Released');
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

export const WebAudioEffectsEngine = new WebAudioEffectsEngineClass();
