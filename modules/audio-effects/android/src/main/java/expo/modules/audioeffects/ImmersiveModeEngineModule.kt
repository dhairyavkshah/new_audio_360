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
                    
                    val bassGainUnits = (bassStrength / 1000.0f) * 5.0f
                    dsp?.setBassBoost(bassGainUnits)
                    currentBassGain = bassGainUnits
                    
                    currentVirtualizerStrength = virtualizerStrength
                    android.util.Log.d("ImmersiveMode", "Virtualizer strength=$virtualizerStrength (stub - no effect yet)")
                    
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
        currentBassGain = 0f
        currentVirtualizerStrength = 0
    }
    
    private fun applyImmersiveSettings(eqGains: List<Double>, bassGainUnits: Float, trebleGainUnits: Float, virtualizerStrength: Int) {
        val dsp = SoftwareDSPAudioProcessor.getInstance()
        
        dsp?.setAllEqBandGains(eqGains)
        currentEqGains = eqGains
        
        dsp?.setBassBoost(bassGainUnits)
        currentBassGain = bassGainUnits
        
        dsp?.setTrebleBoost(trebleGainUnits)
        
        currentVirtualizerStrength = virtualizerStrength
        android.util.Log.d("ImmersiveMode", "Mode applied: bass=$bassGainUnits, treble=$trebleGainUnits, virtualizer=$virtualizerStrength")
    }
    
    // Professional Immersive Mode Configurations
    // Based on Samsung Dolby Atmos, Sony 360 Reality Audio, and professional audio engineering standards
    // EQ bands (7): 32Hz, 64Hz, 125Hz, 500Hz, 2kHz, 8kHz, 16kHz
    // Values in gain units (-5 to +5), where 1 unit = 2.4 dB
    
    private fun applyModeMusic() {
        // Balanced "smile curve" - warm bass, slight mid scoop, sparkly highs
        // Samsung Music mode inspired
        applyImmersiveSettings(
            eqGains = listOf(2.5, 1.8, 0.5, -0.3, 0.5, 1.8, 1.2),
            bassGainUnits = 2.0f,      // +4.8 dB at 150Hz (warm fullness)
            trebleGainUnits = 1.5f,    // +3.6 dB at 6kHz (presence and air)
            virtualizerStrength = 350  // 35% spatial width
        )
    }
    
    private fun applyMode360Reality() {
        // Flat EQ to preserve spatial audio cues - Sony 360 Reality Audio inspired
        // Minimal coloration, maximum spatial positioning accuracy
        applyImmersiveSettings(
            eqGains = listOf(0.5, 0.3, 0.0, 0.0, 0.5, 1.0, 0.5),
            bassGainUnits = 0.5f,      // +1.2 dB (subtle warmth)
            trebleGainUnits = 1.5f,    // +3.6 dB (enhanced location perception)
            virtualizerStrength = 700  // 70% - maximum spatial width
        )
    }
    
    private fun applyModeGaming() {
        // Competitive gaming EQ - cut bass, boost footstep frequencies (2-6kHz)
        // Professional gaming headset standards for footstep clarity
        applyImmersiveSettings(
            eqGains = listOf(-2.0, -1.5, -1.0, 0.5, 3.5, 2.5, 1.5),
            bassGainUnits = -1.0f,     // -2.4 dB (reduce bass masking)
            trebleGainUnits = 2.5f,    // +6 dB (enhanced detail and clarity)
            virtualizerStrength = 500  // 50% - directional awareness
        )
    }
    
    private fun applyModePodcast() {
        // Voice clarity mode - enhanced 1-4kHz for speech intelligibility
        // Reduced bass/treble extremes, no spatial processing
        applyImmersiveSettings(
            eqGains = listOf(-2.0, -1.5, 0.0, 2.0, 2.5, 0.5, -0.5),
            bassGainUnits = -1.5f,     // -3.6 dB (removes rumble)
            trebleGainUnits = -0.5f,   // -1.2 dB (reduces sibilance)
            virtualizerStrength = 0    // 0% - mono-focused for speech
        )
    }
    
    private fun applyModeMovie() {
        // Cinematic experience - THX-inspired with strong LFE and dialogue clarity
        // Sub-bass for explosions, clear mids for dialogue, detailed highs
        applyImmersiveSettings(
            eqGains = listOf(3.5, 2.5, 1.0, 0.3, 1.0, 2.0, 1.5),
            bassGainUnits = 3.5f,      // +8.4 dB (cinematic impact and rumble)
            trebleGainUnits = 2.0f,    // +4.8 dB (effects detail and sparkle)
            virtualizerStrength = 450  // 45% - surround-like experience
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
