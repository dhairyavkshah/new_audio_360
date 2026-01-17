package expo.modules.audioeffects

import android.media.audiofx.Equalizer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class EqualizerModule : Module() {
    private var equalizer: Equalizer? = null
    private var audioSessionId: Int = 0
    private var isEnabled = false
    
    companion object {
        // Use conservative limits to prevent distortion
        // Android typically allows -1500 to +1500 mB, but we limit boost
        const val MIN_LEVEL_MB = -1500  // -15 dB cut (safe)
        const val MAX_LEVEL_MB = 600    // +6 dB boost (conservative to prevent clipping)
    }
    
    override fun definition() = ModuleDefinition {
        Name("EqualizerModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            try {
                release()
                
                audioSessionId = sessionId
                equalizer = Equalizer(0, sessionId).apply {
                    enabled = false
                }
                
                val eq = equalizer!!
                val bands = eq.numberOfBands.toInt()
                val bandInfo = mutableListOf<Map<String, Any>>()
                
                // Get the actual device limits
                val deviceMinLevel = eq.bandLevelRange[0].toInt()
                val deviceMaxLevel = eq.bandLevelRange[1].toInt()
                
                for (i in 0 until bands) {
                    val band = i.toShort()
                    bandInfo.add(mapOf(
                        "band" to i,
                        "centerFreq" to eq.getCenterFreq(band),
                        "minLevel" to maxOf(deviceMinLevel, MIN_LEVEL_MB),
                        "maxLevel" to minOf(deviceMaxLevel, MAX_LEVEL_MB)
                    ))
                }
                
                val presetNames = mutableListOf<String>()
                for (i in 0 until eq.numberOfPresets) {
                    presetNames.add(eq.getPresetName(i.toShort()))
                }
                
                promise.resolve(mapOf(
                    "success" to true,
                    "numberOfBands" to bands,
                    "minLevel" to maxOf(deviceMinLevel, MIN_LEVEL_MB),
                    "maxLevel" to minOf(deviceMaxLevel, MAX_LEVEL_MB),
                    "bands" to bandInfo,
                    "presets" to presetNames
                ))
                
            } catch (e: Exception) {
                promise.reject("ATTACH_ERROR", e.message, e)
            }
        }
        
        Function("setEnabled") { enabled: Boolean ->
            try {
                equalizer?.enabled = enabled
                isEnabled = enabled
                return@Function mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setBandLevel") { band: Int, level: Int ->
            try {
                // Clamp to safe range
                val safeLevel = level.coerceIn(MIN_LEVEL_MB, MAX_LEVEL_MB)
                equalizer?.setBandLevel(band.toShort(), safeLevel.toShort())
                return@Function mapOf("success" to true, "band" to band, "level" to safeLevel)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getBandLevel") { band: Int ->
            return@Function equalizer?.getBandLevel(band.toShort())?.toInt() ?: 0
        }
        
        Function("usePreset") { preset: Int ->
            try {
                equalizer?.usePreset(preset.toShort())
                return@Function mapOf("success" to true, "preset" to preset)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getCurrentPreset") {
            return@Function equalizer?.currentPreset?.toInt() ?: -1
        }
        
        Function("setCustomBands") { levels: List<Int> ->
            try {
                val eq = equalizer ?: return@Function mapOf("success" to false, "error" to "Not attached")
                
                // Apply zero-sum balancing to prevent overall volume change
                val sum = levels.sum()
                val offset = if (levels.isNotEmpty()) sum / levels.size else 0
                
                for ((band, level) in levels.withIndex()) {
                    if (band < eq.numberOfBands) {
                        // Apply offset for zero-sum and clamp to safe range
                        val balancedLevel = level - offset
                        val safeLevel = balancedLevel.coerceIn(MIN_LEVEL_MB, MAX_LEVEL_MB)
                        eq.setBandLevel(band.toShort(), safeLevel.toShort())
                    }
                }
                
                return@Function mapOf("success" to true)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getAllBandLevels") {
            val eq = equalizer ?: return@Function emptyList<Int>()
            val levels = mutableListOf<Int>()
            for (i in 0 until eq.numberOfBands) {
                levels.add(eq.getBandLevel(i.toShort()).toInt())
            }
            return@Function levels
        }
        
        Function("getProperties") {
            val eq = equalizer ?: return@Function mapOf<String, Any>()
            return@Function mapOf(
                "enabled" to eq.enabled,
                "numberOfBands" to eq.numberOfBands.toInt(),
                "currentPreset" to eq.currentPreset.toInt(),
                "minLevel" to maxOf(eq.bandLevelRange[0].toInt(), MIN_LEVEL_MB),
                "maxLevel" to minOf(eq.bandLevelRange[1].toInt(), MAX_LEVEL_MB)
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
        equalizer?.enabled = false
        equalizer?.release()
        equalizer = null
        isEnabled = false
        audioSessionId = 0
    }
}
