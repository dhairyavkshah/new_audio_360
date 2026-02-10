import { Platform } from 'react-native';
import { AudioContext, BiquadFilterNode, GainNode } from 'react-native-audio-api';
import { NeuralAudioProcessor, EnhancementLevel } from './NeuralAudioProcessor';
import { getDeviceCapabilities } from '@/lib/deviceCapabilities';

/**
 * WebAudioEffectsEngine - Pure software DSP for Web/Windows platform
 * 
 * Audio Processing Standards:
 * - Internal processing: 32-bit float (Web Audio API specification)
 * - Output: 16/24-bit PCM @ device sample rate (handled by AudioContext destination)
 * - True stereo processing with independent L/R channel states per BiquadFilterNode
 * 
 * Signal Chain:
 * Input → HF Restoration (highshelf @ 16kHz)
 *       → 10-Band EQ (includes Bass Shelf @ 60Hz, Treble Shelf @ 16kHz)
 *       → Bass Enhancement (parallel: lowpass @ 75Hz → WaveShaper → additive mix)
 *       → Dry/Wet Mix ← Multi-Tap Reverb
 *       → M/S Processing (Spatial Enhancement)
 *       → HRTF Filters (Pinna @ 2700Hz, Elevation @ 8000Hz)
 *       → Master Gain
 *       → Output (Limiter handled in PlayerContext)
 * 
 * Features:
 * - HRTF Integration: Peaking filters for spatial cues (activates at level >= 2)
 * - Bass Enhancement: Harmonic generation via waveshaping (0-100%, max +4dB)
 * - HF Restoration: High-shelf boost for spectral extension (0-100%, max +3dB)
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

// HRTF Gain per spatial level (dB) - matches Android implementation
const SLIDER_HRTF_GAIN = [0, 0, 2, 3, 4, 5]; // dB per level 0-5

// Bass Enhancement max boost (+4dB = 1.58x linear)
const MAX_BASS_ENHANCEMENT_GAIN = 1.58;

// HF Restoration max boost (3dB)
const MAX_HF_RESTORATION_DB = 3;

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
    eqPreset: [+0.8, +0.7, +0.1, -0.7, -0.7, 0.0, +1.0, +1.4, +0.5, -0.7],
    bassBoost: 0.542,    // +1.3 dB
    trebleBoost: 0.542,  // +1.3 dB
    reverb: 0.06,        // 6% reverb
    spatialEnhancement: 2, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 6, itdMs: 0.15, decorrelation: 5, wetMix: 25 },
  },
  '360_reality': {
    // Sony 360 Reality Audio inspired - maximum safe width, cinematic
    name: '360 Reality',
    eqPreset: [+0.3, +0.3, -0.3, -0.6, -0.6, 0.0, +0.9, +1.2, +0.3, -0.6],
    bassBoost: 0.375,    // +0.9 dB
    trebleBoost: 0.625,  // +1.5 dB
    reverb: 0.17,        // 17% reverb
    spatialEnhancement: 5, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 14, itdMs: 0.45, decorrelation: 12, wetMix: 55 },
  },
  gaming: {
    // Competitive gaming - strong positional cues
    name: 'Gaming',
    eqPreset: [+1.0, +0.9, +0.5, -1.0, -1.0, 0.0, +1.2, +1.8, +0.9, -1.5],
    bassBoost: 0.625,    // +1.5 dB
    trebleBoost: 0.875,  // +2.1 dB
    reverb: 0.06,        // 6% reverb
    spatialEnhancement: 3, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 16, itdMs: 0.35, decorrelation: 8, wetMix: 58 },
  },
  podcast: {
    // Voice clarity mode - pure, untouched signal
    name: 'Podcast',
    eqPreset: [-1.8, -1.6, -0.7, -0.5, +0.7, +1.3, +1.1, +1.4, +1.8, 0.0],
    bassBoost: -0.458,   // -1.1 dB
    trebleBoost: 1.083,  // +2.6 dB
    reverb: 0,           // 0% reverb
    spatialEnhancement: 0, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 0, itdMs: 0, decorrelation: 0, wetMix: 0 },
  },
  movie: {
    // Cinematic experience - dialogue-safe cinematic stage
    name: 'Movie',
    eqPreset: [-0.6, -0.5, -0.1, +0.7, +1.1, +1.1, +0.9, -0.3, -0.7, -1.4],
    bassBoost: 0.833,    // +2.0 dB
    trebleBoost: 0.625,  // +1.5 dB
    reverb: 0.11,        // 11% reverb
    spatialEnhancement: 4, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 12, itdMs: 0.30, decorrelation: 10, wetMix: 48 },
  },
  sports: {
    // Stadium/broadcast mode - wide ambience, focused commentary
    name: 'Sports',
    eqPreset: [+1.1, +1.0, +0.5, -0.6, -0.6, 0.0, +1.0, +1.0, -0.9, -2.2],
    bassBoost: 0.958,    // +2.3 dB
    trebleBoost: 0.333,  // +0.8 dB
    reverb: 0.09,        // 9% reverb
    spatialEnhancement: 2, // Legacy level (backward compatibility)
    spatialParams: { sideGain: 10, itdMs: 0.25, decorrelation: 7, wetMix: 45 },
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
  private msProcessingEnabled: boolean = false;

  // HRTF Enhancement nodes (for spatial level >= 2)
  private hrtfPinnaFilter: globalThis.BiquadFilterNode | null = null;     // Pinna notch @ 2700Hz
  private hrtfElevationFilter: globalThis.BiquadFilterNode | null = null; // Elevation cue @ 8000Hz

  // Bass Enhancement nodes (harmonic generation)
  private bassLowpassFilter: globalThis.BiquadFilterNode | null = null;   // Extract bass @ 75Hz
  private harmonicShaper: globalThis.WaveShaperNode | null = null;        // Soft clipping for harmonics
  private bassEnhancementGain: globalThis.GainNode | null = null;         // Mix control (0-1.58x)
  private bassEnhancementLevel: number = 0;                               // 0-100%

  // HF Restoration nodes (spectral extension)
  private hfRestoreFilter: globalThis.BiquadFilterNode | null = null;     // Highshelf @ 16kHz
  private hfRestorationEnabled: boolean = false;
  private hfRestorationLevel: number = 0;                                 // 0-100%
  private useNeuralProcessing: boolean = true;                            // Use neural AI upscaling
  private neuralProcessorInitialized: boolean = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      const capabilities = await getDeviceCapabilities();
      this.useNeuralProcessing = capabilities.enableAIUpscaling;
      
      if (!this.useNeuralProcessing && capabilities.memory.memoryClass === 'low') {
        console.warn('[WebAudioEffectsEngine] Low-memory device detected (<3GB): Neural processing disabled to conserve resources');
      }
      if (!this.useNeuralProcessing && capabilities.memory.totalRamMB < 4096 && capabilities.memory.memoryClass !== 'low') {
        console.warn('[WebAudioEffectsEngine] Medium-memory device detected (<4GB): Neural processing disabled to conserve resources');
      }
      
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

      // Create HF Restoration filter (highshelf @ 16kHz, 0-3dB boost)
      // Placed at input for spectral extension
      this.initializeHfRestoration();

      // Create Bass Enhancement nodes (harmonic generation)
      // Parallel path: lowpass → waveshaper → gain → mix back
      this.initializeBassEnhancement();

      // Create HRTF filters for spatial enhancement
      this.initializeHrtfFilters();
      
      // Create M/S processing nodes for spatial enhancement
      // Uses native Web Audio API ChannelSplitter/Merger for true stereo processing
      this.initializeStereoWidthProcessor();

      // Connect signal chain according to spec:
      // Input → HF Restoration → EQ Filters → Bass Enhancement (parallel) → Spatial (HRTF) → Reverb → Master → Output
      
      // 1. HF Restoration → first EQ filter (if available)
      if (this.hfRestoreFilter) {
        (this.hfRestoreFilter as any).connect(this.eqFilters[0]);
      }
      
      // 2. Connect EQ chain (10-band)
      let currentNode: any = this.eqFilters[0];
      for (let i = 1; i < this.eqFilters.length; i++) {
        currentNode.connect(this.eqFilters[i]);
        currentNode = this.eqFilters[i];
      }
      
      // 3. EQ output splits to dry path and reverb (wet path)
      const eqOutput = this.eqFilters[this.eqFilters.length - 1];
      eqOutput.connect(this.dryGain);
      
      // 4. Bass Enhancement (parallel additive path from EQ output)
      // Bass harmonics are generated and added back to dry signal
      if (this.bassLowpassFilter && this.bassEnhancementGain) {
        eqOutput.connect(this.bassLowpassFilter as any);
        (this.bassEnhancementGain as any).connect(this.dryGain);
      }
      
      // 5. Connect reverb delay lines (parallel structure)
      this.reverbDelays.forEach(({ delay, feedback, filter }) => {
        eqOutput.connect(delay);
        delay.connect(filter);
        filter.connect(feedback);
        feedback.connect(delay); // Feedback loop
        filter.connect(this.wetGain!);
      });
      
      // 6. Mix dry and wet, then through M/S processing + HRTF for spatial enhancement
      // Signal chain: EQ → Dry/Wet Mix → M/S Processing → HRTF → Master → Destination
      if (this.msProcessingEnabled && this.stereoSplitter && this.stereoMerger && this.stereoMixNode) {
        // Connect dry/wet to mix node first (preserves stereo before splitting)
        this.dryGain.connect(this.stereoMixNode);
        this.wetGain.connect(this.stereoMixNode);
        // Mix node to stereo splitter (cast to any for native Web Audio API cross-type connection)
        (this.stereoMixNode as any).connect(this.stereoSplitter);
        
        // 7. Connect HRTF filters after M/S processing, before master
        if (this.hrtfPinnaFilter && this.hrtfElevationFilter) {
          // M/S merger → HRTF Pinna → HRTF Elevation → Master
          (this.stereoMerger as any).connect(this.hrtfPinnaFilter);
          this.hrtfPinnaFilter.connect(this.hrtfElevationFilter);
          this.hrtfElevationFilter.connect(this.masterGain as any);
        } else {
          // Fallback: M/S merger → Master directly
          (this.stereoMerger as any).connect(this.masterGain);
        }
      } else {
        // Fallback: bypass M/S processing, connect through HRTF if available
        if (this.hrtfPinnaFilter && this.hrtfElevationFilter) {
          this.dryGain.connect(this.hrtfPinnaFilter as any);
          this.wetGain.connect(this.hrtfPinnaFilter as any);
          this.hrtfPinnaFilter.connect(this.hrtfElevationFilter);
          this.hrtfElevationFilter.connect(this.masterGain as any);
        } else {
          this.dryGain.connect(this.masterGain);
          this.wetGain.connect(this.masterGain);
        }
      }
      
      // 8. Master → Destination (limiter is handled in PlayerContext)
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
   * Initialize HF Restoration filter (highshelf @ 16kHz)
   * Adds high-frequency content for spectral extension (0-3dB boost)
   */
  private initializeHfRestoration(): void {
    if (!this.audioContext || Platform.OS !== 'web') {
      console.log('[WebAudioEffectsEngine] HF Restoration: Not available (non-web platform)');
      return;
    }

    try {
      const nativeCtx = this.audioContext as unknown as NativeAudioContext;
      
      this.hfRestoreFilter = nativeCtx.createBiquadFilter();
      this.hfRestoreFilter.type = 'highshelf';
      this.hfRestoreFilter.frequency.value = 16000;
      this.hfRestoreFilter.gain.value = 0; // Start disabled
      
      this.hfRestorationEnabled = false;
      this.hfRestorationLevel = 0;
      
      console.log('[WebAudioEffectsEngine] HF Restoration: Initialized (disabled)');
    } catch (error) {
      console.error('[WebAudioEffectsEngine] HF Restoration: Failed to initialize:', error);
    }
  }

  /**
   * Initialize Bass Enhancement nodes for harmonic generation
   * Parallel path: lowpass → waveshaper → gain → additive mix
   */
  private initializeBassEnhancement(): void {
    if (!this.audioContext || Platform.OS !== 'web') {
      console.log('[WebAudioEffectsEngine] Bass Enhancement: Not available (non-web platform)');
      return;
    }

    try {
      const nativeCtx = this.audioContext as unknown as NativeAudioContext;
      
      // Lowpass filter to extract bass @ 75Hz
      this.bassLowpassFilter = nativeCtx.createBiquadFilter();
      this.bassLowpassFilter.type = 'lowpass';
      this.bassLowpassFilter.frequency.value = 75;
      this.bassLowpassFilter.Q.value = 0.707;
      
      // Waveshaper for harmonic generation (soft clipping)
      this.harmonicShaper = nativeCtx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1; // -1 to 1
        curve[i] = Math.tanh(x * 2) * 0.5; // Soft clipping for 2nd/3rd/4th harmonics
      }
      this.harmonicShaper.curve = curve;
      this.harmonicShaper.oversample = '2x';
      
      // Output gain for mix control (0 to 1.58x = +4dB max)
      this.bassEnhancementGain = nativeCtx.createGain();
      this.bassEnhancementGain.gain.value = 0; // Start disabled
      
      // Connect bass enhancement chain
      this.bassLowpassFilter.connect(this.harmonicShaper);
      this.harmonicShaper.connect(this.bassEnhancementGain);
      
      this.bassEnhancementLevel = 0;
      
      console.log('[WebAudioEffectsEngine] Bass Enhancement: Initialized (disabled)');
    } catch (error) {
      console.error('[WebAudioEffectsEngine] Bass Enhancement: Failed to initialize:', error);
    }
  }

  /**
   * Initialize HRTF filters for spatial enhancement
   * Pinna filter @ 2700Hz and Elevation filter @ 8000Hz
   * Activates when spatial level >= 2
   */
  private initializeHrtfFilters(): void {
    if (!this.audioContext || Platform.OS !== 'web') {
      console.log('[WebAudioEffectsEngine] HRTF: Not available (non-web platform)');
      return;
    }

    try {
      const nativeCtx = this.audioContext as unknown as NativeAudioContext;
      
      // Pinna notch filter @ 2700Hz
      this.hrtfPinnaFilter = nativeCtx.createBiquadFilter();
      this.hrtfPinnaFilter.type = 'peaking';
      this.hrtfPinnaFilter.frequency.value = 2700;
      this.hrtfPinnaFilter.Q.value = 2.0;
      this.hrtfPinnaFilter.gain.value = 0; // Start disabled
      
      // Elevation cue filter @ 8000Hz (gain = 50% of pinna)
      this.hrtfElevationFilter = nativeCtx.createBiquadFilter();
      this.hrtfElevationFilter.type = 'peaking';
      this.hrtfElevationFilter.frequency.value = 8000;
      this.hrtfElevationFilter.Q.value = 1.5;
      this.hrtfElevationFilter.gain.value = 0; // Start disabled
      
      console.log('[WebAudioEffectsEngine] HRTF: Initialized (disabled)');
    } catch (error) {
      console.error('[WebAudioEffectsEngine] HRTF: Failed to initialize:', error);
    }
  }

  /**
   * Update HRTF filter gains based on spatial enhancement level
   * HRTF activates at level >= 2
   */
  private updateHrtfGains(level: number): void {
    if (!this.hrtfPinnaFilter || !this.hrtfElevationFilter) {
      return;
    }

    const clampedLevel = Math.max(0, Math.min(5, level));
    const hrtfGainDb = SLIDER_HRTF_GAIN[clampedLevel];
    
    this.hrtfPinnaFilter.gain.value = hrtfGainDb;
    this.hrtfElevationFilter.gain.value = hrtfGainDb * 0.5; // 50% of pinna
    
    if (hrtfGainDb > 0) {
      console.log(`[WebAudioEffectsEngine] HRTF: Pinna=${hrtfGainDb}dB, Elevation=${hrtfGainDb * 0.5}dB`);
    }
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

    // Update HRTF gains based on level
    this.updateHrtfGains(clampedLevel);

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

    // Update HRTF gains based on pseudo-level
    this.updateHrtfGains(this.spatialEnhancementLevel);

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

  /**
   * Set Bass Enhancement level (0-100%)
   * Generates harmonics from bass frequencies for perceived bass boost
   * @param level - Enhancement level 0-100%
   */
  setBassEnhancement(level: number): void {
    const clampedLevel = Math.max(0, Math.min(100, level));
    this.bassEnhancementLevel = clampedLevel;
    
    if (!this.bassEnhancementGain) {
      console.log('[WebAudioEffectsEngine] Bass Enhancement: Not initialized');
      return;
    }
    
    if (clampedLevel === 0) {
      this.bassEnhancementGain.gain.value = 0;
      console.log('[WebAudioEffectsEngine] Bass Enhancement: Disabled');
    } else {
      // Scale from 0-100% to 0-1.58x (max +4dB)
      const gainValue = (clampedLevel / 100) * MAX_BASS_ENHANCEMENT_GAIN;
      this.bassEnhancementGain.gain.value = gainValue;
      console.log(`[WebAudioEffectsEngine] Bass Enhancement: ${clampedLevel}% (gain=${gainValue.toFixed(2)}x)`);
    }
  }

  /**
   * Get current Bass Enhancement level
   * @returns Current level 0-100%
   */
  getBassEnhancement(): number {
    return this.bassEnhancementLevel;
  }

  /**
   * Enable or disable HF Restoration (AI Upscaling)
   * Uses neural network processing when available, falls back to DSP
   * @param enabled - Whether HF restoration is enabled
   */
  setHfRestoration(enabled: boolean): void {
    this.hfRestorationEnabled = enabled;
    this.updateHfRestorationGain();
    
    if (this.useNeuralProcessing && enabled) {
      this.initializeNeuralProcessor();
    }
    
    NeuralAudioProcessor.setEnabled(enabled && this.useNeuralProcessing);
    console.log(`[WebAudioEffectsEngine] HF Restoration: ${enabled ? 'Enabled' : 'Disabled'} (Neural: ${this.useNeuralProcessing})`);
  }
  
  /**
   * Initialize neural audio processor for AI upscaling
   */
  private async initializeNeuralProcessor(): Promise<void> {
    if (this.neuralProcessorInitialized) {
      return;
    }
    
    try {
      const success = await NeuralAudioProcessor.initialize();
      this.neuralProcessorInitialized = success;
      console.log(`[WebAudioEffectsEngine] Neural processor initialized: ${success}`);
    } catch (error) {
      console.error('[WebAudioEffectsEngine] Neural processor init failed:', error);
      this.useNeuralProcessing = false;
    }
  }

  /**
   * Get HF Restoration enabled state
   * @returns Whether HF restoration is enabled
   */
  getHfRestoration(): boolean {
    return this.hfRestorationEnabled;
  }

  /**
   * Set HF Restoration level (0-100% or 'low'/'medium'/'high')
   * @param level - Restoration level 0-100% or enhancement level string
   */
  setHfRestorationLevel(level: number | EnhancementLevel): void {
    let numericLevel: number;
    let enhancementLevel: EnhancementLevel;
    
    if (typeof level === 'string') {
      enhancementLevel = level;
      numericLevel = level === 'low' ? 33 : level === 'medium' ? 66 : 100;
    } else {
      numericLevel = Math.max(0, Math.min(100, level));
      enhancementLevel = numericLevel <= 40 ? 'low' : numericLevel <= 75 ? 'medium' : 'high';
    }
    
    this.hfRestorationLevel = numericLevel;
    this.updateHfRestorationGain();
    
    if (this.useNeuralProcessing) {
      NeuralAudioProcessor.setLevel(enhancementLevel);
    }
    
    console.log(`[WebAudioEffectsEngine] HF Restoration Level: ${numericLevel}% (${enhancementLevel})`);
  }

  /**
   * Get current HF Restoration level
   * @returns Current level 0-100%
   */
  getHfRestorationLevel(): number {
    return this.hfRestorationLevel;
  }

  /**
   * Update HF restoration filter gain based on enabled state and level
   */
  private updateHfRestorationGain(): void {
    if (!this.hfRestoreFilter) {
      return;
    }
    
    if (!this.hfRestorationEnabled || this.hfRestorationLevel === 0) {
      this.hfRestoreFilter.gain.value = 0;
    } else {
      // Scale from 0-100% to 0-3dB
      const boostDb = (this.hfRestorationLevel / 100) * MAX_HF_RESTORATION_DB;
      this.hfRestoreFilter.gain.value = boostDb;
    }
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
    
    // Clean up HRTF nodes
    this.hrtfPinnaFilter = null;
    this.hrtfElevationFilter = null;
    
    // Clean up Bass Enhancement nodes
    this.bassLowpassFilter = null;
    this.harmonicShaper = null;
    this.bassEnhancementGain = null;
    this.bassEnhancementLevel = 0;
    
    // Clean up HF Restoration nodes
    this.hfRestoreFilter = null;
    this.hfRestorationEnabled = false;
    this.hfRestorationLevel = 0;
    
    // Clean up Neural Processor
    if (this.neuralProcessorInitialized) {
      NeuralAudioProcessor.dispose();
      this.neuralProcessorInitialized = false;
    }
    
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
      // HRTF
      hrtfActive: this.spatialEnhancementLevel >= 2,
      hrtfPinnaGain: this.hrtfPinnaFilter?.gain.value ?? 0,
      hrtfElevationGain: this.hrtfElevationFilter?.gain.value ?? 0,
      // Bass Enhancement
      bassEnhancementActive: this.bassEnhancementLevel > 0,
      bassEnhancementLevel: this.bassEnhancementLevel,
      bassEnhancementGain: this.bassEnhancementGain?.gain.value ?? 0,
      // HF Restoration
      hfRestorationActive: this.hfRestorationEnabled && this.hfRestorationLevel > 0,
      hfRestorationEnabled: this.hfRestorationEnabled,
      hfRestorationLevel: this.hfRestorationLevel,
      hfRestorationGain: this.hfRestoreFilter?.gain.value ?? 0,
      // Neural Audio Processing
      neuralProcessingEnabled: this.useNeuralProcessing,
      neuralProcessorInitialized: this.neuralProcessorInitialized,
      neuralProcessorStatus: NeuralAudioProcessor.getStatus(),
    };
  }
  
  /**
   * Get neural processor status
   */
  getNeuralProcessorStatus(): string {
    return NeuralAudioProcessor.getStatus();
  }
  
  /**
   * Check if neural processing is available
   */
  isNeuralProcessingAvailable(): boolean {
    return this.neuralProcessorInitialized && NeuralAudioProcessor.isReady();
  }
}

export const WebAudioEffectsEngine = new WebAudioEffectsEngineClass();
