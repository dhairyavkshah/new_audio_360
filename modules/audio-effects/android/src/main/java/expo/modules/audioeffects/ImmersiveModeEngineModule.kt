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
                    val numBands = dsp?.getNumberOfBands() ?: 7
                    
                    isAttached = true
                    currentMode = MODE_OFF
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "audioSessionId" to sessionId,
                        "equalizerBands" to numBands,
                        "bassBoostSupported" to true,
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
            spatialEnhancementLevel: Int,
            promise: Promise ->
            mainHandler.post {
                try {
                    if (!isAttached) {
                        promise.reject("NOT_ATTACHED", "Engine not attached", null)
                        return@post
                    }
                    
                    val dsp = SoftwareDSPAudioProcessor.getInstance()
                    
                    val bassGainUnits = (bassStrength / 1000.0f) * 5.0f
                    dsp?.setBassBoost(bassGainUnits)
                    currentBassGain = bassGainUnits
                    
                    // Apply stereo width via software DSP
                    val stereoWidth = virtualizerStrength / 1000f
                    dsp?.setStereoWidth(stereoWidth)
                    currentVirtualizerStrength = virtualizerStrength
                    val widthPercent = ((1f + stereoWidth) * 100).toInt()
                    
                    // Apply spatial enhancement
                    dsp?.setSpatialEnhancementLevel(spatialEnhancementLevel)
                    
                    android.util.Log.d("ImmersiveMode", "Custom: virtualizer=$virtualizerStrength (width=${widthPercent}%), spatial=$spatialEnhancementLevel")
                    
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
        dsp?.resetAll()  // This also resets stereoWidth to 0
        dsp?.setSpatialEnhancementLevel(0)
        currentEqGains = emptyList()
        currentBassGain = 0f
        currentVirtualizerStrength = 0
    }
    
    private fun applyImmersiveSettings(eqGains: List<Double>, bassGainUnits: Float, trebleGainUnits: Float, virtualizerStrength: Int, reverbWetMix: Float = 0f, spatialEnhancementLevel: Int = 0) {
        val dsp = SoftwareDSPAudioProcessor.getInstance()
        
        dsp?.setAllEqBandGains(eqGains)
        currentEqGains = eqGains
        
        dsp?.setBassBoost(bassGainUnits)
        currentBassGain = bassGainUnits
        
        dsp?.setTrebleBoost(trebleGainUnits)
        
        // Apply stereo width via software DSP
        // virtualizerStrength 0-1000 maps to stereoWidth 0.0-1.0
        val stereoWidth = virtualizerStrength / 1000f
        dsp?.setStereoWidth(stereoWidth)
        currentVirtualizerStrength = virtualizerStrength
        
        // Apply reverb
        dsp?.setReverb(reverbWetMix)
        
        // Apply spatial enhancement
        dsp?.setSpatialEnhancementLevel(spatialEnhancementLevel)
        
        val widthPercent = ((1f + stereoWidth) * 100).toInt()
        val reverbPercent = (reverbWetMix * 100).toInt()
        android.util.Log.d("ImmersiveMode", "Mode applied: bass=$bassGainUnits, treble=$trebleGainUnits, virtualizer=$virtualizerStrength (width=${widthPercent}%), reverb=${reverbPercent}%, spatial=$spatialEnhancementLevel")
    }
    
    // Professional Immersive Mode Configurations
    // Based on Samsung Dolby Atmos, Sony 360 Reality Audio, and professional audio engineering standards
    // Following Bose approach: all spatial processing bundled into spatialEnhancement (virtualizerStrength=0)
    // EQ bands (10): 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz
    // Values in gain units (-5 to +5), where 1 unit = 2.4 dB
    
    private fun applyModeMusic() {
        // Balanced "smile curve" - warm bass, slight mid scoop, sparkly highs
        applyImmersiveSettings(
            eqGains = listOf(+0.3, +0.3, -0.4, -1.0, -1.0, 0.0, +1.0, +1.5, +0.4, -1.1),
            bassGainUnits = 0.5f,       // +1.2 dB at 150Hz
            trebleGainUnits = 0.54f,    // +1.3 dB at 6kHz
            virtualizerStrength = 0,    // Handled by spatialEnhancement (Bose-style bundled)
            reverbWetMix = 0.08f,       // 8% reverb
            spatialEnhancementLevel = 2 // Level 2: 310µs ITD, 1.4x side boost
        )
    }
    
    private fun applyMode360Reality() {
        // Sony 360 Reality Audio inspired - immersive spatial soundfield
        applyImmersiveSettings(
            eqGains = listOf(0.0, 0.0, -0.6, -0.6, -0.6, 0.0, +1.0, +1.2, +0.3, -0.7),
            bassGainUnits = 0.33f,      // +0.8 dB
            trebleGainUnits = 0.625f,   // +1.5 dB
            virtualizerStrength = 0,    // Handled by spatialEnhancement (Bose-style bundled)
            reverbWetMix = 0.18f,       // 18% reverb
            spatialEnhancementLevel = 5 // Level 5: 700µs ITD, 2.0x side boost (maximum)
        )
    }
    
    private fun applyModeGaming() {
        // Competitive gaming - footstep clarity and directional awareness
        applyImmersiveSettings(
            eqGains = listOf(+0.8, +0.8, +0.4, -1.1, -1.1, 0.0, +1.0, +1.7, +0.8, -1.9),
            bassGainUnits = 0.5f,       // +1.2 dB
            trebleGainUnits = 0.875f,   // +2.1 dB
            virtualizerStrength = 0,    // Handled by spatialEnhancement (Bose-style bundled)
            reverbWetMix = 0.08f,       // 8% reverb
            spatialEnhancementLevel = 3 // Level 3: 440µs ITD, 1.6x side boost
        )
    }
    
    private fun applyModePodcast() {
        // Voice clarity mode - speech intelligibility
        applyImmersiveSettings(
            eqGains = listOf(-1.9, -1.9, -0.9, -0.7, +0.4, +1.0, +1.0, +1.4, +1.8, -0.2),
            bassGainUnits = -0.42f,     // -1.0 dB (removes rumble)
            trebleGainUnits = 0.958f,   // +2.3 dB (clarity)
            virtualizerStrength = 0,    // No spatial processing for speech
            reverbWetMix = 0f,          // 0% reverb
            spatialEnhancementLevel = 0 // Off - focused mono for speech
        )
    }
    
    private fun applyModeMovie() {
        // Cinematic experience - dialogue clarity and surround ambience
        applyImmersiveSettings(
            eqGains = listOf(-0.8, -0.8, -0.4, +0.7, +1.1, +1.0, +1.0, -0.3, -0.5, -1.7),
            bassGainUnits = 0.75f,      // +1.8 dB
            trebleGainUnits = 0.625f,   // +1.5 dB
            virtualizerStrength = 0,    // Handled by spatialEnhancement (Bose-style bundled)
            reverbWetMix = 0.12f,       // 12% reverb
            spatialEnhancementLevel = 4 // Level 4: 570µs ITD, 1.8x side boost
        )
    }
    
    private fun applyModeSports() {
        // Stadium/broadcast mode - commentary clarity with crowd atmosphere
        applyImmersiveSettings(
            eqGains = listOf(+1.2, +1.2, +0.5, -0.7, -0.7, 0.0, +1.0, +1.2, -0.9, -2.5),
            bassGainUnits = 0.917f,     // +2.2 dB (stadium atmosphere)
            trebleGainUnits = 0.33f,    // +0.8 dB
            virtualizerStrength = 0,    // Handled by spatialEnhancement (Bose-style bundled)
            reverbWetMix = 0.10f,       // 10% reverb
            spatialEnhancementLevel = 2 // Level 2: 310µs ITD, 1.4x side boost
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
            "virtualizerEnabled" to (currentVirtualizerStrength > 0),
            "virtualizerStrength" to currentVirtualizerStrength,
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
        currentVirtualizerStrength = 0
    }
}
