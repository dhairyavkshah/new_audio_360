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
  spatialWidth: number;
  reverb: number;
}

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
const BASS_FREQUENCY = 150;
const TREBLE_FREQUENCY = 6000;
const DB_PER_UNIT = 2.4;
const MAX_DB = 12;

const IMMERSIVE_MODES: Record<string, ImmersiveMode> = {
  music: {
    name: 'Music',
    eqPreset: [1.5, 1.0, 0.5, -0.5, -1.0, -0.5, 0.5, -0.5, -0.5, -0.5],
    spatialWidth: 0.25,
    reverb: 0.05,
  },
  '360_reality': {
    name: '360 Reality',
    eqPreset: [0, 0, 0, 0, 0, 0.5, 0.5, -0.5, -0.5, 0],
    spatialWidth: 0.85,
    reverb: 0.25,
  },
  gaming: {
    name: 'Gaming',
    eqPreset: [-2, -1, 0, 0, 1, 2, 1, 0, 0, -1],
    spatialWidth: 0.45,
    reverb: 0.075,
  },
  podcast: {
    name: 'Podcast',
    eqPreset: [-1.5, -1, 0, 1, 1.5, 1, 0, -0.5, -0.5, 0],
    spatialWidth: 0,
    reverb: 0,
  },
  movie: {
    name: 'Movie',
    eqPreset: [2, 1.5, 0.5, 0, -0.5, -0.5, -0.5, -1, -1, -0.5],
    spatialWidth: 0.55,
    reverb: 0.15,
  },
  sports: {
    name: 'Sports',
    eqPreset: [0.5, 0, 0, 1, 1, 0.5, -0.5, -1, -1, -0.5],
    spatialWidth: 0.5,
    reverb: 0.125,
  },
};

class WebAudioEffectsEngineClass {
  private audioContext: AudioContext | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassBoostFilter: BiquadFilterNode | null = null;
  private trebleBoostFilter: BiquadFilterNode | null = null;
  private safetyGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private reverbDelays: { delay: any; feedback: GainNode; filter: BiquadFilterNode }[] = [];
  private isInitialized = false;
  private currentEQValues: number[] = new Array(10).fill(0);
  private bassGainDb: number = 0;
  private trebleGainDb: number = 0;
  private currentMode: string = 'off';
  private currentReverb: number = 0;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      this.audioContext = new AudioContext();
      
      this.dryGain = this.audioContext.createGain();
      this.dryGain.gain.value = 1.0;
      
      this.wetGain = this.audioContext.createGain();
      this.wetGain.gain.value = 0;
      
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
      
      this.bassBoostFilter = this.audioContext.createBiquadFilter();
      this.bassBoostFilter.type = 'lowshelf';
      this.bassBoostFilter.frequency.value = BASS_FREQUENCY;
      this.bassBoostFilter.gain.value = 0;
      
      this.trebleBoostFilter = this.audioContext.createBiquadFilter();
      this.trebleBoostFilter.type = 'highshelf';
      this.trebleBoostFilter.frequency.value = TREBLE_FREQUENCY;
      this.trebleBoostFilter.gain.value = 0;
      
      this.safetyGain = this.audioContext.createGain();
      this.safetyGain.gain.value = 1.0;

      const delayTimes = [0.023, 0.041, 0.067, 0.089];
      const feedbacks = [0.4, 0.35, 0.3, 0.25];
      const filterFreqs = [4000, 3500, 3000, 2500];
      
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

      let currentNode: any = this.eqFilters[0];
      for (let i = 1; i < this.eqFilters.length; i++) {
        currentNode.connect(this.eqFilters[i]);
        currentNode = this.eqFilters[i];
      }
      
      const eqOutput = this.eqFilters[this.eqFilters.length - 1];
      eqOutput.connect(this.bassBoostFilter!);
      this.bassBoostFilter!.connect(this.trebleBoostFilter!);
      this.trebleBoostFilter!.connect(this.safetyGain!);
      this.safetyGain!.connect(this.dryGain);
      
      this.reverbDelays.forEach(({ delay, feedback, filter }) => {
        this.safetyGain!.connect(delay);
        delay.connect(filter);
        filter.connect(feedback);
        feedback.connect(delay);
        filter.connect(this.wetGain!);
      });
      
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

  applyEQ(bands: number[]): void {
    if (!this.isInitialized || this.eqFilters.length === 0) {
      console.log('[WebAudioEffectsEngine] Not initialized, cannot apply EQ');
      return;
    }

    const paddedBands = [...bands];
    while (paddedBands.length < 10) {
      paddedBands.push(0);
    }

    paddedBands.forEach((value, index) => {
      if (this.eqFilters[index]) {
        const dbValue = value * DB_PER_UNIT;
        const clampedDb = Math.max(-MAX_DB, Math.min(MAX_DB, dbValue));
        this.eqFilters[index].gain.value = clampedDb;
      }
    });

    this.setReverb(0);
    this.recalculateSafetyGain();

    this.currentEQValues = paddedBands;
    this.currentMode = 'equalizer';
  }

  applyTenBandEQ(bands: number[]): void {
    this.applyEQ(bands);
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

    this.applyImmersiveEQ(mode.eqPreset, mode.reverb);
    this.currentMode = modeName;
  }

  private applyImmersiveEQ(bands: number[], reverb: number = 0): void {
    if (!this.isInitialized || this.eqFilters.length === 0) {
      console.log('[WebAudioEffectsEngine] Not initialized, cannot apply immersive EQ');
      return;
    }

    const paddedBands = [...bands];
    while (paddedBands.length < 10) {
      paddedBands.push(0);
    }

    paddedBands.forEach((value, index) => {
      if (this.eqFilters[index]) {
        const dbValue = value * DB_PER_UNIT;
        const clampedDb = Math.max(-MAX_DB, Math.min(MAX_DB, dbValue));
        this.eqFilters[index].gain.value = clampedDb;
      }
    });

    this.setReverb(reverb);
    this.recalculateSafetyGain();

    this.currentEQValues = paddedBands;
    console.log(`[WebAudioEffectsEngine] Applied immersive mode with reverb:${reverb}`);
  }

  setBassBoost(gainUnits: number): void {
    const dbValue = gainUnits * DB_PER_UNIT;
    const clampedDb = Math.max(-MAX_DB, Math.min(MAX_DB, dbValue));
    this.bassGainDb = clampedDb;
    
    if (this.bassBoostFilter) {
      this.bassBoostFilter.gain.value = clampedDb;
    }
    
    this.recalculateSafetyGain();
    console.log(`[WebAudioEffectsEngine] Bass boost set to ${clampedDb} dB`);
  }
  
  setTrebleBoost(gainUnits: number): void {
    const dbValue = gainUnits * DB_PER_UNIT;
    const clampedDb = Math.max(-MAX_DB, Math.min(MAX_DB, dbValue));
    this.trebleGainDb = clampedDb;
    
    if (this.trebleBoostFilter) {
      this.trebleBoostFilter.gain.value = clampedDb;
    }
    
    this.recalculateSafetyGain();
    console.log(`[WebAudioEffectsEngine] Treble boost set to ${clampedDb} dB`);
  }
  
  getBassGain(): number {
    return this.bassGainDb;
  }
  
  getTrebleGain(): number {
    return this.trebleGainDb;
  }
  
  private recalculateSafetyGain(): void {
    const eqDbValues = this.currentEQValues.map(v => v * DB_PER_UNIT);
    
    const lowFreqBands = eqDbValues.slice(0, 3);
    const midFreqBands = eqDbValues.slice(3, 6);
    const highFreqBands = eqDbValues.slice(6, 10);
    
    const maxLowEq = Math.max(...lowFreqBands, 0);
    const maxMidEq = Math.max(...midFreqBands, 0);
    const maxHighEq = Math.max(...highFreqBands, 0);
    
    const lowFreqTotal = maxLowEq + Math.max(0, this.bassGainDb);
    const highFreqTotal = maxHighEq + Math.max(0, this.trebleGainDb);
    const midFreqTotal = maxMidEq;
    
    const totalMaxGain = Math.max(lowFreqTotal, midFreqTotal, highFreqTotal);
    
    let safetyReductionDb = 0;
    if (totalMaxGain > MAX_DB) {
      safetyReductionDb = -(totalMaxGain - MAX_DB);
    }
    
    if (this.safetyGain) {
      const linearGain = Math.pow(10, safetyReductionDb / 20);
      this.safetyGain.gain.value = linearGain;
    }
    
    if (this.masterGain) {
      this.masterGain.gain.value = 1.0;
    }
    
    console.log(`[WebAudioEffectsEngine] Safety gain: lowEQ=${maxLowEq.toFixed(1)}+bass=${this.bassGainDb.toFixed(1)}, highEQ=${maxHighEq.toFixed(1)}+treble=${this.trebleGainDb.toFixed(1)}, reduction=${safetyReductionDb.toFixed(1)} dB`);
  }

  setReverb(wetMix: number): void {
    const clampedWet = Math.max(0, Math.min(1, wetMix));
    this.currentReverb = clampedWet;
    
    if (this.dryGain && this.wetGain) {
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
    
    if (this.bassBoostFilter) {
      this.bassBoostFilter.gain.value = 0;
    }
    if (this.trebleBoostFilter) {
      this.trebleBoostFilter.gain.value = 0;
    }
    if (this.safetyGain) {
      this.safetyGain.gain.value = 1.0;
    }
    
    this.bassGainDb = 0;
    this.trebleGainDb = 0;
    this.setReverb(0);
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
    this.bassBoostFilter = null;
    this.trebleBoostFilter = null;
    this.safetyGain = null;
    this.masterGain = null;
    this.dryGain = null;
    this.wetGain = null;
    this.reverbDelays = [];
    this.isInitialized = false;
    this.currentEQValues = new Array(10).fill(0);
    this.bassGainDb = 0;
    this.trebleGainDb = 0;
    this.currentMode = 'off';
    this.currentReverb = 0;
    
    console.log('[WebAudioEffectsEngine] Released');
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

export const WebAudioEffectsEngine = new WebAudioEffectsEngineClass();
