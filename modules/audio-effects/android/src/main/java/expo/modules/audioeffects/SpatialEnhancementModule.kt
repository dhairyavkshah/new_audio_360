package expo.modules.audioeffects

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Spatial Enhancement Module for 6-Level Slider System
 * 
 * Level 0: Off - No processing (0.0x multiplier)
 * Level 1: Subtle - 3% sideGain, 0.10ms ITD, 3% decorr, 10% wet (0.5x multiplier)
 * Level 2: Mild - 6% sideGain, 0.15ms ITD, 5% decorr, 20% wet (1.0x multiplier)
 * Level 3: Moderate - 10% sideGain, 0.25ms ITD, 8% decorr, 30% wet (1.25x multiplier)
 * Level 4: Enhanced - 14% sideGain, 0.40ms ITD, 12% decorr, 40% wet (1.4x multiplier)
 * Level 5: Maximum - 18% sideGain, 0.60ms ITD, 18% decorr, 55% wet (1.5x multiplier)
 */
class SpatialEnhancementModule : Module() {
    private var level = 0
    
    private val levelNames = arrayOf("Off", "Subtle", "Mild", "Moderate", "Enhanced", "Maximum")
    private val multipliers = floatArrayOf(0.0f, 0.5f, 1.0f, 1.25f, 1.4f, 1.5f)
    
    override fun definition() = ModuleDefinition {
        Name("SpatialEnhancementModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        Function("setLevel") { newLevel: Int ->
            try {
                level = newLevel.coerceIn(0, 5)
                SoftwareDSPAudioProcessor.getInstance().setSpatialEnhancementLevel(level)
                val levelName = levelNames[level]
                val multiplier = multipliers[level]
                android.util.Log.d("SpatialEnhancementModule", "Spatial Enhancement: $levelName (${multiplier}x)")
                return@Function mapOf(
                    "success" to true, 
                    "level" to level, 
                    "levelName" to levelName,
                    "multiplier" to multiplier
                )
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
        
        Function("getLevelInfo") {
            try {
                val currentLevel = SoftwareDSPAudioProcessor.getInstance().getSpatialEnhancementLevel()
                return@Function mapOf(
                    "level" to currentLevel,
                    "levelName" to levelNames[currentLevel.coerceIn(0, 5)],
                    "multiplier" to multipliers[currentLevel.coerceIn(0, 5)]
                )
            } catch (e: Exception) {
                return@Function mapOf("level" to 0, "levelName" to "Off", "multiplier" to 0.0f)
            }
        }
        
        Function("setEnabled") { enabled: Boolean ->
            try {
                level = if (enabled) 2 else 0  // Default to "Mild" when enabled
                SoftwareDSPAudioProcessor.getInstance().setSpatialEnhancementLevel(level)
                val levelName = levelNames[level]
                android.util.Log.d("SpatialEnhancementModule", "Spatial Enhancement enabled=$enabled ($levelName)")
                return@Function mapOf("success" to true, "enabled" to enabled, "level" to level)
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
        
        Function("getMultiplier") {
            try {
                return@Function SoftwareDSPAudioProcessor.getInstance().getSliderMultiplier()
            } catch (e: Exception) {
                return@Function 0.0f
            }
        }
        
        Function("getProperties") {
            val currentLevel = level.coerceIn(0, 5)
            return@Function mapOf(
                "enabled" to (currentLevel > 0),
                "level" to currentLevel,
                "levelName" to levelNames[currentLevel],
                "multiplier" to multipliers[currentLevel],
                "isSoftwareDSP" to true
            )
        }
    }
}
