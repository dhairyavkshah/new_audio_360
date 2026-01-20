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
  reverb: number; // 0-1 wet mix (0 = dry, 1 = full reverb)
}

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

// Professional Immersive Mode Configurations
// Based on Sony 360 Reality Audio, Bose soundbars, Yamaha YPAO/Cinema DSP, Samsung Q-Symphony, IMAX Enhanced
// EQ bands: [60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz]
// Values in gain units (-5 to +5), where 1 unit = 2.4 dB
// Reverb: 0-1 wet mix (0 = dry, 1 = full reverb)
const IMMERSIVE_MODES: Record<string, ImmersiveMode> = {
  music: {
    // Balanced "smile curve" - warm bass, slight mid scoop, sparkly highs
    name: 'Music',
    eqPreset: [+0.3, +0.3, -0.4, -1.0, -1.0, 0.0, +1.0, +1.5, +0.4, -1.1],
    bassBoost: 0.5,     // +1.2 dB at 150Hz
    trebleBoost: 0.54,  // +1.3 dB at 6kHz
    spatialWidth: 0.25, // 25% spatial width
    reverb: 0.08,       // 8% reverb
  },
  '360_reality': {
    // Sony 360 Reality Audio inspired - immersive spatial soundfield
    name: '360 Reality',
    eqPreset: [0.0, 0.0, -0.6, -0.6, -0.6, 0.0, +1.0, +1.2, +0.3, -0.7],
    bassBoost: 0.33,    // +0.8 dB
    trebleBoost: 0.625, // +1.5 dB
    spatialWidth: 0.55, // 55% - wide spatial soundfield
    reverb: 0.18,       // 18% reverb
  },
  gaming: {
    // Competitive gaming - footstep clarity and directional awareness
    name: 'Gaming',
    eqPreset: [+0.8, +0.8, +0.4, -1.1, -1.1, 0.0, +1.0, +1.7, +0.8, -1.9],
    bassBoost: 0.5,     // +1.2 dB
    trebleBoost: 0.875, // +2.1 dB
    spatialWidth: 0.57, // 57% spatial width
    reverb: 0.08,       // 8% reverb
  },
  podcast: {
    // Voice clarity mode - speech intelligibility
    name: 'Podcast',
    eqPreset: [-1.9, -1.9, -0.9, -0.7, +0.4, +1.0, +1.0, +1.4, +1.8, -0.2],
    bassBoost: -0.42,   // -1.0 dB (removes rumble)
    trebleBoost: 0.958, // +2.3 dB (clarity)
    spatialWidth: 0,    // 0% - mono-focused for speech
    reverb: 0,          // 0% reverb
  },
  movie: {
    // Cinematic experience - dialogue clarity and surround ambience
    name: 'Movie',
    eqPreset: [-0.8, -0.8, -0.4, +0.7, +1.1, +1.0, +1.0, -0.3, -0.5, -1.7],
    bassBoost: 0.75,    // +1.8 dB
    trebleBoost: 0.625, // +1.5 dB
    spatialWidth: 0.45, // 45% - surround-like experience
    reverb: 0.12,       // 12% reverb
  },
  sports: {
    // Stadium/broadcast mode - commentary clarity with crowd atmosphere
    name: 'Sports',
    eqPreset: [+1.2, +1.2, +0.5, -0.7, -0.7, 0.0, +1.0, +1.2, -0.9, -2.5],
    bassBoost: 0.917,   // +2.2 dB (stadium atmosphere)
    trebleBoost: 0.33,  // +0.8 dB
    spatialWidth: 0.47, // 47% - stadium-like open soundstage
    reverb: 0.10,       // 10% reverb
  },
};

class WebAudioEffectsEngineClass {
  private audioContext: AudioContext | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private reverbDelays: { delay: any; feedback: GainNode; filter: BiquadFilterNode }[] = [];
  private isInitialized = false;
  private currentEQValues: number[] = new Array(10).fill(0);
  private currentMode: string = 'off';
  private currentReverb: number = 0;
  private currentVirtualizer: number = 0; // -5 to +5 range

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      this.audioContext = new AudioContext();
      
      // Create dry/wet mix gains for reverb
      this.dryGain = this.audioContext.createGain();
      this.dryGain.gain.value = 1.0;
      
      this.wetGain = this.audioContext.createGain();
      this.wetGain.gain.value = 0;
      
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;

      // Create EQ filters
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

      // Create multi-tap delay reverb (4 delay lines for richer sound)
      // Delay times chosen for natural room ambience
      const delayTimes = [0.023, 0.041, 0.067, 0.089]; // Prime-ish ratios for diffuse sound
      const feedbacks = [0.4, 0.35, 0.3, 0.25]; // Decreasing feedback for each tap
      const filterFreqs = [4000, 3500, 3000, 2500]; // Lowpass frequencies for natural decay
      
      this.reverbDelays = delayTimes.map((time, i) => {
        const delay = this.audioContext!.createDelay(0.5);
        delay.delayTime.value = time;
        
        const feedback = this.audioContext!.createGain();
        feedback.gain.value = feedbacks[i];
        
        const filter = this.audioContext!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreqs[i];
        filter.Q.value = 0.5;
        
        return { delay, feedback, filter };
      });

      // Connect EQ chain
      let currentNode: any = this.eqFilters[0];
      for (let i = 1; i < this.eqFilters.length; i++) {
        currentNode.connect(this.eqFilters[i]);
        currentNode = this.eqFilters[i];
      }
      
      // EQ output splits to dry and wet paths
      const eqOutput = this.eqFilters[this.eqFilters.length - 1];
      eqOutput.connect(this.dryGain);
      
      // Connect reverb delay lines (parallel structure)
      this.reverbDelays.forEach(({ delay, feedback, filter }) => {
        eqOutput.connect(delay);
        delay.connect(filter);
        filter.connect(feedback);
        feedback.connect(delay); // Feedback loop
        filter.connect(this.wetGain!);
      });
      
      // Mix dry and wet to master output
      this.dryGain.connect(this.masterGain);
      this.wetGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);

      this.isInitialized = true;
      console.log('[WebAudioEffectsEngine] Initialized with 10-band EQ and reverb');
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

    // Reset reverb when applying standard EQ (non-immersive mode)
    this.setReverb(0);

    // Limiter handles distortion prevention in PlayerContext
    // Master gain stays at 1.0 for maximum headroom
    if (this.masterGain) {
      this.masterGain.gain.value = 1.0;
    }

    this.currentEQValues = paddedBands;
    this.currentMode = 'equalizer';
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

  /**
   * Apply 10-band EQ values directly (for Custom EQ with full 10-band control)
   * @param bands - Array of 10 band values in range -8 to +8
   */
  applyTenBandEQ(bands: number[]): void {
    if (bands.length < 10) {
      // Pad with zeros if needed
      const paddedBands = [...bands];
      while (paddedBands.length < 10) {
        paddedBands.push(0);
      }
      this.applyEQ(paddedBands);
    } else {
      this.applyEQ(bands.slice(0, 10));
    }
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
    this.applyImmersiveEQ(mode.eqPreset, mode.bassBoost, mode.trebleBoost, mode.spatialWidth, mode.reverb);
    this.currentMode = modeName;
  }

  /**
   * Apply EQ settings for immersive modes WITHOUT zero-sum normalization.
   * Immersive modes have their own creative curves that shouldn't be balanced.
   * The limiter in PlayerContext handles distortion prevention.
   */
  private applyImmersiveEQ(bands: number[], bassBoost: number, trebleBoost: number, spatialWidth: number, reverb: number = 0): void {
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

    // Apply reverb wet/dry mix
    this.setReverb(reverb);

    // Master gain stays at 1.0 - limiter handles distortion prevention
    if (this.masterGain) {
      this.masterGain.gain.value = 1.0;
    }

    this.currentEQValues = paddedBands;
    console.log(`[WebAudioEffectsEngine] Applied immersive mode with bass:${bassBoost}, treble:${trebleBoost}, spatial:${spatialWidth}, reverb:${reverb}`);
  }

  /**
   * Set reverb wet/dry mix (0 = dry, 1 = full reverb)
   * Uses equal-power crossfade for smooth blending
   */
  setReverb(wetMix: number): void {
    const clampedWet = Math.max(0, Math.min(1, wetMix));
    this.currentReverb = clampedWet;
    
    if (this.dryGain && this.wetGain) {
      // Equal-power crossfade for smooth blending
      // At 0% reverb: dry=1.0, wet=0.0 (fully dry)
      // At 25% reverb: dry≈0.97, wet≈0.25 (mostly dry with subtle ambience)
      // At 100% reverb: dry=0.0, wet=1.0 (fully wet)
      const dryAmount = Math.cos(clampedWet * Math.PI / 2);
      const wetAmount = Math.sin(clampedWet * Math.PI / 2);
      
      this.dryGain.gain.value = dryAmount;
      this.wetGain.gain.value = wetAmount;
    }
  }

  /**
   * Set virtualizer level (-5 to +5)
   * Negative = narrower stereo (more mono-like)
   * Zero = original stereo
   * Positive = wider stereo (enhanced surround)
   * 
   * Intelligent mapping:
   * -5: Full mono (0% stereo width)
   * -3: Reduced stereo (40% width)
   * -1: Slightly narrower (80% width)
   *  0: Original stereo (100% width)
   * +1: Slightly wider (120% perceived width)
   * +3: Wide stereo (180% perceived width)
   * +5: Maximum surround (250% perceived width)
   */
  setVirtualizer(level: number): void {
    const clampedLevel = Math.max(-5, Math.min(5, level));
    this.currentVirtualizer = clampedLevel;
    
    // Calculate stereo width multiplier
    // -5 = 0.0 (mono), 0 = 1.0 (original), +5 = 2.5 (extra wide)
    let stereoWidth: number;
    if (clampedLevel < 0) {
      // Narrowing: -5 = 0%, 0 = 100%
      stereoWidth = 1.0 + (clampedLevel / 5); // -5 → 0.0, 0 → 1.0
    } else {
      // Widening: 0 = 100%, +5 = 250%
      stereoWidth = 1.0 + (clampedLevel * 0.3); // 0 → 1.0, +5 → 2.5
    }
    
    console.log(`[WebAudioEffectsEngine] Virtualizer set to ${clampedLevel} (width: ${(stereoWidth * 100).toFixed(0)}%)`);
    // Note: Actual stereo processing requires stereo channel separation
    // which isn't available in basic mono Web Audio API setup
    // The native Android VirtualizerModule handles actual audio processing
  }

  getVirtualizerLevel(): number {
    return this.currentVirtualizer;
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
    this.setReverb(0); // Reset reverb to dry
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
    this.dryGain = null;
    this.wetGain = null;
    this.reverbDelays = [];
    this.isInitialized = false;
    this.currentEQValues = new Array(10).fill(0);
    this.currentMode = 'off';
    this.currentReverb = 0;
    this.currentVirtualizer = 0;
    
    console.log('[WebAudioEffectsEngine] Released');
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

export const WebAudioEffectsEngine = new WebAudioEffectsEngineClass();
