package expo.modules.audioeffects

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.AudioProcessor.AudioFormat
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin

class SoftwareDSPAudioProcessor : AudioProcessor {
    companion object {
        const val DB_PER_UNIT = 2.4f
        const val MAX_DB = 12f
        const val DEFAULT_Q = 1.4f
        const val BASS_FREQUENCY = 150f
        const val TREBLE_FREQUENCY = 6000f
        
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
    
    private val bassBoostFilter = BiquadFilter(FilterType.LOWSHELF, BASS_FREQUENCY, 0f, 0.707f, 44100f)
    private val trebleBoostFilter = BiquadFilter(FilterType.HIGHSHELF, TREBLE_FREQUENCY, 0f, 0.707f, 44100f)
    
    private val limiter = Limiter(-1f, 20f, 1f, 100f, 44100f)

    private val eqGains = FloatArray(10) { 0f }
    private var bassGainDb = 0f
    private var trebleGainDb = 0f
    private var safetyGainReduction = 0f
    private var stereoWidth = 0f
    private var isEnabled = true
    
    private var reverbWetMix = 0f
    private var currentSampleRate = 44100f
    
    private val REVERB_DELAY_TIMES = floatArrayOf(0.023f, 0.041f, 0.067f, 0.089f)
    private val REVERB_FEEDBACK_GAINS = floatArrayOf(0.4f, 0.35f, 0.3f, 0.25f)
    private val REVERB_LOWPASS_FREQS = floatArrayOf(4000f, 3500f, 3000f, 2500f)
    
    private var reverbDelayBuffersL = Array(4) { FloatArray(0) }
    private var reverbDelayBuffersR = Array(4) { FloatArray(0) }
    private var reverbDelayIndices = IntArray(4) { 0 }
    
    private var reverbLowpassStatesL = FloatArray(4) { 0f }
    private var reverbLowpassStatesR = FloatArray(4) { 0f }
    private var reverbLowpassCoeffs = FloatArray(4) { 0f }

    private var outputBuffer: ByteBuffer = AudioProcessor.EMPTY_BUFFER
    private var inputBuffer: ByteBuffer = AudioProcessor.EMPTY_BUFFER

    init {
        sharedInstance = this
        initializeReverbBuffers(44100f)
    }

    private fun initializeReverbBuffers(sampleRate: Float) {
        currentSampleRate = sampleRate
        
        for (i in 0..3) {
            val delaySamples = (REVERB_DELAY_TIMES[i] * sampleRate).toInt()
            reverbDelayBuffersL[i] = FloatArray(delaySamples)
            reverbDelayBuffersR[i] = FloatArray(delaySamples)
            reverbDelayIndices[i] = 0
            
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
        
        eqFilters.forEachIndexed { i, filter ->
            filter.configure(FilterType.PEAKING, EQ_FREQUENCIES[i], eqGains[i], DEFAULT_Q, sampleRate)
        }
        
        bassBoostFilter.configure(FilterType.LOWSHELF, BASS_FREQUENCY, bassGainDb, 0.707f, sampleRate)
        trebleBoostFilter.configure(FilterType.HIGHSHELF, TREBLE_FREQUENCY, trebleGainDb, 0.707f, sampleRate)
        
        limiter.setSampleRate(sampleRate)
        
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

        for (filter in eqFilters) {
            if (!filter.isPassthrough()) {
                filter.processBuffer(samples, channelCount)
            }
        }
        
        if (!bassBoostFilter.isPassthrough()) {
            bassBoostFilter.processBuffer(samples, channelCount)
        }
        
        if (!trebleBoostFilter.isPassthrough()) {
            trebleBoostFilter.processBuffer(samples, channelCount)
        }
        
        if (safetyGainReduction < 0f) {
            applySafetyGainReduction(samples)
        }

        if (channelCount == 2 && stereoWidth != 0f) {
            processStereoWidth(samples)
        }

        if (reverbWetMix > 0f && channelCount == 2) {
            processReverb(samples)
        }

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

    fun setEqBandGain(band: Int, gainUnits: Float) {
        if (band in 0..9) {
            val gainDb = (gainUnits * DB_PER_UNIT).coerceIn(-MAX_DB, MAX_DB)
            eqGains[band] = gainDb
            eqFilters[band].setGain(gainDb)
            recalculateSafetyGain()
        }
    }

    fun setAllEqBandGains(gains: List<Double>) {
        gains.forEachIndexed { index, gain ->
            if (index < 10) {
                val gainDb = (gain.toFloat() * DB_PER_UNIT).coerceIn(-MAX_DB, MAX_DB)
                eqGains[index] = gainDb
                eqFilters[index].setGain(gainDb)
            }
        }
        recalculateSafetyGain()
    }
    
    fun setBassBoost(gainUnits: Float) {
        val gainDb = (gainUnits * DB_PER_UNIT).coerceIn(-MAX_DB, MAX_DB)
        bassGainDb = gainDb
        bassBoostFilter.setGain(gainDb)
        recalculateSafetyGain()
    }
    
    fun setTrebleBoost(gainUnits: Float) {
        val gainDb = (gainUnits * DB_PER_UNIT).coerceIn(-MAX_DB, MAX_DB)
        trebleGainDb = gainDb
        trebleBoostFilter.setGain(gainDb)
        recalculateSafetyGain()
    }
    
    fun getBassGain(): Float = bassGainDb
    
    fun getTrebleGain(): Float = trebleGainDb
    
    fun getSafetyGainReduction(): Float = safetyGainReduction
    
    private fun recalculateSafetyGain() {
        val lowFreqBands = eqGains.slice(0..2)
        val midFreqBands = eqGains.slice(3..5)
        val highFreqBands = eqGains.slice(6..9)
        
        val maxLowEq = lowFreqBands.maxOrNull() ?: 0f
        val maxMidEq = midFreqBands.maxOrNull() ?: 0f
        val maxHighEq = highFreqBands.maxOrNull() ?: 0f
        
        val lowFreqTotal = maxLowEq + kotlin.math.max(0f, bassGainDb)
        val highFreqTotal = maxHighEq + kotlin.math.max(0f, trebleGainDb)
        val midFreqTotal = maxMidEq
        
        val totalMaxGain = kotlin.math.max(kotlin.math.max(lowFreqTotal, midFreqTotal), highFreqTotal)
        
        safetyGainReduction = if (totalMaxGain > MAX_DB) {
            -(totalMaxGain - MAX_DB)
        } else {
            0f
        }
        
        android.util.Log.d("SoftwareDSP", "Safety gain: lowEQ=$maxLowEq+bass=$bassGainDb, highEQ=$maxHighEq+treble=$trebleGainDb, reduction=$safetyGainReduction dB")
    }
    
    private fun applySafetyGainReduction(samples: ShortArray) {
        val linearGain = 10.0.pow(safetyGainReduction / 20.0).toFloat()
        for (i in samples.indices) {
            val sample = samples[i].toFloat() * linearGain
            samples[i] = sample.coerceIn(-32768f, 32767f).toInt().toShort()
        }
    }

    fun setReverb(wetMix: Float) {
        reverbWetMix = wetMix.coerceIn(0f, 1f)
    }

    fun getReverb(): Float = reverbWetMix

    private fun processReverb(samples: ShortArray) {
        val dryAmount = cos(reverbWetMix * Math.PI / 2).toFloat()
        val wetAmount = sin(reverbWetMix * Math.PI / 2).toFloat()
        
        var i = 0
        while (i < samples.size - 1) {
            val dryLeft = samples[i].toFloat() / 32768f
            val dryRight = samples[i + 1].toFloat() / 32768f
            
            var wetLeft = 0f
            var wetRight = 0f
            
            for (tap in 0..3) {
                val bufferL = reverbDelayBuffersL[tap]
                val bufferR = reverbDelayBuffersR[tap]
                val idx = reverbDelayIndices[tap]
                
                if (bufferL.isEmpty() || bufferR.isEmpty()) continue
                
                val delayedL = bufferL[idx]
                val delayedR = bufferR[idx]
                
                reverbLowpassStatesL[tap] += reverbLowpassCoeffs[tap] * (delayedL - reverbLowpassStatesL[tap])
                reverbLowpassStatesR[tap] += reverbLowpassCoeffs[tap] * (delayedR - reverbLowpassStatesR[tap])
                
                val filteredL = reverbLowpassStatesL[tap]
                val filteredR = reverbLowpassStatesR[tap]
                
                wetLeft += filteredL
                wetRight += filteredR
                
                val feedback = REVERB_FEEDBACK_GAINS[tap]
                bufferL[idx] = dryLeft + filteredL * feedback
                bufferR[idx] = dryRight + filteredR * feedback
                
                reverbDelayIndices[tap] = (idx + 1) % bufferL.size
            }
            
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

    fun setEnabled(enabled: Boolean) {
        isEnabled = enabled
    }

    fun getEqBandGains(): FloatArray = eqGains.copyOf()
    fun getIsEnabled(): Boolean = isEnabled
    fun getEqFrequencies(): FloatArray = EQ_FREQUENCIES.copyOf()
    fun getEqBandNames(): Array<String> = EQ_NAMES.copyOf()
    fun getNumberOfBands(): Int = 10

    fun resetAll() {
        for (i in 0..9) {
            eqGains[i] = 0f
            eqFilters[i].setGain(0f)
        }
        
        bassGainDb = 0f
        trebleGainDb = 0f
        safetyGainReduction = 0f
        bassBoostFilter.setGain(0f)
        trebleBoostFilter.setGain(0f)
        
        stereoWidth = 0f
        reverbWetMix = 0f
        
        eqFilters.forEach { it.resetAllChannels() }
        bassBoostFilter.resetAllChannels()
        trebleBoostFilter.resetAllChannels()
        limiter.reset()
        resetReverbBuffers()
    }
}
