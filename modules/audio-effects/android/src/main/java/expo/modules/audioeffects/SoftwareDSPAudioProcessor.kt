package expo.modules.audioeffects

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.AudioProcessor.AudioFormat
import java.nio.ByteBuffer
import java.nio.ByteOrder

class SoftwareDSPAudioProcessor : AudioProcessor {
    companion object {
        const val DB_PER_UNIT = 2.4f
        const val MAX_DB = 12f
        const val DEFAULT_Q = 1.4f
        const val SHELF_Q = 0.707f
        
        private val EQ_FREQUENCIES = floatArrayOf(32f, 64f, 125f, 500f, 2000f, 8000f, 16000f)
        private val EQ_NAMES = arrayOf("Sub", "Bass", "Low-Mid", "Mid", "High-Mid", "Treble", "Brilliance")
        
        const val BASS_SHELF_FREQ = 150f
        const val TREBLE_SHELF_FREQ = 6000f
        
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

    private val eqFilters = Array(7) { i ->
        BiquadFilter(FilterType.PEAKING, EQ_FREQUENCIES[i], 0f, DEFAULT_Q, 44100f)
    }
    private val bassShelfFilter = BiquadFilter(FilterType.LOWSHELF, BASS_SHELF_FREQ, 0f, SHELF_Q, 44100f)
    private val trebleShelfFilter = BiquadFilter(FilterType.HIGHSHELF, TREBLE_SHELF_FREQ, 0f, SHELF_Q, 44100f)
    private val limiter = Limiter(-1f, 20f, 1f, 100f, 44100f)

    private val eqGains = FloatArray(7) { 0f }
    private var bassGain = 0f
    private var trebleGain = 0f
    private var stereoWidth = 0f  // -1.0 = mono, 0.0 = original, 1.0 = max wide (200%)
    private var isEnabled = true
    
    // Psychoacoustic Virtualizer - creates 3D spatial perception
    private var psychoacousticEnabled = false
    private var psychoacousticIntensity = 0f  // 0.0 to 1.0
    
    // Cross-feed delay buffers (simulates interaural time difference ~0.3-0.7ms)
    // At 44100Hz, 0.5ms = ~22 samples
    private val CROSSFEED_DELAY_SAMPLES = 22
    private val leftDelayBuffer = FloatArray(CROSSFEED_DELAY_SAMPLES)
    private val rightDelayBuffer = FloatArray(CROSSFEED_DELAY_SAMPLES)
    private var delayIndex = 0
    
    // Cross-feed lowpass filter state (simulates head shadow effect)
    // Head blocks high frequencies, so cross-fed signal is lowpassed
    private var crossfeedFilterStateL = 0f
    private var crossfeedFilterStateR = 0f
    private val CROSSFEED_LOWPASS_COEFF = 0.3f  // Cutoff ~3kHz at 44.1kHz
    
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
    }

    override fun configure(inputAudioFormat: AudioFormat): AudioFormat {
        if (inputAudioFormat.encoding != C.ENCODING_PCM_16BIT) {
            return AudioFormat.NOT_SET
        }

        pendingFormat = inputAudioFormat
        val sampleRate = inputAudioFormat.sampleRate.toFloat()
        
        eqFilters.forEachIndexed { i, filter ->
            filter.configure(FilterType.PEAKING, EQ_FREQUENCIES[i], eqGains[i], DEFAULT_Q, sampleRate)
        }
        bassShelfFilter.configure(FilterType.LOWSHELF, BASS_SHELF_FREQ, bassGain, SHELF_Q, sampleRate)
        trebleShelfFilter.configure(FilterType.HIGHSHELF, TREBLE_SHELF_FREQ, trebleGain, SHELF_Q, sampleRate)
        limiter.setSampleRate(sampleRate)

        // Set isActive immediately when format is configured
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
            // Passthrough mode - copy input data to output buffer
            val remaining = buffer.remaining()
            if (outputBuffer.capacity() < remaining) {
                outputBuffer = ByteBuffer.allocateDirect(remaining).order(ByteOrder.nativeOrder())
            }
            outputBuffer.clear()
            outputBuffer.put(buffer)  // This copies data AND advances both buffers
            outputBuffer.flip()       // Prepare for reading: position=0, limit=bytes written
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

        for (filter in eqFilters) {
            if (!filter.isPassthrough()) {
                filter.processBuffer(samples, channelCount)
            }
        }

        if (bassGain != 0f) {
            bassShelfFilter.processBuffer(samples, channelCount)
        }

        if (trebleGain != 0f) {
            trebleShelfFilter.processBuffer(samples, channelCount)
        }

        // Apply spatial processing (stereo width or psychoacoustic virtualizer)
        if (channelCount == 2) {
            if (psychoacousticEnabled && psychoacousticIntensity > 0f) {
                // Psychoacoustic virtualizer for EQ mode - creates 3D spatial perception
                processPsychoacousticVirtualizer(samples)
            } else if (stereoWidth != 0f) {
                // Simple mid-side stereo width for immersive modes
                processStereoWidth(samples)
            }
        }

        limiter.processBuffer(samples, channelCount)

        // Write processed samples to output buffer with correct position/limit
        outputBuffer.clear()
        outputBuffer.asShortBuffer().put(samples)
        outputBuffer.position(samples.size * 2)  // Advance by bytes written
        outputBuffer.flip()  // Sets limit = position, position = 0
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
        if (band in 0..6) {
            val gainDb = (gainUnits * DB_PER_UNIT).coerceIn(-MAX_DB, MAX_DB)
            eqGains[band] = gainDb
            eqFilters[band].setGain(gainDb)
        }
    }

    fun setAllEqBandGains(gains: List<Double>) {
        gains.forEachIndexed { index, gain ->
            if (index < 7) {
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
     * Process stereo width using mid-side technique.
     * Mid = (L + R) / 2 (center content)
     * Side = (L - R) / 2 (stereo content)
     * 
     * Width < 0: Reduce side, more mono
     * Width > 0: Boost side, wider stereo
     */
    private fun processStereoWidth(samples: ShortArray) {
        // Calculate side multiplier based on stereoWidth
        // -1.0 → sideGain = 0.0 (full mono)
        //  0.0 → sideGain = 1.0 (original)
        //  1.0 → sideGain = 2.0 (max wide)
        val sideGain = 1f + stereoWidth

        // Process samples in stereo pairs (L, R, L, R, ...)
        var i = 0
        while (i < samples.size - 1) {
            val left = samples[i].toFloat()
            val right = samples[i + 1].toFloat()

            // Convert to mid-side
            val mid = (left + right) / 2f
            val side = (left - right) / 2f

            // Apply width to side channel
            val newSide = side * sideGain

            // Convert back to left-right
            var newLeft = mid + newSide
            var newRight = mid - newSide

            // Soft clip to prevent overflow
            newLeft = newLeft.coerceIn(-32768f, 32767f)
            newRight = newRight.coerceIn(-32768f, 32767f)

            samples[i] = newLeft.toInt().toShort()
            samples[i + 1] = newRight.toInt().toShort()

            i += 2
        }
    }

    /**
     * Psychoacoustic Virtualizer - Creates 3D spatial perception using:
     * 1. Cross-feed with micro-delay (simulates interaural time difference - ITD)
     * 2. Lowpass filtered cross-feed (simulates head shadow effect - ILD)
     * 3. Subtle decorrelation via allpass filters (creates spaciousness)
     * 4. Wet/dry mixing with psychoacousticIntensity
     * 
     * Based on Bose/Sony/Yamaha spatial processing principles.
     */
    private fun processPsychoacousticVirtualizer(samples: ShortArray) {
        val wetMix = psychoacousticIntensity * 0.35f  // Max 35% wet for natural sound
        val dryMix = 1f - (psychoacousticIntensity * 0.15f)  // Slight dry reduction
        val crossfeedLevel = psychoacousticIntensity * 0.25f  // Cross-feed amount
        
        var i = 0
        while (i < samples.size - 1) {
            val leftDry = samples[i].toFloat()
            val rightDry = samples[i + 1].toFloat()
            
            // 1. Get delayed samples from opposite channel (ITD simulation)
            val leftDelayed = leftDelayBuffer[delayIndex]
            val rightDelayed = rightDelayBuffer[delayIndex]
            
            // Store current samples in delay buffer
            leftDelayBuffer[delayIndex] = leftDry
            rightDelayBuffer[delayIndex] = rightDry
            delayIndex = (delayIndex + 1) % CROSSFEED_DELAY_SAMPLES
            
            // 2. Lowpass filter the cross-feed (head shadow - high frequencies blocked)
            // Simple one-pole lowpass: y = y_prev + coeff * (x - y_prev)
            crossfeedFilterStateL += CROSSFEED_LOWPASS_COEFF * (rightDelayed - crossfeedFilterStateL)
            crossfeedFilterStateR += CROSSFEED_LOWPASS_COEFF * (leftDelayed - crossfeedFilterStateR)
            
            val leftCrossfeed = crossfeedFilterStateL
            val rightCrossfeed = crossfeedFilterStateR
            
            // 3. Apply subtle decorrelation via cascaded allpass filters
            // Creates slight phase differences that enhance spaciousness
            // Allpass: y = coeff * (x - y_prev) + x_prev
            val leftDecorr1 = ALLPASS_COEFF * (leftDry - allpassStateL1) + leftDelayed * 0.1f
            allpassStateL1 = leftDecorr1
            val leftDecorr = ALLPASS_COEFF * (leftDecorr1 - allpassStateL2) + allpassStateL1 * 0.05f
            allpassStateL2 = leftDecorr
            
            val rightDecorr1 = ALLPASS_COEFF * (rightDry - allpassStateR1) + rightDelayed * 0.1f
            allpassStateR1 = rightDecorr1
            val rightDecorr = ALLPASS_COEFF * (rightDecorr1 - allpassStateR2) + allpassStateR1 * 0.05f
            allpassStateR2 = rightDecorr
            
            // 4. Combine: dry signal + cross-feed from opposite channel + decorrelation
            var leftWet = leftDry + (leftCrossfeed * crossfeedLevel) + (leftDecorr * wetMix * 0.3f)
            var rightWet = rightDry + (rightCrossfeed * crossfeedLevel) + (rightDecorr * wetMix * 0.3f)
            
            // 5. Subtle stereo widening on top (enhance the spatial effect)
            val mid = (leftWet + rightWet) / 2f
            val side = (leftWet - rightWet) / 2f
            val widthBoost = 1f + (psychoacousticIntensity * 0.3f)  // Up to 30% wider
            leftWet = mid + side * widthBoost
            rightWet = mid - side * widthBoost
            
            // 6. Final mix: blend processed with dry
            var finalLeft = (leftDry * dryMix) + (leftWet * wetMix)
            var finalRight = (rightDry * dryMix) + (rightWet * wetMix)
            
            // Normalize to prevent clipping
            val normFactor = 1f / (dryMix + wetMix)
            finalLeft *= normFactor
            finalRight *= normFactor
            
            // Soft clip
            finalLeft = finalLeft.coerceIn(-32768f, 32767f)
            finalRight = finalRight.coerceIn(-32768f, 32767f)
            
            samples[i] = finalLeft.toInt().toShort()
            samples[i + 1] = finalRight.toInt().toShort()
            
            i += 2
        }
    }
    
    /**
     * Enable/disable psychoacoustic virtualizer (for EQ mode)
     */
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
    fun getBassGain(): Float = bassGain
    fun getTrebleGain(): Float = trebleGain
    fun getIsEnabled(): Boolean = isEnabled
    fun getEqFrequencies(): FloatArray = EQ_FREQUENCIES.copyOf()
    fun getEqBandNames(): Array<String> = EQ_NAMES.copyOf()
    fun getNumberOfBands(): Int = 7

    fun resetAll() {
        for (i in 0..6) {
            eqGains[i] = 0f
            eqFilters[i].setGain(0f)
        }
        bassGain = 0f
        trebleGain = 0f
        stereoWidth = 0f
        psychoacousticEnabled = false
        psychoacousticIntensity = 0f
        bassShelfFilter.setGain(0f)
        trebleShelfFilter.setGain(0f)
        
        eqFilters.forEach { it.resetAllChannels() }
        bassShelfFilter.resetAllChannels()
        trebleShelfFilter.resetAllChannels()
        limiter.reset()
        resetPsychoacousticBuffers()
    }
}
