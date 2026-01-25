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
 * Input → 10-Band EQ → Dry/Wet Mix → Stereo Width (M/S) → Limiter → Output
 *                    ↑ Multi-Tap Reverb
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

export interface ImmersiveMode {
  name: string;
  eqPreset: number[];
  bassBoost: number;
  trebleBoost: number;
  spatialWidth: number;
  reverb: number; // 0-1 wet mix (0 = dry, 1 = full reverb)
  spatialEnhancement: number; // 0-5 level (psychoacoustic processing)
}

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

// Professional Immersive Mode Configurations
// Based on Sony 360 Reality Audio, Yamaha YPAO/Cinema DSP, Samsung Q-Symphony, IMAX Enhanced
// EQ bands: [60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz]
// Values in gain units (-5 to +5), where 1 unit = 2.4 dB
// Reverb: 0-1 wet mix (0 = dry, 1 = full reverb)
// Immersive Modes: All spatial processing bundled into spatialEnhancement
// spatialWidth set to 0 since spatialEnhancement already includes M/S processing with side boost
const IMMERSIVE_MODES: Record<string, ImmersiveMode> = {
  music: {
    // Balanced "smile curve" - warm bass, slight mid scoop, sparkly highs
    name: 'Music',
    eqPreset: [+0.3, +0.3, -0.4, -1.0, -1.0, 0.0, +1.0, +1.5, +0.4, -1.1],
    bassBoost: 0.5,     // +1.2 dB at 150Hz
    trebleBoost: 0.54,  // +1.3 dB at 6kHz
    spatialWidth: 0,    // Handled by spatialEnhancement
    reverb: 0.08,       // 8% reverb
    spatialEnhancement: 2, // Level 2: 310µs ITD, 1.4x side boost, 0.92 mid atten
  },
  '360_reality': {
    // Sony 360 Reality Audio inspired - immersive spatial soundfield
    name: '360 Reality',
    eqPreset: [0.0, 0.0, -0.6, -0.6, -0.6, 0.0, +1.0, +1.2, +0.3, -0.7],
    bassBoost: 0.33,    // +0.8 dB
    trebleBoost: 0.625, // +1.5 dB
    spatialWidth: 0,    // Handled by spatialEnhancement
    reverb: 0.18,       // 18% reverb
    spatialEnhancement: 5, // Level 5: 700µs ITD, 2.0x side boost, 0.80 mid atten (maximum)
  },
  gaming: {
    // Competitive gaming - footstep clarity and directional awareness
    name: 'Gaming',
    eqPreset: [+0.8, +0.8, +0.4, -1.1, -1.1, 0.0, +1.0, +1.7, +0.8, -1.9],
    bassBoost: 0.5,     // +1.2 dB
    trebleBoost: 0.875, // +2.1 dB
    spatialWidth: 0,    // Handled by spatialEnhancement
    reverb: 0.08,       // 8% reverb
    spatialEnhancement: 3, // Level 3: 440µs ITD, 1.6x side boost, 0.88 mid atten
  },
  podcast: {
    // Voice clarity mode - speech intelligibility
    name: 'Podcast',
    eqPreset: [-1.9, -1.9, -0.9, -0.7, +0.4, +1.0, +1.0, +1.4, +1.8, -0.2],
    bassBoost: -0.42,   // -1.0 dB (removes rumble)
    trebleBoost: 0.958, // +2.3 dB (clarity)
    spatialWidth: 0,    // No spatial processing for speech
    reverb: 0,          // 0% reverb
    spatialEnhancement: 0, // Off - focused mono for speech
  },
  movie: {
    // Cinematic experience - dialogue clarity and surround ambience
    name: 'Movie',
    eqPreset: [-0.8, -0.8, -0.4, +0.7, +1.1, +1.0, +1.0, -0.3, -0.5, -1.7],
    bassBoost: 0.75,    // +1.8 dB
    trebleBoost: 0.625, // +1.5 dB
    spatialWidth: 0,    // Handled by spatialEnhancement
    reverb: 0.12,       // 12% reverb
    spatialEnhancement: 4, // Level 4: 570µs ITD, 1.8x side boost, 0.84 mid atten
  },
  sports: {
    // Stadium/broadcast mode - commentary clarity with crowd atmosphere
    name: 'Sports',
    eqPreset: [+1.2, +1.2, +0.5, -0.7, -0.7, 0.0, +1.0, +1.2, -0.9, -2.5],
    bassBoost: 0.917,   // +2.2 dB (stadium atmosphere)
    trebleBoost: 0.33,  // +0.8 dB
    spatialWidth: 0,    // Handled by spatialEnhancement
    reverb: 0.10,       // 10% reverb
    spatialEnhancement: 2, // Level 2: 310µs ITD, 1.4x side boost, 0.92 mid atten
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
  
  // M/S Stereo Width Processing nodes
  private stereoSplitter: ChannelSplitterNode | null = null;
  private stereoMerger: ChannelMergerNode | null = null;
  private stereoMixNode: GainNode | null = null; // Sums dry+wet before stereo splitting
  private midGainL: GainNode | null = null;  // L contribution to Mid
  private midGainR: GainNode | null = null;  // R contribution to Mid
  private sideGainL: GainNode | null = null; // L contribution to Side
  private sideGainR: GainNode | null = null; // R (inverted) contribution to Side
  private sideWidth: GainNode | null = null; // Controls stereo width
  private midToL: GainNode | null = null;    // Mid to Left output
  private midToR: GainNode | null = null;    // Mid to Right output
  private sideToL: GainNode | null = null;   // Side to Left output
  private sideToR: GainNode | null = null;   // Side (inverted) to Right output
  private stereoWidthEnabled: boolean = false;

  // Psychoacoustic Stereo Enhancement nodes
  private sideHighpass: globalThis.BiquadFilterNode | null = null;  // Highpass for side (no bass widening)
  private sideDelay: globalThis.DelayNode | null = null;            // ITD delay (0.3ms)
  private allPass1: globalThis.BiquadFilterNode | null = null;      // Decorrelation filter 1
  private allPass2: globalThis.BiquadFilterNode | null = null;      // Decorrelation filter 2
  private sidePsychoGain: globalThis.GainNode | null = null;        // Side boost (max 2.2 = 120%)
  private midAttenuation: globalThis.GainNode | null = null;        // Mid compensation
  spatialEnhancementLevel: number = 0;

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
      
      // Create M/S Stereo Width Processing nodes
      // Uses native Web Audio API ChannelSplitter/Merger for true stereo processing
      this.initializeStereoWidthProcessor();

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
      
      // Mix dry and wet, then through stereo width processing, then to master output
      // Signal chain: EQ → Dry/Wet Mix → Stereo Width → Master → Destination
      if (this.stereoWidthEnabled && this.stereoSplitter && this.stereoMerger && this.stereoMixNode) {
        // Connect dry/wet to mix node first (preserves stereo before splitting)
        this.dryGain.connect(this.stereoMixNode);
        this.wetGain.connect(this.stereoMixNode);
        // Mix node to stereo splitter (cast to any for native Web Audio API cross-type connection)
        (this.stereoMixNode as any).connect(this.stereoSplitter);
        // Stereo merger output to master (cast to any for native Web Audio API cross-type connection)
        (this.stereoMerger as any).connect(this.masterGain);
      } else {
        // Fallback: bypass stereo width processing
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
   * Initialize M/S (Mid-Side) Stereo Width Processing
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
      console.log('[WebAudioEffectsEngine] Stereo width: Not available (non-web platform)');
      return;
    }

    try {
      // Access native Web Audio API methods through the context
      const nativeCtx = this.audioContext as unknown as NativeAudioContext;
      
      // Check if native methods are available
      if (typeof nativeCtx.createChannelSplitter !== 'function' || 
          typeof nativeCtx.createChannelMerger !== 'function') {
        console.log('[WebAudioEffectsEngine] Stereo width: Native channel nodes not available');
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
      
      this.stereoWidthEnabled = true;
      console.log('[WebAudioEffectsEngine] Stereo width: M/S processing with psychoacoustic chain initialized');
    } catch (error) {
      console.error('[WebAudioEffectsEngine] Stereo width: Failed to initialize:', error);
      this.stereoWidthEnabled = false;
    }
  }

  /**
   * Initialize Psychoacoustic Processor configuration
   * Called at end of initialize() to configure the psychoacoustic enhancement nodes
   * The nodes are already created and connected in initializeStereoWidthProcessor()
   * This method just ensures they start in disabled (passthrough) state
   */
  private initializePsychoacousticProcessor(): void {
    if (!this.stereoWidthEnabled || !this.sideHighpass || !this.sideDelay || 
        !this.sidePsychoGain || !this.midAttenuation) {
      console.log('[WebAudioEffectsEngine] Psychoacoustic: Cannot configure (stereo width not available)');
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
   * Set Spatial Enhancement Level (Psychoacoustic Stereo Enhancement)
   * 
   * Level 0: Disabled (bypass all psychoacoustic processing)
   * Levels 1-5: Scale the effect intensity
   * 
   * Parameters scaled by level:
   * - sidePsychoGain: 1.0 (off) → 1.1-1.5 (on), capped at 2.2
   * - sideDelay: 0 (off) → 0.1ms-0.5ms (on)
   * - midAttenuation: 1.0 (off) → 0.97-0.85 (on)
   * - sideHighpass: 1Hz (bypass) → 150Hz (protects bass from widening)
   * 
   * @param level - Spatial enhancement level 0-5 (0 = off, 5 = max)
   */
  setSpatialEnhancement(level: number): void {
    // Clamp level to valid range
    const clampedLevel = Math.max(0, Math.min(5, Math.round(level)));
    
    // Mono safety: don't apply if stereo width processing isn't available
    if (!this.stereoWidthEnabled) {
      console.log('[WebAudioEffectsEngine] Psychoacoustic: Cannot enable (stereo width not available)');
      this.spatialEnhancementLevel = 0;
      return;
    }

    if (!this.sideHighpass || !this.sideDelay || !this.sidePsychoGain || !this.midAttenuation) {
      console.log('[WebAudioEffectsEngine] Psychoacoustic: Nodes not initialized');
      this.spatialEnhancementLevel = 0;
      return;
    }

    this.spatialEnhancementLevel = clampedLevel;
    
    // Calculate intensity (0.0 to 1.0)
    const intensity = clampedLevel / 5;

    if (clampedLevel === 0) {
      // Disable psychoacoustic processing (passthrough mode)
      
      // Highpass at 1Hz - effectively passes all audio (bypass)
      this.sideHighpass.frequency.value = 1;
      
      // No delay when disabled
      this.sideDelay.delayTime.value = 0;
      
      // Passthrough gains
      this.sidePsychoGain.gain.value = 1.0;
      this.midAttenuation.gain.value = 1.0;
      
      console.log(`[WebAudioEffectsEngine] Spatial enhancement level set to ${clampedLevel} (intensity: ${(intensity * 100).toFixed(0)}%)`);
    } else {
      // Enable psychoacoustic processing with level-based scaling
      
      // Highpass at 150Hz - only widen frequencies above 150Hz (protects bass from widening)
      this.sideHighpass.frequency.value = 150;
      this.sideHighpass.Q.value = 0.707;
      
      // ITD delay: 0.00005 + (0.00065 * intensity) → 50µs to 700µs (full human perceptual range)
      // Standard: 700µs maximum at 90° azimuth, detection threshold ~10µs
      this.sideDelay.delayTime.value = 0.00005 + (0.00065 * intensity);
      
      // Side psychoacoustic gain: 1.0 + (1.0 * intensity) → 1.0 to 2.0 (0 to +6dB, industry standard)
      // Conservative vs full 15-20dB ILD range to avoid artifacts
      let psychoGain = 1.0 + (1.0 * intensity);
      psychoGain = Math.min(psychoGain, 2.2); // Max 2.2 for safety on web
      this.sidePsychoGain.gain.value = psychoGain;
      
      // Mid attenuation: 1.0 - (0.20 * intensity) → 1.0 to 0.80 (more pronounced center reduction)
      this.midAttenuation.gain.value = 1.0 - (0.20 * intensity);
      
      console.log(`[WebAudioEffectsEngine] Spatial enhancement level set to ${clampedLevel} (intensity: ${(intensity * 100).toFixed(0)}%)`);
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
    this.applyImmersiveEQ(mode.eqPreset, mode.bassBoost, mode.trebleBoost, mode.spatialWidth, mode.reverb, mode.spatialEnhancement);
    this.currentMode = modeName;
  }

  /**
   * Apply EQ settings for immersive modes WITHOUT zero-sum normalization.
   * Immersive modes have their own creative curves that shouldn't be balanced.
   * The limiter in PlayerContext handles distortion prevention.
   */
  private applyImmersiveEQ(bands: number[], bassBoost: number, trebleBoost: number, spatialWidth: number, reverb: number = 0, spatialEnhancement: number = 0): void {
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
    
    // Apply stereo width via M/S processing
    // spatialWidth: 0 = original stereo, 0.5 = +50% width, 1.0 = +100% (double width)
    // Convert to virtualizer level: 0 → 0, 0.5 → +2.5, 1.0 → +5
    const virtualizerLevel = spatialWidth * 5;
    this.setVirtualizer(virtualizerLevel);

    // Master gain stays at 1.0 - limiter handles distortion prevention
    if (this.masterGain) {
      this.masterGain.gain.value = 1.0;
    }

    // Apply spatial enhancement (psychoacoustic processing)
    this.setSpatialEnhancement(spatialEnhancement);

    this.currentEQValues = paddedBands;
    console.log(`[WebAudioEffectsEngine] Applied immersive mode with bass:${bassBoost}, treble:${trebleBoost}, spatial:${spatialWidth}, reverb:${reverb}, spatialEnhancement:${spatialEnhancement}`);
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
   * Intelligent mapping (matches Android SoftwareDSPAudioProcessor):
   * -5: Full mono (0% stereo width) - sideWidth = 0.0
   * -3: Reduced stereo (40% width) - sideWidth = 0.4
   * -1: Slightly narrower (80% width) - sideWidth = 0.8
   *  0: Original stereo (100% width) - sideWidth = 1.0
   * +1: Slightly wider (120% perceived width) - sideWidth = 1.2
   * +3: Wide stereo (160% perceived width) - sideWidth = 1.6
   * +5: Maximum surround (200% perceived width) - sideWidth = 2.0
   * 
   * Uses M/S (Mid-Side) processing for true stereo width control.
   * Width capped at 2.0 (200%) to match Android implementation.
   */
  setVirtualizer(level: number): void {
    const clampedLevel = Math.max(-5, Math.min(5, level));
    this.currentVirtualizer = clampedLevel;
    
    // Calculate stereo width multiplier (matches Android formula)
    // -5 = 0.0 (mono), 0 = 1.0 (original), +5 = 2.0 (double width)
    let stereoWidth: number;
    if (clampedLevel < 0) {
      // Narrowing: -5 = 0%, 0 = 100%
      stereoWidth = 1.0 + (clampedLevel / 5); // -5 → 0.0, 0 → 1.0
    } else {
      // Widening: 0 = 100%, +5 = 200% (matches Android's max width)
      stereoWidth = 1.0 + (clampedLevel * 0.2); // 0 → 1.0, +5 → 2.0
    }
    
    // Apply stereo width via M/S processing
    if (this.stereoWidthEnabled && this.sideWidth) {
      this.sideWidth.gain.value = stereoWidth;
      console.log(`[WebAudioEffectsEngine] Virtualizer set to ${clampedLevel} (M/S width: ${(stereoWidth * 100).toFixed(0)}%)`);
    } else {
      console.log(`[WebAudioEffectsEngine] Virtualizer set to ${clampedLevel} (width: ${(stereoWidth * 100).toFixed(0)}%) - M/S not available`);
    }
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
    this.setVirtualizer(0); // Reset stereo width to original
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
    
    // Clean up M/S stereo width processing nodes
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
    this.stereoWidthEnabled = false;
    
    // Clean up psychoacoustic enhancement nodes
    this.sideHighpass = null;
    this.sideDelay = null;
    this.allPass1 = null;
    this.allPass2 = null;
    this.sidePsychoGain = null;
    this.midAttenuation = null;
    this.spatialEnhancementLevel = 0;
    
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
      virtualizerActive: this.stereoWidthEnabled && this.currentVirtualizer !== 0,
      reverbActive: this.currentReverb > 0,
      stereoWidthPercent: ((1 + this.currentVirtualizer / 5) * 100).toFixed(0) + '%',
      spatialEnhancementLevel: this.spatialEnhancementLevel,
      spatialEnhancementActive: this.spatialEnhancementLevel > 0,
      psychoacousticGain: this.sidePsychoGain?.gain.value ?? 1.0,
      midAttenuation: this.midAttenuation?.gain.value ?? 1.0,
    };
  }
}

export const WebAudioEffectsEngine = new WebAudioEffectsEngineClass();
