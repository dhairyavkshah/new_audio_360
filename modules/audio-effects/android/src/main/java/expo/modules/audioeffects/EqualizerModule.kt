package expo.modules.audioeffects

import android.media.audiofx.Equalizer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class EqualizerModule : Module() {
    private var equalizer: Equalizer? = null
    private var audioSessionId: Int = 0
    private var isEnabled = false
    
    override fun definition() = ModuleDefinition {
        Name("EqualizerModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            try {
                release()
                
                audioSessionId = sessionId
                android.util.Log.d("EqualizerModule", "Attaching to audio session: $sessionId")
                
                // Priority 1000 (high) helps effects work with session 0 (global audio output)
                equalizer = Equalizer(1000, sessionId).apply {
                    enabled = false
                }
                
                val eq = equalizer!!
                val bands = eq.numberOfBands.toInt()
                val bandInfo = mutableListOf<Map<String, Any>>()
                
                for (i in 0 until bands) {
                    val band = i.toShort()
                    bandInfo.add(mapOf(
                        "band" to i,
                        "centerFreq" to eq.getCenterFreq(band),
                        "minLevel" to eq.bandLevelRange[0].toInt(),
                        "maxLevel" to eq.bandLevelRange[1].toInt()
                    ))
                }
                
                val presetNames = mutableListOf<String>()
                for (i in 0 until eq.numberOfPresets) {
                    presetNames.add(eq.getPresetName(i.toShort()))
                }
                
                promise.resolve(mapOf(
                    "success" to true,
                    "numberOfBands" to bands,
                    "minLevel" to eq.bandLevelRange[0].toInt(),
                    "maxLevel" to eq.bandLevelRange[1].toInt(),
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
                val safeLevel = level.coerceIn(-1500, 150)
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
                
                for ((band, level) in levels.withIndex()) {
                    if (band < eq.numberOfBands) {
                        val safeLevel = level.coerceIn(-1500, 150)
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
                "minLevel" to eq.bandLevelRange[0].toInt(),
                "maxLevel" to eq.bandLevelRange[1].toInt()
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
        equalizer?.release()
        equalizer = null
        isEnabled = false
        audioSessionId = 0
    }
}
