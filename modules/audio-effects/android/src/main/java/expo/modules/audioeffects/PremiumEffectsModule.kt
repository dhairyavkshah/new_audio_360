package expo.modules.audioeffects

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PremiumEffectsModule : Module() {
    
    private fun getDspProcessor(): SoftwareDSPAudioProcessor? {
        return try {
            SoftwareDSPAudioProcessor.getInstance()
        } catch (e: Exception) {
            null
        }
    }
    
    override fun definition() = ModuleDefinition {
        Name("PremiumEffectsModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        Function("setPBEEnabled") { enabled: Boolean ->
            try {
                val dsp = getDspProcessor()
                dsp?.setPBEEnabled(enabled)
                android.util.Log.d("PremiumEffects", "PBE enabled: $enabled")
                return@Function mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                android.util.Log.e("PremiumEffects", "Failed to set PBE enabled: ${e.message}")
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setPBEIntensity") { intensity: Double ->
            try {
                val dsp = getDspProcessor()
                dsp?.setPBEIntensity(intensity.toFloat())
                android.util.Log.d("PremiumEffects", "PBE intensity: $intensity")
                return@Function mapOf("success" to true, "intensity" to intensity)
            } catch (e: Exception) {
                android.util.Log.e("PremiumEffects", "Failed to set PBE intensity: ${e.message}")
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setSBREnabled") { enabled: Boolean ->
            try {
                val dsp = getDspProcessor()
                dsp?.setSBREnabled(enabled)
                android.util.Log.d("PremiumEffects", "SBR enabled: $enabled")
                return@Function mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                android.util.Log.e("PremiumEffects", "Failed to set SBR enabled: ${e.message}")
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setSBRIntensity") { intensity: Double ->
            try {
                val dsp = getDspProcessor()
                dsp?.setSBRIntensity(intensity.toFloat())
                android.util.Log.d("PremiumEffects", "SBR intensity: $intensity")
                return@Function mapOf("success" to true, "intensity" to intensity)
            } catch (e: Exception) {
                android.util.Log.e("PremiumEffects", "Failed to set SBR intensity: ${e.message}")
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setDynamicEQEnabled") { enabled: Boolean ->
            try {
                val dsp = getDspProcessor()
                dsp?.setDynamicEQEnabled(enabled)
                android.util.Log.d("PremiumEffects", "Dynamic EQ enabled: $enabled")
                return@Function mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                android.util.Log.e("PremiumEffects", "Failed to set Dynamic EQ enabled: ${e.message}")
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setDynamicEQStrength") { strength: Double ->
            try {
                val dsp = getDspProcessor()
                dsp?.setDynamicEQStrength(strength.toFloat())
                android.util.Log.d("PremiumEffects", "Dynamic EQ strength: $strength")
                return@Function mapOf("success" to true, "strength" to strength)
            } catch (e: Exception) {
                android.util.Log.e("PremiumEffects", "Failed to set Dynamic EQ strength: ${e.message}")
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getPremiumEffectsStatus") {
            try {
                val dsp = getDspProcessor()
                val info = dsp?.getProcessingInfo() ?: emptyMap<String, Any>()
                return@Function mapOf(
                    "success" to true,
                    "pbeEnabled" to (info["pbeEnabled"] ?: false),
                    "pbeIntensity" to (info["pbeIntensity"] ?: 0.5),
                    "sbrEnabled" to (info["sbrEnabled"] ?: false),
                    "sbrIntensity" to (info["sbrIntensity"] ?: 0.5),
                    "dynamicEQEnabled" to (info["dynamicEQEnabled"] ?: false),
                    "dynamicEQStrength" to (info["dynamicEQStrength"] ?: 0.5)
                )
            } catch (e: Exception) {
                return@Function mapOf(
                    "success" to false,
                    "error" to e.message
                )
            }
        }
    }
}
