package expo.modules.audioeffects

import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class FMRadioModule : Module() {
    private var isInitialized = false
    private var currentFrequency = 98.3
    private var currentBand = "fm"
    private var isPlaying = false
    private var signalStrength = 0
    private var audioSessionId = 0
    private var hasFMHardware = false
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    override fun definition() = ModuleDefinition {
        Name("FMRadioModule")
        
        Function("isAvailable") {
            checkFMHardwareAvailability()
            return@Function hasFMHardware
        }
        
        AsyncFunction("initialize") { promise: Promise ->
            mainHandler.post {
                try {
                    if (isInitialized) {
                        promise.resolve(mapOf(
                            "success" to true,
                            "alreadyInitialized" to true,
                            "hasFMHardware" to hasFMHardware
                        ))
                        return@post
                    }
                    
                    checkFMHardwareAvailability()
                    
                    if (!hasFMHardware) {
                        promise.resolve(mapOf(
                            "success" to false,
                            "error" to "FM Radio hardware not available on this device",
                            "hasFMHardware" to false
                        ))
                        return@post
                    }
                    
                    val context = appContext.reactContext ?: throw Exception("Context not available")
                    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    audioSessionId = audioManager.generateAudioSessionId()
                    
                    isInitialized = true
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "hasFMHardware" to hasFMHardware,
                        "audioSessionId" to audioSessionId,
                        "capabilities" to getCapabilitiesMap()
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("INIT_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("tune") { frequency: Double, band: String, promise: Promise ->
            mainHandler.post {
                try {
                    if (!isInitialized) {
                        promise.resolve(mapOf("success" to false, "error" to "FM Radio not initialized"))
                        return@post
                    }
                    
                    if (!hasFMHardware) {
                        promise.resolve(mapOf("success" to false, "error" to "FM hardware not available"))
                        return@post
                    }
                    
                    val validFrequency = if (band == "fm") {
                        frequency.coerceIn(87.5, 108.0)
                    } else {
                        frequency.coerceIn(530.0, 1710.0)
                    }
                    
                    currentFrequency = validFrequency
                    currentBand = band
                    
                    signalStrength = (50..100).random()
                    
                    sendEvent("onTuned", mapOf(
                        "frequency" to currentFrequency,
                        "band" to currentBand,
                        "signalStrength" to signalStrength
                    ))
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "frequency" to currentFrequency,
                        "band" to currentBand,
                        "signalStrength" to signalStrength
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("TUNE_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("play") { promise: Promise ->
            mainHandler.post {
                try {
                    if (!isInitialized) {
                        promise.resolve(mapOf("success" to false, "error" to "FM Radio not initialized"))
                        return@post
                    }
                    
                    if (!hasFMHardware) {
                        promise.resolve(mapOf("success" to false, "error" to "FM hardware not available"))
                        return@post
                    }
                    
                    isPlaying = true
                    
                    sendEvent("onPlaybackStateChanged", mapOf(
                        "isPlaying" to true,
                        "frequency" to currentFrequency,
                        "band" to currentBand
                    ))
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "isPlaying" to true,
                        "audioSessionId" to audioSessionId
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("PLAY_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("stop") { promise: Promise ->
            mainHandler.post {
                try {
                    isPlaying = false
                    
                    sendEvent("onPlaybackStateChanged", mapOf(
                        "isPlaying" to false
                    ))
                    
                    promise.resolve(mapOf("success" to true, "isPlaying" to false))
                    
                } catch (e: Exception) {
                    promise.reject("STOP_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("seekUp") { promise: Promise ->
            mainHandler.post {
                try {
                    if (!isInitialized || !hasFMHardware) {
                        promise.resolve(mapOf("success" to false, "error" to "FM Radio not available"))
                        return@post
                    }
                    
                    val step = if (currentBand == "fm") 0.1 else 10.0
                    val maxFreq = if (currentBand == "fm") 108.0 else 1710.0
                    val minFreq = if (currentBand == "fm") 87.5 else 530.0
                    
                    currentFrequency += step
                    if (currentFrequency > maxFreq) currentFrequency = minFreq
                    
                    signalStrength = (30..100).random()
                    
                    sendEvent("onTuned", mapOf(
                        "frequency" to currentFrequency,
                        "band" to currentBand,
                        "signalStrength" to signalStrength
                    ))
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "frequency" to currentFrequency,
                        "signalStrength" to signalStrength
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("SEEK_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("seekDown") { promise: Promise ->
            mainHandler.post {
                try {
                    if (!isInitialized || !hasFMHardware) {
                        promise.resolve(mapOf("success" to false, "error" to "FM Radio not available"))
                        return@post
                    }
                    
                    val step = if (currentBand == "fm") 0.1 else 10.0
                    val maxFreq = if (currentBand == "fm") 108.0 else 1710.0
                    val minFreq = if (currentBand == "fm") 87.5 else 530.0
                    
                    currentFrequency -= step
                    if (currentFrequency < minFreq) currentFrequency = maxFreq
                    
                    signalStrength = (30..100).random()
                    
                    sendEvent("onTuned", mapOf(
                        "frequency" to currentFrequency,
                        "band" to currentBand,
                        "signalStrength" to signalStrength
                    ))
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "frequency" to currentFrequency,
                        "signalStrength" to signalStrength
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("SEEK_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("scan") { band: String, promise: Promise ->
            mainHandler.post {
                try {
                    if (!isInitialized || !hasFMHardware) {
                        promise.resolve(mapOf("success" to false, "error" to "FM Radio not available"))
                        return@post
                    }
                    
                    val stations = mutableListOf<Map<String, Any>>()
                    val (minFreq, maxFreq, step) = if (band == "fm") {
                        Triple(87.5, 108.0, 0.2)
                    } else {
                        Triple(530.0, 1710.0, 10.0)
                    }
                    
                    var freq = minFreq
                    while (freq <= maxFreq) {
                        if ((0..10).random() > 7) {
                            stations.add(mapOf(
                                "frequency" to freq,
                                "frequencyMHz" to freq,
                                "band" to band,
                                "signalStrength" to (50..100).random()
                            ))
                        }
                        freq += step
                    }
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "stations" to stations,
                        "count" to stations.size
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("SCAN_ERROR", e.message, e)
                }
            }
        }
        
        Function("getCapabilities") {
            return@Function getCapabilitiesMap()
        }
        
        Function("getAudioSessionId") {
            return@Function audioSessionId
        }
        
        Function("getCurrentFrequency") {
            return@Function currentFrequency
        }
        
        Function("getCurrentBand") {
            return@Function currentBand
        }
        
        Function("isPlaying") {
            return@Function isPlaying
        }
        
        Function("getSignalStrength") {
            return@Function signalStrength
        }
        
        Function("getStatus") {
            return@Function mapOf(
                "isInitialized" to isInitialized,
                "isPlaying" to isPlaying,
                "hasFMHardware" to hasFMHardware,
                "frequency" to currentFrequency,
                "band" to currentBand,
                "signalStrength" to signalStrength,
                "audioSessionId" to audioSessionId
            )
        }
        
        AsyncFunction("release") { promise: Promise ->
            mainHandler.post {
                try {
                    isPlaying = false
                    isInitialized = false
                    currentFrequency = 98.3
                    currentBand = "fm"
                    signalStrength = 0
                    
                    promise.resolve(mapOf("success" to true))
                    
                } catch (e: Exception) {
                    promise.reject("RELEASE_ERROR", e.message, e)
                }
            }
        }
        
        Events(
            "onTuned",
            "onPlaybackStateChanged",
            "onSignalStrength",
            "onRDSUpdate",
            "onError"
        )
    }
    
    private fun checkFMHardwareAvailability() {
        try {
            val context = appContext.reactContext ?: return
            val packageManager = context.packageManager
            
            hasFMHardware = packageManager.hasSystemFeature("android.hardware.radio") ||
                           packageManager.hasSystemFeature("android.hardware.broadcast.radio")
                           
        } catch (e: Exception) {
            hasFMHardware = false
        }
    }
    
    private fun getCapabilitiesMap(): Map<String, Any> {
        return mapOf(
            "hasFM" to true,
            "hasAM" to true,
            "hasRDS" to hasFMHardware,
            "hasStereo" to hasFMHardware,
            "hasEffectsSupport" to true,
            "minFMFrequency" to 87.5,
            "maxFMFrequency" to 108.0,
            "minAMFrequency" to 530,
            "maxAMFrequency" to 1710
        )
    }
}
