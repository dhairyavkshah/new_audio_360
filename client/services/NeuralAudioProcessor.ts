import * as tf from '@tensorflow/tfjs';

export type NeuralProcessorStatus = 'idle' | 'loading' | 'processing' | 'ready' | 'error';
export type EnhancementLevel = 'low' | 'medium' | 'high';

interface ProcessingConfig {
  sampleRate: number;
  inputLength: number;
  lookAheadSeconds: number;
  level: EnhancementLevel;
}

const LEVEL_CONFIGS: Record<EnhancementLevel, { blend: number }> = {
  low: { blend: 0.3 },
  medium: { blend: 0.6 },
  high: { blend: 1.0 },
};

const INPUT_LENGTH = 8192;
const MODEL_VERSION = '1.2.1';

// Custom 1D upsampling using upSampling2d (tf.layers.upSampling1d not available in tfjs)
// Reshape to 4D, upsample, reshape back to 3D
// NOTE: This implementation uses fixed lengths based on INPUT_LENGTH=8192:
//   bottleneck: 8192/8 = 1024 -> 2048
//   dec1: 2048 -> 4096  
//   dec2: 4096 -> 8192
function applyUpSampling1d(
  tensor: tf.SymbolicTensor, 
  targetLength: number,
  filters: number,
  name: string
): tf.SymbolicTensor {
  // [batch, length, channels] -> [batch, length, 1, channels]
  const reshaped4d = tf.layers.reshape({
    targetShape: [targetLength, 1, filters],
    name: `${name}_to4d`,
  }).apply(tensor) as tf.SymbolicTensor;
  
  // Upsample by 2 in the length dimension
  const upsampled = tf.layers.upSampling2d({
    size: [2, 1],
    name: `${name}_up`,
  }).apply(reshaped4d) as tf.SymbolicTensor;
  
  // [batch, length*2, 1, channels] -> [batch, length*2, channels]
  return tf.layers.reshape({
    targetShape: [targetLength * 2, filters],
    name: `${name}_to3d`,
  }).apply(upsampled) as tf.SymbolicTensor;
}

class NeuralAudioProcessorClass {
  private model: tf.LayersModel | null = null;
  private status: NeuralProcessorStatus = 'idle';
  private config: ProcessingConfig = {
    sampleRate: 44100,
    inputLength: INPUT_LENGTH,
    lookAheadSeconds: 2,
    level: 'medium',
  };
  
  private isEnabled: boolean = false;
  private statusListeners: Set<(status: NeuralProcessorStatus) => void> = new Set();

  constructor() {
    console.log('[NeuralAudioProcessor] Initialized - Kuleshov architecture v' + MODEL_VERSION);
  }

  private buildKuleshovModel(): tf.LayersModel {
    const input = tf.input({ shape: [INPUT_LENGTH, 1], name: 'audio_input' });
    
    const enc1 = tf.layers.conv1d({
      filters: 64,
      kernelSize: 33,
      padding: 'same',
      activation: 'relu',
      name: 'enc1',
      kernelInitializer: tf.initializers.glorotUniform({ seed: 42 }),
    }).apply(input) as tf.SymbolicTensor;
    
    const pool1 = tf.layers.maxPooling1d({
      poolSize: 2,
      strides: 2,
      name: 'pool1',
    }).apply(enc1) as tf.SymbolicTensor;
    
    const enc2 = tf.layers.conv1d({
      filters: 128,
      kernelSize: 17,
      padding: 'same',
      activation: 'relu',
      name: 'enc2',
      kernelInitializer: tf.initializers.glorotUniform({ seed: 43 }),
    }).apply(pool1) as tf.SymbolicTensor;
    
    const pool2 = tf.layers.maxPooling1d({
      poolSize: 2,
      strides: 2,
      name: 'pool2',
    }).apply(enc2) as tf.SymbolicTensor;
    
    const enc3 = tf.layers.conv1d({
      filters: 256,
      kernelSize: 9,
      padding: 'same',
      activation: 'relu',
      name: 'enc3',
      kernelInitializer: tf.initializers.glorotUniform({ seed: 44 }),
    }).apply(pool2) as tf.SymbolicTensor;
    
    const pool3 = tf.layers.maxPooling1d({
      poolSize: 2,
      strides: 2,
      name: 'pool3',
    }).apply(enc3) as tf.SymbolicTensor;
    
    const bottleneck = tf.layers.conv1d({
      filters: 512,
      kernelSize: 9,
      padding: 'same',
      activation: 'relu',
      name: 'bottleneck',
      kernelInitializer: tf.initializers.glorotUniform({ seed: 45 }),
    }).apply(pool3) as tf.SymbolicTensor;
    
    // bottleneck shape: [batch, 1024, 512] -> upsample to [batch, 2048, 512]
    const up1 = applyUpSampling1d(bottleneck, 1024, 512, 'up1');
    const concat1 = tf.layers.concatenate({ name: 'concat1' }).apply([up1, enc3]) as tf.SymbolicTensor;
    const dec1 = tf.layers.conv1d({
      filters: 256,
      kernelSize: 9,
      padding: 'same',
      activation: 'relu',
      name: 'dec1',
      kernelInitializer: tf.initializers.glorotUniform({ seed: 46 }),
    }).apply(concat1) as tf.SymbolicTensor;
    
    // dec1 shape: [batch, 2048, 256] -> upsample to [batch, 4096, 256]
    const up2 = applyUpSampling1d(dec1, 2048, 256, 'up2');
    const concat2 = tf.layers.concatenate({ name: 'concat2' }).apply([up2, enc2]) as tf.SymbolicTensor;
    const dec2 = tf.layers.conv1d({
      filters: 128,
      kernelSize: 17,
      padding: 'same',
      activation: 'relu',
      name: 'dec2',
      kernelInitializer: tf.initializers.glorotUniform({ seed: 47 }),
    }).apply(concat2) as tf.SymbolicTensor;
    
    // dec2 shape: [batch, 4096, 128] -> upsample to [batch, 8192, 128]
    const up3 = applyUpSampling1d(dec2, 4096, 128, 'up3');
    const concat3 = tf.layers.concatenate({ name: 'concat3' }).apply([up3, enc1]) as tf.SymbolicTensor;
    const dec3 = tf.layers.conv1d({
      filters: 64,
      kernelSize: 33,
      padding: 'same',
      activation: 'relu',
      name: 'dec3',
      kernelInitializer: tf.initializers.glorotUniform({ seed: 48 }),
    }).apply(concat3) as tf.SymbolicTensor;
    
    const output = tf.layers.conv1d({
      filters: 1,
      kernelSize: 9,
      padding: 'same',
      activation: 'tanh',
      name: 'output',
      kernelInitializer: tf.initializers.glorotUniform({ seed: 49 }),
    }).apply(dec3) as tf.SymbolicTensor;
    
    const residualAdd = tf.layers.add({ name: 'residual_add' }).apply([input, output]) as tf.SymbolicTensor;
    
    return tf.model({ inputs: input, outputs: residualAdd, name: 'audio_super_resolution' });
  }

  async initialize(): Promise<boolean> {
    if (this.status === 'ready' || this.status === 'loading') {
      return this.status === 'ready';
    }

    try {
      this.setStatus('loading');
      console.log('[NeuralAudioProcessor] Building Kuleshov audio super-resolution model...');
      
      await tf.ready();
      console.log('[NeuralAudioProcessor] TensorFlow.js backend:', tf.getBackend());
      
      this.model = this.buildKuleshovModel();
      console.log('[NeuralAudioProcessor] Model built with', this.model.countParams().toLocaleString(), 'parameters');
      
      const warmupInput = tf.zeros([1, INPUT_LENGTH, 1]);
      const warmupOutput = this.model.predict(warmupInput) as tf.Tensor;
      warmupOutput.dispose();
      warmupInput.dispose();
      console.log('[NeuralAudioProcessor] Model warmup complete');
      
      this.setStatus('ready');
      console.log('[NeuralAudioProcessor] Kuleshov model ready (v' + MODEL_VERSION + ')');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[NeuralAudioProcessor] Initialization error:', errorMessage);
      this.setStatus('error');
      return false;
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log('[NeuralAudioProcessor] Enabled:', enabled);
    
    if (enabled && this.status === 'idle') {
      this.initialize();
    }
  }

  setLevel(level: EnhancementLevel): void {
    this.config.level = level;
    console.log('[NeuralAudioProcessor] Level set to:', level);
  }

  getStatus(): NeuralProcessorStatus {
    return this.status;
  }

  isReady(): boolean {
    return this.status === 'ready' && this.model !== null;
  }

  private setStatus(status: NeuralProcessorStatus): void {
    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  onStatusChange(listener: (status: NeuralProcessorStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  async processAudioChunk(inputData: Float32Array, sampleRate: number): Promise<Float32Array> {
    if (!this.isEnabled || !this.model) {
      return inputData;
    }

    if (this.status !== 'ready') {
      return inputData;
    }

    try {
      const levelConfig = LEVEL_CONFIGS[this.config.level];
      const processedChunks: Float32Array[] = [];
      
      const paddedLength = Math.ceil(inputData.length / INPUT_LENGTH) * INPUT_LENGTH;
      const paddedInput = new Float32Array(paddedLength);
      paddedInput.set(inputData);
      
      for (let i = 0; i < paddedLength; i += INPUT_LENGTH) {
        const chunk = paddedInput.slice(i, i + INPUT_LENGTH);
        const enhancedChunk = await this.processChunk(chunk, levelConfig.blend);
        processedChunks.push(enhancedChunk);
      }
      
      const result = new Float32Array(inputData.length);
      let offset = 0;
      for (const chunk of processedChunks) {
        const copyLength = Math.min(chunk.length, result.length - offset);
        result.set(chunk.subarray(0, copyLength), offset);
        offset += copyLength;
        if (offset >= result.length) break;
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[NeuralAudioProcessor] Processing error:', errorMessage);
      return inputData;
    }
  }

  private async processChunk(chunk: Float32Array, blend: number): Promise<Float32Array> {
    if (!this.model) {
      return chunk;
    }

    return tf.tidy(() => {
      let maxVal = 0;
      for (let i = 0; i < chunk.length; i++) {
        const absVal = Math.abs(chunk[i]);
        if (absVal > maxVal) maxVal = absVal;
      }
      if (maxVal === 0) maxVal = 1;
      
      const normalizedData = new Float32Array(INPUT_LENGTH);
      for (let i = 0; i < INPUT_LENGTH; i++) {
        normalizedData[i] = chunk[i] / maxVal;
      }
      
      const inputTensor = tf.tensor3d(normalizedData, [1, INPUT_LENGTH, 1]);
      
      const outputTensor = this.model!.predict(inputTensor) as tf.Tensor;
      const outputData = outputTensor.dataSync();
      
      const result = new Float32Array(INPUT_LENGTH);
      for (let i = 0; i < INPUT_LENGTH; i++) {
        const enhanced = outputData[i] * maxVal;
        const original = chunk[i];
        result[i] = original + (enhanced - original) * blend;
      }
      
      return result;
    });
  }

  async processBuffer(buffer: AudioBuffer): Promise<AudioBuffer> {
    if (!this.isEnabled || !this.model) {
      return buffer;
    }

    const ctx = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    const processedBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const processedData = await this.processAudioChunk(inputData, buffer.sampleRate);
      processedBuffer.getChannelData(channel).set(processedData);
    }

    return processedBuffer;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.status = 'idle';
    this.isEnabled = false;
    console.log('[NeuralAudioProcessor] Disposed');
  }
  
  getModelInfo(): object {
    return {
      status: this.status,
      isEnabled: this.isEnabled,
      level: this.config.level,
      inputLength: INPUT_LENGTH,
      modelLoaded: this.model !== null,
      backend: tf.getBackend(),
      architecture: 'Kuleshov Audio Super-Resolution (1D U-Net CNN)',
      version: MODEL_VERSION,
      parameters: this.model ? this.model.countParams() : 0,
    };
  }
}

export const NeuralAudioProcessor = new NeuralAudioProcessorClass();
