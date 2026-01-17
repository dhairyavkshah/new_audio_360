package expo.modules.audioeffects

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.Virtualizer
import android.media.audiofx.LoudnessEnhancer
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ImmersiveModeEngineModule : Module() {
    private var audioSessionId: Int = 0
    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var virtualizer: Virtualizer? = null
    private var loudnessEnhancer: LoudnessEnhancer? = null
    
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
                    
                    bassBoost = BassBoost(0, sessionId).apply {
                        enabled = false
                    }
                    
                    virtualizer = Virtualizer(0, sessionId).apply {
                        enabled = false
                        if (strengthSupported) {
                            setStrength(0)
                        }
                    }
                    
                    try {
                        loudnessEnhancer = LoudnessEnhancer(sessionId).apply {
                            enabled = false
                            setTargetGain(0)
                        }
                    } catch (e: Exception) {
                        loudnessEnhancer = null
                    }
                    
                    isAttached = true
                    currentMode = MODE_OFF
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "audioSessionId" to sessionId,
                        "equalizerBands" to (equalizer?.numberOfBands?.toInt() ?: 0),
                        "bassBoostSupported" to (bassBoost?.strengthSupported ?: false),
                        "virtualizerSupported" to (virtualizer?.strengthSupported ?: false),
                        "loudnessEnhancerAvailable" to (loudnessEnhancer != null)
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
                    "description" to "Optimized for music listening with enhanced clarity and bass",
                    "icon" to "music"
                ),
                mapOf(
                    "id" to MODE_360_REALITY,
                    "name" to "360 Reality",
                    "description" to "Immersive 3D spatial audio experience",
                    "icon" to "surround-sound"
                ),
                mapOf(
                    "id" to MODE_GAMING,
                    "name" to "Gaming",
                    "description" to "Enhanced positional audio for gaming with boosted footsteps and effects",
                    "icon" to "gamepad-variant"
                ),
                mapOf(
                    "id" to MODE_PODCAST,
                    "name" to "Podcast",
                    "description" to "Voice clarity enhancement for podcasts and audiobooks",
                    "icon" to "podcast"
                ),
                mapOf(
                    "id" to MODE_MOVIE,
                    "name" to "Movie",
                    "description" to "Cinematic audio with enhanced dialogue and surround effects",
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
                    
                    bassBoost?.let {
                        if (it.strengthSupported) {
                            it.setStrength(bassStrength.toShort().coerceIn(0, 1000))
                            it.enabled = bassStrength > 0
                        }
                    }
                    
                    virtualizer?.let {
                        if (it.strengthSupported) {
                            it.setStrength(virtualizerStrength.toShort().coerceIn(0, 1000))
                            it.enabled = virtualizerStrength > 0
                        }
                    }
                    
                    loudnessEnhancer?.let {
                        it.setTargetGain(loudnessGain.coerceIn(-1000, 1000))
                        it.enabled = loudnessGain != 0
                    }
                    
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
        bassBoost?.enabled = false
        virtualizer?.enabled = false
        loudnessEnhancer?.enabled = false
    }
    
    private fun applyModeMusic() {
        // Disable gain-adding effects to prevent distortion
        loudnessEnhancer?.enabled = false
        bassBoost?.enabled = false
        
        // Conservative zero-sum EQ: 40 + 10 + (-40) + 10 + (-20) = 0 millibels
        // Max ±40mb = ±0.4dB - very safe headroom
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
        
        // Virtualizer disabled - pure zero-sum EQ only
        virtualizer?.enabled = false
    }
    
    private fun applyMode360Reality() {
        // Disable all gain-adding effects - pure zero-sum EQ only
        loudnessEnhancer?.enabled = false
        bassBoost?.enabled = false
        virtualizer?.enabled = false
        
        // Conservative zero-sum EQ: 20 + (-10) + (-30) + (-10) + 30 = 0 millibels
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
        // Disable all gain-adding effects - pure zero-sum EQ only
        loudnessEnhancer?.enabled = false
        bassBoost?.enabled = false
        virtualizer?.enabled = false
        
        // Conservative zero-sum EQ: (-10) + (-60) + 10 + 35 + 25 = 0 millibels
        // Emphasizes mids/highs for footsteps, cuts bass for clarity
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
        // Disable all gain-adding effects - pure zero-sum EQ only
        loudnessEnhancer?.enabled = false
        bassBoost?.enabled = false
        virtualizer?.enabled = false
        
        // Conservative zero-sum EQ: (-80) + (-30) + 40 + 50 + 20 = 0 millibels
        // Cuts bass rumble, boosts vocal clarity frequencies
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
        // Disable all gain-adding effects - pure zero-sum EQ only
        loudnessEnhancer?.enabled = false
        bassBoost?.enabled = false
        virtualizer?.enabled = false
        
        // Conservative zero-sum EQ: 40 + (-10) + (-50) + (-10) + 30 = 0 millibels
        // Adds cinematic bass punch and treble sparkle
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
            "bassBoostEnabled" to (bassBoost?.enabled ?: false),
            "bassBoostStrength" to (bassBoost?.roundedStrength?.toInt() ?: 0),
            "virtualizerEnabled" to (virtualizer?.enabled ?: false),
            "virtualizerStrength" to (virtualizer?.roundedStrength?.toInt() ?: 0),
            "loudnessEnhancerEnabled" to (loudnessEnhancer?.enabled ?: false),
            "loudnessGain" to (loudnessEnhancer?.targetGain ?: 0),
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
            bassBoost?.release()
            virtualizer?.release()
            loudnessEnhancer?.release()
        } catch (e: Exception) {
            // Ignore release errors
        }
        
        equalizer = null
        bassBoost = null
        virtualizer = null
        loudnessEnhancer = null
        
        isAttached = false
        currentMode = MODE_OFF
        audioSessionId = 0
    }
}
