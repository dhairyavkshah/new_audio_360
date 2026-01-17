package expo.modules.audioeffects

import android.media.audiofx.EnvironmentalReverb
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ReverbModule : Module() {
    private var environmentalReverb: EnvironmentalReverb? = null
    private var currentPreset: String = "none"
    private var audioSessionId: Int = 0

    companion object {
        private const val TAG = "ReverbModule"

        data class ReverbParams(
            val decayTime: Int,
            val roomLevel: Short,
            val roomHFLevel: Short,
            val reflectionsLevel: Short,
            val reflectionsDelay: Int,
            val reverbLevel: Short,
            val reverbDelay: Int,
            val diffusion: Short,
            val density: Short
        )

        val REVERB_PRESETS = mapOf(
            "none" to null,
            "small_studio" to ReverbParams(
                decayTime = 600,
                roomLevel = -800,
                roomHFLevel = -400,
                reflectionsLevel = -1200,
                reflectionsDelay = 5,
                reverbLevel = -600,
                reverbDelay = 10,
                diffusion = 800,
                density = 900
            ),
            "medium_studio" to ReverbParams(
                decayTime = 1000,
                roomLevel = -600,
                roomHFLevel = -300,
                reflectionsLevel = -900,
                reflectionsDelay = 10,
                reverbLevel = -400,
                reverbDelay = 20,
                diffusion = 850,
                density = 850
            ),
            "large_studio" to ReverbParams(
                decayTime = 1800,
                roomLevel = -400,
                roomHFLevel = -200,
                reflectionsLevel = -600,
                reflectionsDelay = 20,
                reverbLevel = -200,
                reverbDelay = 40,
                diffusion = 900,
                density = 800
            ),
            "open_theatre" to ReverbParams(
                decayTime = 2300,
                roomLevel = -200,
                roomHFLevel = -150,
                reflectionsLevel = -400,
                reflectionsDelay = 30,
                reverbLevel = -100,
                reverbDelay = 60,
                diffusion = 950,
                density = 750
            ),
            "auditorium" to ReverbParams(
                decayTime = 2800,
                roomLevel = -150,
                roomHFLevel = -100,
                reflectionsLevel = -300,
                reflectionsDelay = 40,
                reverbLevel = 0,
                reverbDelay = 80,
                diffusion = 1000,
                density = 700
            )
        )
    }

    override fun definition() = ModuleDefinition {
        Name("ReverbModule")

        Function("initialize") { sessionId: Int ->
            try {
                audioSessionId = sessionId
                release()
                
                environmentalReverb = EnvironmentalReverb(0, sessionId)
                environmentalReverb?.enabled = false
                
                Log.d(TAG, "Reverb initialized with session ID: $sessionId")
                mapOf("success" to true, "sessionId" to sessionId)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize reverb: ${e.message}")
                mapOf("success" to false, "error" to (e.message ?: "Unknown error"))
            }
        }

        Function("setPreset") { presetName: String ->
            try {
                currentPreset = presetName.lowercase()
                val params = REVERB_PRESETS[currentPreset]
                
                if (params == null) {
                    environmentalReverb?.enabled = false
                    Log.d(TAG, "Reverb disabled (preset: none)")
                    return@Function mapOf("success" to true, "preset" to "none", "enabled" to false)
                }
                
                environmentalReverb?.apply {
                    decayTime = params.decayTime
                    roomLevel = params.roomLevel
                    roomHFLevel = params.roomHFLevel
                    reflectionsLevel = params.reflectionsLevel
                    reflectionsDelay = params.reflectionsDelay
                    reverbLevel = params.reverbLevel
                    reverbDelay = params.reverbDelay
                    diffusion = params.diffusion
                    density = params.density
                    enabled = true
                }
                
                Log.d(TAG, "Reverb preset set: $currentPreset")
                mapOf(
                    "success" to true, 
                    "preset" to currentPreset,
                    "enabled" to true,
                    "params" to mapOf(
                        "decayTime" to params.decayTime,
                        "roomLevel" to params.roomLevel.toInt(),
                        "diffusion" to params.diffusion.toInt(),
                        "density" to params.density.toInt()
                    )
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to set reverb preset: ${e.message}")
                mapOf("success" to false, "error" to (e.message ?: "Unknown error"))
            }
        }

        Function("setWetDryMix") { wetPercent: Int ->
            try {
                val clampedWet = wetPercent.coerceIn(0, 100)
                val wetLevel = (-1000 + (clampedWet * 10)).toShort()
                
                environmentalReverb?.reverbLevel = wetLevel
                
                Log.d(TAG, "Wet/dry mix set: $clampedWet%")
                mapOf("success" to true, "wetPercent" to clampedWet)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to set wet/dry mix: ${e.message}")
                mapOf("success" to false, "error" to (e.message ?: "Unknown error"))
            }
        }

        Function("enable") { enabled: Boolean ->
            try {
                environmentalReverb?.enabled = enabled
                Log.d(TAG, "Reverb enabled: $enabled")
                mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to toggle reverb: ${e.message}")
                mapOf("success" to false, "error" to (e.message ?: "Unknown error"))
            }
        }

        Function("getCurrentPreset") {
            mapOf(
                "preset" to currentPreset,
                "enabled" to (environmentalReverb?.enabled ?: false)
            )
        }

        Function("getAvailablePresets") {
            REVERB_PRESETS.keys.toList()
        }

        Function("release") {
            release()
            mapOf("success" to true)
        }

        OnDestroy {
            release()
        }
    }

    private fun release() {
        try {
            environmentalReverb?.release()
            environmentalReverb = null
            Log.d(TAG, "Reverb resources released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing reverb: ${e.message}")
        }
    }
}
