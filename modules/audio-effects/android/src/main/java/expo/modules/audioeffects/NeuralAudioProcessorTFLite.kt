package expo.modules.audioeffects

import android.content.Context
import android.util.Log
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.locks.ReentrantLock
import java.util.concurrent.Executors
import kotlin.concurrent.withLock

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
 * - CPU-only processing (industry standard for real-time audio DSP)
 * 
 * Thread Safety:
 * - Uses ReentrantLock for critical sections
 * - Safe for concurrent access from audio and UI threads
 * 
 * Real-time Safety:
 * - Time budget enforcement (10ms per chunk)
 * - Automatic bypass on timeout or error
 * - Bypass tracking for debugging
 * 
 * @author Audio360 Team
 * @version 1.3.0
 */
class NeuralAudioProcessorTFLite private constructor() {
    
    companion object {
        private const val TAG = "NeuralAudioTFLite"
        private const val MODEL_VERSION = "1.3.0"
        private const val MODEL_FILENAME = "audio_sr_model.tflite"
        
        const val INPUT_LENGTH = 8192
        
        const val BLEND_LOW = 0.3f
        const val BLEND_MEDIUM = 0.6f
        const val BLEND_HIGH = 1.0f
        
        private const val TIME_BUDGET_MS = 10L
        private const val BYPASS_LOG_INTERVAL = 100
        
        // Single-threaded executor for async initialization (avoids audio thread blocking)
        private val initExecutor = Executors.newSingleThreadExecutor()
        
        @Volatile
        private var instance: NeuralAudioProcessorTFLite? = null
        
        fun getInstance(): NeuralAudioProcessorTFLite {
            return instance ?: synchronized(this) {
                instance ?: NeuralAudioProcessorTFLite().also { instance = it }
            }
        }
        
        fun releaseInstance() {
            synchronized(this) {
                instance?.release()
                instance = null
            }
        }
    }
    
    enum class Status {
        IDLE,
        INITIALIZING,
        READY,
        PROCESSING,
        ERROR,
        RELEASED
    }
    
    enum class EnhancementLevel(val blend: Float) {
        LOW(BLEND_LOW),
        MEDIUM(BLEND_MEDIUM),
        HIGH(BLEND_HIGH)
    }
    
    private val processingLock = ReentrantLock()
    
    @Volatile
    private var interpreter: Interpreter? = null
    @Volatile
    private var status: Status = Status.IDLE
    @Volatile
    private var isEnabled: Boolean = false
    @Volatile
    private var currentLevel: EnhancementLevel = EnhancementLevel.MEDIUM
    
    @Volatile
    private var inputBuffer: ByteBuffer? = null
    @Volatile
    private var outputBuffer: ByteBuffer? = null
    private val inputShape = intArrayOf(1, INPUT_LENGTH, 1)
    private val outputShape = intArrayOf(1, INPUT_LENGTH, 1)
    
    private val statusListeners = mutableSetOf<(Status) -> Unit>()
    
    private val bypassCount = AtomicLong(0)
    private val timeoutBypassCount = AtomicLong(0)
    private val errorBypassCount = AtomicLong(0)
    private val totalProcessedChunks = AtomicLong(0)
    
    init {
        Log.d(TAG, "Initialized - Kuleshov architecture v$MODEL_VERSION")
    }
    
    /**
     * Initialize the TensorFlow Lite interpreter with the neural audio model.
     * 
     * @param context Android context for accessing assets
     * @return true if initialization succeeded, false otherwise
     */
    @Synchronized
    fun initialize(context: Context): Boolean {
        if (status == Status.READY) {
            Log.d(TAG, "Already initialized")
            return true
        }
        
        if (status == Status.INITIALIZING) {
            Log.d(TAG, "Initialization in progress")
            return false
        }
        
        if (status == Status.RELEASED) {
            Log.w(TAG, "Cannot initialize after release")
            return false
        }
        
        setStatus(Status.INITIALIZING)
        Log.d(TAG, "Loading TFLite model: $MODEL_FILENAME")
        
        return try {
            val modelBuffer = loadModelFile(context)
            if (modelBuffer == null) {
                Log.e(TAG, "Failed to load model file")
                setStatus(Status.ERROR)
                return false
            }
            
            // CPU-only processing - industry standard for real-time audio DSP
            // GPU is NOT suitable for real-time audio because:
            // 1. GPU introduces memory transfer overhead (CPU→GPU→CPU)
            // 2. Audio uses small buffer sizes (8192 samples), inefficient for GPU
            // 3. Real-time audio has strict latency requirements (~10ms)
            // 4. CPU timing is more predictable than GPU scheduling
            val options = Interpreter.Options()
            options.setNumThreads(4)  // Multi-threaded CPU inference
            
            Log.d(TAG, "Using CPU-only processing (industry standard for real-time audio)")
            
            interpreter = Interpreter(modelBuffer, options)
            
            allocateBuffers()
            
            warmup()
            
            setStatus(Status.READY)
            Log.d(TAG, "Model ready (v$MODEL_VERSION, CPU-only)")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Initialization failed: ${e.message}", e)
            setStatus(Status.ERROR)
            false
        }
    }
    
    /**
     * Initialize the TensorFlow Lite interpreter asynchronously in a background thread.
     * This prevents blocking the audio/UI thread during model loading.
     * 
     * Call this on app startup (e.g., in PlaybackService.onCreate()) to preload the model.
     * The processor will gracefully bypass audio until initialization completes.
     * 
     * @param context Android context for accessing assets
     * @param onComplete Optional callback when initialization finishes (called on background thread)
     */
    fun initializeAsync(context: Context, onComplete: ((Boolean) -> Unit)? = null) {
        if (status == Status.READY) {
            Log.d(TAG, "Already initialized, skipping async init")
            onComplete?.invoke(true)
            return
        }
        
        if (status == Status.INITIALIZING) {
            Log.d(TAG, "Initialization already in progress")
            return
        }
        
        Log.d(TAG, "Starting async initialization...")
        initExecutor.execute {
            val result = initialize(context)
            Log.d(TAG, "Async initialization complete: $result")
            onComplete?.invoke(result)
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
     * Process a single chunk of 8192 audio samples with time budget enforcement.
     * 
     * @param samples Input audio samples (must be exactly INPUT_LENGTH samples)
     * @param blend Blend factor between original and enhanced (0.0-1.0)
     * @return Enhanced audio samples, or original if timeout/error occurs
     */
    fun processChunk(samples: FloatArray, blend: Float): FloatArray {
        val currentInterpreter = interpreter
        val currentStatus = status
        val currentInputBuffer = inputBuffer
        val currentOutputBuffer = outputBuffer
        
        if (currentInterpreter == null || currentStatus != Status.READY) {
            recordBypass(BypassReason.NOT_READY)
            return samples
        }
        
        if (samples.size != INPUT_LENGTH) {
            Log.w(TAG, "Invalid chunk size: ${samples.size}, expected $INPUT_LENGTH")
            recordBypass(BypassReason.INVALID_INPUT)
            return samples
        }
        
        if (currentInputBuffer == null || currentOutputBuffer == null) {
            recordBypass(BypassReason.BUFFER_NULL)
            return samples
        }
        
        val startTime = System.nanoTime()
        
        return processingLock.withLock {
            try {
                if (status == Status.RELEASED) {
                    recordBypass(BypassReason.RELEASED)
                    return@withLock samples
                }
                
                val previousStatus = status
                setStatus(Status.PROCESSING)
                
                var maxVal = 0f
                for (i in 0 until INPUT_LENGTH) {
                    val absVal = kotlin.math.abs(samples[i])
                    if (absVal > maxVal) maxVal = absVal
                }
                if (maxVal == 0f) maxVal = 1f
                
                currentInputBuffer.rewind()
                for (i in 0 until INPUT_LENGTH) {
                    currentInputBuffer.putFloat(samples[i] / maxVal)
                }
                currentInputBuffer.rewind()
                currentOutputBuffer.rewind()
                
                val elapsedBeforeInference = (System.nanoTime() - startTime) / 1_000_000
                if (elapsedBeforeInference > TIME_BUDGET_MS) {
                    setStatus(Status.READY)
                    recordBypass(BypassReason.TIMEOUT)
                    return@withLock samples
                }
                
                try {
                    currentInterpreter.run(currentInputBuffer, currentOutputBuffer)
                } catch (e: Exception) {
                    Log.e(TAG, "Inference failed: ${e.message}")
                    setStatus(Status.READY)
                    recordBypass(BypassReason.ERROR)
                    return@withLock samples
                }
                
                val inferenceMs = (System.nanoTime() - startTime) / 1_000_000
                if (inferenceMs > TIME_BUDGET_MS) {
                    setStatus(Status.READY)
                    recordBypass(BypassReason.TIMEOUT)
                    return@withLock samples
                }
                
                currentOutputBuffer.rewind()
                val result = FloatArray(INPUT_LENGTH)
                for (i in 0 until INPUT_LENGTH) {
                    val enhanced = (currentOutputBuffer.float) * maxVal
                    val original = samples[i]
                    result[i] = original + (enhanced - original) * blend
                }
                
                totalProcessedChunks.incrementAndGet()
                setStatus(Status.READY)
                
                val totalMs = (System.nanoTime() - startTime) / 1_000_000.0
                if (totalMs > 50) {
                    Log.d(TAG, "Inference time: ${String.format("%.2f", totalMs)}ms")
                }
                
                result
            } catch (e: Exception) {
                Log.e(TAG, "Processing error: ${e.message}", e)
                setStatus(Status.READY)
                recordBypass(BypassReason.ERROR)
                samples
            }
        }
    }
    
    private enum class BypassReason {
        NOT_READY,
        INVALID_INPUT,
        BUFFER_NULL,
        RELEASED,
        TIMEOUT,
        ERROR
    }
    
    private fun recordBypass(reason: BypassReason) {
        val count = bypassCount.incrementAndGet()
        when (reason) {
            BypassReason.TIMEOUT -> timeoutBypassCount.incrementAndGet()
            BypassReason.ERROR -> errorBypassCount.incrementAndGet()
            else -> {}
        }
        
        if (count % BYPASS_LOG_INTERVAL == 0L) {
            Log.d(TAG, "Bypass stats: total=$count, timeouts=${timeoutBypassCount.get()}, errors=${errorBypassCount.get()}, processed=${totalProcessedChunks.get()}")
        }
    }
    
    /**
     * Process audio with support for mono and stereo channels.
     * Thread-safe with time budget enforcement.
     * 
     * For stereo audio, each channel is processed independently.
     * 
     * @param samples Interleaved audio samples (mono or stereo)
     * @param channelCount Number of channels (1 for mono, 2 for stereo)
     * @param blend Blend factor between original and enhanced (0.0-1.0)
     * @return Enhanced audio samples in the same format as input
     */
    @Synchronized
    fun processAudio(samples: FloatArray, channelCount: Int, blend: Float): FloatArray {
        if (!isEnabled || interpreter == null || status != Status.READY) {
            return samples
        }
        
        if (samples.isEmpty()) {
            return samples
        }
        
        return try {
            when (channelCount) {
                1 -> processMonoAudio(samples, blend)
                2 -> processStereoAudio(samples, blend)
                else -> {
                    Log.w(TAG, "Unsupported channel count: $channelCount")
                    samples
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "processAudio failed, bypassing: ${e.message}")
            samples
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
    @Synchronized
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
    @Synchronized
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
     * Check if the processor is enabled.
     */
    fun isEnabled(): Boolean = isEnabled
    
    /**
     * Release the model to free memory when under pressure.
     * Can be re-initialized later with initialize().
     */
    @Synchronized
    fun releaseModel() {
        if (status != Status.READY && status != Status.IDLE) return
        
        Log.d(TAG, "Releasing model for memory optimization")
        
        try {
            interpreter?.close()
        } catch (e: Exception) {
            Log.w(TAG, "Error closing interpreter: ${e.message}")
        }
        interpreter = null
        inputBuffer = null
        outputBuffer = null
        setStatus(Status.IDLE)
        
        Log.d(TAG, "Model released, status set to IDLE")
    }
    
    /**
     * Register a listener for status changes.
     */
    @Synchronized
    fun addStatusListener(listener: (Status) -> Unit) {
        statusListeners.add(listener)
    }
    
    /**
     * Remove a status listener.
     */
    @Synchronized
    fun removeStatusListener(listener: (Status) -> Unit) {
        statusListeners.remove(listener)
    }
    
    private fun setStatus(newStatus: Status) {
        status = newStatus
        statusListeners.forEach { 
            try {
                it(newStatus)
            } catch (e: Exception) {
                Log.e(TAG, "Status listener error: ${e.message}")
            }
        }
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
            "processingMode" to "CPU-only (industry standard)",
            "architecture" to "Kuleshov Audio Super-Resolution (1D U-Net CNN)",
            "version" to MODEL_VERSION,
            "timeBudgetMs" to TIME_BUDGET_MS,
            "totalBypasses" to bypassCount.get(),
            "timeoutBypasses" to timeoutBypassCount.get(),
            "errorBypasses" to errorBypassCount.get(),
            "processedChunks" to totalProcessedChunks.get()
        )
    }
    
    /**
     * Get bypass statistics for debugging.
     */
    fun getBypassStats(): Map<String, Long> {
        return mapOf(
            "totalBypasses" to bypassCount.get(),
            "timeoutBypasses" to timeoutBypassCount.get(),
            "errorBypasses" to errorBypassCount.get(),
            "processedChunks" to totalProcessedChunks.get()
        )
    }
    
    /**
     * Release all resources held by the processor.
     * Thread-safe cleanup of interpreter and GPU delegate.
     * After calling this, the processor cannot be reused.
     */
    @Synchronized
    fun release() {
        if (status == Status.RELEASED) {
            Log.d(TAG, "Already released")
            return
        }
        
        Log.d(TAG, "Releasing resources...")
        
        processingLock.withLock {
            try {
                interpreter?.close()
            } catch (e: Exception) {
                Log.w(TAG, "Error closing interpreter: ${e.message}")
            }
            interpreter = null
            
            inputBuffer = null
            outputBuffer = null
        }
        
        isEnabled = false
        setStatus(Status.RELEASED)
        statusListeners.clear()
        
        Log.d(TAG, "Released - Final stats: bypasses=${bypassCount.get()}, processed=${totalProcessedChunks.get()}")
    }
    
    /**
     * Release all resources held by the processor.
     * @deprecated Use release() instead for clearer naming.
     */
    @Deprecated("Use release() instead", ReplaceWith("release()"))
    fun dispose() {
        release()
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
