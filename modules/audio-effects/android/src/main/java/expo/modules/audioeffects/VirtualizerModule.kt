package expo.modules.audioeffects

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class VirtualizerModule : Module() {
    private var audioSessionId: Int = 0
    private var isEnabled = false
    private var currentStrength: Int = 0
    
    override fun definition() = ModuleDefinition {
        Name("VirtualizerModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            try {
                audioSessionId = sessionId
                android.util.Log.d("VirtualizerModule", "Software DSP Virtualizer attached to session: $sessionId")
                
                promise.resolve(mapOf(
                    "success" to true,
                    "strengthSupported" to true,
                    "minStrength" to -1000,
                    "maxStrength" to 1000,
                    "isSoftwareDSP" to true
                ))
                
            } catch (e: Exception) {
                android.util.Log.e("VirtualizerModule", "Attach failed: ${e.message}", e)
                promise.reject("ATTACH_ERROR", e.message, e)
            }
        }
        
        Function("setEnabled") { enabled: Boolean ->
            try {
                isEnabled = enabled
                if (!enabled) {
                    // Reset stereo width to original when disabled
                    SoftwareDSPAudioProcessor.getInstance().setStereoWidth(0f)
                } else if (currentStrength != 0) {
                    // Re-apply current strength when enabled
                    val width = currentStrength / 1000f
                    SoftwareDSPAudioProcessor.getInstance().setStereoWidth(width)
                }
                android.util.Log.d("VirtualizerModule", "Software DSP Virtualizer enabled=$enabled")
                return@Function mapOf("success" to true, "enabled" to enabled, "isSoftwareDSP" to true)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setStrength") { strength: Int ->
            try {
                // Support signed values: -1000 to +1000
                // Negative = narrow toward mono, Positive = widen stereo
                val clampedStrength = strength.coerceIn(-1000, 1000)
                currentStrength = clampedStrength
                
                // Convert to stereo width: -1000 → -1.0, 0 → 0.0, +1000 → +1.0
                val width = clampedStrength / 1000f
                SoftwareDSPAudioProcessor.getInstance().setStereoWidth(width)
                
                val widthPercent = ((1f + width) * 100).toInt()
                android.util.Log.d("VirtualizerModule", "Software DSP Virtualizer strength=$clampedStrength (width=${widthPercent}%)")
                return@Function mapOf("success" to true, "strength" to clampedStrength, "isSoftwareDSP" to true)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getStrength") {
            return@Function currentStrength
        }
        
        Function("getProperties") {
            return@Function mapOf(
                "enabled" to isEnabled,
                "strengthSupported" to true,
                "strength" to currentStrength,
                "isSoftwareDSP" to true
            )
        }
        
        AsyncFunction("release") { promise: Promise ->
            try {
                SoftwareDSPAudioProcessor.getInstance().setStereoWidth(0f)
                isEnabled = false
                currentStrength = 0
                audioSessionId = 0
                android.util.Log.d("VirtualizerModule", "Software DSP Virtualizer released")
                promise.resolve(mapOf("success" to true))
            } catch (e: Exception) {
                promise.reject("RELEASE_ERROR", e.message, e)
            }
        }
    }
}
