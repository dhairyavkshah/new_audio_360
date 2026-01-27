package expo.modules.audioeffects

import android.content.Context
import android.util.Log
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.CompatibilityList
import org.tensorflow.lite.gpu.GpuDelegate
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

/**
 * Neural Audio Super-Resolution Processor using TensorFlow Lite.
 * 
 * Implements Kuleshov-style 1D U-Net architecture for audio enhancement.
 * This is the Android equivalent of the web-based NeuralAudioProcessor.ts.
 * 
 * Architecture:
 * - Input: 8192 audio samples (single channel, normalized [-1.0, 1.0])
 * - Output: 8192 enhanced samples
 * - Model: 1D U-Net CNN with skip connections
 * - Residual learning: output = input + model(input)
 * 
 * Enhancement Levels:
 * - Low: blend = 0.3 (subtle enhancement)
 * - Medium: blend = 0.6 (balanced enhancement)
 * - High: blend = 1.0 (full enhancement)
 * 
 * Performance Optimizations:
 * - Direct ByteBuffers for TFLite I/O (avoids memory copies)
 * - Buffer reuse to minimize GC pressure
 * - Lazy initialization
 * - GPU delegate with automatic CPU fallback
 * 
 * @author Audio360 Team
 * @version 1.2.0
 */
class NeuralAudioProcessorTFLite private constructor() {
    
    companion object {
        private const val TAG = "NeuralAudioTFLite"
        private const val MODEL_VERSION = "1.2.0"
        private const val MODEL_FILENAME = "audio_sr_model.tflite"
        
        const val INPUT_LENGTH = 8192
        
        const val BLEND_LOW = 0.3f
        const val BLEND_MEDIUM = 0.6f
        const val BLEND_HIGH = 1.0f
        
        @Volatile
        private var instance: NeuralAudioProcessorTFLite? = null
        
        fun getInstance(): NeuralAudioProcessorTFLite {
            return instance ?: synchronized(this) {
                instance ?: NeuralAudioProcessorTFLite().also { instance = it }
            }
        }
    }
    
    enum class Status {
        IDLE,
        LOADING,
        READY,
        ERROR
    }
    
    enum class EnhancementLevel(val blend: Float) {
        LOW(BLEND_LOW),
        MEDIUM(BLEND_MEDIUM),
        HIGH(BLEND_HIGH)
    }
    
    private var interpreter: Interpreter? = null
    private var gpuDelegate: GpuDelegate? = null
    private var status: Status = Status.IDLE
    private var isEnabled: Boolean = false
    private var currentLevel: EnhancementLevel = EnhancementLevel.MEDIUM
    private var useGpu: Boolean = false
    
    private var inputBuffer: ByteBuffer? = null
    private var outputBuffer: ByteBuffer? = null
    private val inputShape = intArrayOf(1, INPUT_LENGTH, 1)
    private val outputShape = intArrayOf(1, INPUT_LENGTH, 1)
    
    private val statusListeners = mutableSetOf<(Status) -> Unit>()
    
    init {
        Log.d(TAG, "Initialized - Kuleshov architecture v$MODEL_VERSION")
    }
    
    /**
     * Initialize the TensorFlow Lite interpreter with the neural audio model.
     * 
     * @param context Android context for accessing assets
     * @return true if initialization succeeded, false otherwise
     */
    fun initialize(context: Context): Boolean {
        if (status == Status.READY) {
            Log.d(TAG, "Already initialized")
            return true
        }
        
        if (status == Status.LOADING) {
            Log.d(TAG, "Initialization in progress")
            return false
        }
        
        setStatus(Status.LOADING)
        Log.d(TAG, "Loading TFLite model: $MODEL_FILENAME")
        
        return try {
            val modelBuffer = loadModelFile(context)
            if (modelBuffer == null) {
                Log.e(TAG, "Failed to load model file")
                setStatus(Status.ERROR)
                return false
            }
            
            val options = Interpreter.Options()
            options.setNumThreads(4)
            
            val compatList = CompatibilityList()
            if (compatList.isDelegateSupportedOnThisDevice) {
                try {
                    val delegateOptions = compatList.bestOptionsForThisDevice
                    gpuDelegate = GpuDelegate(delegateOptions)
                    options.addDelegate(gpuDelegate)
                    useGpu = true
                    Log.d(TAG, "GPU delegate enabled")
                } catch (e: Exception) {
                    Log.w(TAG, "GPU delegate failed, using CPU: ${e.message}")
                    useGpu = false
                }
            } else {
                Log.d(TAG, "GPU not supported, using CPU")
                useGpu = false
            }
            
            interpreter = Interpreter(modelBuffer, options)
            
            allocateBuffers()
            
            warmup()
            
            setStatus(Status.READY)
            Log.d(TAG, "Model ready (v$MODEL_VERSION, GPU: $useGpu)")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Initialization failed: ${e.message}", e)
            setStatus(Status.ERROR)
            false
        }
    }
    
    /**
     * Load the TFLite model file from assets.
     */
    private fun loadModelFile(context: Context): MappedByteBuffer? {
        return try {
            val assetFileDescriptor = context.assets.openFd(MODEL_FILENAME)
            val inputStream = FileInputStream(assetFileDescriptor.fileDescriptor)
            val fileChannel = inputStream.channel
            val startOffset = assetFileDescriptor.startOffset
            val declaredLength = assetFileDescriptor.declaredLength
            fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load model from assets: ${e.message}")
            null
        }
    }
    
    /**
     * Allocate direct ByteBuffers for TFLite input/output.
     * Using direct buffers improves performance by avoiding memory copies.
     */
    private fun allocateBuffers() {
        val inputSize = INPUT_LENGTH * 4
        inputBuffer = ByteBuffer.allocateDirect(inputSize).apply {
            order(ByteOrder.nativeOrder())
        }
        
        val outputSize = INPUT_LENGTH * 4
        outputBuffer = ByteBuffer.allocateDirect(outputSize).apply {
            order(ByteOrder.nativeOrder())
        }
        
        Log.d(TAG, "Allocated buffers: input=${inputSize}B, output=${outputSize}B")
    }
    
    /**
     * Warmup the model with a dummy inference to initialize GPU resources.
     */
    private fun warmup() {
        val warmupStart = System.nanoTime()
        
        inputBuffer?.rewind()
        for (i in 0 until INPUT_LENGTH) {
            inputBuffer?.putFloat(0f)
        }
        inputBuffer?.rewind()
        outputBuffer?.rewind()
        
        interpreter?.run(inputBuffer, outputBuffer)
        
        val warmupMs = (System.nanoTime() - warmupStart) / 1_000_000.0
        Log.d(TAG, "Warmup complete: ${String.format("%.2f", warmupMs)}ms")
    }
    
    /**
     * Process a single chunk of 8192 audio samples.
     * 
     * @param samples Input audio samples (must be exactly INPUT_LENGTH samples)
     * @param blend Blend factor between original and enhanced (0.0-1.0)
     * @return Enhanced audio samples
     */
    fun processChunk(samples: FloatArray, blend: Float): FloatArray {
        if (interpreter == null || status != Status.READY) {
            return samples
        }
        
        if (samples.size != INPUT_LENGTH) {
            Log.w(TAG, "Invalid chunk size: ${samples.size}, expected $INPUT_LENGTH")
            return samples
        }
        
        val startTime = System.nanoTime()
        
        var maxVal = 0f
        for (i in 0 until INPUT_LENGTH) {
            val absVal = kotlin.math.abs(samples[i])
            if (absVal > maxVal) maxVal = absVal
        }
        if (maxVal == 0f) maxVal = 1f
        
        inputBuffer?.rewind()
        for (i in 0 until INPUT_LENGTH) {
            inputBuffer?.putFloat(samples[i] / maxVal)
        }
        inputBuffer?.rewind()
        outputBuffer?.rewind()
        
        try {
            interpreter?.run(inputBuffer, outputBuffer)
        } catch (e: Exception) {
            Log.e(TAG, "Inference failed: ${e.message}")
            return samples
        }
        
        outputBuffer?.rewind()
        val result = FloatArray(INPUT_LENGTH)
        for (i in 0 until INPUT_LENGTH) {
            val enhanced = (outputBuffer?.float ?: 0f) * maxVal
            val original = samples[i]
            result[i] = original + (enhanced - original) * blend
        }
        
        val inferenceMs = (System.nanoTime() - startTime) / 1_000_000.0
        if (inferenceMs > 50) {
            Log.d(TAG, "Inference time: ${String.format("%.2f", inferenceMs)}ms")
        }
        
        return result
    }
    
    /**
     * Process audio with support for mono and stereo channels.
     * 
     * For stereo audio, each channel is processed independently.
     * 
     * @param samples Interleaved audio samples (mono or stereo)
     * @param channelCount Number of channels (1 for mono, 2 for stereo)
     * @param blend Blend factor between original and enhanced (0.0-1.0)
     * @return Enhanced audio samples in the same format as input
     */
    fun processAudio(samples: FloatArray, channelCount: Int, blend: Float): FloatArray {
        if (!isEnabled || interpreter == null || status != Status.READY) {
            return samples
        }
        
        if (samples.isEmpty()) {
            return samples
        }
        
        return when (channelCount) {
            1 -> processMonoAudio(samples, blend)
            2 -> processStereoAudio(samples, blend)
            else -> {
                Log.w(TAG, "Unsupported channel count: $channelCount")
                samples
            }
        }
    }
    
    /**
     * Process mono audio by chunking into INPUT_LENGTH segments.
     */
    private fun processMonoAudio(samples: FloatArray, blend: Float): FloatArray {
        val paddedLength = ((samples.size + INPUT_LENGTH - 1) / INPUT_LENGTH) * INPUT_LENGTH
        val paddedInput = FloatArray(paddedLength)
        samples.copyInto(paddedInput, 0, 0, samples.size)
        
        val result = FloatArray(samples.size)
        var offset = 0
        
        while (offset < paddedLength) {
            val chunk = paddedInput.copyOfRange(offset, offset + INPUT_LENGTH)
            val enhancedChunk = processChunk(chunk, blend)
            
            val copyLength = minOf(INPUT_LENGTH, samples.size - offset)
            if (copyLength > 0 && offset < samples.size) {
                enhancedChunk.copyInto(result, offset, 0, copyLength)
            }
            
            offset += INPUT_LENGTH
        }
        
        return result
    }
    
    /**
     * Process stereo audio by deinterleaving, processing each channel, and reinterleaving.
     */
    private fun processStereoAudio(samples: FloatArray, blend: Float): FloatArray {
        val frameCount = samples.size / 2
        
        val leftChannel = FloatArray(frameCount)
        val rightChannel = FloatArray(frameCount)
        
        for (i in 0 until frameCount) {
            leftChannel[i] = samples[i * 2]
            rightChannel[i] = samples[i * 2 + 1]
        }
        
        val enhancedLeft = processMonoAudio(leftChannel, blend)
        val enhancedRight = processMonoAudio(rightChannel, blend)
        
        val result = FloatArray(samples.size)
        for (i in 0 until frameCount) {
            result[i * 2] = enhancedLeft[i]
            result[i * 2 + 1] = enhancedRight[i]
        }
        
        return result
    }
    
    /**
     * Process audio using the current enhancement level setting.
     */
    fun processAudio(samples: FloatArray, channelCount: Int): FloatArray {
        return processAudio(samples, channelCount, currentLevel.blend)
    }
    
    /**
     * Enable or disable neural audio processing.
     */
    fun setEnabled(enabled: Boolean) {
        isEnabled = enabled
        Log.d(TAG, "Enabled: $enabled")
    }
    
    /**
     * Check if neural audio processing is enabled.
     */
    fun isEnabled(): Boolean = isEnabled
    
    /**
     * Set the enhancement level.
     */
    fun setLevel(level: EnhancementLevel) {
        currentLevel = level
        Log.d(TAG, "Level set to: ${level.name} (blend: ${level.blend})")
    }
    
    /**
     * Get the current enhancement level.
     */
    fun getLevel(): EnhancementLevel = currentLevel
    
    /**
     * Get the current processor status.
     */
    fun getStatus(): Status = status
    
    /**
     * Check if the processor is ready for inference.
     */
    fun isReady(): Boolean = status == Status.READY && interpreter != null
    
    /**
     * Register a listener for status changes.
     */
    fun addStatusListener(listener: (Status) -> Unit) {
        statusListeners.add(listener)
    }
    
    /**
     * Remove a status listener.
     */
    fun removeStatusListener(listener: (Status) -> Unit) {
        statusListeners.remove(listener)
    }
    
    private fun setStatus(newStatus: Status) {
        status = newStatus
        statusListeners.forEach { it(newStatus) }
    }
    
    /**
     * Get information about the loaded model.
     */
    fun getModelInfo(): Map<String, Any> {
        return mapOf(
            "status" to status.name,
            "isEnabled" to isEnabled,
            "level" to currentLevel.name,
            "blend" to currentLevel.blend,
            "inputLength" to INPUT_LENGTH,
            "modelLoaded" to (interpreter != null),
            "useGpu" to useGpu,
            "architecture" to "Kuleshov Audio Super-Resolution (1D U-Net CNN)",
            "version" to MODEL_VERSION
        )
    }
    
    /**
     * Release all resources held by the processor.
     */
    fun dispose() {
        interpreter?.close()
        interpreter = null
        
        gpuDelegate?.close()
        gpuDelegate = null
        
        inputBuffer = null
        outputBuffer = null
        
        status = Status.IDLE
        isEnabled = false
        statusListeners.clear()
        
        Log.d(TAG, "Disposed")
    }
    
    /**
     * Get blend factor for a given enhancement level name.
     */
    fun getBlendForLevel(levelName: String): Float {
        return when (levelName.lowercase()) {
            "low" -> BLEND_LOW
            "medium" -> BLEND_MEDIUM
            "high" -> BLEND_HIGH
            else -> BLEND_MEDIUM
        }
    }
}
