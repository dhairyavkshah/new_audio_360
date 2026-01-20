package expo.modules.audioeffects

import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ImmersiveModeEngineModule : Module() {
    private var audioSessionId: Int = 0
    
    private var currentMode: String = "off"
    private var isAttached = false
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    private var currentEqGains: List<Double> = emptyList()
    private var currentVirtualizerStrength: Int = 0
    
    companion object {
        const val MODE_OFF = "off"
        const val MODE_MUSIC = "music"
        const val MODE_360_REALITY = "360_reality"
        const val MODE_GAMING = "gaming"
        const val MODE_PODCAST = "podcast"
        const val MODE_MOVIE = "movie"
        const val MODE_SPORTS = "sports"
    }
    
    override fun definition() = ModuleDefinition {
        Name("ImmersiveModeEngineModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            mainHandler.post {
                try {
                    audioSessionId = sessionId
                    android.util.Log.d("ImmersiveMode", "Software DSP ImmersiveMode attached to session: $sessionId")
                    
                    val dsp = SoftwareDSPAudioProcessor.getInstance()
                    val numBands = dsp?.getNumberOfBands() ?: 10
                    
                    isAttached = true
                    currentMode = MODE_OFF
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "audioSessionId" to sessionId,
                        "equalizerBands" to numBands,
                        "bassBoostSupported" to false,
                        "virtualizerSupported" to true,
                        "isSoftwareDSP" to true
                    ))
                    
                } catch (e: Exception) {
                    android.util.Log.e("ImmersiveMode", "Attach failed: ${e.message}", e)
                    promise.reject("ATTACH_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setMode") { mode: String, promise: Promise ->
            mainHandler.post {
                try {
                    if (!isAttached) {
                        promise.reject("NOT_ATTACHED", "Engine not attached to audio session", null)
                        return@post
                    }
                    
                    when (mode) {
                        MODE_OFF -> applyModeOff()
                        MODE_MUSIC -> applyModeMusic()
                        MODE_360_REALITY -> applyMode360Reality()
                        MODE_GAMING -> applyModeGaming()
                        MODE_PODCAST -> applyModePodcast()
                        MODE_MOVIE -> applyModeMovie()
                        MODE_SPORTS -> applyModeSports()
                        else -> {
                            promise.reject("INVALID_MODE", "Unknown mode: $mode", null)
                            return@post
                        }
                    }
                    
                    currentMode = mode
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "mode" to mode,
                        "settings" to getCurrentSettings(),
                        "isSoftwareDSP" to true
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("MODE_ERROR", e.message, e)
                }
            }
        }
        
        Function("getCurrentMode") {
            return@Function mapOf(
                "mode" to currentMode,
                "isAttached" to isAttached,
                "settings" to getCurrentSettings(),
                "isSoftwareDSP" to true
            )
        }
        
        Function("getAvailableModes") {
            return@Function listOf(
                mapOf(
                    "id" to MODE_OFF,
                    "name" to "Off",
                    "description" to "No audio enhancement",
                    "icon" to "volume-off"
                ),
                mapOf(
                    "id" to MODE_MUSIC,
                    "name" to "Music",
                    "description" to "Balanced for music listening",
                    "icon" to "music"
                ),
                mapOf(
                    "id" to MODE_360_REALITY,
                    "name" to "360 Reality",
                    "description" to "Spatial audio experience",
                    "icon" to "surround-sound"
                ),
                mapOf(
                    "id" to MODE_GAMING,
                    "name" to "Gaming",
                    "description" to "Enhanced for gaming audio",
                    "icon" to "gamepad-variant"
                ),
                mapOf(
                    "id" to MODE_PODCAST,
                    "name" to "Podcast",
                    "description" to "Voice clarity enhancement",
                    "icon" to "podcast"
                ),
                mapOf(
                    "id" to MODE_MOVIE,
                    "name" to "Movie",
                    "description" to "Cinematic audio experience",
                    "icon" to "movie-open"
                ),
                mapOf(
                    "id" to MODE_SPORTS,
                    "name" to "Sports",
                    "description" to "Stadium broadcast clarity",
                    "icon" to "soccer"
                )
            )
        }
        
        AsyncFunction("setCustomParameters") { 
            bassStrength: Int, 
            virtualizerStrength: Int, 
            loudnessGain: Int,
            eqPreset: Int,
            promise: Promise ->
            mainHandler.post {
                try {
                    if (!isAttached) {
                        promise.reject("NOT_ATTACHED", "Engine not attached", null)
                        return@post
                    }
                    
                    val dsp = SoftwareDSPAudioProcessor.getInstance()
                    
                    val stereoWidth = virtualizerStrength / 1000f
                    dsp?.setStereoWidth(stereoWidth)
                    currentVirtualizerStrength = virtualizerStrength
                    
                    currentMode = "custom"
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "settings" to getCurrentSettings(),
                        "isSoftwareDSP" to true
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("PARAM_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("release") { promise: Promise ->
            mainHandler.post {
                try {
                    release()
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("RELEASE_ERROR", e.message, e)
                }
            }
        }
        
        Events("onModeChanged")
    }
    
    private fun applyModeOff() {
        val dsp = SoftwareDSPAudioProcessor.getInstance()
        dsp?.resetAll()
        currentEqGains = emptyList()
        currentVirtualizerStrength = 0
    }
    
    private fun applyImmersiveSettings(
        eqGainsDb: List<Double>, 
        spatialWidth: Int, 
        reverbWetMix: Float = 0f,
        bassBoostDb: Float = 0f,
        trebleBoostDb: Float = 0f
    ) {
        val dsp = SoftwareDSPAudioProcessor.getInstance()
        
        // Convert dB values to units for DSP functions (which multiply by DB_PER_UNIT)
        val dbPerUnit = SoftwareDSPAudioProcessor.DB_PER_UNIT.toDouble()
        val eqUnits = eqGainsDb.map { it / dbPerUnit }
        dsp?.setAllEqBandGains(eqUnits)
        currentEqGains = eqGainsDb
        
        val stereoWidth = spatialWidth / 100f
        dsp?.setStereoWidth(stereoWidth)
        currentVirtualizerStrength = (spatialWidth * 10)
        
        dsp?.setReverb(reverbWetMix)
        
        // Convert dB to units for bass/treble boost
        dsp?.setBassBoost(bassBoostDb / SoftwareDSPAudioProcessor.DB_PER_UNIT)
        dsp?.setTrebleBoost(trebleBoostDb / SoftwareDSPAudioProcessor.DB_PER_UNIT)
    }
    
    // Zero-sum immersive mode presets for maximum headroom
    private fun applyModeMusic() {
        applyImmersiveSettings(
            eqGains = listOf(0.3, 0.3, -0.4, -1.0, -1.0, 0.0, 1.0, 1.5, 0.4, -1.1),
            spatialWidth = 25,
            reverbWetMix = 0.08f,
            bassBoostDb = 1.2f,
            trebleBoostDb = 1.3f
        )
    }
    
    private fun applyMode360Reality() {
        applyImmersiveSettings(
            eqGains = listOf(0.0, 0.0, -0.6, -0.6, -0.6, 0.0, 1.0, 1.2, 0.3, -0.7),
            spatialWidth = 55,
            reverbWetMix = 0.18f,
            bassBoostDb = 0.8f,
            trebleBoostDb = 1.5f
        )
    }
    
    private fun applyModeGaming() {
        applyImmersiveSettings(
            eqGains = listOf(0.8, 0.8, 0.4, -1.1, -1.1, 0.0, 1.0, 1.7, 0.8, -1.9),
            spatialWidth = 57,
            reverbWetMix = 0.08f,
            bassBoostDb = 1.2f,
            trebleBoostDb = 2.1f
        )
    }
    
    private fun applyModePodcast() {
        applyImmersiveSettings(
            eqGains = listOf(-1.9, -1.9, -0.9, -0.7, 0.4, 1.0, 1.0, 1.4, 1.8, -0.2),
            spatialWidth = 0,
            reverbWetMix = 0.0f,
            bassBoostDb = -1.0f,
            trebleBoostDb = 2.3f
        )
    }
    
    private fun applyModeMovie() {
        applyImmersiveSettings(
            eqGains = listOf(-0.8, -0.8, -0.4, 0.7, 1.1, 1.0, 1.0, -0.3, -0.5, -1.7),
            spatialWidth = 45,
            reverbWetMix = 0.12f,
            bassBoostDb = 1.8f,
            trebleBoostDb = 1.5f
        )
    }
    
    private fun applyModeSports() {
        applyImmersiveSettings(
            eqGains = listOf(1.2, 1.2, 0.5, -0.7, -0.7, 0.0, 1.0, 1.2, -0.9, -2.5),
            spatialWidth = 47,
            reverbWetMix = 0.10f,
            bassBoostDb = 2.2f,
            trebleBoostDb = 0.8f
        )
    }
    
    private fun getCurrentSettings(): Map<String, Any> {
        val dsp = SoftwareDSPAudioProcessor.getInstance()
        val eqGains = dsp?.getEqBandGains()?.toList() ?: emptyList<Float>()
        
        return mapOf(
            "equalizerEnabled" to (currentMode != MODE_OFF),
            "equalizerBandLevels" to eqGains.map { (it * 100).toInt() },
            "virtualizerEnabled" to (currentVirtualizerStrength > 0),
            "virtualizerStrength" to currentVirtualizerStrength,
            "isSoftwareDSP" to true
        )
    }
    
    private fun release() {
        val dsp = SoftwareDSPAudioProcessor.getInstance()
        dsp?.resetAll()
        
        isAttached = false
        currentMode = MODE_OFF
        audioSessionId = 0
        currentEqGains = emptyList()
        currentVirtualizerStrength = 0
    }
}
