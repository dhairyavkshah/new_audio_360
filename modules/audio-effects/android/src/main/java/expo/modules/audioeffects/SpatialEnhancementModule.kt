package expo.modules.audioeffects

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SpatialEnhancementModule : Module() {
    private var isEnabled = false
    
    override fun definition() = ModuleDefinition {
        Name("SpatialEnhancementModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        Function("setEnabled") { enabled: Boolean ->
            try {
                isEnabled = enabled
                SoftwareDSPAudioProcessor.getInstance().setSpatialEnhancement(enabled)
                android.util.Log.d("SpatialEnhancementModule", "Spatial Enhancement enabled=$enabled")
                return@Function mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                android.util.Log.e("SpatialEnhancementModule", "setEnabled failed: ${e.message}", e)
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getEnabled") {
            try {
                return@Function SoftwareDSPAudioProcessor.getInstance().getSpatialEnhancement()
            } catch (e: Exception) {
                return@Function false
            }
        }
        
        Function("getProperties") {
            return@Function mapOf(
                "enabled" to isEnabled,
                "isSoftwareDSP" to true
            )
        }
    }
}
