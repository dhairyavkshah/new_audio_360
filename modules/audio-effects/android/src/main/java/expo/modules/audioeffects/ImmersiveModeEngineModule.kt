package expo.modules.audioeffects

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.Virtualizer
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
                    android.util.Log.d("ImmersiveMode", "Attaching to audio session: $sessionId")
                    
                    // Initialize Equalizer with high priority (1000) for better global session support
                    equalizer = Equalizer(1000, sessionId).apply {
                        enabled = false
                    }
                    android.util.Log.d("ImmersiveMode", "Equalizer attached successfully")
                    
                    // Initialize BassBoost with high priority
                    try {
                        bassBoost = BassBoost(1000, sessionId).apply {
                            enabled = false
                            if (strengthSupported) {
                                setStrength(0)
                            }
                        }
                        android.util.Log.d("ImmersiveMode", "BassBoost attached successfully")
                    } catch (e: Exception) {
                        android.util.Log.w("ImmersiveMode", "BassBoost not supported: ${e.message}")
                        bassBoost = null
                    }
                    
                    // Initialize Virtualizer with high priority
                    try {
                        virtualizer = Virtualizer(1000, sessionId).apply {
                            enabled = false
                            if (strengthSupported) {
                                setStrength(0)
                            }
                        }
                        android.util.Log.d("ImmersiveMode", "Virtualizer attached successfully")
                    } catch (e: Exception) {
                        android.util.Log.w("ImmersiveMode", "Virtualizer not supported: ${e.message}")
                        virtualizer = null
                    }
                    
                    isAttached = true
                    currentMode = MODE_OFF
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "audioSessionId" to sessionId,
                        "equalizerBands" to (equalizer?.numberOfBands?.toInt() ?: 0),
                        "bassBoostSupported" to (bassBoost?.strengthSupported ?: false),
                        "virtualizerSupported" to (virtualizer?.strengthSupported ?: false)
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
        bassBoost?.enabled = false
        virtualizer?.enabled = false
    }
    
    /**
     * Apply immersive mode settings with BassBoost, Virtualizer, and EQ
     * @param eqBands EQ band levels in millibels (will be zero-sum balanced internally)
     * @param bassStrength BassBoost strength 0-1000 (conservative: 0-400 recommended)
     * @param virtualizerStrength Virtualizer strength 0-1000 (conservative: 0-500 recommended)
     */
    private fun applyImmersiveSettings(eqBands: IntArray, bassStrength: Int, virtualizerStrength: Int) {
        // Apply EQ with zero-sum balancing
        equalizer?.let { eq ->
            eq.enabled = true
            val numBands = eq.numberOfBands.toInt()
            val minLevel = eq.bandLevelRange[0]
            val maxLevel = eq.bandLevelRange[1]
            
            // Calculate offset for zero-sum balancing
            val sum = eqBands.sum()
            val offset = if (eqBands.isNotEmpty()) sum / eqBands.size else 0
            
            for (i in 0 until minOf(numBands, eqBands.size)) {
                // Apply zero-sum offset and clamp to hardware limits
                val balancedValue = eqBands[i] - offset
                val level = balancedValue.coerceIn(minLevel.toInt(), maxLevel.toInt()).toShort()
                eq.setBandLevel(i.toShort(), level)
            }
        }
        
        // Apply BassBoost with conservative strength
        bassBoost?.let { bb ->
            if (bb.strengthSupported && bassStrength > 0) {
                bb.setStrength(bassStrength.toShort())
                bb.enabled = true
            } else {
                bb.enabled = false
            }
        }
        
        // Apply Virtualizer with conservative strength
        virtualizer?.let { virt ->
            if (virt.strengthSupported && virtualizerStrength > 0) {
                virt.setStrength(virtualizerStrength.toShort())
                virt.enabled = true
            } else {
                virt.enabled = false
            }
        }
    }
    
    private fun applyModeMusic() {
        // Music mode: Slight V-curve EQ, moderate bass, subtle spatial
        // Raw: +150, +50, -100, +50, -150 (sum = 0, already balanced)
        applyImmersiveSettings(
            eqBands = intArrayOf(150, 50, -100, 50, -150),
            bassStrength = 200,  // Moderate bass enhancement
            virtualizerStrength = 150  // Subtle spatial widening
        )
    }
    
    private fun applyMode360Reality() {
        // 360 Reality: Strong spatial, balanced EQ
        // Raw: +100, -50, 0, -50, 0 (sum = 0, already balanced)
        applyImmersiveSettings(
            eqBands = intArrayOf(100, -50, 0, -50, 0),
            bassStrength = 150,  // Light bass
            virtualizerStrength = 450  // Strong spatial effect
        )
    }
    
    private fun applyModeGaming() {
        // Gaming: Enhanced highs for footsteps/details, punchy bass
        // Raw: -100, -100, 0, 100, 100 (sum = 0, already balanced)
        applyImmersiveSettings(
            eqBands = intArrayOf(-100, -100, 0, 100, 100),
            bassStrength = 250,  // Punchy bass for explosions
            virtualizerStrength = 350  // Good spatial for positioning
        )
    }
    
    private fun applyModePodcast() {
        // Podcast: Voice clarity, reduced bass, no spatial
        // Raw: -150, -50, 150, 100, -50 (sum = 0, already balanced)
        applyImmersiveSettings(
            eqBands = intArrayOf(-150, -50, 150, 100, -50),
            bassStrength = 0,  // No bass boost for speech
            virtualizerStrength = 0  // No spatial effect for mono content
        )
    }
    
    private fun applyModeMovie() {
        // Movie: Cinematic bass, wide soundstage
        // Raw: +150, +50, -200, 0, 0 (sum = 0, already balanced)
        applyImmersiveSettings(
            eqBands = intArrayOf(150, 50, -200, 0, 0),
            bassStrength = 350,  // Strong cinematic bass
            virtualizerStrength = 400  // Wide soundstage
        )
    }
    
    private fun getCurrentSettings(): Map<String, Any> {
        return mapOf(
            "equalizerEnabled" to (equalizer?.enabled ?: false),
            "equalizerBandLevels" to getEqualizerBandLevels(),
            "bassBoostEnabled" to (bassBoost?.enabled ?: false),
            "bassBoostStrength" to (bassBoost?.roundedStrength?.toInt() ?: 0),
            "virtualizerEnabled" to (virtualizer?.enabled ?: false),
            "virtualizerStrength" to (virtualizer?.roundedStrength?.toInt() ?: 0)
        )
    }
    
    private fun getEqualizerBandLevels(): List<Int> {
        val eq = equalizer ?: return emptyList()
        val numBands = eq.numberOfBands.toInt()
        return (0 until numBands).map { eq.getBandLevel(it.toShort()).toInt() }
    }
    
    private fun release() {
        try {
            bassBoost?.release()
        } catch (e: Exception) {
            // Ignore release errors
        }
        
        try {
            virtualizer?.release()
        } catch (e: Exception) {
            // Ignore release errors
        }
        
        try {
            equalizer?.release()
        } catch (e: Exception) {
            // Ignore release errors
        }
        
        bassBoost = null
        virtualizer = null
        equalizer = null
        isAttached = false
        currentMode = MODE_OFF
        audioSessionId = 0
    }
}
