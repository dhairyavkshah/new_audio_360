package expo.modules.audioeffects

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.AudioProcessor.AudioFormat
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Pure software-based DSP audio processor for Android.
 * 
 * Audio Processing Standards:
 * - Input: PCM16 (16-bit) or PCM24 (24-bit) at any sample rate
 * - Internal: 32-bit float processing throughout the signal chain
 * - Output: Same format as input (PCM16 or PCM24) at input sample rate
 * - Filters: Configured at input sample rate for accurate frequency response
 * - Design reference: 48 kHz (Android native output rate, most common)
 * - True stereo processing with independent L/R channel states
 * 
 * Note: Filters are always configured at the input sample rate to ensure
 * correct frequency response. No resampling is performed - the processor
 * operates at the source sample rate (typically 44.1kHz or 48kHz).
 * 
 * Signal Chain (v29.0):
 * Input → AI Audio Upscaling (Neural) → 10-Band EQ → Bass Shelf → Bass Enhancement → Treble Shelf → Spatial Enhancement (with HRTF) → Reverb → Limiter → Output
 * 
 * Smart Enhancements (v29.0):
 * - HRTF Binaural: Pinna filters @ 2.7kHz (Q=2.0, +0-5dB) and 8kHz (Q=1.5, +0-3dB) for spatial levels 2-5
 * - Bass Enhancement: Harmonic generation via soft-clipping, 75Hz crossover, max +4dB
 * - HF Restoration / AI Upscaling: Neural audio super-resolution via TensorFlow Lite (Kuleshov 1D U-Net)
 *   Replaces DSP-based spectral extension with AI-powered audio enhancement
 */
class SoftwareDSPAudioProcessor : AudioProcessor {
    companion object {
        const val DB_PER_UNIT = 2.4f
        const val MAX_DB = 12f
        const val DEFAULT_Q = 1.4f
        const val SHELF_Q = 0.707f
        
        // Standard sample rate for filter design (48 kHz industry standard)
        const val STANDARD_SAMPLE_RATE = 48000f
        
        // 10-band EQ frequencies matching Web implementation
        private val EQ_FREQUENCIES = floatArrayOf(60f, 170f, 310f, 600f, 1000f, 3000f, 6000f, 12000f, 14000f, 16000f)
        private val EQ_NAMES = arrayOf("60Hz", "170Hz", "310Hz", "600Hz", "1kHz", "3kHz", "6kHz", "12kHz", "14kHz", "16kHz")
        
        const val BASS_SHELF_FREQ = 150f
        const val TREBLE_SHELF_FREQ = 6000f
        
        // Psychoacoustic Stereo Enhancement constants (industry-standard ranges)
        // ITD: Human maximum is ~700µs (0.7ms) for 90° lateral position
        // ILD: Up to 15-20dB for high frequencies at 90° azimuth
        private const val BASS_MONO_FREQ = 150f
        private const val SIDE_BOOST = 1.0f  // 100% boost = 2.0x at max level (industry standard)
        private const val ITD_DELAY_MS = 0.35f  // Base ITD (not used directly, scaled by level)
        private const val MAX_ITD_DELAY_MS = 0.7f  // Human maximum ~700µs
        private const val CORRELATION_THRESHOLD = 0.3f
        private const val CORRELATION_ALPHA = 0.995f  // EMA smoothing
        private const val ALLPASS_Q = 0.7f
        // Note: Mid attenuation removed - spatial enhancement only boosts sides without reducing center
        
        // 6-Level Spatial Enhancement Slider System
        // Level 0: Off, Level 1: Subtle, Level 2: Mild, Level 3: Moderate, Level 4: Enhanced, Level 5: Maximum
        private val SLIDER_SIDE_GAIN = floatArrayOf(0f, 3f, 6f, 10f, 14f, 18f)        // Side Gain (%)
        private val SLIDER_ITD_MS = floatArrayOf(0f, 0.10f, 0.15f, 0.25f, 0.40f, 0.60f) // ITD (ms)
        private val SLIDER_DECORRELATION = floatArrayOf(0f, 3f, 5f, 8f, 12f, 18f)     // Decorrelation (%)
        private val SLIDER_WET_MIX = floatArrayOf(0f, 10f, 20f, 30f, 40f, 55f)         // Wet Mix (%)
        private val SLIDER_MULTIPLIERS = floatArrayOf(0.0f, 0.5f, 1.0f, 1.25f, 1.4f, 1.5f) // Multipliers
        
        // Hard Safety Caps (NEVER EXCEED)
        private const val MAX_SIDE_GAIN_PERCENT = 18f   // max 18%
        private const val MAX_ITD_MS = 0.6f             // max 0.6ms
        private const val MAX_DECORRELATION = 18f       // max 18%
        private const val MAX_WET_MIX = 55f             // max 55%
        
        // HRTF Pinna Simulation (industry-standard ear canal resonance)
        private const val HRTF_PINNA_FREQ = 2700f
        private const val HRTF_ELEVATION_FREQ = 8000f
        private const val HRTF_PINNA_Q = 2.0f
        private const val HRTF_ELEVATION_Q = 1.5f
        private val SLIDER_HRTF_GAIN = floatArrayOf(0f, 0f, 2f, 3f, 4f, 5f) // dB per level
        
        // Bass Enhancement (psychoacoustic harmonic generation)
        private const val BASS_ENHANCE_CROSSOVER = 75f
        private const val BASS_ENHANCE_MAX_BOOST_DB = 4f
        
        // HF Restoration (high-frequency spectral extension)
        private const val HF_ANALYZE_LOW = 10000f
        private const val HF_ANALYZE_HIGH = 14000f
        private const val HF_RESTORE_FREQ = 16000f
        private const val HF_RESTORE_MAX_BOOST_DB = 3f
        
        @Volatile
        private var sharedInstance: SoftwareDSPAudioProcessor? = null
        
        fun getInstance(): SoftwareDSPAudioProcessor {
            return sharedInstance ?: synchronized(this) {
                sharedInstance ?: SoftwareDSPAudioProcessor().also { sharedInstance = it }
            }
        }
    }

    private var inputFormat: AudioFormat = AudioFormat.NOT_SET
    private var outputFormat: AudioFormat = AudioFormat.NOT_SET
    private var pendingFormat: AudioFormat = AudioFormat.NOT_SET
    private var isActive = false
    private var inputEnded = false
    
    // Current input format properties
    private var currentEncoding: Int = C.ENCODING_PCM_16BIT
    private var currentSampleRate: Float = STANDARD_SAMPLE_RATE
    
    // Sample counting for accurate progress tracking
    // This is more accurate than ExoPlayer's timing-based position
    @Volatile private var samplesProcessed: Long = 0L
    @Volatile private var trackEnded: Boolean = false
    private var endOfStreamCallback: (() -> Unit)? = null
    
    // Pending sample position for seeks - flush() will use this value instead of 0
    // This prevents race conditions where ExoPlayer's async flush() resets the counter
    // after we've set it via resetSampleCounter()
    @Volatile private var pendingSamplePosition: Long? = null

    // All filters configured at 48 kHz (reconfigured at runtime if input differs)
    private val eqFilters = Array(10) { i ->
        BiquadFilter(FilterType.PEAKING, EQ_FREQUENCIES[i], 0f, DEFAULT_Q, STANDARD_SAMPLE_RATE)
    }
    private val bassShelfFilter = BiquadFilter(FilterType.LOWSHELF, BASS_SHELF_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val trebleShelfFilter = BiquadFilter(FilterType.HIGHSHELF, TREBLE_SHELF_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val limiter = Limiter(-0.1f, 20f, 1f, 100f, STANDARD_SAMPLE_RATE)
    
    // HRTF Pinna Simulation filters (L/R independent)
    private val hrtfPinnaFilterL = BiquadFilter(FilterType.PEAKING, HRTF_PINNA_FREQ, 0f, HRTF_PINNA_Q, STANDARD_SAMPLE_RATE)
    private val hrtfPinnaFilterR = BiquadFilter(FilterType.PEAKING, HRTF_PINNA_FREQ, 0f, HRTF_PINNA_Q, STANDARD_SAMPLE_RATE)
    private val hrtfElevationFilterL = BiquadFilter(FilterType.PEAKING, HRTF_ELEVATION_FREQ, 0f, HRTF_ELEVATION_Q, STANDARD_SAMPLE_RATE)
    private val hrtfElevationFilterR = BiquadFilter(FilterType.PEAKING, HRTF_ELEVATION_FREQ, 0f, HRTF_ELEVATION_Q, STANDARD_SAMPLE_RATE)
    
    // Bass Enhancement filters (harmonic generation)
    private val bassEnhanceLowpass = BiquadFilter(FilterType.LOWPASS, BASS_ENHANCE_CROSSOVER, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val bassEnhanceHighpass = BiquadFilter(FilterType.HIGHPASS, BASS_ENHANCE_CROSSOVER, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val bassHarmonicsFilter = BiquadFilter(FilterType.PEAKING, 150f, 0f, 1.0f, STANDARD_SAMPLE_RATE)
    
    // HF Restoration filters (spectral extension)
    private val hfAnalyzeFilter = BiquadFilter(FilterType.HIGHPASS, HF_ANALYZE_LOW, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val hfRestoreFilter = BiquadFilter(FilterType.HIGHSHELF, HF_RESTORE_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)

    private val eqGains = FloatArray(10) { 0f }
    
    // Multi-tap delay reverb (4 delay lines for richer sound)
    // Max delay sized for 48 kHz (industry standard sample rate)
    private val DELAY_TIMES = floatArrayOf(0.023f, 0.041f, 0.067f, 0.089f) // seconds
    private val DELAY_FEEDBACKS = floatArrayOf(0.4f, 0.35f, 0.3f, 0.25f)
    private val MAX_DELAY_SAMPLES = 9600 // ~200ms at 48kHz
    private val delayBuffersL = Array(4) { FloatArray(MAX_DELAY_SAMPLES) }
    private val delayBuffersR = Array(4) { FloatArray(MAX_DELAY_SAMPLES) }
    private val delayIndices = IntArray(4) { 0 }
    
    private var reverbWetMix = 0f // 0.0 = dry, 1.0 = full reverb
    private var bassGain = 0f
    private var trebleGain = 0f
    private var isEnabled = true
    
    // HRTF state variables
    private var hrtfPinnaGain = 0f
    private var hrtfElevationGain = 0f
    
    // Bass Enhancement state
    private var bassEnhancementLevel = 0f // 0-100%
    
    // HF Restoration state
    private var hfRestorationEnabled = false
    private var hfRestorationLevel = 0f // 0-100%
    private var hfEnergySmooth = 0f // Smoothed HF energy for auto-detection
    
    // Psychoacoustic Stereo Enhancement
    private var spatialEnhancementLevel: Int = 0  // 0-5 intensity level (legacy)
    
    // Explicit spatial parameters (used when set via setSpatialEnhancementParams)
    private var explicitSpatialParams: Boolean = false
    private var spatialSideGainPercent: Float = 0f      // Side gain boost in % (+6 = 1.06x)
    private var spatialItdMs: Float = 0f                 // ITD in milliseconds (0-0.7)
    private var spatialDecorrelation: Float = 0f         // Decorrelation amount in % (0-100)
    private var spatialWetMix: Float = 0f                // Wet mix in % (0-100)
    
    // Bass mono enforcement filters (lowpass at 150Hz to extract bass for mono-sum)
    private val bassMonoLowpassL = BiquadFilter(FilterType.LOWPASS, BASS_MONO_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val bassMonoLowpassR = BiquadFilter(FilterType.LOWPASS, BASS_MONO_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val bassMonoHighpassL = BiquadFilter(FilterType.HIGHPASS, BASS_MONO_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val bassMonoHighpassR = BiquadFilter(FilterType.HIGHPASS, BASS_MONO_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    
    // Side channel highpass filter (150Hz) - no bass widening
    private val sideHighpassFilter = BiquadFilter(FilterType.HIGHPASS, BASS_MONO_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    
    // All-pass decorrelation filters for Side channel (above 2kHz)
    private val allpassFilter1 = BiquadFilter(FilterType.ALLPASS, 3000f, 0f, ALLPASS_Q, STANDARD_SAMPLE_RATE)
    private val allpassFilter2 = BiquadFilter(FilterType.ALLPASS, 5000f, 0f, ALLPASS_Q, STANDARD_SAMPLE_RATE)
    
    // ITD delay buffer for Side channel (max 0.6ms = ~29 samples at 48kHz)
    private val MAX_ITD_DELAY_SAMPLES = 64 // Enough for 0.6ms at 96kHz
    private val itdDelayBuffer = FloatArray(MAX_ITD_DELAY_SAMPLES)
    private var itdDelayWriteIndex = 0
    private var itdDelaySamples = 0 // Actual delay in samples at current sample rate
    
    // Correlation monitor state (EMA)
    private var correlationSum = 0.0
    private var leftSquaredSum = 0.0
    private var rightSquaredSum = 0.0
    private var runningCorrelation = 1.0f // Start assuming full correlation

    private var outputBuffer: ByteBuffer = AudioProcessor.EMPTY_BUFFER
    private var inputBuffer: ByteBuffer = AudioProcessor.EMPTY_BUFFER
    
    // Reusable float buffer for 32-bit internal processing
    private var floatSamples: FloatArray = FloatArray(0)

    init {
        sharedInstance = this
        android.util.Log.d("SoftwareDSP", "Initialized with 32-bit float internal processing @ $STANDARD_SAMPLE_RATE Hz")
    }

    override fun configure(inputAudioFormat: AudioFormat): AudioFormat {
        // Support both 16-bit and 24-bit PCM input
        val encoding = inputAudioFormat.encoding
        if (encoding != C.ENCODING_PCM_16BIT && encoding != C.ENCODING_PCM_24BIT) {
            android.util.Log.w("SoftwareDSP", "Unsupported encoding: $encoding, only PCM16 and PCM24 supported")
            return AudioFormat.NOT_SET
        }

        pendingFormat = inputAudioFormat
        currentEncoding = encoding
        currentSampleRate = inputAudioFormat.sampleRate.toFloat()
        
        // Configure all filters at the input sample rate
        // (allows playback at any rate while maintaining correct frequency response)
        for (i in 0 until 10) {
            eqFilters[i].configure(FilterType.PEAKING, EQ_FREQUENCIES[i], eqGains[i], DEFAULT_Q, currentSampleRate)
        }
        bassShelfFilter.configure(FilterType.LOWSHELF, BASS_SHELF_FREQ, bassGain, SHELF_Q, currentSampleRate)
        trebleShelfFilter.configure(FilterType.HIGHSHELF, TREBLE_SHELF_FREQ, trebleGain, SHELF_Q, currentSampleRate)
        limiter.setSampleRate(currentSampleRate)
        
        // Configure psychoacoustic stereo enhancement filters
        bassMonoLowpassL.configure(FilterType.LOWPASS, BASS_MONO_FREQ, 0f, SHELF_Q, currentSampleRate)
        bassMonoLowpassR.configure(FilterType.LOWPASS, BASS_MONO_FREQ, 0f, SHELF_Q, currentSampleRate)
        bassMonoHighpassL.configure(FilterType.HIGHPASS, BASS_MONO_FREQ, 0f, SHELF_Q, currentSampleRate)
        bassMonoHighpassR.configure(FilterType.HIGHPASS, BASS_MONO_FREQ, 0f, SHELF_Q, currentSampleRate)
        sideHighpassFilter.configure(FilterType.HIGHPASS, BASS_MONO_FREQ, 0f, SHELF_Q, currentSampleRate)
        allpassFilter1.configure(FilterType.ALLPASS, 3000f, 0f, ALLPASS_Q, currentSampleRate)
        allpassFilter2.configure(FilterType.ALLPASS, 5000f, 0f, ALLPASS_Q, currentSampleRate)
        
        // Configure HRTF filters at current sample rate
        hrtfPinnaFilterL.configure(FilterType.PEAKING, HRTF_PINNA_FREQ, hrtfPinnaGain, HRTF_PINNA_Q, currentSampleRate)
        hrtfPinnaFilterR.configure(FilterType.PEAKING, HRTF_PINNA_FREQ, hrtfPinnaGain, HRTF_PINNA_Q, currentSampleRate)
        hrtfElevationFilterL.configure(FilterType.PEAKING, HRTF_ELEVATION_FREQ, hrtfElevationGain, HRTF_ELEVATION_Q, currentSampleRate)
        hrtfElevationFilterR.configure(FilterType.PEAKING, HRTF_ELEVATION_FREQ, hrtfElevationGain, HRTF_ELEVATION_Q, currentSampleRate)
        
        // Configure Bass Enhancement filters at current sample rate
        bassEnhanceLowpass.configure(FilterType.LOWPASS, BASS_ENHANCE_CROSSOVER, 0f, SHELF_Q, currentSampleRate)
        bassEnhanceHighpass.configure(FilterType.HIGHPASS, BASS_ENHANCE_CROSSOVER, 0f, SHELF_Q, currentSampleRate)
        bassHarmonicsFilter.configure(FilterType.PEAKING, 150f, 0f, 1.0f, currentSampleRate)
        
        // Configure HF Restoration filters at current sample rate
        hfAnalyzeFilter.configure(FilterType.HIGHPASS, HF_ANALYZE_LOW, 0f, SHELF_Q, currentSampleRate)
        hfRestoreFilter.configure(FilterType.HIGHSHELF, HF_RESTORE_FREQ, 0f, SHELF_Q, currentSampleRate)
        
        // Calculate ITD delay in samples (0.3ms at current sample rate)
        itdDelaySamples = ((ITD_DELAY_MS / 1000f) * currentSampleRate).toInt().coerceIn(1, MAX_ITD_DELAY_SAMPLES - 1)

        inputFormat = inputAudioFormat
        outputFormat = inputAudioFormat
        isActive = true
        
        val bitDepth = if (encoding == C.ENCODING_PCM_16BIT) 16 else 24
        android.util.Log.d("SoftwareDSP", "Configured: ${bitDepth}-bit PCM @ ${currentSampleRate.toInt()} Hz, 32-bit float internal, ITD delay: $itdDelaySamples samples")

        return inputAudioFormat
    }

    override fun isActive(): Boolean = isEnabled && isActive

    override fun queueInput(buffer: ByteBuffer) {
        if (buffer.remaining() == 0) {
            outputBuffer = buffer
            return
        }

        if (!isEnabled) {
            // Passthrough mode - copy input data to output buffer
            val remaining = buffer.remaining()
            if (outputBuffer.capacity() < remaining) {
                outputBuffer = ByteBuffer.allocateDirect(remaining).order(ByteOrder.nativeOrder())
            }
            outputBuffer.clear()
            outputBuffer.put(buffer)
            outputBuffer.flip()
            return
        }

        val channelCount = inputFormat.channelCount
        val remaining = buffer.remaining()
        
        // Convert input PCM to 32-bit float for internal processing
        val sampleCount: Int
        when (currentEncoding) {
            C.ENCODING_PCM_16BIT -> {
                sampleCount = remaining / 2
                if (floatSamples.size < sampleCount) {
                    floatSamples = FloatArray(sampleCount)
                }
                pcm16ToFloat(buffer, floatSamples, sampleCount)
            }
            C.ENCODING_PCM_24BIT -> {
                sampleCount = remaining / 3
                if (floatSamples.size < sampleCount) {
                    floatSamples = FloatArray(sampleCount)
                }
                pcm24ToFloat(buffer, floatSamples, sampleCount)
            }
            else -> {
                outputBuffer = buffer
                return
            }
        }

        // =========================================
        // 32-BIT FLOAT SIGNAL CHAIN
        // =========================================
        
        // 1. AI Audio Upscaling (Neural HF Restoration via TensorFlow Lite)
        // Uses Kuleshov-style 1D U-Net for audio super-resolution
        if (hfRestorationEnabled && hfRestorationLevel > 0f && channelCount == 2) {
            val blend = when {
                hfRestorationLevel <= 33f -> NeuralAudioProcessorTFLite.BLEND_LOW      // 0.3
                hfRestorationLevel <= 66f -> NeuralAudioProcessorTFLite.BLEND_MEDIUM   // 0.6
                else -> NeuralAudioProcessorTFLite.BLEND_HIGH                           // 1.0
            }
            val neuralProcessor = NeuralAudioProcessorTFLite.getInstance()
            if (neuralProcessor.isReady()) {
                val enhanced = neuralProcessor.processAudio(floatSamples, channelCount, blend)
                enhanced.copyInto(floatSamples)
            }
        }
        
        // 2. 10-Band Parametric EQ (true stereo)
        for (filter in eqFilters) {
            if (!filter.isPassthrough()) {
                filter.processBufferFloat(floatSamples, channelCount)
            }
        }

        // 3. Bass Shelf Filter (true stereo)
        if (bassGain != 0f) {
            bassShelfFilter.processBufferFloat(floatSamples, channelCount)
        }
        
        // 4. Bass Enhancement (after bass shelf - harmonic generation)
        if (bassEnhancementLevel > 0f && channelCount == 2) {
            processBassEnhancement(floatSamples, channelCount)
        }

        // 5. Treble Shelf Filter (true stereo)
        if (trebleGain != 0f) {
            trebleShelfFilter.processBufferFloat(floatSamples, channelCount)
        }

        // 6. Psychoacoustic Stereo Enhancement (true stereo with HRTF)
        if (spatialEnhancementLevel > 0 && channelCount == 2) {
            processPsychoacousticStereo(floatSamples)
        }

        // 7. Multi-Tap Delay Reverb (true stereo)
        if (reverbWetMix > 0f && channelCount == 2) {
            processReverbFloat(floatSamples)
        }

        // 8. Brickwall Limiter (linked stereo - industry standard)
        limiter.processBufferFloat(floatSamples, channelCount)

        // =========================================
        // Convert 32-bit float back to output PCM format
        // =========================================
        
        if (outputBuffer.capacity() < remaining) {
            outputBuffer = ByteBuffer.allocateDirect(remaining).order(ByteOrder.nativeOrder())
        } else {
            outputBuffer.clear()
        }
        
        when (currentEncoding) {
            C.ENCODING_PCM_16BIT -> {
                floatToPcm16(floatSamples, outputBuffer, sampleCount)
            }
            C.ENCODING_PCM_24BIT -> {
                floatToPcm24(floatSamples, outputBuffer, sampleCount)
            }
        }
        
        outputBuffer.flip()
        
        // Update sample counter for accurate progress tracking
        // sampleCount is per-channel samples, so for stereo we divide by channel count
        val framesProcessed = sampleCount / channelCount
        samplesProcessed += framesProcessed
    }

    /**
     * Convert PCM16 (16-bit signed) to normalized float [-1.0, 1.0].
     */
    private fun pcm16ToFloat(input: ByteBuffer, output: FloatArray, sampleCount: Int) {
        val shortBuffer = input.asShortBuffer()
        for (i in 0 until sampleCount) {
            output[i] = shortBuffer.get() / 32768f
        }
        input.position(input.position() + sampleCount * 2)
    }

    /**
     * Convert PCM24 (24-bit signed, packed) to normalized float [-1.0, 1.0].
     */
    private fun pcm24ToFloat(input: ByteBuffer, output: FloatArray, sampleCount: Int) {
        val startPos = input.position()
        for (i in 0 until sampleCount) {
            // Read 3 bytes as little-endian 24-bit signed integer
            val b0 = input.get().toInt() and 0xFF
            val b1 = input.get().toInt() and 0xFF
            val b2 = input.get().toInt() // Sign-extended
            val sample24 = b0 or (b1 shl 8) or (b2 shl 16)
            output[i] = sample24 / 8388608f  // 2^23 = 8388608
        }
    }

    /**
     * Convert normalized float [-1.0, 1.0] to PCM16 (16-bit signed).
     */
    private fun floatToPcm16(input: FloatArray, output: ByteBuffer, sampleCount: Int) {
        val shortBuffer = output.asShortBuffer()
        for (i in 0 until sampleCount) {
            val clamped = input[i].coerceIn(-1f, 1f)
            shortBuffer.put((clamped * 32767f).toInt().toShort())
        }
        output.position(sampleCount * 2)
    }

    /**
     * Convert normalized float [-1.0, 1.0] to PCM24 (24-bit signed, packed).
     */
    private fun floatToPcm24(input: FloatArray, output: ByteBuffer, sampleCount: Int) {
        for (i in 0 until sampleCount) {
            val clamped = input[i].coerceIn(-1f, 1f)
            val sample24 = (clamped * 8388607f).toInt()  // 2^23 - 1 = 8388607
            output.put((sample24 and 0xFF).toByte())
            output.put(((sample24 shr 8) and 0xFF).toByte())
            output.put(((sample24 shr 16) and 0xFF).toByte())
        }
    }

    override fun queueEndOfStream() {
        inputEnded = true
        android.util.Log.d("SoftwareDSP", "End of stream queued, samples processed: $samplesProcessed")
    }

    override fun getOutput(): ByteBuffer {
        val output = outputBuffer
        outputBuffer = AudioProcessor.EMPTY_BUFFER
        return output
    }

    override fun isEnded(): Boolean {
        val ended = inputEnded && outputBuffer === AudioProcessor.EMPTY_BUFFER
        // Fire callback when track truly ends (decoder finished + buffer drained)
        if (ended && !trackEnded) {
            trackEnded = true
            android.util.Log.d("SoftwareDSP", "Track ended - all samples delivered, total: $samplesProcessed")
            endOfStreamCallback?.invoke()
        }
        return ended
    }

    override fun flush() {
        outputBuffer = AudioProcessor.EMPTY_BUFFER
        inputBuffer = AudioProcessor.EMPTY_BUFFER
        inputEnded = false
        trackEnded = false
        
        // Use pending sample position if set (from seek), otherwise reset to 0 (new track)
        val pending = pendingSamplePosition
        if (pending != null) {
            samplesProcessed = pending
            pendingSamplePosition = null
            android.util.Log.d("SoftwareDSP", "flush() using pending position: $pending samples")
        } else {
            samplesProcessed = 0L
            android.util.Log.d("SoftwareDSP", "flush() reset to 0 (new track)")
        }
        
        eqFilters.forEach { it.resetAllChannels() }
        bassShelfFilter.resetAllChannels()
        trebleShelfFilter.resetAllChannels()
        limiter.reset()
        
        // Clear reverb delay buffers to prevent stale audio artifacts after seek
        for (tap in 0 until 4) {
            delayBuffersL[tap].fill(0f)
            delayBuffersR[tap].fill(0f)
            delayIndices[tap] = 0
        }
        
        // Reset psychoacoustic stereo enhancement filters
        bassMonoLowpassL.resetAllChannels()
        bassMonoLowpassR.resetAllChannels()
        bassMonoHighpassL.resetAllChannels()
        bassMonoHighpassR.resetAllChannels()
        sideHighpassFilter.resetAllChannels()
        allpassFilter1.resetAllChannels()
        allpassFilter2.resetAllChannels()
        itdDelayBuffer.fill(0f)
        itdDelayWriteIndex = 0
        correlationSum = 0.0
        leftSquaredSum = 0.0
        rightSquaredSum = 0.0
        runningCorrelation = 1.0f
        
        // Reset HRTF filters
        hrtfPinnaFilterL.resetAllChannels()
        hrtfPinnaFilterR.resetAllChannels()
        hrtfElevationFilterL.resetAllChannels()
        hrtfElevationFilterR.resetAllChannels()
        
        // Reset Bass Enhancement filters
        bassEnhanceLowpass.resetAllChannels()
        bassEnhanceHighpass.resetAllChannels()
        bassHarmonicsFilter.resetAllChannels()
        
        // Reset HF Restoration filters
        hfAnalyzeFilter.resetAllChannels()
        hfRestoreFilter.resetAllChannels()
        hfEnergySmooth = 0f

        if (pendingFormat != AudioFormat.NOT_SET) {
            inputFormat = pendingFormat
            outputFormat = pendingFormat
            isActive = true
        }
    }

    override fun reset() {
        flush()
        pendingFormat = AudioFormat.NOT_SET
        inputFormat = AudioFormat.NOT_SET
        outputFormat = AudioFormat.NOT_SET
        isActive = false
    }

    // =========================================
    // SAMPLE-BASED PROGRESS TRACKING API
    // =========================================
    
    /**
     * Get the number of audio frames (samples per channel) processed since last flush/reset.
     * Formula: playback_time_seconds = samplesProcessed / sampleRate
     */
    fun getSamplesProcessed(): Long = samplesProcessed
    
    /**
     * Get current sample rate for position calculation.
     */
    fun getSampleRate(): Float = currentSampleRate
    
    /**
     * Get playback position in milliseconds based on sample counting.
     * This is more accurate than timing-based methods as it counts actual audio delivered.
     */
    fun getSampleBasedPositionMs(): Long {
        if (currentSampleRate <= 0f) return 0L
        return ((samplesProcessed.toDouble() / currentSampleRate) * 1000.0).toLong()
    }
    
    /**
     * Returns true if the decoder has signaled end-of-stream AND all samples have been output.
     * This is the most reliable signal that playback has truly completed.
     */
    fun hasTrackEnded(): Boolean = trackEnded
    
    /**
     * Set a callback to be invoked when the track truly ends (all samples delivered).
     * This fires when isEnded() becomes true for the first time after playback.
     */
    fun setEndOfStreamCallback(callback: (() -> Unit)?) {
        endOfStreamCallback = callback
    }
    
    /**
     * Set pending sample position for next flush (used during seek).
     * ExoPlayer calls flush() asynchronously during seek, so we store the 
     * desired position and let flush() apply it.
     */
    fun setPendingSamplePosition(samples: Long) {
        pendingSamplePosition = samples
        trackEnded = false
        android.util.Log.d("SoftwareDSP", "setPendingSamplePosition: $samples")
    }
    
    /**
     * Reset sample counter to 0 for new track loads (not seeks).
     */
    fun resetSampleCounter(toSamples: Long = 0L) {
        pendingSamplePosition = null
        samplesProcessed = toSamples
        trackEnded = false
    }
    
    /**
     * Clear all audio buffers for clean track transitions.
     * Called when switching between tracks (auto-advance, next, previous, etc.)
     * to prevent audio artifacts from previous track bleeding into new one.
     * 
     * This does NOT reset settings/gains - only clears delay buffers and filter states.
     */
    fun clearAudioBuffers() {
        android.util.Log.d("SoftwareDSP", "clearAudioBuffers() - clearing all delay buffers for track transition")
        
        // Clear reverb delay buffers
        for (tap in 0 until 4) {
            delayBuffersL[tap].fill(0f)
            delayBuffersR[tap].fill(0f)
            delayIndices[tap] = 0
        }
        
        // Clear ITD delay buffer (spatial processing)
        itdDelayBuffer.fill(0f)
        itdDelayWriteIndex = 0
        
        // Reset filter states (removes transients from previous audio)
        eqFilters.forEach { it.resetAllChannels() }
        bassShelfFilter.resetAllChannels()
        trebleShelfFilter.resetAllChannels()
        limiter.reset()
        
        // Reset psychoacoustic stereo enhancement filter states
        bassMonoLowpassL.resetAllChannels()
        bassMonoLowpassR.resetAllChannels()
        bassMonoHighpassL.resetAllChannels()
        bassMonoHighpassR.resetAllChannels()
        sideHighpassFilter.resetAllChannels()
        allpassFilter1.resetAllChannels()
        allpassFilter2.resetAllChannels()
        
        // Reset correlation monitor
        correlationSum = 0.0
        leftSquaredSum = 0.0
        rightSquaredSum = 0.0
        runningCorrelation = 1.0f
        
        // Reset HRTF filter states
        hrtfPinnaFilterL.resetAllChannels()
        hrtfPinnaFilterR.resetAllChannels()
        hrtfElevationFilterL.resetAllChannels()
        hrtfElevationFilterR.resetAllChannels()
        
        // Reset Bass Enhancement filter states
        bassEnhanceLowpass.resetAllChannels()
        bassEnhanceHighpass.resetAllChannels()
        bassHarmonicsFilter.resetAllChannels()
        
        // Reset HF Restoration filter states
        hfAnalyzeFilter.resetAllChannels()
        hfRestoreFilter.resetAllChannels()
        hfEnergySmooth = 0f
    }

    fun setEqBandGain(band: Int, gainUnits: Float) {
        if (band in 0..9) {
            val gainDb = (gainUnits * DB_PER_UNIT).coerceIn(-MAX_DB, MAX_DB)
            eqGains[band] = gainDb
            eqFilters[band].setGain(gainDb)
        }
    }

    fun setAllEqBandGains(gains: List<Double>) {
        gains.forEachIndexed { index, gain ->
            if (index < 10) {
                setEqBandGain(index, gain.toFloat())
            }
        }
    }

    fun setBassBoost(gainUnits: Float) {
        val gainDb = (gainUnits * DB_PER_UNIT).coerceIn(-MAX_DB, MAX_DB)
        bassGain = gainDb
        bassShelfFilter.setGain(gainDb)
    }

    fun setTrebleBoost(gainUnits: Float) {
        val gainDb = (gainUnits * DB_PER_UNIT).coerceIn(-MAX_DB, MAX_DB)
        trebleGain = gainDb
        trebleShelfFilter.setGain(gainDb)
    }

    /**
     * Set spatial enhancement intensity level (0-5) using the 6-level slider system.
     * Level 0: Off - No processing (0.0x multiplier)
     * Level 1: Subtle - 3% sideGain, 0.10ms ITD, 3% decorr, 10% wet (0.5x multiplier)
     * Level 2: Mild - 6% sideGain, 0.15ms ITD, 5% decorr, 20% wet (1.0x multiplier)
     * Level 3: Moderate - 10% sideGain, 0.25ms ITD, 8% decorr, 30% wet (1.25x multiplier)
     * Level 4: Enhanced - 14% sideGain, 0.40ms ITD, 12% decorr, 40% wet (1.4x multiplier)
     * Level 5: Maximum - 18% sideGain, 0.60ms ITD, 18% decorr, 55% wet (1.5x multiplier)
     */
    fun setSpatialEnhancementLevel(level: Int) {
        spatialEnhancementLevel = level.coerceIn(0, 5)
        explicitSpatialParams = false // Switch back to level-based mode
        
        // Apply slider-based spatial parameters
        spatialSideGainPercent = SLIDER_SIDE_GAIN[spatialEnhancementLevel]
        spatialItdMs = SLIDER_ITD_MS[spatialEnhancementLevel]
        spatialDecorrelation = SLIDER_DECORRELATION[spatialEnhancementLevel]
        spatialWetMix = SLIDER_WET_MIX[spatialEnhancementLevel]
        
        // Configure HRTF filters based on level (activates at level 2+)
        hrtfPinnaGain = SLIDER_HRTF_GAIN[spatialEnhancementLevel]
        hrtfElevationGain = hrtfPinnaGain * 0.5f // 50% of pinna gain
        
        hrtfPinnaFilterL.setGain(hrtfPinnaGain)
        hrtfPinnaFilterR.setGain(hrtfPinnaGain)
        hrtfElevationFilterL.setGain(hrtfElevationGain)
        hrtfElevationFilterR.setGain(hrtfElevationGain)
        
        val levelNames = arrayOf("Off", "Subtle", "Mild", "Moderate", "Enhanced", "Maximum")
        android.util.Log.d("SoftwareDSP", "Spatial enhancement level: ${levelNames[spatialEnhancementLevel]} (${SLIDER_MULTIPLIERS[spatialEnhancementLevel]}x multiplier, HRTF: ${hrtfPinnaGain}dB)")
    }
    
    /**
     * Get the current slider multiplier based on the spatial enhancement level.
     */
    fun getSliderMultiplier(): Float = SLIDER_MULTIPLIERS[spatialEnhancementLevel.coerceIn(0, 5)]

    fun getSpatialEnhancementLevel(): Int = spatialEnhancementLevel

    /**
     * Enable or disable psychoacoustic stereo enhancement (backward compatibility).
     * This applies frequency-dependent M/S processing, ITD, and correlation-guarded widening.
     */
    fun setSpatialEnhancement(enabled: Boolean) {
        setSpatialEnhancementLevel(if (enabled) 1 else 0)
    }

    fun getSpatialEnhancement(): Boolean = spatialEnhancementLevel > 0
    
    /**
     * Set explicit spatial enhancement parameters for immersive modes.
     * This provides fine-grained control over each spatial effect parameter.
     * Values are applied directly with safety caps (no combination with slider).
     * The slider and immersive modes work independently - when immersive mode is active,
     * it uses its own fixed spatial params; when slider is used, it applies its level values.
     *
     * @param sideGain Side channel gain boost in % (+6 = 1.06x multiplier)
     * @param itdMs Inter-aural Time Difference in milliseconds (0-0.7ms)
     * @param decorrelation Decorrelation amount in % (0-100, controls all-pass filter Q)
     * @param wetMix Wet mix in % (0-100, blends processed with original)
     */
    fun setSpatialEnhancementParams(sideGain: Float, itdMs: Float, decorrelation: Float, wetMix: Float) {
        // Apply hard safety caps directly (no slider multiplier combination)
        spatialSideGainPercent = sideGain.coerceIn(0f, MAX_SIDE_GAIN_PERCENT)
        spatialItdMs = itdMs.coerceIn(0f, MAX_ITD_MS)
        spatialDecorrelation = decorrelation.coerceIn(0f, MAX_DECORRELATION)
        spatialWetMix = wetMix.coerceIn(0f, MAX_WET_MIX)
        explicitSpatialParams = true
        
        // Set pseudo-level for compatibility (based on wetMix)
        spatialEnhancementLevel = if (spatialWetMix <= 0f) 0 else kotlin.math.ceil(spatialWetMix / 11f).toInt().coerceIn(1, 5)
        
        android.util.Log.d("SoftwareDSP", "Spatial params set: sideGain=$spatialSideGainPercent%, ITD=${spatialItdMs}ms, decorr=$spatialDecorrelation%, wetMix=$spatialWetMix%")
    }
    
    /**
     * Get the current explicit spatial parameters.
     */
    fun getSpatialEnhancementParams(): Map<String, Float> = mapOf(
        "sideGain" to spatialSideGainPercent,
        "itdMs" to spatialItdMs,
        "decorrelation" to spatialDecorrelation,
        "wetMix" to spatialWetMix
    )

    /**
     * Process psychoacoustic stereo enhancement (32-bit float version).
     * Implements frequency-dependent M/S processing with ITD, all-pass decorrelation,
     * and correlation-guarded side boost.
     * 
     * Parameters scale based on spatialEnhancementLevel (0-5):
     * - Level 0: Disabled (no processing)
     * - Level 1: Subtle - 20% effect
     * - Level 2: Mild - 40% effect
     * - Level 3: Moderate - 60% effect (default for music)
     * - Level 4: Enhanced - 80% effect
     * - Level 5: Maximum - 100% effect
     * 
     * Signal flow:
     * 1. Bass Mono Enforcement (below 150Hz)
     * 2. M/S Conversion with frequency-dependent processing
     * 3. ITD delay on Side channel (scaled by level)
     * 4. All-pass decorrelation on Side channel
     * 5. Correlation monitoring and adaptive side gain (scaled by level)
     * 6. Back to L/R conversion
     */
    private fun processPsychoacousticStereo(samples: FloatArray) {
        // Calculate parameters based on explicit settings or level
        val scaledSideBoost: Float
        val scaledItdMs: Float
        val wetFactor: Float
        val decorrelationQ: Float
        
        if (explicitSpatialParams) {
            // Use explicit parameters set via setSpatialEnhancementParams (already clamped to safety caps)
            wetFactor = spatialWetMix / MAX_WET_MIX // Normalize to 0-1 based on max
            
            // Side gain: Convert percentage to multiplier, scaled by wetMix
            // sideGain +6% means 1.06x base multiplier
            // Then scale the boost portion by wetMix (0% = no boost, max% = full boost)
            val baseSideMultiplier = 1.0f + (spatialSideGainPercent / 100f)
            scaledSideBoost = ((baseSideMultiplier - 1.0f) * wetFactor)
            
            // ITD already clamped to MAX_ITD_MS in setSpatialEnhancementParams
            scaledItdMs = spatialItdMs
            
            // Decorrelation Q: map 0-MAX_DECORRELATION% to 0.3-1.5 (matching Web implementation)
            decorrelationQ = 0.3f + (spatialDecorrelation / MAX_DECORRELATION) * 1.2f
            
            // Update all-pass filter Q values for decorrelation
            allpassFilter1.setQ(decorrelationQ)
            allpassFilter2.setQ(decorrelationQ * 0.85f) // Slightly lower for second stage
        } else {
            // Level-based calculation using 6-level slider system
            // Parameters already set in setSpatialEnhancementLevel()
            wetFactor = spatialWetMix / MAX_WET_MIX // Normalize to 0-1
            
            // Side boost from slider values
            val baseSideMultiplier = 1.0f + (spatialSideGainPercent / 100f)
            scaledSideBoost = ((baseSideMultiplier - 1.0f) * wetFactor)
            scaledItdMs = spatialItdMs
            decorrelationQ = 0.3f + (spatialDecorrelation / MAX_DECORRELATION) * 1.2f
        }
        
        // ITD delay samples
        val scaledItdSamples = ((scaledItdMs / 1000f) * currentSampleRate).toInt().coerceIn(1, MAX_ITD_DELAY_SAMPLES - 1)
        
        var i = 0
        while (i < samples.size - 1) {
            val left = samples[i]
            val right = samples[i + 1]
            
            // =========================================
            // A. Bass Mono Enforcement (below 150Hz)
            // =========================================
            // Extract bass content using lowpass filters
            val bassL = bassMonoLowpassL.processSample(left, 0)
            val bassR = bassMonoLowpassR.processSample(right, 0)
            // Sum bass to mono
            val bassMono = (bassL + bassR) / 2f
            
            // Extract high content (above 150Hz) - this retains stereo
            val highL = bassMonoHighpassL.processSample(left, 0)
            val highR = bassMonoHighpassR.processSample(right, 0)
            
            // Reconstruct with mono bass and stereo highs
            val monoBasedL = bassMono + highL
            val monoBasedR = bassMono + highR
            
            // =========================================
            // B. Frequency-Dependent M/S Processing
            // =========================================
            // Convert to Mid-Side
            val mid = (monoBasedL + monoBasedR) / 2f
            var side = (monoBasedL - monoBasedR) / 2f
            
            // Apply highpass to Side channel (no bass widening)
            side = sideHighpassFilter.processSample(side, 0)
            
            // =========================================
            // C. Interaural Time Difference (ITD) - Scaled by level
            // =========================================
            // Read delayed side from circular buffer using scaled delay
            val readIndex = (itdDelayWriteIndex - scaledItdSamples + MAX_ITD_DELAY_SAMPLES) % MAX_ITD_DELAY_SAMPLES
            val delayedSide = itdDelayBuffer[readIndex]
            
            // Write current side to buffer
            itdDelayBuffer[itdDelayWriteIndex] = side
            itdDelayWriteIndex = (itdDelayWriteIndex + 1) % MAX_ITD_DELAY_SAMPLES
            
            // Use delayed side
            side = delayedSide
            
            // =========================================
            // D. All-Pass Decorrelation (above 2kHz)
            // =========================================
            // Apply cascaded all-pass filters to side channel
            side = allpassFilter1.processSample(side, 0)
            side = allpassFilter2.processSample(side, 0)
            
            // =========================================
            // E. Correlation Monitor/Guard (active for all levels)
            // =========================================
            // Update running correlation (EMA)
            correlationSum = CORRELATION_ALPHA * correlationSum + (1.0 - CORRELATION_ALPHA) * (left * right).toDouble()
            leftSquaredSum = CORRELATION_ALPHA * leftSquaredSum + (1.0 - CORRELATION_ALPHA) * (left * left).toDouble()
            rightSquaredSum = CORRELATION_ALPHA * rightSquaredSum + (1.0 - CORRELATION_ALPHA) * (right * right).toDouble()
            
            val denominator = kotlin.math.sqrt(leftSquaredSum * rightSquaredSum)
            if (denominator > 1e-10) {
                runningCorrelation = (correlationSum / denominator).toFloat().coerceIn(-1f, 1f)
            }
            
            // Calculate side boost with correlation guard - scaled by intensity
            // Cap at 2.2 to match Web implementation for safety
            var sideBoostMultiplier = (1f + scaledSideBoost).coerceAtMost(2.2f)
            
            // If correlation drops below threshold, reduce side gain by 10-20%
            if (runningCorrelation < CORRELATION_THRESHOLD) {
                val reductionFactor = 0.8f + 0.1f * (runningCorrelation / CORRELATION_THRESHOLD).coerceIn(0f, 1f)
                sideBoostMultiplier *= reductionFactor
            }
            
            // Apply side boost
            side *= sideBoostMultiplier
            
            // =========================================
            // F. Output - Convert back to L/R (no mid attenuation - preserves original center content)
            // =========================================
            var outL = (mid + side).coerceIn(-1f, 1f)
            var outR = (mid - side).coerceIn(-1f, 1f)
            
            // =========================================
            // G. HRTF Pinna Simulation (levels 2-5 only)
            // =========================================
            if (spatialEnhancementLevel >= 2 || (explicitSpatialParams && hrtfPinnaGain > 0f)) {
                outL = hrtfPinnaFilterL.processSample(outL, 0)
                outL = hrtfElevationFilterL.processSample(outL, 0)
                outR = hrtfPinnaFilterR.processSample(outR, 0)
                outR = hrtfElevationFilterR.processSample(outR, 0)
            }
            
            samples[i] = outL
            samples[i + 1] = outR
            
            i += 2
        }
    }

    /**
     * Set reverb wet mix (0 = dry, 1 = full reverb)
     * Uses equal-power crossfade for smooth blending
     */
    fun setReverb(wetMix: Float) {
        reverbWetMix = wetMix.coerceIn(0f, 1f)
        android.util.Log.d("SoftwareDSP", "Reverb wet mix set to ${(reverbWetMix * 100).toInt()}%")
    }

    fun getReverb(): Float = reverbWetMix
    
    /**
     * Set bass enhancement level (0-100%)
     * Uses psychoacoustic harmonic generation via soft clipping
     */
    fun setBassEnhancement(level: Float) {
        bassEnhancementLevel = level.coerceIn(0f, 100f)
        android.util.Log.d("SoftwareDSP", "Bass Enhancement set to ${bassEnhancementLevel.toInt()}%")
    }
    
    fun getBassEnhancement(): Float = bassEnhancementLevel
    
    /**
     * Enable or disable HF Restoration / AI Audio Upscaling (neural super-resolution)
     */
    fun setHfRestoration(enabled: Boolean) {
        hfRestorationEnabled = enabled
        NeuralAudioProcessorTFLite.getInstance().setEnabled(enabled)
        android.util.Log.d("SoftwareDSP", "AI Audio Upscaling ${if (enabled) "enabled" else "disabled"}")
    }
    
    fun getHfRestoration(): Boolean = hfRestorationEnabled
    
    /**
     * Set HF Restoration / AI Audio Upscaling level (0-100%)
     * Maps to neural processor enhancement levels: low=0.3, medium=0.6, high=1.0
     */
    fun setHfRestorationLevel(level: Float) {
        hfRestorationLevel = level.coerceIn(0f, 100f)
        val neuralLevel = when {
            hfRestorationLevel <= 33f -> NeuralAudioProcessorTFLite.EnhancementLevel.LOW
            hfRestorationLevel <= 66f -> NeuralAudioProcessorTFLite.EnhancementLevel.MEDIUM
            else -> NeuralAudioProcessorTFLite.EnhancementLevel.HIGH
        }
        NeuralAudioProcessorTFLite.getInstance().setLevel(neuralLevel)
        android.util.Log.d("SoftwareDSP", "AI Upscaling level set to ${neuralLevel.name} (${hfRestorationLevel.toInt()}%)")
    }
    
    fun getHfRestorationLevel(): Float = hfRestorationLevel

    /**
     * Process multi-tap delay reverb (32-bit float version).
     * Uses 4 delay lines with different times for rich, diffuse sound.
     * True stereo with independent L/R delay buffers.
     */
    private fun processReverbFloat(samples: FloatArray) {
        // Equal-power crossfade: dry = cos, wet = sin
        val dryGain = kotlin.math.cos(reverbWetMix * kotlin.math.PI.toFloat() / 2f)
        val wetGain = kotlin.math.sin(reverbWetMix * kotlin.math.PI.toFloat() / 2f)
        
        var i = 0
        while (i < samples.size - 1) {
            val dryL = samples[i]
            val dryR = samples[i + 1]
            
            var wetL = 0f
            var wetR = 0f
            
            // Sum contributions from all 4 delay lines
            for (tap in 0 until 4) {
                val delaySamples = (DELAY_TIMES[tap] * currentSampleRate).toInt().coerceIn(1, MAX_DELAY_SAMPLES - 1)
                val readIndex = (delayIndices[tap] - delaySamples + MAX_DELAY_SAMPLES) % MAX_DELAY_SAMPLES
                
                // Read delayed samples
                val delayedL = delayBuffersL[tap][readIndex]
                val delayedR = delayBuffersR[tap][readIndex]
                
                // Add to wet signal
                wetL += delayedL * 0.25f // Each tap contributes 25%
                wetR += delayedR * 0.25f
                
                // Write to delay buffer with feedback (normalized float scale)
                delayBuffersL[tap][delayIndices[tap]] = dryL + delayedL * DELAY_FEEDBACKS[tap]
                delayBuffersR[tap][delayIndices[tap]] = dryR + delayedR * DELAY_FEEDBACKS[tap]
                
                // Advance index
                delayIndices[tap] = (delayIndices[tap] + 1) % MAX_DELAY_SAMPLES
            }
            
            // Mix dry and wet (soft clip at ±1.0 for float headroom)
            samples[i] = (dryL * dryGain + wetL * wetGain).coerceIn(-1f, 1f)
            samples[i + 1] = (dryR * dryGain + wetR * wetGain).coerceIn(-1f, 1f)
            
            i += 2
        }
    }
    
    /**
     * Process bass enhancement via psychoacoustic harmonic generation.
     * Uses soft clipping (tanh) to generate harmonics from sub-bass content.
     * ADDITIVE ONLY - original signal is never attenuated.
     */
    private fun processBassEnhancement(samples: FloatArray, channelCount: Int) {
        if (bassEnhancementLevel <= 0f || channelCount != 2) return
        
        val mixLevel = bassEnhancementLevel / 100f
        val boostFactor = (BASS_ENHANCE_MAX_BOOST_DB / 20f) * mixLevel // Convert dB to linear scale factor
        
        var i = 0
        while (i < samples.size - 1) {
            val left = samples[i]
            val right = samples[i + 1]
            
            // Extract low frequencies below crossover (75Hz)
            val bassL = bassEnhanceLowpass.processSample(left, 0)
            val bassR = bassEnhanceLowpass.processSample(right, 1)
            
            // Generate harmonics via soft clipping (creates 2nd, 3rd, 4th harmonics)
            val harmonicL = kotlin.math.tanh(bassL * 2f) * 0.5f
            val harmonicR = kotlin.math.tanh(bassR * 2f) * 0.5f
            
            // Mix harmonics back (additive only - original signal untouched)
            samples[i] = left + harmonicL * boostFactor
            samples[i + 1] = right + harmonicR * boostFactor
            
            i += 2
        }
    }
    
    // NOTE: DSP-based HF restoration has been replaced with AI upscaling via NeuralAudioProcessorTFLite.
    // The neural processor uses a Kuleshov-style 1D U-Net CNN for audio super-resolution,
    // providing superior high-frequency restoration compared to simple spectral extension.
    // See the signal chain in queueInput() for the AI processing implementation.

    fun setEnabled(enabled: Boolean) {
        isEnabled = enabled
    }

    fun getEqBandGains(): FloatArray = eqGains.copyOf()
    fun getBassGain(): Float = bassGain
    fun getTrebleGain(): Float = trebleGain
    fun getIsEnabled(): Boolean = isEnabled
    fun getEqFrequencies(): FloatArray = EQ_FREQUENCIES.copyOf()
    fun getEqBandNames(): Array<String> = EQ_NAMES.copyOf()
    fun getNumberOfBands(): Int = 10

    fun resetAll() {
        for (i in 0..9) {
            eqGains[i] = 0f
            eqFilters[i].setGain(0f)
        }
        bassGain = 0f
        trebleGain = 0f
        reverbWetMix = 0f
        spatialEnhancementLevel = 0
        bassShelfFilter.setGain(0f)
        trebleShelfFilter.setGain(0f)
        
        // Clear reverb delay buffers
        for (tap in 0 until 4) {
            delayBuffersL[tap].fill(0f)
            delayBuffersR[tap].fill(0f)
            delayIndices[tap] = 0
        }
        
        // Reset psychoacoustic stereo enhancement
        bassMonoLowpassL.resetAllChannels()
        bassMonoLowpassR.resetAllChannels()
        bassMonoHighpassL.resetAllChannels()
        bassMonoHighpassR.resetAllChannels()
        sideHighpassFilter.resetAllChannels()
        allpassFilter1.resetAllChannels()
        allpassFilter2.resetAllChannels()
        itdDelayBuffer.fill(0f)
        itdDelayWriteIndex = 0
        correlationSum = 0.0
        leftSquaredSum = 0.0
        rightSquaredSum = 0.0
        runningCorrelation = 1.0f
        
        // Reset HRTF filters and state
        hrtfPinnaGain = 0f
        hrtfElevationGain = 0f
        hrtfPinnaFilterL.setGain(0f)
        hrtfPinnaFilterR.setGain(0f)
        hrtfElevationFilterL.setGain(0f)
        hrtfElevationFilterR.setGain(0f)
        hrtfPinnaFilterL.resetAllChannels()
        hrtfPinnaFilterR.resetAllChannels()
        hrtfElevationFilterL.resetAllChannels()
        hrtfElevationFilterR.resetAllChannels()
        
        // Reset Bass Enhancement filters and state
        bassEnhancementLevel = 0f
        bassEnhanceLowpass.resetAllChannels()
        bassEnhanceHighpass.resetAllChannels()
        bassHarmonicsFilter.resetAllChannels()
        
        // Reset HF Restoration filters and state
        hfRestorationEnabled = false
        hfRestorationLevel = 0f
        hfEnergySmooth = 0f
        hfAnalyzeFilter.resetAllChannels()
        hfRestoreFilter.resetAllChannels()
        
        eqFilters.forEach { it.resetAllChannels() }
        bassShelfFilter.resetAllChannels()
        trebleShelfFilter.resetAllChannels()
        limiter.reset()
    }
    
    /**
     * Get current audio processing information for debugging.
     */
    fun getProcessingInfo(): Map<String, Any> {
        return mapOf(
            "internalFormat" to "32-bit float",
            "inputEncoding" to when (currentEncoding) {
                C.ENCODING_PCM_16BIT -> "PCM16"
                C.ENCODING_PCM_24BIT -> "PCM24"
                else -> "Unknown"
            },
            "sampleRate" to currentSampleRate.toInt(),
            "designSampleRate" to STANDARD_SAMPLE_RATE.toInt(),
            "enabled" to isEnabled,
            "eqActive" to eqGains.any { it != 0f },
            "bassBoostActive" to (bassGain != 0f),
            "trebleBoostActive" to (trebleGain != 0f),
            "reverbActive" to (reverbWetMix > 0f),
            "spatialEnhancementActive" to (spatialEnhancementLevel > 0),
            "spatialEnhancementLevel" to spatialEnhancementLevel,
            "itdDelaySamples" to itdDelaySamples,
            "runningCorrelation" to runningCorrelation,
            "hrtfActive" to (hrtfPinnaGain > 0f),
            "hrtfPinnaGain" to hrtfPinnaGain,
            "hrtfElevationGain" to hrtfElevationGain,
            "bassEnhancementActive" to (bassEnhancementLevel > 0f),
            "bassEnhancementLevel" to bassEnhancementLevel,
            "hfRestorationActive" to hfRestorationEnabled,
            "hfRestorationLevel" to hfRestorationLevel,
            "aiUpscalingType" to "NeuralAudioProcessorTFLite (Kuleshov 1D U-Net)",
            "neuralProcessorReady" to NeuralAudioProcessorTFLite.getInstance().isReady(),
            "neuralProcessorStatus" to NeuralAudioProcessorTFLite.getInstance().getStatus().name
        )
    }
}
