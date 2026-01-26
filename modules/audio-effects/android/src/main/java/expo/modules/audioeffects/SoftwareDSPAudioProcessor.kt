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
 * Signal Chain:
 * Input → 10-Band EQ → Bass Shelf → Treble Shelf → Dynamic Volume EQ → PBE → SBR → Spatial Enhancement → Reverb → Limiter → Output
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
        
        // Dynamic Volume EQ (Fletcher-Munson Compensation) constants
        private const val DYNAMIC_EQ_BASS_FREQ = 100f      // Center frequency for bass boost
        private const val DYNAMIC_EQ_TREBLE_FREQ = 8000f   // Center frequency for treble boost
        private const val DYNAMIC_EQ_LOW_THRESHOLD = -20f  // dB threshold for max compensation
        private const val DYNAMIC_EQ_HIGH_THRESHOLD = -6f  // dB threshold for no compensation
        private const val DYNAMIC_EQ_MAX_BASS_BOOST = 3f   // Max bass boost in dB at low levels
        private const val DYNAMIC_EQ_MAX_TREBLE_BOOST = 2f // Max treble boost in dB at low levels
        private const val DYNAMIC_EQ_RMS_ALPHA = 0.995f    // RMS smoothing coefficient
        
        // Psychoacoustic Bass Enhancement (PBE) constants
        private const val PBE_CROSSOVER_FREQ = 100f        // LPF cutoff for sub-bass extraction
        private const val PBE_HARMONIC_LOW_FREQ = 100f     // Bandpass low cutoff for harmonics
        private const val PBE_HARMONIC_HIGH_FREQ = 400f    // Bandpass high cutoff for harmonics
        
        // Spectral Band Replication (SBR) constants
        private const val SBR_HIGHPASS_FREQ = 8000f        // HPF to isolate upper harmonics
        private const val SBR_SHELF_FREQ = 16000f          // High-shelf boost frequency
        private const val SBR_MAX_BLEND = 0.3f             // Max blend amount (30%)
        
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
        private const val MID_ATTENUATION = 0.85f  // Mid channel attenuation for maximum widening
        
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

    // All filters configured at 48 kHz (reconfigured at runtime if input differs)
    private val eqFilters = Array(10) { i ->
        BiquadFilter(FilterType.PEAKING, EQ_FREQUENCIES[i], 0f, DEFAULT_Q, STANDARD_SAMPLE_RATE)
    }
    private val bassShelfFilter = BiquadFilter(FilterType.LOWSHELF, BASS_SHELF_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val trebleShelfFilter = BiquadFilter(FilterType.HIGHSHELF, TREBLE_SHELF_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val limiter = Limiter(-1f, 20f, 1f, 100f, STANDARD_SAMPLE_RATE)

    private val eqGains = FloatArray(10) { 0f }
    
    // =========================================
    // Dynamic Volume EQ (Fletcher-Munson Compensation)
    // =========================================
    private var dynamicEQEnabled = false
    private var dynamicEQStrength = 0.5f  // 0.0-1.0, scales compensation amount
    private var rmsLevel = 0.0  // Running RMS level in linear scale
    private val dynamicEQBassFilter = BiquadFilter(FilterType.LOWSHELF, DYNAMIC_EQ_BASS_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val dynamicEQTrebleFilter = BiquadFilter(FilterType.HIGHSHELF, DYNAMIC_EQ_TREBLE_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private var currentDynamicBassBoost = 0f   // Current applied bass boost in dB
    private var currentDynamicTrebleBoost = 0f // Current applied treble boost in dB
    
    // =========================================
    // Psychoacoustic Bass Enhancement (PBE)
    // =========================================
    private var pbeEnabled = false
    private var pbeIntensity = 0.5f  // 0.0-1.0, controls wet/dry mix of harmonics
    private val pbeLowpassFilter = BiquadFilter(FilterType.LOWPASS, PBE_CROSSOVER_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val pbeBandpassLowFilter = BiquadFilter(FilterType.HIGHPASS, PBE_HARMONIC_LOW_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val pbeBandpassHighFilter = BiquadFilter(FilterType.LOWPASS, PBE_HARMONIC_HIGH_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    
    // =========================================
    // Spectral Band Replication (SBR)
    // =========================================
    private var sbrEnabled = false
    private var sbrIntensity = 0.5f  // 0.0-1.0, controls blend amount (scaled to 10-30%)
    private val sbrHighpassFilter = BiquadFilter(FilterType.HIGHPASS, SBR_HIGHPASS_FREQ, 0f, SHELF_Q, STANDARD_SAMPLE_RATE)
    private val sbrHighShelfFilter = BiquadFilter(FilterType.HIGHSHELF, SBR_SHELF_FREQ, 3f, SHELF_Q, STANDARD_SAMPLE_RATE)
    
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
        
        // Configure Dynamic Volume EQ filters
        dynamicEQBassFilter.configure(FilterType.LOWSHELF, DYNAMIC_EQ_BASS_FREQ, 0f, SHELF_Q, currentSampleRate)
        dynamicEQTrebleFilter.configure(FilterType.HIGHSHELF, DYNAMIC_EQ_TREBLE_FREQ, 0f, SHELF_Q, currentSampleRate)
        
        // Configure PBE filters
        pbeLowpassFilter.configure(FilterType.LOWPASS, PBE_CROSSOVER_FREQ, 0f, SHELF_Q, currentSampleRate)
        pbeBandpassLowFilter.configure(FilterType.HIGHPASS, PBE_HARMONIC_LOW_FREQ, 0f, SHELF_Q, currentSampleRate)
        pbeBandpassHighFilter.configure(FilterType.LOWPASS, PBE_HARMONIC_HIGH_FREQ, 0f, SHELF_Q, currentSampleRate)
        
        // Configure SBR filters
        sbrHighpassFilter.configure(FilterType.HIGHPASS, SBR_HIGHPASS_FREQ, 0f, SHELF_Q, currentSampleRate)
        sbrHighShelfFilter.configure(FilterType.HIGHSHELF, SBR_SHELF_FREQ, 3f, SHELF_Q, currentSampleRate)
        
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
        
        // 1. 10-Band Parametric EQ (true stereo)
        for (filter in eqFilters) {
            if (!filter.isPassthrough()) {
                filter.processBufferFloat(floatSamples, channelCount)
            }
        }

        // 2. Bass Shelf Filter (true stereo)
        if (bassGain != 0f) {
            bassShelfFilter.processBufferFloat(floatSamples, channelCount)
        }

        // 3. Treble Shelf Filter (true stereo)
        if (trebleGain != 0f) {
            trebleShelfFilter.processBufferFloat(floatSamples, channelCount)
        }

        // 4. Dynamic Volume EQ (Fletcher-Munson Compensation)
        if (dynamicEQEnabled) {
            processDynamicEQ(floatSamples, channelCount)
        }

        // 5. Psychoacoustic Bass Enhancement (PBE)
        if (pbeEnabled) {
            processPBE(floatSamples, channelCount)
        }

        // 6. Spectral Band Replication (SBR)
        if (sbrEnabled) {
            processSBR(floatSamples, channelCount)
        }

        // 7. Psychoacoustic Stereo Enhancement (true stereo)
        if (spatialEnhancementLevel > 0 && channelCount == 2) {
            processPsychoacousticStereo(floatSamples)
        }

        // 8. Multi-Tap Delay Reverb (true stereo)
        if (reverbWetMix > 0f && channelCount == 2) {
            processReverbFloat(floatSamples)
        }

        // 9. Brickwall Limiter (linked stereo - industry standard)
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
    }

    override fun getOutput(): ByteBuffer {
        val output = outputBuffer
        outputBuffer = AudioProcessor.EMPTY_BUFFER
        return output
    }

    override fun isEnded(): Boolean = inputEnded && outputBuffer === AudioProcessor.EMPTY_BUFFER

    override fun flush() {
        outputBuffer = AudioProcessor.EMPTY_BUFFER
        inputBuffer = AudioProcessor.EMPTY_BUFFER
        inputEnded = false
        
        eqFilters.forEach { it.resetAllChannels() }
        bassShelfFilter.resetAllChannels()
        trebleShelfFilter.resetAllChannels()
        limiter.reset()
        
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
        
        // Reset Dynamic Volume EQ filters
        dynamicEQBassFilter.resetAllChannels()
        dynamicEQTrebleFilter.resetAllChannels()
        rmsLevel = 0.0
        currentDynamicBassBoost = 0f
        currentDynamicTrebleBoost = 0f
        
        // Reset PBE filters
        pbeLowpassFilter.resetAllChannels()
        pbeBandpassLowFilter.resetAllChannels()
        pbeBandpassHighFilter.resetAllChannels()
        
        // Reset SBR filters
        sbrHighpassFilter.resetAllChannels()
        sbrHighShelfFilter.resetAllChannels()

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
        
        val levelNames = arrayOf("Off", "Subtle", "Mild", "Moderate", "Enhanced", "Maximum")
        android.util.Log.d("SoftwareDSP", "Spatial enhancement level: ${levelNames[spatialEnhancementLevel]} (${SLIDER_MULTIPLIERS[spatialEnhancementLevel]}x multiplier)")
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
        val scaledMidAttenuation: Float
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
            
            // Mid attenuation: scale with wetFactor (0% = 1.0, max = 0.85)
            scaledMidAttenuation = 1.0f - (0.15f * wetFactor)
            
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
            scaledMidAttenuation = 1.0f - (0.15f * wetFactor)
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
            
            // Apply Mid attenuation to preserve loudness - scaled by intensity
            val attenuatedMid = mid * scaledMidAttenuation
            
            // =========================================
            // F. Output - Convert back to L/R
            // =========================================
            samples[i] = (attenuatedMid + side).coerceIn(-1f, 1f)
            samples[i + 1] = (attenuatedMid - side).coerceIn(-1f, 1f)
            
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
        
        // Reset premium DSP effects
        dynamicEQEnabled = false
        dynamicEQStrength = 0.5f
        rmsLevel = 0.0
        currentDynamicBassBoost = 0f
        currentDynamicTrebleBoost = 0f
        dynamicEQBassFilter.resetAllChannels()
        dynamicEQTrebleFilter.resetAllChannels()
        
        pbeEnabled = false
        pbeIntensity = 0.5f
        pbeLowpassFilter.resetAllChannels()
        pbeBandpassLowFilter.resetAllChannels()
        pbeBandpassHighFilter.resetAllChannels()
        
        sbrEnabled = false
        sbrIntensity = 0.5f
        sbrHighpassFilter.resetAllChannels()
        sbrHighShelfFilter.resetAllChannels()
        
        eqFilters.forEach { it.resetAllChannels() }
        bassShelfFilter.resetAllChannels()
        trebleShelfFilter.resetAllChannels()
        limiter.reset()
    }
    
    // =========================================
    // Dynamic Volume EQ (Fletcher-Munson Compensation) Controls
    // =========================================
    
    /**
     * Enable or disable Dynamic Volume EQ (Fletcher-Munson compensation).
     * Automatically boosts bass and treble at low listening levels.
     */
    fun setDynamicEQEnabled(enabled: Boolean) {
        dynamicEQEnabled = enabled
        android.util.Log.d("SoftwareDSP", "Dynamic Volume EQ ${if (enabled) "enabled" else "disabled"}")
    }
    
    fun getDynamicEQEnabled(): Boolean = dynamicEQEnabled
    
    /**
     * Set Dynamic Volume EQ strength (0.0-1.0).
     * Scales the bass/treble compensation amount.
     */
    fun setDynamicEQStrength(strength: Float) {
        dynamicEQStrength = strength.coerceIn(0f, 1f)
        android.util.Log.d("SoftwareDSP", "Dynamic Volume EQ strength set to ${(dynamicEQStrength * 100).toInt()}%")
    }
    
    fun getDynamicEQStrength(): Float = dynamicEQStrength
    
    /**
     * Process Dynamic Volume EQ (Fletcher-Munson Compensation).
     * Tracks RMS level and applies bass/treble boost at low volumes.
     * 
     * Algorithm:
     * 1. Track current output level via RMS (smoothed)
     * 2. At low levels (< -20dB), boost bass by +3dB and treble by +2dB
     * 3. At high levels (> -6dB), apply no compensation
     * 4. Smooth transition between levels using linear interpolation
     */
    private fun processDynamicEQ(samples: FloatArray, channelCount: Int) {
        // Calculate RMS level for this buffer (simplified for efficiency)
        var sumSquares = 0.0
        for (i in samples.indices) {
            sumSquares += (samples[i] * samples[i]).toDouble()
        }
        val bufferRms = kotlin.math.sqrt(sumSquares / samples.size)
        
        // Smooth RMS level using EMA
        rmsLevel = DYNAMIC_EQ_RMS_ALPHA * rmsLevel + (1.0 - DYNAMIC_EQ_RMS_ALPHA) * bufferRms
        
        // Convert to dB (avoid log of zero)
        val rmsDb = if (rmsLevel > 1e-10) (20.0 * kotlin.math.log10(rmsLevel)).toFloat() else -60f
        
        // Calculate compensation factor (0 = no compensation, 1 = full compensation)
        val compensationFactor: Float = when {
            rmsDb <= DYNAMIC_EQ_LOW_THRESHOLD -> 1f
            rmsDb >= DYNAMIC_EQ_HIGH_THRESHOLD -> 0f
            else -> {
                // Linear interpolation between thresholds
                (DYNAMIC_EQ_HIGH_THRESHOLD - rmsDb) / (DYNAMIC_EQ_HIGH_THRESHOLD - DYNAMIC_EQ_LOW_THRESHOLD)
            }
        }
        
        // Calculate target gains (scaled by strength and compensation factor)
        val targetBassBoost = DYNAMIC_EQ_MAX_BASS_BOOST * compensationFactor * dynamicEQStrength
        val targetTrebleBoost = DYNAMIC_EQ_MAX_TREBLE_BOOST * compensationFactor * dynamicEQStrength
        
        // Update filter gains only if they've changed significantly (avoid recalculating coefficients too often)
        if (kotlin.math.abs(targetBassBoost - currentDynamicBassBoost) > 0.1f) {
            currentDynamicBassBoost = targetBassBoost
            dynamicEQBassFilter.setGain(currentDynamicBassBoost)
        }
        if (kotlin.math.abs(targetTrebleBoost - currentDynamicTrebleBoost) > 0.1f) {
            currentDynamicTrebleBoost = targetTrebleBoost
            dynamicEQTrebleFilter.setGain(currentDynamicTrebleBoost)
        }
        
        // Apply filters (only if there's any boost to apply)
        if (currentDynamicBassBoost > 0.01f) {
            dynamicEQBassFilter.processBufferFloat(samples, channelCount)
        }
        if (currentDynamicTrebleBoost > 0.01f) {
            dynamicEQTrebleFilter.processBufferFloat(samples, channelCount)
        }
    }
    
    // =========================================
    // Psychoacoustic Bass Enhancement (PBE) Controls
    // =========================================
    
    /**
     * Enable or disable Psychoacoustic Bass Enhancement.
     * Generates harmonics of sub-bass frequencies for perceived bass on small speakers.
     */
    fun setPBEEnabled(enabled: Boolean) {
        pbeEnabled = enabled
        android.util.Log.d("SoftwareDSP", "PBE ${if (enabled) "enabled" else "disabled"}")
    }
    
    fun getPBEEnabled(): Boolean = pbeEnabled
    
    /**
     * Set PBE intensity (0.0-1.0).
     * Controls the wet/dry mix of generated harmonics.
     */
    fun setPBEIntensity(intensity: Float) {
        pbeIntensity = intensity.coerceIn(0f, 1f)
        android.util.Log.d("SoftwareDSP", "PBE intensity set to ${(pbeIntensity * 100).toInt()}%")
    }
    
    fun getPBEIntensity(): Float = pbeIntensity
    
    /**
     * Process Psychoacoustic Bass Enhancement.
     * Generates harmonics of sub-bass frequencies so brain perceives bass that small speakers can't reproduce.
     * 
     * Algorithm:
     * 1. Crossover filter: LPF at ~100Hz to extract sub-bass
     * 2. Harmonic generator: Generate 2nd, 3rd, 4th harmonics using polynomial waveshaping
     *    y = x + 0.5*x² + 0.25*x³ (creates 2nd, 3rd, 4th harmonics)
     * 3. Bandpass filter: 100-400Hz to keep only useful harmonics
     * 4. Blend: Mix harmonics with original signal based on intensity
     */
    private fun processPBE(samples: FloatArray, channelCount: Int) {
        var i = 0
        while (i < samples.size) {
            for (ch in 0 until channelCount) {
                if (i + ch >= samples.size) break
                
                val original = samples[i + ch]
                
                // Extract sub-bass using lowpass filter (< 100Hz)
                val subBass = pbeLowpassFilter.processSample(original, ch)
                
                // Generate harmonics using polynomial waveshaping
                // y = x + 0.5*x² + 0.25*x³ creates 2nd, 3rd, 4th harmonics
                val x = subBass
                val harmonics = x + 0.5f * x * x + 0.25f * x * x * x
                
                // Apply bandpass filter (100-400Hz) to keep only useful harmonics
                var filteredHarmonics = pbeBandpassLowFilter.processSample(harmonics, ch)
                filteredHarmonics = pbeBandpassHighFilter.processSample(filteredHarmonics, ch)
                
                // Blend harmonics with original signal
                samples[i + ch] = original + filteredHarmonics * pbeIntensity
            }
            i += channelCount
        }
    }
    
    // =========================================
    // Spectral Band Replication (SBR) Controls
    // =========================================
    
    /**
     * Enable or disable Spectral Band Replication.
     * Extends high frequencies to restore lost detail in compressed audio.
     */
    fun setSBREnabled(enabled: Boolean) {
        sbrEnabled = enabled
        android.util.Log.d("SoftwareDSP", "SBR ${if (enabled) "enabled" else "disabled"}")
    }
    
    fun getSBREnabled(): Boolean = sbrEnabled
    
    /**
     * Set SBR intensity (0.0-1.0).
     * Controls the blend amount of extended frequencies (scaled to 10-30%).
     */
    fun setSBRIntensity(intensity: Float) {
        sbrIntensity = intensity.coerceIn(0f, 1f)
        android.util.Log.d("SoftwareDSP", "SBR intensity set to ${(sbrIntensity * 100).toInt()}%")
    }
    
    fun getSBRIntensity(): Float = sbrIntensity
    
    /**
     * Process Spectral Band Replication.
     * Extends high frequencies above 16kHz to restore lost detail in compressed audio.
     * 
     * Algorithm:
     * 1. High-pass filter at 8kHz to isolate upper harmonics
     * 2. Simple spectral folding: Use the high frequency content directly
     *    (we use waveshaping to create harmonic content that extends the spectrum)
     * 3. Apply high-shelf EQ boost above 16kHz with gentle roll-off
     * 4. Low-level blend (10-30%) with original, scaled by intensity
     */
    private fun processSBR(samples: FloatArray, channelCount: Int) {
        // Calculate blend amount (10-30% based on intensity)
        val blendAmount = 0.1f + (SBR_MAX_BLEND - 0.1f) * sbrIntensity
        
        var i = 0
        while (i < samples.size) {
            for (ch in 0 until channelCount) {
                if (i + ch >= samples.size) break
                
                val original = samples[i + ch]
                
                // Extract high frequency content (8kHz+) using highpass filter
                val highFreq = sbrHighpassFilter.processSample(original, ch)
                
                // Generate extended harmonics using soft waveshaping
                // tanh-like saturation creates harmonic extension
                val x = highFreq * 2f // Boost input for more harmonic generation
                val extended = kotlin.math.tanh(x.toDouble()).toFloat()
                
                // Apply high-shelf boost to emphasize the extended frequencies
                val boosted = sbrHighShelfFilter.processSample(extended, ch)
                
                // Blend with original (low-level mix)
                samples[i + ch] = original + boosted * blendAmount
            }
            i += channelCount
        }
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
            "dynamicEQActive" to dynamicEQEnabled,
            "dynamicEQStrength" to dynamicEQStrength,
            "pbeActive" to pbeEnabled,
            "pbeIntensity" to pbeIntensity,
            "sbrActive" to sbrEnabled,
            "sbrIntensity" to sbrIntensity
        )
    }
}
