package expo.modules.audioeffects

import android.media.audiofx.BassBoost
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class BassBoostModule : Module() {
    private var bassBoost: BassBoost? = null
    private var audioSessionId: Int = 0
    private var isEnabled = false
    
    override fun definition() = ModuleDefinition {
        Name("BassBoostModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            try {
                release()
                
                audioSessionId = sessionId
                android.util.Log.d("BassBoostModule", "Attaching to audio session: $sessionId")
                
                // Priority 1000 (high) helps effects work with session 0 (global audio output)
                bassBoost = BassBoost(1000, sessionId).apply {
                    enabled = false
                }
                
                val strengthSupported = bassBoost?.strengthSupported ?: false
                android.util.Log.d("BassBoostModule", "BassBoost attached successfully, strengthSupported: $strengthSupported")
                
                promise.resolve(mapOf(
                    "success" to true,
                    "strengthSupported" to strengthSupported,
                    "minStrength" to 0,
                    "maxStrength" to 1000
                ))
                
            } catch (e: Exception) {
                android.util.Log.e("BassBoostModule", "Attach failed: ${e.message}", e)
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
                val clampedStrength = strength.coerceIn(0, 1000).toShort()
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
        bassBoost?.release()
        bassBoost = null
        isEnabled = false
        audioSessionId = 0
    }
}
