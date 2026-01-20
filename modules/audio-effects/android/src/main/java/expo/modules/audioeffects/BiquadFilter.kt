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

class BiquadFilter(
    private var type: FilterType = FilterType.PEAKING,
    private var frequency: Float = 1000f,
    private var gainDb: Float = 0f,
    private var q: Float = 1.0f,
    private var sampleRate: Float = 44100f
) {
    private var b0: Double = 1.0
    private var b1: Double = 0.0
    private var b2: Double = 0.0
    private var a1: Double = 0.0
    private var a2: Double = 0.0

    private val channelStates = mutableMapOf<Int, ChannelState>()

    private class ChannelState {
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

    fun processSample(sample: Double, channel: Int): Double {
        val state = getChannelState(channel)
        
        val output = b0 * sample + b1 * state.x1 + b2 * state.x2 - a1 * state.y1 - a2 * state.y2
        
        state.x2 = state.x1
        state.x1 = sample
        state.y2 = state.y1
        state.y1 = output
        
        return output
    }

    fun processBuffer(samples: ShortArray, channelCount: Int) {
        for (i in samples.indices) {
            val channel = i % channelCount
            val sample = samples[i].toDouble() / 32768.0
            val processed = processSample(sample, channel)
            samples[i] = (processed * 32768.0).coerceIn(-32768.0, 32767.0).toInt().toShort()
        }
    }

    fun resetAllChannels() {
        channelStates.values.forEach { it.reset() }
    }

    fun isPassthrough(): Boolean = gainDb == 0f
}
