package expo.modules.audioeffects

import android.media.audiofx.Equalizer
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ImmersiveModeEngineModule : Module() {
    private var audioSessionId: Int = 0
    private var equalizer: Equalizer? = null
    
    private var currentMode: String = "off"
    private var isAttached = false
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
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
                    release()
                    
                    audioSessionId = sessionId
                    
                    // Only create Equalizer - no other effects to prevent distortion
                    equalizer = Equalizer(0, sessionId).apply {
                        enabled = false
                    }
                    
                    isAttached = true
                    currentMode = MODE_OFF
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "audioSessionId" to sessionId,
                        "equalizerBands" to (equalizer?.numberOfBands?.toInt() ?: 0)
                    ))
                    
                } catch (e: Exception) {
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
                        "settings" to getCurrentSettings()
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
                "settings" to getCurrentSettings()
            )
        }
        
        // SINGLE SOURCE OF TRUTH: SoundLabContext.tsx - these descriptions must match
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
                    "description" to "Optimized for music listening",
                    "icon" to "music"
                ),
                mapOf(
                    "id" to MODE_360_REALITY,
                    "name" to "360 Reality",
                    "description" to "Immersive 3D spatial audio",
                    "icon" to "surround-sound"
                ),
                mapOf(
                    "id" to MODE_GAMING,
                    "name" to "Gaming",
                    "description" to "Enhanced positional audio",
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
                    "description" to "Cinematic audio enhancement",
                    "icon" to "movie-open"
                )
            )
        }
        
        AsyncFunction("setCustomParameters") { 
            _bassStrength: Int, 
            _virtualizerStrength: Int, 
            _loudnessGain: Int,
            eqPreset: Int,
            promise: Promise ->
            mainHandler.post {
                try {
                    if (!isAttached) {
                        promise.reject("NOT_ATTACHED", "Engine not attached", null)
                        return@post
                    }
                    
                    // Only apply EQ preset - no other effects
                    equalizer?.let { eq ->
                        if (eqPreset >= 0 && eqPreset < eq.numberOfPresets) {
                            eq.usePreset(eqPreset.toShort())
                            eq.enabled = true
                        } else if (eqPreset == -1) {
                            eq.enabled = false
                        }
                    }
                    
                    currentMode = "custom"
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "settings" to getCurrentSettings()
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
    
    // ========================================================================
    // SINGLE SOURCE OF TRUTH: EQ bands defined in client/contexts/SoundLabContext.tsx
    // All values must match exactly between TypeScript and Kotlin
    // ========================================================================
    
    private fun applyModeOff() {
        equalizer?.enabled = false
    }
    
    private fun applyModeMusic() {
        // SINGLE SOURCE OF TRUTH: SoundLabContext.IMMERSIVE_MODES[music].eqBands = [40, 10, -40, 10, -20]
        // Zero-sum: 40 + 10 + (-40) + 10 + (-20) = 0 millibels
        equalizer?.let { eq ->
            eq.enabled = true
            val numBands = eq.numberOfBands.toInt()
            if (numBands >= 5) {
                eq.setBandLevel(0, 40.toShort())
                eq.setBandLevel(1, 10.toShort())
                eq.setBandLevel(2, (-40).toShort())
                eq.setBandLevel(3, 10.toShort())
                eq.setBandLevel(4, (-20).toShort())
            }
        }
    }
    
    private fun applyMode360Reality() {
        // SINGLE SOURCE OF TRUTH: SoundLabContext.IMMERSIVE_MODES[360_reality].eqBands = [20, -10, -30, -10, 30]
        // Zero-sum: 20 + (-10) + (-30) + (-10) + 30 = 0 millibels
        equalizer?.let { eq ->
            eq.enabled = true
            val numBands = eq.numberOfBands.toInt()
            if (numBands >= 5) {
                eq.setBandLevel(0, 20.toShort())
                eq.setBandLevel(1, (-10).toShort())
                eq.setBandLevel(2, (-30).toShort())
                eq.setBandLevel(3, (-10).toShort())
                eq.setBandLevel(4, 30.toShort())
            }
        }
    }
    
    private fun applyModeGaming() {
        // SINGLE SOURCE OF TRUTH: SoundLabContext.IMMERSIVE_MODES[gaming].eqBands = [-10, -60, 10, 35, 25]
        // Zero-sum: (-10) + (-60) + 10 + 35 + 25 = 0 millibels
        equalizer?.let { eq ->
            eq.enabled = true
            val numBands = eq.numberOfBands.toInt()
            if (numBands >= 5) {
                eq.setBandLevel(0, (-10).toShort())
                eq.setBandLevel(1, (-60).toShort())
                eq.setBandLevel(2, 10.toShort())
                eq.setBandLevel(3, 35.toShort())
                eq.setBandLevel(4, 25.toShort())
            }
        }
    }
    
    private fun applyModePodcast() {
        // SINGLE SOURCE OF TRUTH: SoundLabContext.IMMERSIVE_MODES[podcast].eqBands = [-80, -30, 40, 50, 20]
        // Zero-sum: (-80) + (-30) + 40 + 50 + 20 = 0 millibels
        equalizer?.let { eq ->
            eq.enabled = true
            val numBands = eq.numberOfBands.toInt()
            if (numBands >= 5) {
                eq.setBandLevel(0, (-80).toShort())
                eq.setBandLevel(1, (-30).toShort())
                eq.setBandLevel(2, 40.toShort())
                eq.setBandLevel(3, 50.toShort())
                eq.setBandLevel(4, 20.toShort())
            }
        }
    }
    
    private fun applyModeMovie() {
        // SINGLE SOURCE OF TRUTH: SoundLabContext.IMMERSIVE_MODES[movie].eqBands = [40, -10, -50, -10, 30]
        // Zero-sum: 40 + (-10) + (-50) + (-10) + 30 = 0 millibels
        equalizer?.let { eq ->
            eq.enabled = true
            val numBands = eq.numberOfBands.toInt()
            if (numBands >= 5) {
                eq.setBandLevel(0, 40.toShort())
                eq.setBandLevel(1, (-10).toShort())
                eq.setBandLevel(2, (-50).toShort())
                eq.setBandLevel(3, (-10).toShort())
                eq.setBandLevel(4, 30.toShort())
            }
        }
    }
    
    private fun getCurrentSettings(): Map<String, Any> {
        return mapOf(
            "equalizerEnabled" to (equalizer?.enabled ?: false),
            "equalizerBandLevels" to getEqualizerBandLevels()
        )
    }
    
    private fun getEqualizerBandLevels(): List<Int> {
        val eq = equalizer ?: return emptyList()
        val numBands = eq.numberOfBands.toInt()
        return (0 until numBands).map { eq.getBandLevel(it.toShort()).toInt() }
    }
    
    private fun release() {
        try {
            equalizer?.release()
        } catch (e: Exception) {
            // Ignore release errors
        }
        
        equalizer = null
        isAttached = false
        currentMode = MODE_OFF
        audioSessionId = 0
    }
}
