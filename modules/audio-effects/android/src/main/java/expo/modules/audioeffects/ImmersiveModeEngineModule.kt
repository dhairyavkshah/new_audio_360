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
                    
                    // Disable psychoacoustic virtualizer for immersive custom mode
                    dsp?.setPsychoacousticVirtualizer(false, 0f)
                    
                    // Apply stereo width via software DSP (mid-side technique)
                    val stereoWidth = virtualizerStrength / 1000f
                    dsp?.setStereoWidth(stereoWidth)
                    currentVirtualizerStrength = virtualizerStrength
                    val widthPercent = ((1f + stereoWidth) * 100).toInt()
                    android.util.Log.d("ImmersiveMode", "Custom: virtualizer=$virtualizerStrength (width=${widthPercent}%)")
                    
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
        currentEqGains = emptyList()
        currentBassGain = 0f
        currentVirtualizerStrength = 0
    }
    
    private fun applyImmersiveSettings(eqGains: List<Double>, bassGainUnits: Float, trebleGainUnits: Float, virtualizerStrength: Int, reverbWetMix: Float = 0f) {
        val dsp = SoftwareDSPAudioProcessor.getInstance()
        
        dsp?.setAllEqBandGains(eqGains)
        currentEqGains = eqGains
        
        dsp?.setBassBoost(bassGainUnits)
        currentBassGain = bassGainUnits
        
        dsp?.setTrebleBoost(trebleGainUnits)
        
        // Disable psychoacoustic virtualizer (EQ mode) when switching to immersive mode
        // Immersive modes use simple mid-side stereo width instead
        dsp?.setPsychoacousticVirtualizer(false, 0f)
        
        // Apply stereo width via software DSP (mid-side technique)
        // virtualizerStrength 0-1000 maps to stereoWidth 0.0-1.0
        val stereoWidth = virtualizerStrength / 1000f
        dsp?.setStereoWidth(stereoWidth)
        currentVirtualizerStrength = virtualizerStrength
        
        // Apply reverb wet mix
        dsp?.setReverb(reverbWetMix)
        
        val widthPercent = ((1f + stereoWidth) * 100).toInt()
        android.util.Log.d("ImmersiveMode", "Mode applied: bass=$bassGainUnits, treble=$trebleGainUnits, virtualizer=$virtualizerStrength (width=${widthPercent}%), reverb=$reverbWetMix")
    }
    
    // Professional Immersive Mode Configurations
    // Based on Samsung Dolby Atmos, Sony 360 Reality Audio, and professional audio engineering standards
    // EQ bands (10): 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz
    // Values in gain units (-5 to +5), where 1 unit = 2.4 dB
    
    private fun applyModeMusic() {
        // Bose-inspired balanced music mode
        // Moderate warm bass, subtle treble sparkle, minimal room ambience
        applyImmersiveSettings(
            eqGains = listOf(2.0, 1.5, 0.5, -0.5, 0.0, 0.5, 1.0, 1.5, 1.0, 0.5),
            bassGainUnits = 1.5f,      // +3.6 dB (Bose music: moderate warm bass)
            trebleGainUnits = 1.0f,    // +2.4 dB (reduced for non-fatiguing warmth)
            virtualizerStrength = 250, // 25% - subtle widening only
            reverbWetMix = 0.05f       // 5% - minimal room ambience for natural feel
        )
    }
    
    private fun applyMode360Reality() {
        // Sony 360 Reality Audio inspired - near-flat for accurate spatial positioning
        // Maximum spatial immersion with significant reverb for 360° soundfield
        applyImmersiveSettings(
            eqGains = listOf(0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.5, 0.3, 0.0, 0.0),
            bassGainUnits = 0.3f,      // +0.7 dB (near-flat for accurate spatial cues)
            trebleGainUnits = 0.5f,    // +1.2 dB (air for spatial perception)
            virtualizerStrength = 850, // 85% - maximum immersion for 360° soundfield
            reverbWetMix = 0.25f       // 25% - significant reverb for true 360° surround sphere
        )
    }
    
    private fun applyModeGaming() {
        // Competitive gaming - cut bass, boost footstep frequencies (2-6kHz)
        // Subtle spatial cues without muddiness
        applyImmersiveSettings(
            eqGains = listOf(-2.0, -1.5, -1.0, 0.0, 2.0, 3.5, 3.0, 2.0, 1.5, 1.0),
            bassGainUnits = -1.0f,     // -2.4 dB (reduce bass masking for footsteps)
            trebleGainUnits = 2.0f,    // +4.8 dB (slightly less to reduce fatigue)
            virtualizerStrength = 450, // 45% - better directional accuracy
            reverbWetMix = 0.075f      // 7.5% - subtle room cues for spatial awareness
        )
    }
    
    private fun applyModePodcast() {
        // Voice clarity mode - crystal clear speech
        // No spatial processing, no reverb
        applyImmersiveSettings(
            eqGains = listOf(-2.0, -1.5, 0.0, 1.5, 2.5, 2.0, 1.0, 0.0, -0.5, -1.0),
            bassGainUnits = -1.5f,     // -3.6 dB (removes rumble and boominess)
            trebleGainUnits = -0.5f,   // -1.2 dB (reduces sibilance)
            virtualizerStrength = 0,   // 0% - mono-focused for speech
            reverbWetMix = 0.0f        // 0% - no reverb for clean voice
        )
    }
    
    private fun applyModeMovie() {
        // IMAX/THX-inspired cinematic experience
        // Strong bass punch, detailed highs, cinema hall ambience
        applyImmersiveSettings(
            eqGains = listOf(3.5, 2.5, 1.0, 0.0, 0.5, 1.0, 1.5, 2.5, 2.0, 1.5),
            bassGainUnits = 4.0f,      // +9.6 dB (IMAX Enhanced-level bass punch)
            trebleGainUnits = 2.5f,    // +6 dB (enhanced effects detail)
            virtualizerStrength = 550, // 55% - proper surround experience
            reverbWetMix = 0.15f       // 15% - cinema hall ambience (Yamaha Cinema DSP inspired)
        )
    }
    
    private fun applyModeSports() {
        // Stadium/broadcast mode - commentary clarity with crowd atmosphere
        // Open stadium feel with arena ambience
        applyImmersiveSettings(
            eqGains = listOf(1.0, 0.5, 0.5, 2.0, 2.5, 2.0, 0.5, 0.0, -0.5, -0.5),
            bassGainUnits = 1.5f,      // +3.6 dB (slightly more for stadium atmosphere)
            trebleGainUnits = 0.0f,    // Neutral (balanced commentary clarity)
            virtualizerStrength = 500, // 50% - stadium-like open soundstage
            reverbWetMix = 0.125f      // 12.5% - stadium/arena open-air ambience
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
