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
 * Input → 10-Band EQ → Bass Shelf → Treble Shelf → Stereo Width → Reverb → Limiter → Output
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
        
        // Psychoacoustic Stereo Enhancement constants
        private const val BASS_MONO_FREQ = 150f
        private const val SIDE_BOOST = 0.5f  // 50% boost = 1.5x, capped at 2.0x (100%)
        private const val ITD_DELAY_MS = 0.3f
        private const val MAX_ITD_DELAY_MS = 0.6f
        private const val CORRELATION_THRESHOLD = 0.3f
        private const val CORRELATION_ALPHA = 0.995f  // EMA smoothing
        private const val ALLPASS_Q = 0.7f
        private const val MID_ATTENUATION = 0.9f  // Mid channel attenuation (0.85-0.95)
        
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
    private var stereoWidth = 0f  // -1.0 = mono, 0.0 = original, 1.0 = max wide (200%)
    private var isEnabled = true
    
    // Psychoacoustic Stereo Enhancement
    private var spatialEnhancementEnabled: Boolean = false
    
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

        // 4. Stereo Width / Virtualizer (M/S processing, true stereo)
        if (channelCount == 2 && stereoWidth != 0f) {
            processStereoWidthFloat(floatSamples)
        }

        // 5. Psychoacoustic Stereo Enhancement (true stereo)
        if (spatialEnhancementEnabled && channelCount == 2) {
            processPsychoacousticStereo(floatSamples)
        }

        // 6. Multi-Tap Delay Reverb (true stereo)
        if (reverbWetMix > 0f && channelCount == 2) {
            processReverbFloat(floatSamples)
        }

        // 7. Brickwall Limiter (linked stereo - industry standard)
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
     * Set stereo width for virtualizer effect.
     * @param width Range -1.0 to 1.0
     *   -1.0 = Full mono (0% stereo width)
     *    0.0 = Original stereo (100% width)
     *    1.0 = Maximum wide (200% width)
     */
    fun setStereoWidth(width: Float) {
        stereoWidth = width.coerceIn(-1f, 1f)
        android.util.Log.d("SoftwareDSP", "Stereo width set to $stereoWidth (${((1f + stereoWidth) * 100).toInt()}%)")
    }

    fun getStereoWidth(): Float = stereoWidth

    /**
     * Enable or disable psychoacoustic stereo enhancement.
     * This applies frequency-dependent M/S processing, ITD, and correlation-guarded widening.
     */
    fun setSpatialEnhancement(enabled: Boolean) {
        spatialEnhancementEnabled = enabled
        android.util.Log.d("SoftwareDSP", "Spatial enhancement ${if (enabled) "enabled" else "disabled"}")
    }

    fun getSpatialEnhancement(): Boolean = spatialEnhancementEnabled

    /**
     * Process psychoacoustic stereo enhancement (32-bit float version).
     * Implements frequency-dependent M/S processing with ITD, all-pass decorrelation,
     * and correlation-guarded side boost.
     * 
     * Signal flow:
     * 1. Bass Mono Enforcement (below 150Hz)
     * 2. M/S Conversion with frequency-dependent processing
     * 3. ITD delay on Side channel
     * 4. All-pass decorrelation on Side channel
     * 5. Correlation monitoring and adaptive side gain
     * 6. Back to L/R conversion
     */
    private fun processPsychoacousticStereo(samples: FloatArray) {
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
            // C. Interaural Time Difference (ITD)
            // =========================================
            // Read delayed side from circular buffer
            val readIndex = (itdDelayWriteIndex - itdDelaySamples + MAX_ITD_DELAY_SAMPLES) % MAX_ITD_DELAY_SAMPLES
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
            // E. Correlation Monitor/Guard
            // =========================================
            // Update running correlation (EMA)
            correlationSum = CORRELATION_ALPHA * correlationSum + (1.0 - CORRELATION_ALPHA) * (left * right).toDouble()
            leftSquaredSum = CORRELATION_ALPHA * leftSquaredSum + (1.0 - CORRELATION_ALPHA) * (left * left).toDouble()
            rightSquaredSum = CORRELATION_ALPHA * rightSquaredSum + (1.0 - CORRELATION_ALPHA) * (right * right).toDouble()
            
            val denominator = kotlin.math.sqrt(leftSquaredSum * rightSquaredSum)
            if (denominator > 1e-10) {
                runningCorrelation = (correlationSum / denominator).toFloat().coerceIn(-1f, 1f)
            }
            
            // Calculate side boost with correlation guard
            var sideBoostMultiplier = (1f + SIDE_BOOST).coerceAtMost(2f)  // 1.5x, capped at 2.0x
            
            // If correlation drops below threshold, reduce side gain by 10-20%
            if (runningCorrelation < CORRELATION_THRESHOLD) {
                val reductionFactor = 0.8f + 0.1f * (runningCorrelation / CORRELATION_THRESHOLD).coerceIn(0f, 1f)
                sideBoostMultiplier *= reductionFactor
            }
            
            // Apply side boost
            side *= sideBoostMultiplier
            
            // Apply Mid attenuation to preserve loudness
            val attenuatedMid = mid * MID_ATTENUATION
            
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

    /**
     * Process stereo width using mid-side technique (32-bit float version).
     * Mid = (L + R) / 2 (center content)
     * Side = (L - R) / 2 (stereo content)
     * 
     * Width < 0: Reduce side, more mono
     * Width > 0: Boost side, wider stereo
     */
    private fun processStereoWidthFloat(samples: FloatArray) {
        // Calculate side multiplier based on stereoWidth
        // -1.0 → sideGain = 0.0 (full mono)
        //  0.0 → sideGain = 1.0 (original)
        //  1.0 → sideGain = 2.0 (max wide)
        val sideGain = 1f + stereoWidth

        // Process samples in stereo pairs (L, R, L, R, ...)
        var i = 0
        while (i < samples.size - 1) {
            val left = samples[i]
            val right = samples[i + 1]

            // Convert to mid-side
            val mid = (left + right) / 2f
            val side = (left - right) / 2f

            // Apply width to side channel
            val newSide = side * sideGain

            // Convert back to left-right (soft clip at ±1.0)
            samples[i] = (mid + newSide).coerceIn(-1f, 1f)
            samples[i + 1] = (mid - newSide).coerceIn(-1f, 1f)

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
        stereoWidth = 0f
        reverbWetMix = 0f
        spatialEnhancementEnabled = false
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
            "virtualizerActive" to (stereoWidth != 0f),
            "reverbActive" to (reverbWetMix > 0f),
            "spatialEnhancementActive" to spatialEnhancementEnabled,
            "itdDelaySamples" to itdDelaySamples,
            "runningCorrelation" to runningCorrelation
        )
    }
}
