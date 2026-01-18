package expo.modules.audioeffects

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class BassBoostModule : Module() {
    private var audioSessionId: Int = 0
    private var isEnabled = false
    private var currentStrength: Int = 0
    
    override fun definition() = ModuleDefinition {
        Name("BassBoostModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            try {
                audioSessionId = sessionId
                android.util.Log.d("BassBoostModule", "Software DSP BassBoost attached to session: $sessionId")
                
                promise.resolve(mapOf(
                    "success" to true,
                    "strengthSupported" to true,
                    "minStrength" to 0,
                    "maxStrength" to 1000,
                    "isSoftwareDSP" to true
                ))
                
            } catch (e: Exception) {
                android.util.Log.e("BassBoostModule", "Attach failed: ${e.message}", e)
                promise.reject("ATTACH_ERROR", e.message, e)
            }
        }
        
        Function("setEnabled") { enabled: Boolean ->
            try {
                isEnabled = enabled
                if (!enabled) {
                    SoftwareDSPAudioProcessor.getInstance()?.setBassBoost(0f)
                } else {
                    val gainUnits = (currentStrength / 1000.0f) * 5.0f
                    SoftwareDSPAudioProcessor.getInstance()?.setBassBoost(gainUnits)
                }
                return@Function mapOf("success" to true, "enabled" to enabled, "isSoftwareDSP" to true)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setStrength") { strength: Int ->
            try {
                val clampedStrength = strength.coerceIn(0, 1000)
                currentStrength = clampedStrength
                
                val gainUnits = (clampedStrength / 1000.0f) * 5.0f
                SoftwareDSPAudioProcessor.getInstance()?.setBassBoost(gainUnits)
                
                android.util.Log.d("BassBoostModule", "Software DSP bass boost set: strength=$clampedStrength, gain=$gainUnits")
                
                return@Function mapOf("success" to true, "strength" to clampedStrength, "isSoftwareDSP" to true)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getStrength") {
            val dspInstance = SoftwareDSPAudioProcessor.getInstance()
            if (dspInstance != null) {
                val gainDb = dspInstance.getBassGain()
                val gainUnits = gainDb / SoftwareDSPAudioProcessor.DB_PER_UNIT
                return@Function ((gainUnits / 5.0f) * 1000).toInt().coerceIn(0, 1000)
            }
            return@Function currentStrength
        }
        
        Function("getProperties") {
            val dspInstance = SoftwareDSPAudioProcessor.getInstance()
            val strength = if (dspInstance != null) {
                val gainDb = dspInstance.getBassGain()
                val gainUnits = gainDb / SoftwareDSPAudioProcessor.DB_PER_UNIT
                ((gainUnits / 5.0f) * 1000).toInt().coerceIn(0, 1000)
            } else {
                currentStrength
            }
            
            return@Function mapOf(
                "enabled" to isEnabled,
                "strengthSupported" to true,
                "strength" to strength,
                "isSoftwareDSP" to true
            )
        }
        
        AsyncFunction("release") { promise: Promise ->
            try {
                SoftwareDSPAudioProcessor.getInstance()?.setBassBoost(0f)
                isEnabled = false
                currentStrength = 0
                audioSessionId = 0
                android.util.Log.d("BassBoostModule", "Software DSP BassBoost released")
                promise.resolve(mapOf("success" to true))
            } catch (e: Exception) {
                promise.reject("RELEASE_ERROR", e.message, e)
            }
        }
    }
}
