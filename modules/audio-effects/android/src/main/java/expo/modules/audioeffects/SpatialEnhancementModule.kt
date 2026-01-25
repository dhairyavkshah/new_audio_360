package expo.modules.audioeffects

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SpatialEnhancementModule : Module() {
    private var level = 0
    
    override fun definition() = ModuleDefinition {
        Name("SpatialEnhancementModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        Function("setLevel") { newLevel: Int ->
            try {
                level = newLevel.coerceIn(0, 5)
                SoftwareDSPAudioProcessor.getInstance().setSpatialEnhancementLevel(level)
                android.util.Log.d("SpatialEnhancementModule", "Spatial Enhancement level=$level")
                return@Function mapOf("success" to true, "level" to level)
            } catch (e: Exception) {
                android.util.Log.e("SpatialEnhancementModule", "setLevel failed: ${e.message}", e)
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getLevel") {
            try {
                return@Function SoftwareDSPAudioProcessor.getInstance().getSpatialEnhancementLevel()
            } catch (e: Exception) {
                return@Function 0
            }
        }
        
        Function("setEnabled") { enabled: Boolean ->
            try {
                level = if (enabled) 1 else 0
                SoftwareDSPAudioProcessor.getInstance().setSpatialEnhancementLevel(level)
                android.util.Log.d("SpatialEnhancementModule", "Spatial Enhancement enabled=$enabled (level=$level)")
                return@Function mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                android.util.Log.e("SpatialEnhancementModule", "setEnabled failed: ${e.message}", e)
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getEnabled") {
            try {
                return@Function SoftwareDSPAudioProcessor.getInstance().getSpatialEnhancementLevel() > 0
            } catch (e: Exception) {
                return@Function false
            }
        }
        
        Function("getProperties") {
            return@Function mapOf(
                "enabled" to (level > 0),
                "level" to level,
                "isSoftwareDSP" to true
            )
        }
    }
}
