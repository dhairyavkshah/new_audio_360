package expo.modules.audioeffects

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.AudioProcessor.AudioFormat
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.cos
import kotlin.math.sin

class SoftwareDSPAudioProcessor : AudioProcessor {
    companion object {
        const val DB_PER_UNIT = 2.4f
        const val MAX_DB = 12f
        const val DEFAULT_Q = 1.4f
        
        private val EQ_FREQUENCIES = floatArrayOf(60f, 170f, 310f, 600f, 1000f, 3000f, 6000f, 12000f, 14000f, 16000f)
        private val EQ_NAMES = arrayOf("Sub Bass", "Bass", "Low Bass", "Low Mid", "Mid", "Upper Mid", "Presence", "Brilliance", "Air", "Ultra High")
        
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

    private val eqFilters = Array(10) { i ->
        BiquadFilter(FilterType.PEAKING, EQ_FREQUENCIES[i], 0f, DEFAULT_Q, 44100f)
    }
    private val limiter = Limiter(-1f, 20f, 1f, 100f, 44100f)

    private val eqGains = FloatArray(10) { 0f }
    private val eqGainsUnits = FloatArray(10) { 0f }  // Store raw EQ gains in unit space for bass/treble application
    private var bassBoostValue = 0f
    private var trebleBoostValue = 0f
    private var stereoWidth = 0f  // -1.0 = mono, 0.0 = original, 1.0 = max wide (200%)
    private var isEnabled = true
    
    // Reverb parameters - matching Web implementation
    private var reverbWetMix = 0f  // 0.0 to 1.0
    private var currentSampleRate = 44100f
    
    // 4 delay lines with times: [0.023, 0.041, 0.067, 0.089] seconds
    private val REVERB_DELAY_TIMES = floatArrayOf(0.023f, 0.041f, 0.067f, 0.089f)
    private val REVERB_FEEDBACK_GAINS = floatArrayOf(0.4f, 0.35f, 0.3f, 0.25f)
    private val REVERB_LOWPASS_FREQS = floatArrayOf(4000f, 3500f, 3000f, 2500f)
    
    // Delay buffers for each tap (stereo: left and right channels)
    private var reverbDelayBuffersL = Array(4) { FloatArray(0) }
    private var reverbDelayBuffersR = Array(4) { FloatArray(0) }
    private var reverbDelayIndices = IntArray(4) { 0 }
    
    // Lowpass filter states for each reverb tap (stereo)
    private var reverbLowpassStatesL = FloatArray(4) { 0f }
    private var reverbLowpassStatesR = FloatArray(4) { 0f }
    private var reverbLowpassCoeffs = FloatArray(4) { 0f }
    
    // Psychoacoustic Virtualizer - creates 3D spatial perception (Android exclusive)
    private var psychoacousticEnabled = false
    private var psychoacousticIntensity = 0f  // 0.0 to 1.0
    
    // Cross-feed delay buffers (simulates interaural time difference ~0.3-0.7ms)
    // At 44100Hz, 0.5ms = ~22 samples
    private val CROSSFEED_DELAY_SAMPLES = 22
    private val leftDelayBuffer = FloatArray(CROSSFEED_DELAY_SAMPLES)
    private val rightDelayBuffer = FloatArray(CROSSFEED_DELAY_SAMPLES)
    private var delayIndex = 0
    
    // Cross-feed lowpass filter state (simulates head shadow effect)
    private var crossfeedFilterStateL = 0f
    private var crossfeedFilterStateR = 0f
    private val CROSSFEED_LOWPASS_COEFF = 0.3f
    
    // Subtle decorrelation for spaciousness (allpass filter states)
    private var allpassStateL1 = 0f
    private var allpassStateL2 = 0f
    private var allpassStateR1 = 0f
    private var allpassStateR2 = 0f
    private val ALLPASS_COEFF = 0.6f

    private var outputBuffer: ByteBuffer = AudioProcessor.EMPTY_BUFFER
    private var inputBuffer: ByteBuffer = AudioProcessor.EMPTY_BUFFER

    init {
        sharedInstance = this
        initializeReverbBuffers(44100f)
    }

    private fun initializeReverbBuffers(sampleRate: Float) {
        currentSampleRate = sampleRate
        
        // Calculate delay buffer sizes based on sample rate
        for (i in 0..3) {
            val delaySamples = (REVERB_DELAY_TIMES[i] * sampleRate).toInt()
            reverbDelayBuffersL[i] = FloatArray(delaySamples)
            reverbDelayBuffersR[i] = FloatArray(delaySamples)
            reverbDelayIndices[i] = 0
            
            // Calculate lowpass coefficient: simple one-pole lowpass
            // coeff = exp(-2 * PI * freq / sampleRate) approximated as 1 / (1 + 2*PI*freq/sampleRate)
            val omega = 2.0 * Math.PI * REVERB_LOWPASS_FREQS[i] / sampleRate
            reverbLowpassCoeffs[i] = (omega / (1.0 + omega)).toFloat()
        }
    }

    override fun configure(inputAudioFormat: AudioFormat): AudioFormat {
        if (inputAudioFormat.encoding != C.ENCODING_PCM_16BIT) {
            return AudioFormat.NOT_SET
        }

        pendingFormat = inputAudioFormat
        val sampleRate = inputAudioFormat.sampleRate.toFloat()
        
        // Configure all 10 EQ filters
        eqFilters.forEachIndexed { i, filter ->
            filter.configure(FilterType.PEAKING, EQ_FREQUENCIES[i], eqGains[i], DEFAULT_Q, sampleRate)
        }
        limiter.setSampleRate(sampleRate)
        
        // Initialize reverb buffers for this sample rate
        initializeReverbBuffers(sampleRate)

        inputFormat = inputAudioFormat
        outputFormat = inputAudioFormat
        isActive = true

        return inputAudioFormat
    }

    override fun isActive(): Boolean = isEnabled && isActive

    override fun queueInput(buffer: ByteBuffer) {
        if (buffer.remaining() == 0) {
            outputBuffer = buffer
            return
        }

        if (!isEnabled) {
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
        val sampleCount = remaining / 2

        if (outputBuffer.capacity() < remaining) {
            outputBuffer = ByteBuffer.allocateDirect(remaining).order(ByteOrder.nativeOrder())
        } else {
            outputBuffer.clear()
        }

        val samples = ShortArray(sampleCount)
        val shortBuffer = buffer.asShortBuffer()
        shortBuffer.get(samples)
        buffer.position(buffer.position() + samples.size * 2)

        // Signal chain: Source → EQ (10 bands with bass/treble applied) → Stereo Widener → Reverb → Limiter → Output

        // 1. Apply 10-band EQ (bass/treble boost is already applied to appropriate bands)
        for (filter in eqFilters) {
            if (!filter.isPassthrough()) {
                filter.processBuffer(samples, channelCount)
            }
        }

        // 2. Apply spatial processing (stereo width or psychoacoustic virtualizer)
        if (channelCount == 2) {
            if (psychoacousticEnabled && psychoacousticIntensity > 0f) {
                processPsychoacousticVirtualizer(samples)
            } else if (stereoWidth != 0f) {
                processStereoWidth(samples)
            }
        }

        // 3. Apply reverb (matching Web order: after stereo processing, before limiter)
        if (reverbWetMix > 0f && channelCount == 2) {
            processReverb(samples)
        }

        // 4. Apply limiter
        limiter.processBuffer(samples, channelCount)

        outputBuffer.clear()
        outputBuffer.asShortBuffer().put(samples)
        outputBuffer.position(samples.size * 2)
        outputBuffer.flip()
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
        limiter.reset()
        resetReverbBuffers()

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

    /**
     * Set a single EQ band gain.
     * Updates both unit storage and applies with current bass/treble boosts.
     * Note: For preset/full EQ updates, use applyEqWithZeroSum for proper zero-sum normalization.
     */
    fun setEqBandGain(band: Int, gainUnits: Float) {
        if (band in 0..9) {
            // Store in unit space
            eqGainsUnits[band] = gainUnits
            
            // Calculate final dB with bass/treble boost applied to appropriate bands
            var dbValue = gainUnits * DB_PER_UNIT
            if (band <= 1) {
                dbValue += bassBoostValue * DB_PER_UNIT
            }
            if (band >= 6) {
                dbValue += trebleBoostValue * DB_PER_UNIT
            }
            
            val clampedDb = dbValue.coerceIn(-MAX_DB, MAX_DB)
            eqGains[band] = clampedDb
            eqFilters[band].setGain(clampedDb)
        }
    }

    /**
     * Set all EQ band gains WITHOUT zero-sum normalization.
     * Used by immersive modes which have their own designed EQ curves (matching Web's applyImmersiveEQ).
     */
    fun setAllEqBandGains(gains: List<Double>) {
        gains.forEachIndexed { index, gain ->
            if (index < 10) {
                // Store in unit space for bass/treble reapplication
                eqGainsUnits[index] = gain.toFloat()
                // Convert to dB and apply to filter
                val gainDb = (gain.toFloat() * DB_PER_UNIT).coerceIn(-MAX_DB, MAX_DB)
                eqGains[index] = gainDb
                eqFilters[index].setGain(gainDb)
            }
        }
    }
    
    /**
     * Apply EQ bands with zero-sum normalization (matching Web implementation exactly).
     * Web flow:
     * 1. Calculate zero-sum in unit space (subtract average)
     * 2. For each band, convert to dB
     * 3. Add bass boost (dB) to bands 0,1
     * 4. Add treble boost (dB) to bands 6,7,8,9
     * 5. Clamp and apply
     */
    fun applyEqWithZeroSum(gains: List<Double>, bassBoost: Float = 0f, trebleBoost: Float = 0f) {
        // Pad to 10 bands if needed (matching Web)
        val paddedGains = gains.toMutableList()
        while (paddedGains.size < 10) {
            paddedGains.add(0.0)
        }
        
        // Step 1: Calculate zero-sum normalization in UNIT space (matching Web)
        val sum = paddedGains.sum()
        val average = sum / paddedGains.size
        val zeroSumGains = paddedGains.map { (it - average).toFloat() }
        
        // Store the zero-summed unit values
        zeroSumGains.forEachIndexed { index, gain ->
            if (index < 10) {
                eqGainsUnits[index] = gain
            }
        }
        
        // Store bass/treble boost values
        bassBoostValue = bassBoost
        trebleBoostValue = trebleBoost
        
        // Step 2-5: Apply to filters with bass/treble boost (matching Web exactly)
        zeroSumGains.forEachIndexed { index, unitValue ->
            if (index < 10) {
                // Convert to dB
                var dbValue = unitValue * DB_PER_UNIT
                
                // Add bass boost to bands 0, 1 (matching Web)
                if (index <= 1) {
                    dbValue += bassBoost * DB_PER_UNIT
                }
                // Add treble boost to bands 6, 7, 8, 9 (matching Web)
                if (index >= 6) {
                    dbValue += trebleBoost * DB_PER_UNIT
                }
                
                val clampedDb = dbValue.coerceIn(-MAX_DB, MAX_DB)
                eqGains[index] = clampedDb
                eqFilters[index].setGain(clampedDb)
            }
        }
        
        android.util.Log.d("SoftwareDSP", "Applied EQ with zero-sum normalization, bass=$bassBoost, treble=$trebleBoost")
    }

    /**
     * Reapply current EQ with new bass/treble boost values.
     * This recalculates filters using stored unit values + new boosts.
     */
    private fun reapplyEqWithBoosts(bassBoost: Float, trebleBoost: Float) {
        bassBoostValue = bassBoost
        trebleBoostValue = trebleBoost
        
        // Reapply EQ filters with current unit values + new bass/treble (matching Web)
        for (index in 0..9) {
            var dbValue = eqGainsUnits[index] * DB_PER_UNIT
            
            // Add bass boost to bands 0, 1 (matching Web)
            if (index <= 1) {
                dbValue += bassBoost * DB_PER_UNIT
            }
            // Add treble boost to bands 6, 7, 8, 9 (matching Web)
            if (index >= 6) {
                dbValue += trebleBoost * DB_PER_UNIT
            }
            
            val clampedDb = dbValue.coerceIn(-MAX_DB, MAX_DB)
            eqGains[index] = clampedDb
            eqFilters[index].setGain(clampedDb)
        }
        
        android.util.Log.d("SoftwareDSP", "Bass/Treble boost applied: bass=$bassBoost, treble=$trebleBoost")
    }

    fun setBassBoost(gainUnits: Float) {
        reapplyEqWithBoosts(gainUnits, trebleBoostValue)
    }

    fun setTrebleBoost(gainUnits: Float) {
        reapplyEqWithBoosts(bassBoostValue, gainUnits)
    }

    /**
     * Set reverb wet/dry mix (0 = dry, 1 = full reverb)
     * Uses equal-power crossfade for smooth blending (matching Web implementation)
     */
    fun setReverb(wetMix: Float) {
        reverbWetMix = wetMix.coerceIn(0f, 1f)
        android.util.Log.d("SoftwareDSP", "Reverb set to ${(reverbWetMix * 100).toInt()}%")
    }

    fun getReverb(): Float = reverbWetMix

    /**
     * Process multi-tap reverb matching Web implementation.
     * 4 delay lines with lowpass filters and feedback.
     * Equal-power crossfade for wet/dry mix.
     */
    private fun processReverb(samples: ShortArray) {
        // Equal-power crossfade (matching Web)
        val dryAmount = cos(reverbWetMix * Math.PI / 2).toFloat()
        val wetAmount = sin(reverbWetMix * Math.PI / 2).toFloat()
        
        var i = 0
        while (i < samples.size - 1) {
            val dryLeft = samples[i].toFloat() / 32768f
            val dryRight = samples[i + 1].toFloat() / 32768f
            
            var wetLeft = 0f
            var wetRight = 0f
            
            // Process each of the 4 delay taps
            for (tap in 0..3) {
                val bufferL = reverbDelayBuffersL[tap]
                val bufferR = reverbDelayBuffersR[tap]
                val idx = reverbDelayIndices[tap]
                
                if (bufferL.isEmpty() || bufferR.isEmpty()) continue
                
                // Get delayed sample
                val delayedL = bufferL[idx]
                val delayedR = bufferR[idx]
                
                // Apply lowpass filter (head shadow simulation)
                reverbLowpassStatesL[tap] += reverbLowpassCoeffs[tap] * (delayedL - reverbLowpassStatesL[tap])
                reverbLowpassStatesR[tap] += reverbLowpassCoeffs[tap] * (delayedR - reverbLowpassStatesR[tap])
                
                val filteredL = reverbLowpassStatesL[tap]
                val filteredR = reverbLowpassStatesR[tap]
                
                // Add to wet output
                wetLeft += filteredL
                wetRight += filteredR
                
                // Write new sample with feedback to delay buffer
                val feedback = REVERB_FEEDBACK_GAINS[tap]
                bufferL[idx] = dryLeft + filteredL * feedback
                bufferR[idx] = dryRight + filteredR * feedback
                
                // Advance delay index
                reverbDelayIndices[tap] = (idx + 1) % bufferL.size
            }
            
            // Mix dry and wet signals with equal-power crossfade
            val outLeft = (dryLeft * dryAmount + wetLeft * wetAmount).coerceIn(-1f, 1f)
            val outRight = (dryRight * dryAmount + wetRight * wetAmount).coerceIn(-1f, 1f)
            
            samples[i] = (outLeft * 32767f).toInt().toShort()
            samples[i + 1] = (outRight * 32767f).toInt().toShort()
            
            i += 2
        }
    }

    private fun resetReverbBuffers() {
        for (i in 0..3) {
            reverbDelayBuffersL[i].fill(0f)
            reverbDelayBuffersR[i].fill(0f)
            reverbDelayIndices[i] = 0
            reverbLowpassStatesL[i] = 0f
            reverbLowpassStatesR[i] = 0f
        }
    }

    fun setStereoWidth(width: Float) {
        stereoWidth = width.coerceIn(-1f, 1f)
        android.util.Log.d("SoftwareDSP", "Stereo width set to $stereoWidth (${((1f + stereoWidth) * 100).toInt()}%)")
    }

    fun getStereoWidth(): Float = stereoWidth

    private fun processStereoWidth(samples: ShortArray) {
        val sideGain = 1f + stereoWidth

        var i = 0
        while (i < samples.size - 1) {
            val left = samples[i].toFloat()
            val right = samples[i + 1].toFloat()

            val mid = (left + right) / 2f
            val side = (left - right) / 2f

            val newSide = side * sideGain

            var newLeft = mid + newSide
            var newRight = mid - newSide

            newLeft = newLeft.coerceIn(-32768f, 32767f)
            newRight = newRight.coerceIn(-32768f, 32767f)

            samples[i] = newLeft.toInt().toShort()
            samples[i + 1] = newRight.toInt().toShort()

            i += 2
        }
    }

    private fun processPsychoacousticVirtualizer(samples: ShortArray) {
        val wetMix = psychoacousticIntensity * 0.35f
        val dryMix = 1f - (psychoacousticIntensity * 0.15f)
        val crossfeedLevel = psychoacousticIntensity * 0.25f
        
        var i = 0
        while (i < samples.size - 1) {
            val leftDry = samples[i].toFloat()
            val rightDry = samples[i + 1].toFloat()
            
            val leftDelayed = leftDelayBuffer[delayIndex]
            val rightDelayed = rightDelayBuffer[delayIndex]
            
            leftDelayBuffer[delayIndex] = leftDry
            rightDelayBuffer[delayIndex] = rightDry
            delayIndex = (delayIndex + 1) % CROSSFEED_DELAY_SAMPLES
            
            crossfeedFilterStateL += CROSSFEED_LOWPASS_COEFF * (rightDelayed - crossfeedFilterStateL)
            crossfeedFilterStateR += CROSSFEED_LOWPASS_COEFF * (leftDelayed - crossfeedFilterStateR)
            
            val leftCrossfeed = crossfeedFilterStateL
            val rightCrossfeed = crossfeedFilterStateR
            
            val leftDecorr1 = ALLPASS_COEFF * (leftDry - allpassStateL1) + leftDelayed * 0.1f
            allpassStateL1 = leftDecorr1
            val leftDecorr = ALLPASS_COEFF * (leftDecorr1 - allpassStateL2) + allpassStateL1 * 0.05f
            allpassStateL2 = leftDecorr
            
            val rightDecorr1 = ALLPASS_COEFF * (rightDry - allpassStateR1) + rightDelayed * 0.1f
            allpassStateR1 = rightDecorr1
            val rightDecorr = ALLPASS_COEFF * (rightDecorr1 - allpassStateR2) + allpassStateR1 * 0.05f
            allpassStateR2 = rightDecorr
            
            var leftWet = leftDry + (leftCrossfeed * crossfeedLevel) + (leftDecorr * wetMix * 0.3f)
            var rightWet = rightDry + (rightCrossfeed * crossfeedLevel) + (rightDecorr * wetMix * 0.3f)
            
            val mid = (leftWet + rightWet) / 2f
            val side = (leftWet - rightWet) / 2f
            val widthBoost = 1f + (psychoacousticIntensity * 0.3f)
            leftWet = mid + side * widthBoost
            rightWet = mid - side * widthBoost
            
            var finalLeft = (leftDry * dryMix) + (leftWet * wetMix)
            var finalRight = (rightDry * dryMix) + (rightWet * wetMix)
            
            val normFactor = 1f / (dryMix + wetMix)
            finalLeft *= normFactor
            finalRight *= normFactor
            
            finalLeft = finalLeft.coerceIn(-32768f, 32767f)
            finalRight = finalRight.coerceIn(-32768f, 32767f)
            
            samples[i] = finalLeft.toInt().toShort()
            samples[i + 1] = finalRight.toInt().toShort()
            
            i += 2
        }
    }
    
    fun setPsychoacousticVirtualizer(enabled: Boolean, intensity: Float) {
        psychoacousticEnabled = enabled
        psychoacousticIntensity = intensity.coerceIn(0f, 1f)
        android.util.Log.d("SoftwareDSP", "Psychoacoustic virtualizer: enabled=$enabled, intensity=${(intensity * 100).toInt()}%")
    }
    
    fun getPsychoacousticEnabled(): Boolean = psychoacousticEnabled
    fun getPsychoacousticIntensity(): Float = psychoacousticIntensity
    
    private fun resetPsychoacousticBuffers() {
        leftDelayBuffer.fill(0f)
        rightDelayBuffer.fill(0f)
        delayIndex = 0
        crossfeedFilterStateL = 0f
        crossfeedFilterStateR = 0f
        allpassStateL1 = 0f
        allpassStateL2 = 0f
        allpassStateR1 = 0f
        allpassStateR2 = 0f
    }

    fun setEnabled(enabled: Boolean) {
        isEnabled = enabled
    }

    fun getEqBandGains(): FloatArray = eqGains.copyOf()
    fun getBassGain(): Float = bassBoostValue * DB_PER_UNIT
    fun getTrebleGain(): Float = trebleBoostValue * DB_PER_UNIT
    fun getIsEnabled(): Boolean = isEnabled
    fun getEqFrequencies(): FloatArray = EQ_FREQUENCIES.copyOf()
    fun getEqBandNames(): Array<String> = EQ_NAMES.copyOf()
    fun getNumberOfBands(): Int = 10

    fun resetAll() {
        for (i in 0..9) {
            eqGains[i] = 0f
            eqFilters[i].setGain(0f)
        }
        bassBoostValue = 0f
        trebleBoostValue = 0f
        stereoWidth = 0f
        reverbWetMix = 0f
        psychoacousticEnabled = false
        psychoacousticIntensity = 0f
        
        eqFilters.forEach { it.resetAllChannels() }
        limiter.reset()
        resetReverbBuffers()
        resetPsychoacousticBuffers()
    }
}
