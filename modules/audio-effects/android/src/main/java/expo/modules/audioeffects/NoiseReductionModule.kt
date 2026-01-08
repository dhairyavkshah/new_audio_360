package expo.modules.audioeffects

import android.media.audiofx.NoiseSuppressor
import android.media.audiofx.AutomaticGainControl
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NoiseReductionModule : Module() {
    private var noiseSuppressor: NoiseSuppressor? = null
    private var automaticGainControl: AutomaticGainControl? = null
    private var currentLevel: String = "off"
    private var audioSessionId: Int = 0

    companion object {
        private const val TAG = "NoiseReductionModule"
        
        val NOISE_LEVELS = listOf("off", "light", "medium", "strong")
    }

    override fun definition() = ModuleDefinition {
        Name("NoiseReductionModule")

        Function("isAvailable") {
            val nsAvailable = NoiseSuppressor.isAvailable()
            val agcAvailable = AutomaticGainControl.isAvailable()
            mapOf(
                "noiseSuppressor" to nsAvailable,
                "automaticGainControl" to agcAvailable
            )
        }

        Function("initialize") { sessionId: Int ->
            try {
                audioSessionId = sessionId
                release()
                
                if (NoiseSuppressor.isAvailable()) {
                    noiseSuppressor = NoiseSuppressor.create(sessionId)
                    noiseSuppressor?.enabled = false
                    Log.d(TAG, "NoiseSuppressor initialized")
                }
                
                if (AutomaticGainControl.isAvailable()) {
                    automaticGainControl = AutomaticGainControl.create(sessionId)
                    automaticGainControl?.enabled = false
                    Log.d(TAG, "AutomaticGainControl initialized")
                }
                
                mapOf(
                    "success" to true,
                    "sessionId" to sessionId,
                    "noiseSuppressorAvailable" to (noiseSuppressor != null),
                    "agcAvailable" to (automaticGainControl != null)
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize noise reduction: ${e.message}")
                mapOf("success" to false, "error" to (e.message ?: "Unknown error"))
            }
        }

        Function("setLevel") { level: String ->
            try {
                currentLevel = level.lowercase()
                
                when (currentLevel) {
                    "off" -> {
                        noiseSuppressor?.enabled = false
                        automaticGainControl?.enabled = false
                    }
                    "light" -> {
                        noiseSuppressor?.enabled = true
                        automaticGainControl?.enabled = false
                    }
                    "medium" -> {
                        noiseSuppressor?.enabled = true
                        automaticGainControl?.enabled = true
                    }
                    "strong" -> {
                        noiseSuppressor?.enabled = true
                        automaticGainControl?.enabled = true
                    }
                }
                
                Log.d(TAG, "Noise reduction level set: $currentLevel")
                mapOf(
                    "success" to true,
                    "level" to currentLevel,
                    "noiseSuppressorEnabled" to (noiseSuppressor?.enabled ?: false),
                    "agcEnabled" to (automaticGainControl?.enabled ?: false)
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to set noise reduction level: ${e.message}")
                mapOf("success" to false, "error" to (e.message ?: "Unknown error"))
            }
        }

        Function("getCurrentLevel") {
            mapOf(
                "level" to currentLevel,
                "noiseSuppressorEnabled" to (noiseSuppressor?.enabled ?: false),
                "agcEnabled" to (automaticGainControl?.enabled ?: false)
            )
        }

        Function("getAvailableLevels") {
            NOISE_LEVELS
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
            noiseSuppressor?.release()
            noiseSuppressor = null
            automaticGainControl?.release()
            automaticGainControl = null
            Log.d(TAG, "Noise reduction resources released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing noise reduction: ${e.message}")
        }
    }
}
