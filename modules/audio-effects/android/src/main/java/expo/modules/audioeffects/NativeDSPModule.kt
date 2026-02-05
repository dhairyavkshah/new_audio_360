package expo.modules.audioeffects

import android.util.Log

/**
 * Native DSP module that uses C++/NEON SIMD for optimized audio processing.
 * Falls back to Kotlin implementation on devices without NEON support.
 */
object NativeDSPModule {
    private const val TAG = "NativeDSPModule"
    
    private var nativeLoaded = false
    private var neonAvailable = false
    
    init {
        try {
            System.loadLibrary("audio_dsp")
            nativeLoaded = true
            neonAvailable = isNEONAvailable()
            Log.d(TAG, "Native DSP loaded, NEON: $neonAvailable")
        } catch (e: UnsatisfiedLinkError) {
            Log.w(TAG, "Native DSP not available, using Kotlin fallback: ${e.message}")
            nativeLoaded = false
            neonAvailable = false
        }
    }
    
    fun isNativeAvailable(): Boolean = nativeLoaded
    
    fun isNEONSupported(): Boolean = neonAvailable
    
    external fun isNEONAvailable(): Boolean
    
    external fun applyGainNative(samples: FloatArray, gain: Float)
    
    external fun biquadFilterNative(
        samples: FloatArray,
        channelCount: Int,
        b0: Float, b1: Float, b2: Float,
        a1: Float, a2: Float,
        stateL: FloatArray,
        stateR: FloatArray
    )
    
    external fun softClipNative(samples: FloatArray)
    
    external fun pcm16ToFloatNative(input: ShortArray, output: FloatArray)
    
    external fun floatToPcm16Native(input: FloatArray, output: ShortArray)
    
    fun applyGain(samples: FloatArray, gain: Float) {
        if (nativeLoaded) {
            applyGainNative(samples, gain)
        } else {
            for (i in samples.indices) {
                samples[i] *= gain
            }
        }
    }
    
    fun softClip(samples: FloatArray) {
        if (nativeLoaded) {
            softClipNative(samples)
        } else {
            for (i in samples.indices) {
                samples[i] = samples[i].coerceIn(-1f, 1f)
            }
        }
    }
    
    fun pcm16ToFloat(input: ShortArray, output: FloatArray) {
        if (nativeLoaded && input.size <= output.size) {
            pcm16ToFloatNative(input, output)
        } else {
            for (i in input.indices) {
                output[i] = input[i] / 32768f
            }
        }
    }
    
    fun floatToPcm16(input: FloatArray, output: ShortArray) {
        if (nativeLoaded && input.size <= output.size) {
            floatToPcm16Native(input, output)
        } else {
            for (i in input.indices) {
                val clamped = input[i].coerceIn(-1f, 1f)
                output[i] = (clamped * 32767f).toInt().toShort()
            }
        }
    }
}
