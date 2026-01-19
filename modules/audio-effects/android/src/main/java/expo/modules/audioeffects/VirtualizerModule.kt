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
                android.util.Log.d("VirtualizerModule", "Software DSP Virtualizer enabled=$enabled (stub - no effect yet)")
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
                
                // Calculate stereo width multiplier for logging
                // -1000 = 0% (mono), 0 = 100% (original), +1000 = 200% (max wide)
                val widthPercent = when {
                    clampedStrength < 0 -> 100 + (clampedStrength / 10) // -1000 -> 0%, 0 -> 100%
                    else -> 100 + (clampedStrength / 10) // 0 -> 100%, +1000 -> 200%
                }
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
