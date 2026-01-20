package expo.modules.audioeffects

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class EqualizerModule : Module() {
    private var audioSessionId: Int = 0
    private var isEnabled = false
    private var isAttached = false
    
    private fun getDspProcessor(): SoftwareDSPAudioProcessor? {
        return try {
            SoftwareDSPAudioProcessor.getInstance()
        } catch (e: Exception) {
            null
        }
    }
    
    override fun definition() = ModuleDefinition {
        Name("EqualizerModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            try {
                audioSessionId = sessionId
                android.util.Log.d("EqualizerModule", "Attaching software DSP to audio session: $sessionId")
                
                val dsp = getDspProcessor()
                if (dsp == null) {
                    promise.reject("ATTACH_ERROR", "Software DSP not initialized", null)
                    return@AsyncFunction
                }
                
                isAttached = true
                
                val frequencies = dsp.getEqFrequencies()
                val bandNames = dsp.getEqBandNames()
                val bandInfo = mutableListOf<Map<String, Any>>()
                
                for (i in frequencies.indices) {
                    bandInfo.add(mapOf(
                        "band" to i,
                        "centerFreq" to (frequencies[i] * 1000).toInt(),
                        "name" to bandNames[i],
                        "minLevel" to -1200,
                        "maxLevel" to 1200
                    ))
                }
                
                promise.resolve(mapOf(
                    "success" to true,
                    "numberOfBands" to 10,
                    "minLevel" to -1200,
                    "maxLevel" to 1200,
                    "bands" to bandInfo,
                    "presets" to listOf("Flat", "Rock", "Pop", "Jazz", "Classical", "Electronic", "Hip-Hop", "Acoustic", "Bass+", "Clarity"),
                    "isSoftwareDSP" to true
                ))
                
            } catch (e: Exception) {
                promise.reject("ATTACH_ERROR", e.message, e)
            }
        }
        
        Function("setEnabled") { enabled: Boolean ->
            try {
                val dsp = getDspProcessor()
                dsp?.setEnabled(enabled)
                isEnabled = enabled
                return@Function mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setBandLevel") { band: Int, level: Int ->
            try {
                val dsp = getDspProcessor()
                if (dsp == null) {
                    return@Function mapOf("success" to false, "error" to "DSP not initialized")
                }
                
                val gainUnits = level.toFloat() / 100f
                dsp.setEqBandGain(band, gainUnits)
                return@Function mapOf("success" to true, "band" to band, "level" to level)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getBandLevel") { band: Int ->
            val dsp = getDspProcessor()
            val gains = dsp?.getEqBandGains() ?: return@Function 0
            if (band in gains.indices) {
                return@Function (gains[band] / SoftwareDSPAudioProcessor.DB_PER_UNIT * 100).toInt()
            }
            return@Function 0
        }
        
        Function("usePreset") { preset: Int ->
            try {
                val dsp = getDspProcessor()
                if (dsp == null) {
                    return@Function mapOf("success" to false, "error" to "DSP not initialized")
                }
                
                // Zero-sum EQ presets for maximum headroom
                val presetGains = when (preset) {
                    0 -> listOf(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)  // Flat (Reference)
                    1 -> listOf(0.4, 0.4, -0.3, -1.1, -1.1, -0.1, 0.9, 1.6, 0.7, -0.7)  // Rock (Balanced Punch)
                    2 -> listOf(0.3, 0.3, -0.4, -0.5, -0.4, 0.7, 0.8, 0.7, -0.4, -0.7)  // Pop (Clean Vocals)
                    3 -> listOf(-0.3, -0.3, -1.1, 1.0, 1.0, 0.3, -0.7, -0.3, -0.3, -0.9)  // Jazz (Warm & Natural)
                    4 -> listOf(-0.8, -0.8, -0.4, -0.4, -0.2, 0.2, 0.5, 1.0, 0.9, 0.4)  // Classical (Wide & Open)
                    5 -> listOf(1.3, 1.3, 0.5, -1.4, -1.4, -0.5, 0.5, 1.3, 0.5, -1.2)  // Electronic (Controlled Energy)
                    6 -> listOf(2.4, 2.4, 0.7, -1.2, -0.6, 0.0, 0.4, -0.6, -1.4, -2.0)  // Hip-Hop (Deep Bass, Clear Mids)
                    7 -> listOf(-0.6, -0.6, -1.2, 0.7, 1.5, 1.5, 0.7, -0.3, -0.3, -1.3)  // Acoustic (Natural & Intimate)
                    8 -> listOf(3.5, 2.5, 1.5, -0.6, -1.2, -1.2, -1.2, -1.2, -0.5, -1.4)  // Bass+ (Party Mode)
                    9 -> listOf(-1.9, -1.9, -0.9, -0.8, 0.3, 0.6, 1.3, 1.3, 1.9, 0.1)  // Clarity (Treble+)
                    else -> listOf(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
                }
                
                dsp.setAllEqBandGains(presetGains)
                dsp.setReverb(0f)
                dsp.setStereoWidth(0f)
                
                return@Function mapOf("success" to true, "preset" to preset)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getCurrentPreset") {
            return@Function -1
        }
        
        Function("setCustomBands") { levels: List<Int> ->
            try {
                val dsp = getDspProcessor()
                if (dsp == null) {
                    return@Function mapOf("success" to false, "error" to "DSP not initialized")
                }
                
                val gains = levels.map { it.toDouble() / 100.0 }
                dsp.setAllEqBandGains(gains)
                dsp.setReverb(0f)
                dsp.setStereoWidth(0f)
                
                return@Function mapOf("success" to true)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getAllBandLevels") {
            val dsp = getDspProcessor() ?: return@Function emptyList<Int>()
            val gains = dsp.getEqBandGains()
            return@Function gains.map { (it / SoftwareDSPAudioProcessor.DB_PER_UNIT * 100).toInt() }
        }
        
        Function("getProperties") {
            val dsp = getDspProcessor()
            return@Function mapOf(
                "enabled" to (dsp?.getIsEnabled() ?: false),
                "numberOfBands" to 10,
                "currentPreset" to -1,
                "minLevel" to -1200,
                "maxLevel" to 1200,
                "isSoftwareDSP" to true
            )
        }
        
        Function("setEqBands") { bands: List<Double> ->
            try {
                val dsp = getDspProcessor()
                if (dsp == null) {
                    return@Function mapOf("success" to false, "error" to "DSP not initialized")
                }
                
                dsp.setAllEqBandGains(bands)
                dsp.setReverb(0f)
                dsp.setStereoWidth(0f)
                
                return@Function mapOf("success" to true)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setLfeEnabled") { enabled: Boolean ->
            try {
                val dsp = getDspProcessor()
                if (dsp == null) {
                    return@Function mapOf("success" to false, "error" to "DSP not initialized")
                }
                dsp.setLfeEnabled(enabled)
                return@Function mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setLfeCrossoverFrequency") { freq: Double ->
            try {
                val dsp = getDspProcessor()
                if (dsp == null) {
                    return@Function mapOf("success" to false, "error" to "DSP not initialized")
                }
                dsp.setLfeCrossoverFrequency(freq.toFloat())
                return@Function mapOf("success" to true, "frequency" to freq)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setLfeHeadroom") { headroom: Double ->
            try {
                val dsp = getDspProcessor()
                if (dsp == null) {
                    return@Function mapOf("success" to false, "error" to "DSP not initialized")
                }
                dsp.setLfeHeadroom(headroom.toFloat())
                return@Function mapOf("success" to true, "headroom" to headroom)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("setLfeGain") { gain: Double ->
            try {
                val dsp = getDspProcessor()
                if (dsp == null) {
                    return@Function mapOf("success" to false, "error" to "DSP not initialized")
                }
                dsp.setLfeGain(gain.toFloat())
                return@Function mapOf("success" to true, "gain" to gain)
            } catch (e: Exception) {
                return@Function mapOf("success" to false, "error" to e.message)
            }
        }
        
        Function("getLfeSettings") {
            val dsp = getDspProcessor()
            if (dsp == null) {
                return@Function mapOf(
                    "enabled" to false,
                    "crossover" to 80.0,
                    "headroom" to 6.0,
                    "gain" to 0.0
                )
            }
            return@Function mapOf(
                "enabled" to dsp.getLfeEnabled(),
                "crossover" to dsp.getLfeCrossoverFrequency().toDouble(),
                "headroom" to dsp.getLfeHeadroom().toDouble(),
                "gain" to dsp.getLfeGain().toDouble()
            )
        }
        
        AsyncFunction("release") { promise: Promise ->
            try {
                val dsp = getDspProcessor()
                dsp?.resetAll()
                isAttached = false
                isEnabled = false
                audioSessionId = 0
                promise.resolve(mapOf("success" to true))
            } catch (e: Exception) {
                promise.reject("RELEASE_ERROR", e.message, e)
            }
        }
    }
}
