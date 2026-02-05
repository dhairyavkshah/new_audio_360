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
    private var currentBassGain: Float = 0f
    
    private fun gmf(): Float {
        val sv = AppContextModule.gav()
        return when (sv) {
            0 -> 1.0f
            1 -> 0.4f
            2 -> 0.6f
            else -> 0.75f
        }
    }
    
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
                    val numBands = dsp?.getNumberOfBands() ?: 7
                    
                    isAttached = true
                    currentMode = MODE_OFF
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "audioSessionId" to sessionId,
                        "equalizerBands" to numBands,
                        "bassBoostSupported" to true,
                        "isSoftwareDSP" to true
                    ))
                    
                } catch (e: Exception) {
                    android.util.Log.e("ImmersiveMode", "Attach failed (soft-fail): ${e.message}", e)
                    isAttached = true
                    currentMode = MODE_OFF
                    promise.resolve(mapOf(
                        "success" to true,
                        "audioSessionId" to sessionId,
                        "equalizerBands" to 7,
                        "bassBoostSupported" to true,
                        "isSoftwareDSP" to true
                    ))
                }
            }
        }
        
        AsyncFunction("setMode") { mode: String, promise: Promise ->
            mainHandler.post {
                try {
                    when (mode) {
                        MODE_OFF -> applyModeOff()
                        MODE_MUSIC -> applyModeMusic()
                        MODE_360_REALITY -> applyMode360Reality()
                        MODE_GAMING -> applyModeGaming()
                        MODE_PODCAST -> applyModePodcast()
                        MODE_MOVIE -> applyModeMovie()
                        MODE_SPORTS -> applyModeSports()
                        else -> {
                            currentMode = MODE_OFF
                            promise.resolve(mapOf(
                                "success" to true,
                                "mode" to MODE_OFF,
                                "settings" to getCurrentSettings(),
                                "isSoftwareDSP" to true
                            ))
                            return@post
                        }
                    }
                    
                    currentMode = mode
                    isAttached = true
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "mode" to mode,
                        "settings" to getCurrentSettings(),
                        "isSoftwareDSP" to true
                    ))
                    
                } catch (e: Exception) {
                    promise.resolve(mapOf(
                        "success" to true,
                        "mode" to currentMode,
                        "settings" to getCurrentSettings(),
                        "isSoftwareDSP" to true
                    ))
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
            loudnessGain: Int,
            eqPreset: Int,
            spatialEnhancementLevel: Int,
            promise: Promise ->
            mainHandler.post {
                try {
                    if (!isAttached) {
                        promise.resolve(mapOf(
                            "success" to true,
                            "settings" to getCurrentSettings(),
                            "isSoftwareDSP" to true
                        ))
                        return@post
                    }
                    
                    val dsp = SoftwareDSPAudioProcessor.getInstance()
                    val mf = gmf()
                    
                    val bassGainUnits = (bassStrength / 1000.0f) * 5.0f * mf
                    dsp?.setBassBoost(bassGainUnits)
                    currentBassGain = bassGainUnits
                    
                    val scaledSpatialLevel = (spatialEnhancementLevel * mf).toInt()
                    dsp?.setSpatialEnhancementLevel(scaledSpatialLevel)
                    
                    android.util.Log.d("ImmersiveMode", "Custom: bass=$bassStrength, spatial=$spatialEnhancementLevel, factor=$mf")
                    
                    currentMode = "custom"
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "settings" to getCurrentSettings(),
                        "isSoftwareDSP" to true
                    ))
                    
                } catch (e: Exception) {
                    promise.resolve(mapOf(
                        "success" to true,
                        "settings" to getCurrentSettings(),
                        "isSoftwareDSP" to true
                    ))
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
        dsp?.setSpatialEnhancementLevel(0)
        currentEqGains = emptyList()
        currentBassGain = 0f
    }
    
    /**
     * Spatial enhancement parameters data class for explicit control.
     */
    data class SpatialParams(
        val sideGain: Float,       // Side gain boost in % (+6 = 1.06x)
        val itdMs: Float,          // ITD in milliseconds (0-0.7)
        val decorrelation: Float,  // Decorrelation amount in % (0-100)
        val wetMix: Float          // Wet mix in % (0-100)
    )
    
    private fun applyImmersiveSettings(
        eqGains: List<Double>, 
        bassGainUnits: Float, 
        trebleGainUnits: Float, 
        reverbWetMix: Float = 0f, 
        spatialParams: SpatialParams
    ) {
        val dsp = SoftwareDSPAudioProcessor.getInstance() ?: return
        
        // Clear all audio buffers before applying new immersive mode to prevent layering/lag
        dsp.clearAudioBuffers()
        android.util.Log.d("ImmersiveMode", "Cleared audio buffers before applying new mode")
        
        val mf = gmf()
        
        val scaledEq = eqGains.map { it * mf }
        dsp.setAllEqBandGains(scaledEq)
        currentEqGains = scaledEq
        
        dsp.setBassBoost(bassGainUnits * mf)
        currentBassGain = bassGainUnits * mf
        
        dsp.setTrebleBoost(trebleGainUnits * mf)
        
        dsp.setReverb(reverbWetMix * mf)
        
        dsp.setSpatialEnhancementParams(
            spatialParams.sideGain * mf,
            spatialParams.itdMs * mf,
            spatialParams.decorrelation * mf,
            spatialParams.wetMix * mf
        )
        
        val reverbPercent = (reverbWetMix * 100).toInt()
        android.util.Log.d("ImmersiveMode", "Mode applied: bass=$bassGainUnits, treble=$trebleGainUnits, reverb=${reverbPercent}%, spatial=[sideGain:${spatialParams.sideGain}%, ITD:${spatialParams.itdMs}ms, decorr:${spatialParams.decorrelation}%, wetMix:${spatialParams.wetMix}%]")
    }
    
    // Professional Immersive Mode Configurations
    // Based on Samsung Dolby Atmos, Sony 360 Reality Audio, and professional audio engineering standards
    // Spatial Parameters: sideGain (%), itdMs (milliseconds), decorrelation (%), wetMix (%)
    // EQ bands (10): 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz
    // Values in gain units (-5 to +5), where 1 unit = 2.4 dB
    
    private fun applyModeMusic() {
        // Balanced "smile curve" - warm bass, slight mid scoop, sparkly highs
        // Subtle openness, vocals locked
        applyImmersiveSettings(
            eqGains = listOf(+0.3, +0.3, -0.4, -1.0, -1.0, 0.0, +1.0, +1.5, +0.4, -1.1),
            bassGainUnits = 0.5f,       // +1.2 dB at 150Hz
            trebleGainUnits = 0.54f,    // +1.3 dB at 6kHz
            reverbWetMix = 0.08f,       // 8% reverb
            spatialParams = SpatialParams(sideGain = 6f, itdMs = 0.15f, decorrelation = 5f, wetMix = 20f)
        )
    }
    
    private fun applyMode360Reality() {
        // Sony 360 Reality Audio inspired - maximum safe width, cinematic
        applyImmersiveSettings(
            eqGains = listOf(0.0, 0.0, -0.6, -0.6, -0.6, 0.0, +1.0, +1.2, +0.3, -0.7),
            bassGainUnits = 0.33f,      // +0.8 dB
            trebleGainUnits = 0.625f,   // +1.5 dB
            reverbWetMix = 0.18f,       // 18% reverb
            spatialParams = SpatialParams(sideGain = 14f, itdMs = 0.45f, decorrelation = 12f, wetMix = 40f)
        )
    }
    
    private fun applyModeGaming() {
        // Competitive gaming - strong positional cues
        applyImmersiveSettings(
            eqGains = listOf(+0.8, +0.8, +0.4, -1.1, -1.1, 0.0, +1.0, +1.7, +0.8, -1.9),
            bassGainUnits = 0.5f,       // +1.2 dB
            trebleGainUnits = 0.875f,   // +2.1 dB
            reverbWetMix = 0.08f,       // 8% reverb
            spatialParams = SpatialParams(sideGain = 16f, itdMs = 0.35f, decorrelation = 8f, wetMix = 35f)
        )
    }
    
    private fun applyModePodcast() {
        // Voice clarity mode - pure, untouched signal
        applyImmersiveSettings(
            eqGains = listOf(-1.9, -1.9, -0.9, -0.7, +0.4, +1.0, +1.0, +1.4, +1.8, -0.2),
            bassGainUnits = -0.42f,     // -1.0 dB (removes rumble)
            trebleGainUnits = 0.958f,   // +2.3 dB (clarity)
            reverbWetMix = 0f,          // 0% reverb
            spatialParams = SpatialParams(sideGain = 0f, itdMs = 0f, decorrelation = 0f, wetMix = 0f)
        )
    }
    
    private fun applyModeMovie() {
        // Cinematic experience - dialogue-safe cinematic stage
        applyImmersiveSettings(
            eqGains = listOf(-0.8, -0.8, -0.4, +0.7, +1.1, +1.0, +1.0, -0.3, -0.5, -1.7),
            bassGainUnits = 0.75f,      // +1.8 dB
            trebleGainUnits = 0.625f,   // +1.5 dB
            reverbWetMix = 0.12f,       // 12% reverb
            spatialParams = SpatialParams(sideGain = 12f, itdMs = 0.30f, decorrelation = 10f, wetMix = 45f)
        )
    }
    
    private fun applyModeSports() {
        // Stadium/broadcast mode - wide ambience, focused commentary
        applyImmersiveSettings(
            eqGains = listOf(+1.2, +1.2, +0.5, -0.7, -0.7, 0.0, +1.0, +1.2, -0.9, -2.5),
            bassGainUnits = 0.917f,     // +2.2 dB (stadium atmosphere)
            trebleGainUnits = 0.33f,    // +0.8 dB
            reverbWetMix = 0.10f,       // 10% reverb
            spatialParams = SpatialParams(sideGain = 10f, itdMs = 0.25f, decorrelation = 7f, wetMix = 30f)
        )
    }
    
    private fun getCurrentSettings(): Map<String, Any> {
        val dsp = SoftwareDSPAudioProcessor.getInstance()
        val eqGains = dsp?.getEqBandGains()?.toList() ?: emptyList<Float>()
        val bassGain = dsp?.getBassGain() ?: 0f
        
        return mapOf(
            "equalizerEnabled" to (currentMode != MODE_OFF),
            "equalizerBandLevels" to eqGains.map { (it * 100).toInt() },
            "bassBoostEnabled" to (currentBassGain > 0),
            "bassBoostStrength" to ((currentBassGain / 5.0f) * 1000).toInt().coerceIn(0, 1000),
            "spatialEnhancementLevel" to (dsp?.getSpatialEnhancementLevel() ?: 0),
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
        currentBassGain = 0f
    }
}
