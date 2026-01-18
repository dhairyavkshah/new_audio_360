package expo.modules.audioeffects

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max

class Limiter(
    private var thresholdDb: Float = -1f,
    private var ratio: Float = 20f,
    private var attackMs: Float = 1f,
    private var releaseMs: Float = 100f,
    private var sampleRate: Float = 44100f
) {
    private var threshold: Double = 0.0
    private var attackCoeff: Double = 0.0
    private var releaseCoeff: Double = 0.0
    private var envelope: Double = 0.0
    private var isEnabled: Boolean = true

    init {
        calculateParameters()
    }

    fun setSampleRate(sampleRate: Float) {
        if (this.sampleRate != sampleRate) {
            this.sampleRate = sampleRate
            calculateParameters()
        }
    }

    fun setEnabled(enabled: Boolean) {
        isEnabled = enabled
    }

    private fun calculateParameters() {
        threshold = Math.pow(10.0, thresholdDb / 20.0)
        attackCoeff = exp(-1.0 / (attackMs * sampleRate / 1000.0))
        releaseCoeff = exp(-1.0 / (releaseMs * sampleRate / 1000.0))
    }

    private fun computeGain(inputLevel: Double): Double {
        if (inputLevel <= threshold) {
            return 1.0
        }
        
        val overDb = 20.0 * ln(inputLevel / threshold) / ln(10.0)
        val compressedDb = overDb / ratio
        val targetLevel = threshold * Math.pow(10.0, compressedDb / 20.0)
        
        return targetLevel / inputLevel
    }

    fun processSample(sample: Double): Double {
        if (!isEnabled) return sample
        
        val inputLevel = abs(sample)
        
        val targetEnvelope = if (inputLevel > envelope) {
            attackCoeff * envelope + (1.0 - attackCoeff) * inputLevel
        } else {
            releaseCoeff * envelope + (1.0 - releaseCoeff) * inputLevel
        }
        envelope = targetEnvelope
        
        val gain = computeGain(envelope)
        
        return sample * gain
    }

    fun processBuffer(samples: ShortArray, channelCount: Int) {
        if (!isEnabled) return
        
        var i = 0
        while (i < samples.size) {
            var maxLevel = 0.0
            for (ch in 0 until channelCount) {
                if (i + ch < samples.size) {
                    maxLevel = max(maxLevel, abs(samples[i + ch].toDouble() / 32768.0))
                }
            }
            
            val targetEnvelope = if (maxLevel > envelope) {
                attackCoeff * envelope + (1.0 - attackCoeff) * maxLevel
            } else {
                releaseCoeff * envelope + (1.0 - releaseCoeff) * maxLevel
            }
            envelope = targetEnvelope
            
            val gain = computeGain(envelope)
            
            for (ch in 0 until channelCount) {
                if (i + ch < samples.size) {
                    val sample = samples[i + ch].toDouble() / 32768.0
                    val processed = sample * gain
                    samples[i + ch] = (processed * 32768.0).coerceIn(-32768.0, 32767.0).toInt().toShort()
                }
            }
            
            i += channelCount
        }
    }

    fun reset() {
        envelope = 0.0
    }
}
