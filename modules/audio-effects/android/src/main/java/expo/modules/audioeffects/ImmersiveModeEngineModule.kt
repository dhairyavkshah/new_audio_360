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
                    
                    // Only use EQ preset if valid, no other effects
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
    
    private fun applyModeOff() {
        equalizer?.enabled = false
    }
    
    // Zero-sum EQ: all bands sum to 0
    private fun applyZeroSumEQ(bands: IntArray) {
        equalizer?.let { eq ->
            eq.enabled = true
            val numBands = eq.numberOfBands.toInt()
            if (numBands >= 5 && bands.size >= 5) {
                // Verify zero-sum
                val sum = bands.sum()
                val offset = sum / bands.size
                for (i in 0 until minOf(numBands, bands.size)) {
                    val balancedValue = bands[i] - offset
                    eq.setBandLevel(i.toShort(), balancedValue.toShort())
                }
            }
        }
    }
    
    private fun applyModeMusic() {
        // Zero-sum balanced EQ for music: slight bass and treble boost, mids cut
        // Sum: 50 + 20 + (-70) + (-20) + 20 = 0
        applyZeroSumEQ(intArrayOf(50, 20, -70, -20, 20))
    }
    
    private fun applyMode360Reality() {
        // Zero-sum for spatial: V-shaped curve
        // Sum: 40 + (-20) + (-40) + (-20) + 40 = 0
        applyZeroSumEQ(intArrayOf(40, -20, -40, -20, 40))
    }
    
    private fun applyModeGaming() {
        // Zero-sum for gaming: enhanced highs for footsteps
        // Sum: (-40) + (-60) + 20 + 40 + 40 = 0
        applyZeroSumEQ(intArrayOf(-40, -60, 20, 40, 40))
    }
    
    private fun applyModePodcast() {
        // Zero-sum for voice: mid boost, bass/treble cut
        // Sum: (-60) + (-20) + 80 + 40 + (-40) = 0
        applyZeroSumEQ(intArrayOf(-60, -20, 80, 40, -40))
    }
    
    private fun applyModeMovie() {
        // Zero-sum for cinema: enhanced bass and highs
        // Sum: 60 + (-20) + (-80) + (-20) + 60 = 0
        applyZeroSumEQ(intArrayOf(60, -20, -80, -20, 60))
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
