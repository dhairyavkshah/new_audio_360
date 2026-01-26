package expo.modules.audioeffects

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max

/**
 * Brickwall limiter implementation using linked stereo envelope detection.
 * 
 * Audio Processing Standards:
 * - Internal processing: 64-bit double precision for envelope and gain calculations
 * - Uses linked stereo (max of L/R) to prevent stereo image shift (industry standard)
 * - Threshold: -0.1 dB (industry standard for streaming), Ratio: 20:1, Attack: 1ms, Release: 100ms
 */
class Limiter(
    private var thresholdDb: Float = -0.1f,
    private var ratio: Float = 20f,
    private var attackMs: Float = 1f,
    private var releaseMs: Float = 100f,
    private var sampleRate: Float = 48000f
) {
    // 64-bit double precision for envelope detection
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

    /**
     * Compute gain reduction based on envelope level.
     * Uses soft-knee compression above threshold.
     */
    private fun computeGain(inputLevel: Double): Double {
        if (inputLevel <= threshold) {
            return 1.0
        }
        
        val overDb = 20.0 * ln(inputLevel / threshold) / ln(10.0)
        val compressedDb = overDb / ratio
        val targetLevel = threshold * Math.pow(10.0, compressedDb / 20.0)
        
        return targetLevel / inputLevel
    }

    /**
     * Process a single sample (for mono or single-channel processing).
     * @param sample Input sample in normalized float range [-1.0, 1.0]
     * @return Processed sample
     */
    fun processSample(sample: Float): Float {
        if (!isEnabled) return sample
        
        val sampleD = sample.toDouble()
        val inputLevel = abs(sampleD)
        
        val targetEnvelope = if (inputLevel > envelope) {
            attackCoeff * envelope + (1.0 - attackCoeff) * inputLevel
        } else {
            releaseCoeff * envelope + (1.0 - releaseCoeff) * inputLevel
        }
        envelope = targetEnvelope
        
        val gain = computeGain(envelope)
        
        return (sampleD * gain).toFloat()
    }

    /**
     * Process buffer of 32-bit float samples (normalized [-1.0, 1.0]).
     * Uses linked stereo envelope detection (max of all channels per frame).
     * 
     * @param samples Interleaved float samples [L, R, L, R, ...]
     * @param channelCount Number of channels (1=mono, 2=stereo)
     */
    fun processBufferFloat(samples: FloatArray, channelCount: Int) {
        if (!isEnabled) return
        
        var i = 0
        while (i < samples.size) {
            // Linked stereo: find max level across all channels in this frame
            var maxLevel = 0.0
            for (ch in 0 until channelCount) {
                if (i + ch < samples.size) {
                    maxLevel = max(maxLevel, abs(samples[i + ch].toDouble()))
                }
            }
            
            // Update envelope with attack/release smoothing
            val targetEnvelope = if (maxLevel > envelope) {
                attackCoeff * envelope + (1.0 - attackCoeff) * maxLevel
            } else {
                releaseCoeff * envelope + (1.0 - releaseCoeff) * maxLevel
            }
            envelope = targetEnvelope
            
            // Compute and apply gain reduction
            val gain = computeGain(envelope).toFloat()
            
            for (ch in 0 until channelCount) {
                if (i + ch < samples.size) {
                    samples[i + ch] = samples[i + ch] * gain
                }
            }
            
            i += channelCount
        }
    }

    /**
     * Legacy method for ShortArray processing (PCM16).
     * @deprecated Use processBufferFloat for 32-bit float processing chain
     */
    @Deprecated("Use processBufferFloat for 32-bit float processing chain")
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
