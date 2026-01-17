package expo.modules.audioeffects

import android.media.audiofx.BassBoost
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class BassBoostModule : Module() {
    private var bassBoost: BassBoost? = null
    private var audioSessionId: Int = 0
    private var isEnabled = false
    
    companion object {
        // Conservative limit to prevent distortion
        // Full range is 0-1000, but high values cause muddiness
        const val MAX_SAFE_STRENGTH = 600
    }
    
    override fun definition() = ModuleDefinition {
        Name("BassBoostModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            try {
                release()
                
                audioSessionId = sessionId
                bassBoost = BassBoost(0, sessionId).apply {
                    enabled = false
                }
                
                val strengthSupported = bassBoost?.strengthSupported ?: false
                
                promise.resolve(mapOf(
                    "success" to true,
                    "strengthSupported" to strengthSupported,
                    "minStrength" to 0,
                    "maxStrength" to MAX_SAFE_STRENGTH
                ))
                
            } catch (e: Exception) {
                promise.reject("ATTACH_ERROR", e.message, e)
            }
        }
        
        Function("setEnabled") { enabled: Boolean ->
            try {
                bassBoost?.enabled = enabled
                isEnabled = enabled
                return@Function mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setStrength") { strength: Int ->
            try {
                val clampedStrength = strength.coerceIn(0, MAX_SAFE_STRENGTH).toShort()
                bassBoost?.setStrength(clampedStrength)
                return@Function mapOf("success" to true, "strength" to clampedStrength.toInt())
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getStrength") {
            return@Function bassBoost?.roundedStrength?.toInt() ?: 0
        }
        
        Function("getProperties") {
            val bb = bassBoost ?: return@Function mapOf<String, Any>()
            return@Function mapOf(
                "enabled" to bb.enabled,
                "strengthSupported" to bb.strengthSupported,
                "strength" to bb.roundedStrength.toInt()
            )
        }
        
        AsyncFunction("release") { promise: Promise ->
            try {
                release()
                promise.resolve(mapOf("success" to true))
            } catch (e: Exception) {
                promise.reject("RELEASE_ERROR", e.message, e)
            }
        }
    }
    
    private fun release() {
        bassBoost?.enabled = false
        bassBoost?.release()
        bassBoost = null
        isEnabled = false
        audioSessionId = 0
    }
}
