package expo.modules.audioeffects

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

enum class FilterType {
    PEAKING,
    LOWSHELF,
    HIGHSHELF
}

/**
 * Biquad filter implementation using Robert Bristow-Johnson's Audio EQ Cookbook formulas.
 * Supports true stereo processing with independent filter states per channel.
 * 
 * Audio Processing Standards:
 * - Internal processing: 32-bit float (Float) / 64-bit double for coefficients
 * - Maintains per-channel state for true stereo processing
 */
class BiquadFilter(
    private var type: FilterType = FilterType.PEAKING,
    private var frequency: Float = 1000f,
    private var gainDb: Float = 0f,
    private var q: Float = 1.0f,
    private var sampleRate: Float = 48000f
) {
    // 64-bit double precision for filter coefficients (prevents numerical instability)
    private var b0: Double = 1.0
    private var b1: Double = 0.0
    private var b2: Double = 0.0
    private var a1: Double = 0.0
    private var a2: Double = 0.0

    // Per-channel state for true stereo processing
    private val channelStates = mutableMapOf<Int, ChannelState>()

    private class ChannelState {
        // 64-bit double precision for filter state (prevents accumulation errors)
        var x1: Double = 0.0
        var x2: Double = 0.0
        var y1: Double = 0.0
        var y2: Double = 0.0

        fun reset() {
            x1 = 0.0
            x2 = 0.0
            y1 = 0.0
            y2 = 0.0
        }
    }

    init {
        calculateCoefficients()
    }

    fun configure(type: FilterType, frequency: Float, gainDb: Float, q: Float, sampleRate: Float) {
        this.type = type
        this.frequency = frequency
        this.gainDb = gainDb
        this.q = q
        this.sampleRate = sampleRate
        calculateCoefficients()
    }

    fun setGain(gainDb: Float) {
        if (this.gainDb != gainDb) {
            this.gainDb = gainDb
            calculateCoefficients()
        }
    }

    fun setSampleRate(sampleRate: Float) {
        if (this.sampleRate != sampleRate) {
            this.sampleRate = sampleRate
            calculateCoefficients()
            resetAllChannels()
        }
    }

    /**
     * Calculate biquad filter coefficients using Bristow-Johnson formulas.
     * Uses 64-bit double precision for numerical stability.
     */
    private fun calculateCoefficients() {
        val omega = 2.0 * PI * frequency / sampleRate
        val sinOmega = sin(omega)
        val cosOmega = cos(omega)
        val alpha = sinOmega / (2.0 * q)
        val A = 10.0.pow(gainDb / 40.0)

        var b0Temp: Double
        var b1Temp: Double
        var b2Temp: Double
        var a0Temp: Double
        var a1Temp: Double
        var a2Temp: Double

        when (type) {
            FilterType.PEAKING -> {
                b0Temp = 1.0 + alpha * A
                b1Temp = -2.0 * cosOmega
                b2Temp = 1.0 - alpha * A
                a0Temp = 1.0 + alpha / A
                a1Temp = -2.0 * cosOmega
                a2Temp = 1.0 - alpha / A
            }
            FilterType.LOWSHELF -> {
                val sqrtA = sqrt(A)
                val sqrtA2Alpha = 2.0 * sqrtA * alpha
                b0Temp = A * ((A + 1.0) - (A - 1.0) * cosOmega + sqrtA2Alpha)
                b1Temp = 2.0 * A * ((A - 1.0) - (A + 1.0) * cosOmega)
                b2Temp = A * ((A + 1.0) - (A - 1.0) * cosOmega - sqrtA2Alpha)
                a0Temp = (A + 1.0) + (A - 1.0) * cosOmega + sqrtA2Alpha
                a1Temp = -2.0 * ((A - 1.0) + (A + 1.0) * cosOmega)
                a2Temp = (A + 1.0) + (A - 1.0) * cosOmega - sqrtA2Alpha
            }
            FilterType.HIGHSHELF -> {
                val sqrtA = sqrt(A)
                val sqrtA2Alpha = 2.0 * sqrtA * alpha
                b0Temp = A * ((A + 1.0) + (A - 1.0) * cosOmega + sqrtA2Alpha)
                b1Temp = -2.0 * A * ((A - 1.0) + (A + 1.0) * cosOmega)
                b2Temp = A * ((A + 1.0) + (A - 1.0) * cosOmega - sqrtA2Alpha)
                a0Temp = (A + 1.0) - (A - 1.0) * cosOmega + sqrtA2Alpha
                a1Temp = 2.0 * ((A - 1.0) - (A + 1.0) * cosOmega)
                a2Temp = (A + 1.0) - (A - 1.0) * cosOmega - sqrtA2Alpha
            }
        }

        b0 = b0Temp / a0Temp
        b1 = b1Temp / a0Temp
        b2 = b2Temp / a0Temp
        a1 = a1Temp / a0Temp
        a2 = a2Temp / a0Temp
    }

    private fun getChannelState(channel: Int): ChannelState {
        return channelStates.getOrPut(channel) { ChannelState() }
    }

    /**
     * Process a single sample with 64-bit double precision internally.
     * @param sample Input sample in normalized float range [-1.0, 1.0]
     * @param channel Channel index (0=L, 1=R) for true stereo processing
     * @return Processed sample in normalized float range
     */
    fun processSample(sample: Float, channel: Int): Float {
        val state = getChannelState(channel)
        val sampleD = sample.toDouble()
        
        val output = b0 * sampleD + b1 * state.x1 + b2 * state.x2 - a1 * state.y1 - a2 * state.y2
        
        state.x2 = state.x1
        state.x1 = sampleD
        state.y2 = state.y1
        state.y1 = output
        
        return output.toFloat()
    }

    /**
     * Process buffer of 32-bit float samples (normalized [-1.0, 1.0]).
     * True stereo processing with independent filter states per channel.
     * 
     * @param samples Interleaved float samples [L, R, L, R, ...]
     * @param channelCount Number of channels (1=mono, 2=stereo)
     */
    fun processBufferFloat(samples: FloatArray, channelCount: Int) {
        for (i in samples.indices) {
            val channel = i % channelCount
            samples[i] = processSample(samples[i], channel)
        }
    }

    /**
     * Legacy method for ShortArray processing (PCM16).
     * Converts to float internally, processes, then converts back.
     * @deprecated Use processBufferFloat for 32-bit float processing chain
     */
    @Deprecated("Use processBufferFloat for 32-bit float processing chain")
    fun processBuffer(samples: ShortArray, channelCount: Int) {
        for (i in samples.indices) {
            val channel = i % channelCount
            val sample = samples[i].toFloat() / 32768f
            val processed = processSample(sample, channel)
            samples[i] = (processed * 32768f).coerceIn(-32768f, 32767f).toInt().toShort()
        }
    }

    fun resetAllChannels() {
        channelStates.values.forEach { it.reset() }
    }

    fun isPassthrough(): Boolean = gainDb == 0f
}
