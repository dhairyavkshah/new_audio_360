import { Platform } from 'react-native';
import { AudioContext, BiquadFilterNode, GainNode } from 'react-native-audio-api';

/**
 * WebAudioEffectsEngine - Pure software DSP for Web platform
 * 
 * Audio Processing Standards:
 * - Internal processing: 32-bit float (Web Audio API specification)
 * - Output: 16/24-bit PCM @ device sample rate (handled by AudioContext destination)
 * - True stereo processing with independent L/R channel states per BiquadFilterNode
 * 
 * Signal Chain:
 * Input → 10-Band EQ → Dynamic EQ → PBE → SBR → Dry/Wet Mix → M/S Processing (Spatial) → Master → Output
 *                                                ↑ Multi-Tap Reverb
 * 
 * Premium Effects:
 * - Dynamic EQ: Fletcher-Munson compensation (bass/treble boost at low volumes)
 * - PBE: Psychoacoustic Bass Enhancement (harmonic generation for sub-bass)
 * - SBR: Spectral Band Replication (audio upscaling for high frequencies)
 * 
 * Web Audio API Compliance:
 * - All BiquadFilterNode instances process channels independently (true stereo)
 * - DynamicsCompressorNode uses linked stereo envelope (industry standard for limiters)
 * - Sample rate follows AudioContext.sampleRate (device native rate)
 * - 32-bit float audio graph throughout, converted to output format at destination
 */

// Native Web Audio API types for M/S stereo processing (available in browser)
type NativeAudioContext = globalThis.AudioContext;
type ChannelSplitterNode = globalThis.ChannelSplitterNode;
type ChannelMergerNode = globalThis.ChannelMergerNode;

export interface EQBandConfig {
  frequency: number;
  type: BiquadFilterType;
  gain: number;
  Q?: number;
}

export type BiquadFilterType = 'lowshelf' | 'peaking' | 'highshelf';

export interface SpatialEnhancementParams {
  sideGain: number;        // Side channel gain boost in % (+6 means 1.06x gain)
  itdMs: number;           // Inter-aural Time Difference in milliseconds (0-0.7ms)
  decorrelation: number;   // Decorrelation amount in % (0-100)
  wetMix: number;          // Wet mix for psychoacoustic effect in % (0-100)
}

export interface ImmersiveMode {
  name: string;
  eqPreset: number[];
  bassBoost: number;
  trebleBoost: number;
  reverb: number; // 0-1 wet mix (0 = dry, 1 = full reverb)
  spatialEnhancement: number; // Legacy 0-5 level (kept for backward compatibility)
  spatialParams: SpatialEnhancementParams; // Explicit spatial parameters
}

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

// 6-Level Spatial Enhancement Slider System
// Level 0: Off, Level 1: Subtle, Level 2: Mild, Level 3: Moderate, Level 4: Enhanced, Level 5: Maximum
const SLIDER_SIDE_GAIN = [0, 3, 6, 10, 14, 18];        // Side Gain (%)
const SLIDER_ITD_MS = [0, 0.10, 0.15, 0.25, 0.40, 0.60]; // ITD (ms)
const SLIDER_DECORRELATION = [0, 3, 5, 8, 12, 18];     // Decorrelation (%)
const SLIDER_WET_MIX = [0, 10, 20, 30, 40, 55];         // Wet Mix (%)
const SLIDER_MULTIPLIERS = [0.0, 0.5, 1.0, 1.25, 1.4, 1.5]; // Multipliers
const SLIDER_LEVEL_NAMES = ['Off', 'Subtle', 'Mild', 'Moderate', 'Enhanced', 'Maximum'];

// Hard Safety Caps (NEVER EXCEED)
const MAX_SIDE_GAIN_PERCENT = 18;   // max 18%
const MAX_ITD_MS = 0.6;             // max 0.6ms
const MAX_DECORRELATION = 18;       // max 18%
const MAX_WET_MIX = 55;             // max 55%

// Professional Immersive Mode Configurations
// Based on Sony 360 Reality Audio, Yamaha YPAO/Cinema DSP, Samsung Q-Symphony, IMAX Enhanced
// EQ bands: [60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz]
// Values in gain units (-5 to +5), where 1 unit = 2.4 dB
// Reverb: 0-1 wet mix (0 = dry, 1 = full reverb)
// Spatial Parameters: sideGain (%), itdMs (milliseconds), decorrelation (%), wetMix (%)
const IMMERSIVE_MODES: Record<string, ImmersiveMode> = {
  music: {
    // Balanced "smile curve" - warm bass, slight mid scoop, sparkly highs
    // Subtle openness, vocals locked
    name: 'Music',
    eqPreset: [+0.3, +0.3, -0.4, -1.0, -1.0, 0.0, +1.0, +1.5, +0.4, -1.1],
    bassBoost: 0.5,     // +1.2 dB at 150Hz
    trebleBoost: 0.54,  // +1.3 dB at 6kHz
    reverb: 0.08,       // 8% reverb
    spatialEnhancement: 2, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 6, itdMs: 0.15, decorrelation: 5, wetMix: 20 },
  },
  '360_reality': {
    // Sony 360 Reality Audio inspired - maximum safe width, cinematic
    name: '360 Reality',
    eqPreset: [0.0, 0.0, -0.6, -0.6, -0.6, 0.0, +1.0, +1.2, +0.3, -0.7],
    bassBoost: 0.33,    // +0.8 dB
    trebleBoost: 0.625, // +1.5 dB
    reverb: 0.18,       // 18% reverb
    spatialEnhancement: 5, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 14, itdMs: 0.45, decorrelation: 12, wetMix: 40 },
  },
  gaming: {
    // Competitive gaming - strong positional cues
    name: 'Gaming',
    eqPreset: [+0.8, +0.8, +0.4, -1.1, -1.1, 0.0, +1.0, +1.7, +0.8, -1.9],
    bassBoost: 0.5,     // +1.2 dB
    trebleBoost: 0.875, // +2.1 dB
    reverb: 0.08,       // 8% reverb
    spatialEnhancement: 3, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 16, itdMs: 0.35, decorrelation: 8, wetMix: 35 },
  },
  podcast: {
    // Voice clarity mode - pure, untouched signal
    name: 'Podcast',
    eqPreset: [-1.9, -1.9, -0.9, -0.7, +0.4, +1.0, +1.0, +1.4, +1.8, -0.2],
    bassBoost: -0.42,   // -1.0 dB (removes rumble)
    trebleBoost: 0.958, // +2.3 dB (clarity)
    reverb: 0,          // 0% reverb
    spatialEnhancement: 0, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 0, itdMs: 0, decorrelation: 0, wetMix: 0 },
  },
  movie: {
    // Cinematic experience - dialogue-safe cinematic stage
    name: 'Movie',
    eqPreset: [-0.8, -0.8, -0.4, +0.7, +1.1, +1.0, +1.0, -0.3, -0.5, -1.7],
    bassBoost: 0.75,    // +1.8 dB
    trebleBoost: 0.625, // +1.5 dB
    reverb: 0.12,       // 12% reverb
    spatialEnhancement: 4, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 12, itdMs: 0.30, decorrelation: 10, wetMix: 45 },
  },
  sports: {
    // Stadium/broadcast mode - wide ambience, focused commentary
    name: 'Sports',
    eqPreset: [+1.2, +1.2, +0.5, -0.7, -0.7, 0.0, +1.0, +1.2, -0.9, -2.5],
    bassBoost: 0.917,   // +2.2 dB (stadium atmosphere)
    trebleBoost: 0.33,  // +0.8 dB
    reverb: 0.10,       // 10% reverb
    spatialEnhancement: 2, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 10, itdMs: 0.25, decorrelation: 7, wetMix: 30 },
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
  
  // M/S Processing nodes (for spatial enhancement)
  private msProcessingEnabled: boolean = false;
  private stereoSplitter: ChannelSplitterNode | null = null;
  private stereoMerger: ChannelMergerNode | null = null;
  private stereoMixNode: GainNode | null = null; // Sums dry+wet before stereo splitting
  private midGainL: GainNode | null = null;  // L contribution to Mid
  private midGainR: GainNode | null = null;  // R contribution to Mid
  private sideGainL: GainNode | null = null; // L contribution to Side
  private sideGainR: GainNode | null = null; // R (inverted) contribution to Side
  private sideWidth: GainNode | null = null; // Side channel gain for spatial processing
  private midToL: GainNode | null = null;    // Mid to Left output
  private midToR: GainNode | null = null;    // Mid to Right output
  private sideToL: GainNode | null = null;   // Side to Left output
  private sideToR: GainNode | null = null;   // Side (inverted) to Right output

  // Psychoacoustic Stereo Enhancement nodes
  private sideHighpass: globalThis.BiquadFilterNode | null = null;  // Highpass for side (no bass widening)
  private sideDelay: globalThis.DelayNode | null = null;            // ITD delay (0.3ms)
  private allPass1: globalThis.BiquadFilterNode | null = null;      // Decorrelation filter 1
  private allPass2: globalThis.BiquadFilterNode | null = null;      // Decorrelation filter 2
  private sidePsychoGain: globalThis.GainNode | null = null;        // Side boost (max 2.2 = 120%)
  private midAttenuation: globalThis.GainNode | null = null;        // Mid compensation
  spatialEnhancementLevel: number = 0;

  // Premium Effects: Psychoacoustic Bass Enhancement (PBE)
  private pbeEnabled: boolean = false;
  private pbeIntensity: number = 0.5;
  private pbeInputGain: globalThis.GainNode | null = null;        // Input to PBE chain
  private pbeLowpass: globalThis.BiquadFilterNode | null = null;  // 100Hz lowpass to extract sub-bass
  private pbeWaveshaper: globalThis.WaveShaperNode | null = null; // Polynomial curve for harmonics
  private pbeBandpass: globalThis.BiquadFilterNode | null = null; // 100-400Hz bandpass for useful harmonics
  private pbeHarmonicsGain: globalThis.GainNode | null = null;    // Blend harmonics with original
  private pbeBypassGain: globalThis.GainNode | null = null;       // Bypass path (dry signal)
  private pbeOutputGain: globalThis.GainNode | null = null;       // Output mixer

  // Premium Effects: Spectral Band Replication (SBR) - Audio Upscaling
  private sbrEnabled: boolean = false;
  private sbrIntensity: number = 0.5;
  private sbrInputGain: globalThis.GainNode | null = null;        // Input to SBR chain
  private sbrHighpass: globalThis.BiquadFilterNode | null = null; // 8kHz highpass to isolate upper harmonics
  private sbrWaveshaper: globalThis.WaveShaperNode | null = null; // Soft tanh curve for harmonic extension
  private sbrHighshelf: globalThis.BiquadFilterNode | null = null;// High-shelf boost above 16kHz
  private sbrHarmonicsGain: globalThis.GainNode | null = null;    // Blend extended harmonics (10-30%)
  private sbrBypassGain: globalThis.GainNode | null = null;       // Bypass path (dry signal)
  private sbrOutputGain: globalThis.GainNode | null = null;       // Output mixer

  // Premium Effects: Dynamic Volume EQ (Fletcher-Munson Compensation)
  private dynamicEQEnabled: boolean = false;
  private dynamicEQStrength: number = 0.5;
  private dynamicEQAnalyser: globalThis.AnalyserNode | null = null;   // RMS level tracking
  private dynamicEQBassShelf: globalThis.BiquadFilterNode | null = null;  // 100Hz lowshelf
  private dynamicEQTrebleShelf: globalThis.BiquadFilterNode | null = null; // 8kHz highshelf
  private dynamicEQInputGain: globalThis.GainNode | null = null;      // Input routing
  private dynamicEQOutputGain: globalThis.GainNode | null = null;     // Output routing
  private dynamicEQAnimationFrame: number | null = null;              // RAF handle for RMS tracking
  private dynamicEQCurrentRMS: number = 0;                            // Smoothed RMS level

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
      
      // Create M/S processing nodes for spatial enhancement
      // Uses native Web Audio API ChannelSplitter/Merger for true stereo processing
      this.initializeStereoWidthProcessor();

      // Initialize premium effects (PBE, SBR, Dynamic EQ)
      this.initializePremiumEffects();

      // Connect EQ chain
      let currentNode: any = this.eqFilters[0];
      for (let i = 1; i < this.eqFilters.length; i++) {
        currentNode.connect(this.eqFilters[i]);
        currentNode = this.eqFilters[i];
      }
      
      // Signal chain: EQ → Dynamic EQ → PBE → SBR → Dry/Wet (Reverb)
      const eqOutput = this.eqFilters[this.eqFilters.length - 1];
      
      // Connect premium effects chain: EQ → DynamicEQ → PBE → SBR → Reverb
      let premiumChainOutput: globalThis.AudioNode | BiquadFilterNode = eqOutput;
      
      // Dynamic EQ comes first (Fletcher-Munson compensation)
      if (this.dynamicEQInputGain && this.dynamicEQOutputGain) {
        eqOutput.connect(this.dynamicEQInputGain as unknown as GainNode);
        premiumChainOutput = this.dynamicEQOutputGain;
      }
      
      // PBE (Psychoacoustic Bass Enhancement) comes second
      if (this.pbeInputGain && this.pbeOutputGain) {
        (premiumChainOutput as any).connect(this.pbeInputGain);
        premiumChainOutput = this.pbeOutputGain;
      }
      
      // SBR (Spectral Band Replication) comes third
      if (this.sbrInputGain && this.sbrOutputGain) {
        (premiumChainOutput as any).connect(this.sbrInputGain);
        premiumChainOutput = this.sbrOutputGain;
      }
      
      // Premium chain output connects to dry/wet paths for reverb
      (premiumChainOutput as any).connect(this.dryGain);
      
      // Connect reverb delay lines (parallel structure) - from premium chain output
      this.reverbDelays.forEach(({ delay, feedback, filter }) => {
        (premiumChainOutput as any).connect(delay);
        delay.connect(filter);
        filter.connect(feedback);
        feedback.connect(delay); // Feedback loop
        filter.connect(this.wetGain!);
      });
      
      // Mix dry and wet, then through M/S processing for spatial enhancement, then to master output
      // Signal chain: EQ → Dry/Wet Mix → M/S Processing → Master → Destination
      if (this.msProcessingEnabled && this.stereoSplitter && this.stereoMerger && this.stereoMixNode) {
        // Connect dry/wet to mix node first (preserves stereo before splitting)
        this.dryGain.connect(this.stereoMixNode);
        this.wetGain.connect(this.stereoMixNode);
        // Mix node to stereo splitter (cast to any for native Web Audio API cross-type connection)
        (this.stereoMixNode as any).connect(this.stereoSplitter);
        // Stereo merger output to master (cast to any for native Web Audio API cross-type connection)
        (this.stereoMerger as any).connect(this.masterGain);
      } else {
        // Fallback: bypass M/S processing
        this.dryGain.connect(this.masterGain);
        this.wetGain.connect(this.masterGain);
      }
      this.masterGain.connect(this.audioContext.destination);

      // Initialize psychoacoustic processor (configures nodes in disabled state)
      this.initializePsychoacousticProcessor();

      this.isInitialized = true;
      console.log('[WebAudioEffectsEngine] Initialized with 10-band EQ, reverb, and psychoacoustic enhancement');
      return true;
    } catch (error) {
      console.error('[WebAudioEffectsEngine] Failed to initialize:', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return Platform.OS !== 'web' || typeof window !== 'undefined';
  }

  /**
   * Initialize M/S (Mid-Side) processing for spatial enhancement
   * 
   * Signal Flow:
   * Input (Stereo) → Splitter → [M/S Encode] → [Width Control] → [M/S Decode] → Merger → Output
   * 
   * M/S Encoding:
   *   Mid = (L + R) / 2  (center/mono content)
   *   Side = (L - R) / 2  (stereo difference)
   * 
   * Width Control:
   *   Side signal is multiplied by width factor (0 = mono, 1 = original, 2+ = wider)
   * 
   * M/S Decoding:
   *   L = Mid + Side
   *   R = Mid - Side
   */
  private initializeStereoWidthProcessor(): void {
    if (!this.audioContext || Platform.OS !== 'web') {
      console.log('[WebAudioEffectsEngine] M/S Processing: Not available (non-web platform)');
      return;
    }

    try {
      // Access native Web Audio API methods through the context
      const nativeCtx = this.audioContext as unknown as NativeAudioContext;
      
      // Check if native methods are available
      if (typeof nativeCtx.createChannelSplitter !== 'function' || 
          typeof nativeCtx.createChannelMerger !== 'function') {
        console.log('[WebAudioEffectsEngine] M/S Processing: Native channel nodes not available');
        return;
      }

      // Create mix node to sum dry+wet before stereo processing
      // This preserves stereo content before splitting to L/R
      this.stereoMixNode = nativeCtx.createGain() as unknown as GainNode;
      this.stereoMixNode.gain.value = 1.0;
      
      // Create splitter (2 channels: L, R)
      this.stereoSplitter = nativeCtx.createChannelSplitter(2);
      
      // Create merger (2 channels: L, R)
      this.stereoMerger = nativeCtx.createChannelMerger(2);
      
      // Create M/S encoding gain nodes
      // Mid = (L + R) / 2: Both L and R contribute with gain 0.5
      this.midGainL = nativeCtx.createGain() as unknown as GainNode;
      this.midGainL.gain.value = 0.5;
      this.midGainR = nativeCtx.createGain() as unknown as GainNode;
      this.midGainR.gain.value = 0.5;
      
      // Side = (L - R) / 2: L contributes +0.5, R contributes -0.5
      this.sideGainL = nativeCtx.createGain() as unknown as GainNode;
      this.sideGainL.gain.value = 0.5;
      this.sideGainR = nativeCtx.createGain() as unknown as GainNode;
      this.sideGainR.gain.value = -0.5; // Inverted for subtraction
      
      // Width control: multiplies Side signal (default 1.0 = original stereo)
      this.sideWidth = nativeCtx.createGain() as unknown as GainNode;
      this.sideWidth.gain.value = 1.0;
      
      // Create M/S decoding gain nodes
      // L = Mid + Side: Both contribute with gain 1.0
      this.midToL = nativeCtx.createGain() as unknown as GainNode;
      this.midToL.gain.value = 1.0;
      this.sideToL = nativeCtx.createGain() as unknown as GainNode;
      this.sideToL.gain.value = 1.0;
      
      // R = Mid - Side: Mid contributes +1.0, Side contributes -1.0
      this.midToR = nativeCtx.createGain() as unknown as GainNode;
      this.midToR.gain.value = 1.0;
      this.sideToR = nativeCtx.createGain() as unknown as GainNode;
      this.sideToR.gain.value = -1.0; // Inverted for subtraction
      
      // Create intermediate sum nodes for Mid and Side
      const midSum = nativeCtx.createGain();
      midSum.gain.value = 1.0;
      const sideSum = nativeCtx.createGain();
      sideSum.gain.value = 1.0;
      
      // Create psychoacoustic enhancement nodes
      // These are inserted AFTER the existing side processing (sideWidth)
      this.sideHighpass = nativeCtx.createBiquadFilter();
      this.sideHighpass.type = 'highpass';
      this.sideHighpass.frequency.value = 1; // Start bypassed (1Hz passes everything)
      this.sideHighpass.Q.value = 0.707;
      
      this.sideDelay = nativeCtx.createDelay(0.01); // Max 10ms
      this.sideDelay.delayTime.value = 0; // Start bypassed
      
      this.allPass1 = nativeCtx.createBiquadFilter();
      this.allPass1.type = 'allpass';
      this.allPass1.frequency.value = 3000;
      this.allPass1.Q.value = 0.7;
      
      this.allPass2 = nativeCtx.createBiquadFilter();
      this.allPass2.type = 'allpass';
      this.allPass2.frequency.value = 5000;
      this.allPass2.Q.value = 0.7;
      
      this.sidePsychoGain = nativeCtx.createGain();
      this.sidePsychoGain.gain.value = 1.0; // Start at passthrough (disabled state)
      
      this.midAttenuation = nativeCtx.createGain();
      this.midAttenuation.gain.value = 1.0; // Start at passthrough (disabled state)
      
      // Connect M/S Encoding:
      // Splitter[0] (L) → midGainL → midSum
      // Splitter[1] (R) → midGainR → midSum
      this.stereoSplitter.connect(this.midGainL as unknown as globalThis.GainNode, 0);
      this.stereoSplitter.connect(this.midGainR as unknown as globalThis.GainNode, 1);
      (this.midGainL as unknown as globalThis.GainNode).connect(midSum);
      (this.midGainR as unknown as globalThis.GainNode).connect(midSum);
      
      // Splitter[0] (L) → sideGainL → sideSum
      // Splitter[1] (R) → sideGainR (inverted) → sideSum
      this.stereoSplitter.connect(this.sideGainL as unknown as globalThis.GainNode, 0);
      this.stereoSplitter.connect(this.sideGainR as unknown as globalThis.GainNode, 1);
      (this.sideGainL as unknown as globalThis.GainNode).connect(sideSum);
      (this.sideGainR as unknown as globalThis.GainNode).connect(sideSum);
      
      // sideSum → sideWidth (existing width control)
      sideSum.connect(this.sideWidth as unknown as globalThis.GainNode);
      
      // Connect psychoacoustic chain AFTER sideWidth:
      // sideWidth → sideHighpass → sideDelay → allPass1 → allPass2 → sidePsychoGain
      (this.sideWidth as unknown as globalThis.GainNode).connect(this.sideHighpass);
      this.sideHighpass.connect(this.sideDelay);
      this.sideDelay.connect(this.allPass1);
      this.allPass1.connect(this.allPass2);
      this.allPass2.connect(this.sidePsychoGain);
      
      // Connect M/S Decoding:
      // Mid path: midSum → midAttenuation → midToL/midToR → Merger
      midSum.connect(this.midAttenuation);
      this.midAttenuation.connect(this.midToL as unknown as globalThis.GainNode);
      this.midAttenuation.connect(this.midToR as unknown as globalThis.GainNode);
      (this.midToL as unknown as globalThis.GainNode).connect(this.stereoMerger, 0, 0);
      (this.midToR as unknown as globalThis.GainNode).connect(this.stereoMerger, 0, 1);
      
      // Side path: sidePsychoGain → sideToL/sideToR → Merger
      this.sidePsychoGain.connect(this.sideToL as unknown as globalThis.GainNode);
      this.sidePsychoGain.connect(this.sideToR as unknown as globalThis.GainNode);
      (this.sideToL as unknown as globalThis.GainNode).connect(this.stereoMerger, 0, 0);
      (this.sideToR as unknown as globalThis.GainNode).connect(this.stereoMerger, 0, 1);
      
      this.msProcessingEnabled = true;
      console.log('[WebAudioEffectsEngine] M/S processing with psychoacoustic chain initialized');
    } catch (error) {
      console.error('[WebAudioEffectsEngine] M/S processing: Failed to initialize:', error);
      this.msProcessingEnabled = false;
    }
  }

  /**
   * Initialize Psychoacoustic Processor configuration
   * Called at end of initialize() to configure the psychoacoustic enhancement nodes
   * The nodes are already created and connected in initializeStereoWidthProcessor()
   * This method just ensures they start in disabled (passthrough) state
   */
  private initializePsychoacousticProcessor(): void {
    if (!this.msProcessingEnabled || !this.sideHighpass || !this.sideDelay || 
        !this.sidePsychoGain || !this.midAttenuation) {
      console.log('[WebAudioEffectsEngine] Psychoacoustic: Cannot configure (M/S processing not available)');
      return;
    }

    // Ensure psychoacoustic processing starts disabled (passthrough state)
    // Highpass at 1Hz effectively passes all audio
    this.sideHighpass.frequency.value = 1;
    this.sideHighpass.Q.value = 0.707;
    
    // No ITD delay when disabled
    this.sideDelay.delayTime.value = 0;
    
    // All-pass filters always pass audio, but with configured frequencies for when enabled
    if (this.allPass1) {
      this.allPass1.frequency.value = 3000;
      this.allPass1.Q.value = 0.7;
    }
    if (this.allPass2) {
      this.allPass2.frequency.value = 5000;
      this.allPass2.Q.value = 0.7;
    }
    
    // Gains at passthrough (1.0) when disabled
    this.sidePsychoGain.gain.value = 1.0;
    this.midAttenuation.gain.value = 1.0;
    
    this.spatialEnhancementLevel = 0;
    console.log('[WebAudioEffectsEngine] Psychoacoustic: Processor configured (disabled state)');
  }

  /**
   * Initialize Premium Effects: PBE, SBR, and Dynamic EQ
   * All processing uses 32-bit float throughout
   */
  private initializePremiumEffects(): void {
    if (!this.audioContext || Platform.OS !== 'web') {
      console.log('[WebAudioEffectsEngine] Premium Effects: Not available (non-web platform)');
      return;
    }

    try {
      const nativeCtx = this.audioContext as unknown as NativeAudioContext;

      // ==========================================
      // Dynamic Volume EQ (Fletcher-Munson Compensation)
      // Signal: Input → Analyser → BassShelf → TrebleShelf → Output
      // ==========================================
      this.dynamicEQInputGain = nativeCtx.createGain();
      this.dynamicEQInputGain.gain.value = 1.0;
      
      this.dynamicEQAnalyser = nativeCtx.createAnalyser();
      this.dynamicEQAnalyser.fftSize = 2048;
      this.dynamicEQAnalyser.smoothingTimeConstant = 0.8;
      
      this.dynamicEQBassShelf = nativeCtx.createBiquadFilter();
      this.dynamicEQBassShelf.type = 'lowshelf';
      this.dynamicEQBassShelf.frequency.value = 100;
      this.dynamicEQBassShelf.gain.value = 0; // Start flat
      
      this.dynamicEQTrebleShelf = nativeCtx.createBiquadFilter();
      this.dynamicEQTrebleShelf.type = 'highshelf';
      this.dynamicEQTrebleShelf.frequency.value = 8000;
      this.dynamicEQTrebleShelf.gain.value = 0; // Start flat
      
      this.dynamicEQOutputGain = nativeCtx.createGain();
      this.dynamicEQOutputGain.gain.value = 1.0;
      
      // Connect Dynamic EQ chain
      this.dynamicEQInputGain.connect(this.dynamicEQAnalyser);
      this.dynamicEQAnalyser.connect(this.dynamicEQBassShelf);
      this.dynamicEQBassShelf.connect(this.dynamicEQTrebleShelf);
      this.dynamicEQTrebleShelf.connect(this.dynamicEQOutputGain);

      // ==========================================
      // Psychoacoustic Bass Enhancement (PBE)
      // Signal: Input → [Lowpass → Waveshaper → Bandpass → HarmonicsGain] + [BypassGain] → Output
      // ==========================================
      this.pbeInputGain = nativeCtx.createGain();
      this.pbeInputGain.gain.value = 1.0;
      
      // Lowpass filter at 100Hz to extract sub-bass
      this.pbeLowpass = nativeCtx.createBiquadFilter();
      this.pbeLowpass.type = 'lowpass';
      this.pbeLowpass.frequency.value = 100;
      this.pbeLowpass.Q.value = 0.707;
      
      // Waveshaper with polynomial curve: y = x + 0.5*x² + 0.25*x³
      this.pbeWaveshaper = nativeCtx.createWaveShaper();
      this.pbeWaveshaper.curve = this.createPBEWaveshaperCurve();
      this.pbeWaveshaper.oversample = '4x'; // High quality processing
      
      // Bandpass filter 100-400Hz to keep useful harmonics
      this.pbeBandpass = nativeCtx.createBiquadFilter();
      this.pbeBandpass.type = 'bandpass';
      this.pbeBandpass.frequency.value = 200; // Center frequency
      this.pbeBandpass.Q.value = 0.667; // Q for ~100-400Hz range
      
      // Harmonics gain (wet signal)
      this.pbeHarmonicsGain = nativeCtx.createGain();
      this.pbeHarmonicsGain.gain.value = 0; // Start disabled
      
      // Bypass gain (dry signal)
      this.pbeBypassGain = nativeCtx.createGain();
      this.pbeBypassGain.gain.value = 1.0;
      
      // Output mixer
      this.pbeOutputGain = nativeCtx.createGain();
      this.pbeOutputGain.gain.value = 1.0;
      
      // Connect PBE chain
      // Wet path: Input → Lowpass → Waveshaper → Bandpass → HarmonicsGain → Output
      this.pbeInputGain.connect(this.pbeLowpass);
      this.pbeLowpass.connect(this.pbeWaveshaper);
      this.pbeWaveshaper.connect(this.pbeBandpass);
      this.pbeBandpass.connect(this.pbeHarmonicsGain);
      this.pbeHarmonicsGain.connect(this.pbeOutputGain);
      
      // Dry path: Input → BypassGain → Output
      this.pbeInputGain.connect(this.pbeBypassGain);
      this.pbeBypassGain.connect(this.pbeOutputGain);

      // ==========================================
      // Spectral Band Replication (SBR) - Audio Upscaling
      // Signal: Input → [Highpass → Waveshaper → Highshelf → HarmonicsGain] + [BypassGain] → Output
      // ==========================================
      this.sbrInputGain = nativeCtx.createGain();
      this.sbrInputGain.gain.value = 1.0;
      
      // Highpass filter at 8kHz to isolate upper harmonics
      this.sbrHighpass = nativeCtx.createBiquadFilter();
      this.sbrHighpass.type = 'highpass';
      this.sbrHighpass.frequency.value = 8000;
      this.sbrHighpass.Q.value = 0.707;
      
      // Waveshaper with soft tanh curve for harmonic extension
      this.sbrWaveshaper = nativeCtx.createWaveShaper();
      this.sbrWaveshaper.curve = this.createSBRWaveshaperCurve();
      this.sbrWaveshaper.oversample = '4x'; // High quality processing
      
      // High-shelf filter boosting above 16kHz
      this.sbrHighshelf = nativeCtx.createBiquadFilter();
      this.sbrHighshelf.type = 'highshelf';
      this.sbrHighshelf.frequency.value = 16000;
      this.sbrHighshelf.gain.value = 6; // +6dB boost
      
      // Harmonics gain (wet signal) - 10-30% blend
      this.sbrHarmonicsGain = nativeCtx.createGain();
      this.sbrHarmonicsGain.gain.value = 0; // Start disabled
      
      // Bypass gain (dry signal)
      this.sbrBypassGain = nativeCtx.createGain();
      this.sbrBypassGain.gain.value = 1.0;
      
      // Output mixer
      this.sbrOutputGain = nativeCtx.createGain();
      this.sbrOutputGain.gain.value = 1.0;
      
      // Connect SBR chain
      // Wet path: Input → Highpass → Waveshaper → Highshelf → HarmonicsGain → Output
      this.sbrInputGain.connect(this.sbrHighpass);
      this.sbrHighpass.connect(this.sbrWaveshaper);
      this.sbrWaveshaper.connect(this.sbrHighshelf);
      this.sbrHighshelf.connect(this.sbrHarmonicsGain);
      this.sbrHarmonicsGain.connect(this.sbrOutputGain);
      
      // Dry path: Input → BypassGain → Output
      this.sbrInputGain.connect(this.sbrBypassGain);
      this.sbrBypassGain.connect(this.sbrOutputGain);

      console.log('[WebAudioEffectsEngine] Premium Effects initialized: PBE, SBR, Dynamic EQ');
    } catch (error) {
      console.error('[WebAudioEffectsEngine] Premium Effects: Failed to initialize:', error);
    }
  }

  /**
   * Create PBE waveshaper curve: y = x + 0.5*x² + 0.25*x³
   * Generates even (2nd) and odd (3rd) harmonics for bass enhancement
   */
  private createPBEWaveshaperCurve(): Float32Array {
    const samples = 8192;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; // Map to -1 to 1
      // Polynomial: y = x + 0.5*x² + 0.25*x³
      let y = x + 0.5 * x * x + 0.25 * x * x * x;
      // Soft clip to prevent harsh distortion
      y = Math.tanh(y);
      curve[i] = y;
    }
    return curve;
  }

  /**
   * Create SBR waveshaper curve: soft tanh for harmonic extension
   * Gentle saturation to create higher harmonics from existing content
   */
  private createSBRWaveshaperCurve(): Float32Array {
    const samples = 8192;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; // Map to -1 to 1
      // Soft tanh curve with slight drive for harmonic generation
      const drive = 1.5;
      curve[i] = Math.tanh(x * drive);
    }
    return curve;
  }

  /**
   * Start Dynamic EQ RMS tracking loop
   * Adjusts bass/treble shelves based on output level (Fletcher-Munson curves)
   */
  private startDynamicEQTracking(): void {
    if (!this.dynamicEQAnalyser || !this.dynamicEQBassShelf || !this.dynamicEQTrebleShelf) {
      return;
    }
    
    const bufferLength = this.dynamicEQAnalyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    
    const updateDynamicEQ = () => {
      if (!this.dynamicEQEnabled || !this.dynamicEQAnalyser) {
        this.dynamicEQAnimationFrame = null;
        return;
      }
      
      // Get time domain data for RMS calculation
      this.dynamicEQAnalyser.getFloatTimeDomainData(dataArray);
      
      // Calculate RMS
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      
      // Smooth RMS with exponential moving average
      const smoothingFactor = 0.1;
      this.dynamicEQCurrentRMS = this.dynamicEQCurrentRMS * (1 - smoothingFactor) + rms * smoothingFactor;
      
      // Convert RMS to dB (reference: 1.0 = 0dB)
      const rmsDb = 20 * Math.log10(Math.max(this.dynamicEQCurrentRMS, 0.0001));
      
      // Fletcher-Munson compensation:
      // At low levels (-40dB and below): boost bass and treble
      // At high levels (-10dB and above): flatten to neutral
      // Smooth interpolation between
      const minDb = -40;
      const maxDb = -10;
      const normalizedLevel = Math.max(0, Math.min(1, (rmsDb - minDb) / (maxDb - minDb)));
      
      // At low levels, we need more bass and treble boost (inverse of Fletcher-Munson)
      // Maximum boost at lowest levels, no boost at highest levels
      const compensationFactor = (1 - normalizedLevel) * this.dynamicEQStrength;
      
      // Bass boost: up to +8dB at 100Hz at low levels
      const bassBoostDb = compensationFactor * 8;
      // Treble boost: up to +6dB at 8kHz at low levels
      const trebleBoostDb = compensationFactor * 6;
      
      // Apply with smooth transitions
      if (this.dynamicEQBassShelf) {
        this.dynamicEQBassShelf.gain.value = bassBoostDb;
      }
      if (this.dynamicEQTrebleShelf) {
        this.dynamicEQTrebleShelf.gain.value = trebleBoostDb;
      }
      
      // Continue tracking
      this.dynamicEQAnimationFrame = requestAnimationFrame(updateDynamicEQ);
    };
    
    // Start the tracking loop
    this.dynamicEQAnimationFrame = requestAnimationFrame(updateDynamicEQ);
  }

  /**
   * Stop Dynamic EQ RMS tracking loop
   */
  private stopDynamicEQTracking(): void {
    if (this.dynamicEQAnimationFrame !== null) {
      cancelAnimationFrame(this.dynamicEQAnimationFrame);
      this.dynamicEQAnimationFrame = null;
    }
    
    // Reset to flat response
    if (this.dynamicEQBassShelf) {
      this.dynamicEQBassShelf.gain.value = 0;
    }
    if (this.dynamicEQTrebleShelf) {
      this.dynamicEQTrebleShelf.gain.value = 0;
    }
    
    this.dynamicEQCurrentRMS = 0;
  }

  // ==========================================
  // Premium Effects Control Methods
  // ==========================================

  /**
   * Enable/disable Psychoacoustic Bass Enhancement
   */
  setPBEEnabled(enabled: boolean): void {
    this.pbeEnabled = enabled;
    this.updatePBEGains();
    console.log(`[WebAudioEffectsEngine] PBE: ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Set PBE intensity (0-1)
   * Controls how much harmonic content is blended with original
   */
  setPBEIntensity(intensity: number): void {
    this.pbeIntensity = Math.max(0, Math.min(1, intensity));
    this.updatePBEGains();
    console.log(`[WebAudioEffectsEngine] PBE Intensity: ${(this.pbeIntensity * 100).toFixed(0)}%`);
  }

  private updatePBEGains(): void {
    if (!this.pbeHarmonicsGain || !this.pbeBypassGain) return;
    
    if (this.pbeEnabled) {
      // Wet/dry crossfade based on intensity
      // At 0 intensity: full dry, no harmonics
      // At 1 intensity: 50% dry, 50% harmonics (never fully wet)
      const wetAmount = this.pbeIntensity * 0.5;
      const dryAmount = 1.0 - (this.pbeIntensity * 0.3); // Slight reduction of dry
      
      this.pbeHarmonicsGain.gain.value = wetAmount;
      this.pbeBypassGain.gain.value = dryAmount;
    } else {
      // Disabled: full bypass
      this.pbeHarmonicsGain.gain.value = 0;
      this.pbeBypassGain.gain.value = 1.0;
    }
  }

  /**
   * Enable/disable Spectral Band Replication
   */
  setSBREnabled(enabled: boolean): void {
    this.sbrEnabled = enabled;
    this.updateSBRGains();
    console.log(`[WebAudioEffectsEngine] SBR: ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Set SBR intensity (0-1)
   * Controls blend amount (maps to 10-30% range)
   */
  setSBRIntensity(intensity: number): void {
    this.sbrIntensity = Math.max(0, Math.min(1, intensity));
    this.updateSBRGains();
    console.log(`[WebAudioEffectsEngine] SBR Intensity: ${(this.sbrIntensity * 100).toFixed(0)}%`);
  }

  private updateSBRGains(): void {
    if (!this.sbrHarmonicsGain || !this.sbrBypassGain) return;
    
    if (this.sbrEnabled) {
      // Map intensity to 10-30% wet blend range
      const wetAmount = 0.1 + (this.sbrIntensity * 0.2); // 10-30%
      this.sbrHarmonicsGain.gain.value = wetAmount;
      this.sbrBypassGain.gain.value = 1.0; // Keep full dry
    } else {
      // Disabled: full bypass
      this.sbrHarmonicsGain.gain.value = 0;
      this.sbrBypassGain.gain.value = 1.0;
    }
  }

  /**
   * Enable/disable Dynamic Volume EQ (Fletcher-Munson Compensation)
   */
  setDynamicEQEnabled(enabled: boolean): void {
    this.dynamicEQEnabled = enabled;
    
    if (enabled) {
      this.startDynamicEQTracking();
    } else {
      this.stopDynamicEQTracking();
    }
    
    console.log(`[WebAudioEffectsEngine] Dynamic EQ: ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Set Dynamic EQ strength (0-1)
   * Controls how much compensation is applied at low levels
   */
  setDynamicEQStrength(strength: number): void {
    this.dynamicEQStrength = Math.max(0, Math.min(1, strength));
    console.log(`[WebAudioEffectsEngine] Dynamic EQ Strength: ${(this.dynamicEQStrength * 100).toFixed(0)}%`);
  }

  /**
   * Get current status of all premium effects
   */
  getPremiumEffectsStatus(): {
    pbeEnabled: boolean;
    pbeIntensity: number;
    sbrEnabled: boolean;
    sbrIntensity: number;
    dynamicEQEnabled: boolean;
    dynamicEQStrength: number;
  } {
    return {
      pbeEnabled: this.pbeEnabled,
      pbeIntensity: this.pbeIntensity,
      sbrEnabled: this.sbrEnabled,
      sbrIntensity: this.sbrIntensity,
      dynamicEQEnabled: this.dynamicEQEnabled,
      dynamicEQStrength: this.dynamicEQStrength,
    };
  }

  /**
   * Set Spatial Enhancement Level using the 6-Level Slider System
   * 
   * Level 0: Off - No processing (0.0x multiplier)
   * Level 1: Subtle - 3% sideGain, 0.10ms ITD, 3% decorr, 10% wet (0.5x multiplier)
   * Level 2: Mild - 6% sideGain, 0.15ms ITD, 5% decorr, 20% wet (1.0x multiplier)
   * Level 3: Moderate - 10% sideGain, 0.25ms ITD, 8% decorr, 30% wet (1.25x multiplier)
   * Level 4: Enhanced - 14% sideGain, 0.40ms ITD, 12% decorr, 40% wet (1.4x multiplier)
   * Level 5: Maximum - 18% sideGain, 0.60ms ITD, 18% decorr, 55% wet (1.5x multiplier)
   * 
   * @param level - Spatial enhancement level 0-5 (0 = off, 5 = max)
   */
  setSpatialEnhancement(level: number): void {
    const clampedLevel = Math.max(0, Math.min(5, Math.round(level)));
    
    if (!this.msProcessingEnabled) {
      console.log('[WebAudioEffectsEngine] Psychoacoustic: Cannot enable (M/S processing not available)');
      this.spatialEnhancementLevel = 0;
      return;
    }

    if (!this.sideHighpass || !this.sideDelay || !this.sidePsychoGain || !this.midAttenuation) {
      console.log('[WebAudioEffectsEngine] Psychoacoustic: Nodes not initialized');
      this.spatialEnhancementLevel = 0;
      return;
    }

    this.spatialEnhancementLevel = clampedLevel;
    
    // Get slider values for this level
    const sideGainPercent = SLIDER_SIDE_GAIN[clampedLevel];
    const itdMs = SLIDER_ITD_MS[clampedLevel];
    const decorrelation = SLIDER_DECORRELATION[clampedLevel];
    const wetMix = SLIDER_WET_MIX[clampedLevel];
    const multiplier = SLIDER_MULTIPLIERS[clampedLevel];
    const levelName = SLIDER_LEVEL_NAMES[clampedLevel];

    if (clampedLevel === 0) {
      this.sideHighpass.frequency.value = 1;
      this.sideDelay.delayTime.value = 0;
      this.sidePsychoGain.gain.value = 1.0;
      this.midAttenuation.gain.value = 1.0;
      console.log(`[WebAudioEffectsEngine] Spatial: ${levelName} (${multiplier}x)`);
    } else {
      this.sideHighpass.frequency.value = 150;
      this.sideHighpass.Q.value = 0.707;
      
      // ITD delay from slider values (ms to seconds)
      this.sideDelay.delayTime.value = Math.min(itdMs, MAX_ITD_MS) / 1000;
      
      // Side gain from slider values
      const wetFactor = wetMix / MAX_WET_MIX;
      const baseSideMultiplier = 1.0 + (sideGainPercent / 100);
      let psychoGain = 1.0 + ((baseSideMultiplier - 1.0) * wetFactor);
      psychoGain = Math.min(psychoGain, 1.0 + (MAX_SIDE_GAIN_PERCENT / 100)); // Safety cap
      this.sidePsychoGain.gain.value = psychoGain;
      
      // Mid attenuation
      this.midAttenuation.gain.value = 1.0 - (0.15 * wetFactor);
      
      // Configure all-pass decorrelation
      if (this.allPass1 && this.allPass2) {
        const decorrelationQ = 0.3 + (decorrelation / MAX_DECORRELATION) * 1.2;
        this.allPass1.Q.value = decorrelationQ;
        this.allPass2.Q.value = decorrelationQ * 0.85;
      }
      
      console.log(`[WebAudioEffectsEngine] Spatial: ${levelName} (${multiplier}x) - sideGain:${sideGainPercent}%, ITD:${itdMs}ms, decorr:${decorrelation}%, wet:${wetMix}%`);
    }
  }
  
  /**
   * Get the current slider multiplier based on the spatial enhancement level.
   */
  getSliderMultiplier(): number {
    return SLIDER_MULTIPLIERS[Math.max(0, Math.min(5, this.spatialEnhancementLevel))];
  }

  /**
   * Apply Spatial Enhancement with explicit parameters
   * Values are applied directly with safety caps (no combination with slider).
   * The slider and immersive modes work independently - when immersive mode is active,
   * it uses its own fixed spatial params; when slider is used, it applies its level values.
   * 
   * @param params - Explicit spatial enhancement parameters
   *   - sideGain: Side channel gain boost in % (+6 means 1.06x = +0.5dB)
   *   - itdMs: Inter-aural Time Difference in milliseconds (0-0.7ms)
   *   - decorrelation: Decorrelation amount in % (controls all-pass filter intensity)
   *   - wetMix: Wet mix for psychoacoustic effect in % (blends processed/unprocessed)
   */
  applySpatialEnhancementParams(params: SpatialEnhancementParams): void {
    if (!this.msProcessingEnabled) {
      console.log('[WebAudioEffectsEngine] Psychoacoustic: Cannot enable (M/S processing not available)');
      this.spatialEnhancementLevel = 0;
      return;
    }

    if (!this.sideHighpass || !this.sideDelay || !this.sidePsychoGain || !this.midAttenuation) {
      console.log('[WebAudioEffectsEngine] Psychoacoustic: Nodes not initialized');
      this.spatialEnhancementLevel = 0;
      return;
    }

    const { sideGain, itdMs, decorrelation, wetMix } = params;
    
    // Apply hard safety caps directly (no slider multiplier combination)
    const finalSideGain = Math.min(Math.max(0, sideGain), MAX_SIDE_GAIN_PERCENT);
    const finalItdMs = Math.min(Math.max(0, itdMs), MAX_ITD_MS);
    const finalDecorrelation = Math.min(Math.max(0, decorrelation), MAX_DECORRELATION);
    const finalWetMix = Math.min(Math.max(0, wetMix), MAX_WET_MIX);

    // Check if spatial enhancement should be disabled
    if (finalSideGain === 0 && finalItdMs === 0 && finalDecorrelation === 0 && finalWetMix === 0) {
      this.sideHighpass.frequency.value = 1;
      this.sideDelay.delayTime.value = 0;
      this.sidePsychoGain.gain.value = 1.0;
      this.midAttenuation.gain.value = 1.0;
      this.spatialEnhancementLevel = 0;
      console.log('[WebAudioEffectsEngine] Spatial enhancement disabled (all params zero)');
      return;
    }

    // Set pseudo-level for compatibility (based on finalWetMix)
    this.spatialEnhancementLevel = finalWetMix <= 0 ? 0 : Math.ceil(finalWetMix / 11);

    // Highpass at 150Hz - protects bass from widening
    this.sideHighpass.frequency.value = 150;
    this.sideHighpass.Q.value = 0.707;
    
    // ITD delay (ms to seconds)
    this.sideDelay.delayTime.value = finalItdMs / 1000;
    
    // Side gain with safety cap
    const wetFactor = finalWetMix / MAX_WET_MIX;
    const baseSideMultiplier = 1.0 + (finalSideGain / 100);
    let effectiveSideGain = 1.0 + ((baseSideMultiplier - 1.0) * wetFactor);
    effectiveSideGain = Math.min(effectiveSideGain, 1.0 + (MAX_SIDE_GAIN_PERCENT / 100));
    this.sidePsychoGain.gain.value = effectiveSideGain;
    
    // Mid attenuation
    const midAttenuation = 1.0 - (0.15 * wetFactor);
    this.midAttenuation.gain.value = midAttenuation;
    
    // Configure all-pass decorrelation filters
    if (this.allPass1 && this.allPass2) {
      const decorrelationQ = 0.3 + (finalDecorrelation / MAX_DECORRELATION) * 1.2;
      this.allPass1.Q.value = decorrelationQ;
      this.allPass2.Q.value = decorrelationQ * 0.85;
    }

    console.log(`[WebAudioEffectsEngine] Spatial params set: sideGain:${finalSideGain.toFixed(1)}%, ITD:${finalItdMs.toFixed(2)}ms, decorr:${finalDecorrelation.toFixed(1)}%, wet:${finalWetMix.toFixed(1)}%`);
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
    this.applyImmersiveEQ(mode.eqPreset, mode.bassBoost, mode.trebleBoost, mode.reverb, mode.spatialParams);
    this.currentMode = modeName;
  }

  /**
   * Apply EQ settings for immersive modes WITHOUT zero-sum normalization.
   * Immersive modes have their own creative curves that shouldn't be balanced.
   * The limiter in PlayerContext handles distortion prevention.
   */
  private applyImmersiveEQ(bands: number[], bassBoost: number, trebleBoost: number, reverb: number = 0, spatialParams?: SpatialEnhancementParams): void {
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

    // Apply spatial enhancement with explicit parameters
    if (spatialParams) {
      this.applySpatialEnhancementParams(spatialParams);
    } else {
      this.setSpatialEnhancement(0); // Default to off
    }

    this.currentEQValues = paddedBands;
    const paramsStr = spatialParams 
      ? `sideGain:${spatialParams.sideGain}%, ITD:${spatialParams.itdMs}ms, decorr:${spatialParams.decorrelation}%, wetMix:${spatialParams.wetMix}%`
      : 'disabled';
    console.log(`[WebAudioEffectsEngine] Applied immersive mode with bass:${bassBoost}, treble:${trebleBoost}, reverb:${reverb}, spatial:[${paramsStr}]`);
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
    // Stop Dynamic EQ tracking before closing context
    this.stopDynamicEQTracking();
    
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
    
    // Clean up M/S processing nodes
    this.stereoSplitter = null;
    this.stereoMerger = null;
    this.stereoMixNode = null;
    this.midGainL = null;
    this.midGainR = null;
    this.sideGainL = null;
    this.sideGainR = null;
    this.sideWidth = null;
    this.midToL = null;
    this.midToR = null;
    this.sideToL = null;
    this.sideToR = null;
    
    // Clean up psychoacoustic enhancement nodes
    this.sideHighpass = null;
    this.sideDelay = null;
    this.allPass1 = null;
    this.allPass2 = null;
    this.sidePsychoGain = null;
    this.midAttenuation = null;
    this.spatialEnhancementLevel = 0;
    this.msProcessingEnabled = false;
    
    // Clean up Premium Effects: PBE
    this.pbeInputGain = null;
    this.pbeLowpass = null;
    this.pbeWaveshaper = null;
    this.pbeBandpass = null;
    this.pbeHarmonicsGain = null;
    this.pbeBypassGain = null;
    this.pbeOutputGain = null;
    this.pbeEnabled = false;
    this.pbeIntensity = 0.5;
    
    // Clean up Premium Effects: SBR
    this.sbrInputGain = null;
    this.sbrHighpass = null;
    this.sbrWaveshaper = null;
    this.sbrHighshelf = null;
    this.sbrHarmonicsGain = null;
    this.sbrBypassGain = null;
    this.sbrOutputGain = null;
    this.sbrEnabled = false;
    this.sbrIntensity = 0.5;
    
    // Clean up Premium Effects: Dynamic EQ
    this.dynamicEQInputGain = null;
    this.dynamicEQAnalyser = null;
    this.dynamicEQBassShelf = null;
    this.dynamicEQTrebleShelf = null;
    this.dynamicEQOutputGain = null;
    this.dynamicEQEnabled = false;
    this.dynamicEQStrength = 0.5;
    this.dynamicEQCurrentRMS = 0;
    
    this.isInitialized = false;
    this.currentEQValues = new Array(10).fill(0);
    this.currentMode = 'off';
    this.currentReverb = 0;
    
    console.log('[WebAudioEffectsEngine] Released');
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get current audio processing information for debugging.
   * Matches Android SoftwareDSPAudioProcessor.getProcessingInfo() interface.
   */
  getProcessingInfo(): Record<string, any> {
    return {
      internalFormat: '32-bit float',
      inputEncoding: 'Web Audio API (32-bit float)',
      sampleRate: this.audioContext?.sampleRate ?? 'Not initialized',
      designSampleRate: 'Device native rate',
      enabled: this.isInitialized,
      eqActive: this.currentEQValues.some(v => v !== 0),
      bassBoostActive: false, // Integrated into EQ
      trebleBoostActive: false, // Integrated into EQ
      reverbActive: this.currentReverb > 0,
      spatialEnhancementLevel: this.spatialEnhancementLevel,
      spatialEnhancementActive: this.spatialEnhancementLevel > 0,
      psychoacousticGain: this.sidePsychoGain?.gain.value ?? 1.0,
      midAttenuation: this.midAttenuation?.gain.value ?? 1.0,
      // Premium Effects status
      premiumEffects: {
        pbeEnabled: this.pbeEnabled,
        pbeIntensity: this.pbeIntensity,
        pbeHarmonicsGain: this.pbeHarmonicsGain?.gain.value ?? 0,
        sbrEnabled: this.sbrEnabled,
        sbrIntensity: this.sbrIntensity,
        sbrHarmonicsGain: this.sbrHarmonicsGain?.gain.value ?? 0,
        dynamicEQEnabled: this.dynamicEQEnabled,
        dynamicEQStrength: this.dynamicEQStrength,
        dynamicEQCurrentRMS: this.dynamicEQCurrentRMS,
        dynamicEQBassBoost: this.dynamicEQBassShelf?.gain.value ?? 0,
        dynamicEQTrebleBoost: this.dynamicEQTrebleShelf?.gain.value ?? 0,
      },
    };
  }
}

export const WebAudioEffectsEngine = new WebAudioEffectsEngineClass();
