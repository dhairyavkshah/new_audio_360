package expo.modules.audioeffects

import android.media.audiofx.Virtualizer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class VirtualizerModule : Module() {
    private var virtualizer: Virtualizer? = null
    private var audioSessionId: Int = 0
    private var isEnabled = false
    
    override fun definition() = ModuleDefinition {
        Name("VirtualizerModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            try {
                release()
                
                audioSessionId = sessionId
                virtualizer = Virtualizer(0, sessionId).apply {
                    enabled = false
                }
                
                val strengthSupported = virtualizer?.strengthSupported ?: false
                
                promise.resolve(mapOf(
                    "success" to true,
                    "strengthSupported" to strengthSupported,
                    "minStrength" to 0,
                    "maxStrength" to 1000
                ))
                
            } catch (e: Exception) {
                promise.reject("ATTACH_ERROR", e.message, e)
            }
        }
        
        Function("setEnabled") { enabled: Boolean ->
            try {
                virtualizer?.enabled = enabled
                isEnabled = enabled
                return@Function mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setStrength") { strength: Int ->
            try {
                val clampedStrength = strength.coerceIn(0, 1000).toShort()
                virtualizer?.setStrength(clampedStrength)
                return@Function mapOf("success" to true, "strength" to clampedStrength.toInt())
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getStrength") {
            return@Function virtualizer?.roundedStrength?.toInt() ?: 0
        }
        
        Function("getProperties") {
            val virt = virtualizer ?: return@Function mapOf<String, Any>()
            return@Function mapOf(
                "enabled" to virt.enabled,
                "strengthSupported" to virt.strengthSupported,
                "strength" to virt.roundedStrength.toInt()
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
        virtualizer?.release()
        virtualizer = null
        isEnabled = false
        audioSessionId = 0
    }
}
