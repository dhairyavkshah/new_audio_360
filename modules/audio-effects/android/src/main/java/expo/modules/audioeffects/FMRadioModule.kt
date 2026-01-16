package expo.modules.audioeffects

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.util.concurrent.atomic.AtomicBoolean

class FMRadioModule : Module() {
    private var audioManager: AudioManager? = null
    
    private var audioRecord: AudioRecord? = null
    private var audioTrack: AudioTrack? = null
    private var audioSessionId: Int = 0
    
    private var isPlaying = AtomicBoolean(false)
    private var isInitialized = false
    
    private var currentFrequency: Int = 87500000
    private var currentBandType: String = "fm"
    private var currentSignalStrength: Int = 0
    
    private var audioThread: Thread? = null
    private var hasHeadphoneAntenna = false
    private var hasFMTuner = false
    private var hasAMTuner = false
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    private var radioHandlerThread: HandlerThread? = null
    private var radioHandler: Handler? = null
    
    private fun ensureRadioHandler(): Handler {
        if (radioHandlerThread == null || radioHandler == null) {
            radioHandlerThread = HandlerThread("FMRadioThread").apply { start() }
            radioHandler = Handler(radioHandlerThread!!.looper)
        }
        return radioHandler!!
    }
    
    private fun frequencyToDisplayUnit(frequencyHz: Int, bandType: String): Double {
        return if (bandType == "am") {
            frequencyHz / 1000.0
        } else {
            frequencyHz / 1000000.0
        }
    }
    
    private fun getFrequencyUnit(bandType: String): String {
        return if (bandType == "am") "kHz" else "MHz"
    }
    
    private fun checkHeadphoneAntenna() {
        val devices = audioManager?.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
        hasHeadphoneAntenna = devices?.any { 
            it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES || 
            it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET 
        } ?: false
    }
    
    private val audioDeviceCallback = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>?) {
            checkHeadphoneAntenna()
            sendEvent("onAntennaStateChanged", mapOf(
                "hasAntenna" to hasHeadphoneAntenna,
                "antennaType" to if (hasHeadphoneAntenna) "headphone" else "none"
            ))
        }
        
        override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>?) {
            checkHeadphoneAntenna()
            sendEvent("onAntennaStateChanged", mapOf(
                "hasAntenna" to hasHeadphoneAntenna,
                "antennaType" to if (hasHeadphoneAntenna) "headphone" else "none"
            ))
        }
    }
    
    companion object {
        private const val SAMPLE_RATE = 44100
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_STEREO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val FM_LOWER_LIMIT = 87500000
        private const val FM_UPPER_LIMIT = 108000000
        private const val AM_LOWER_LIMIT = 531000
        private const val AM_UPPER_LIMIT = 1710000
        private const val FM_SPACING = 100000
        private const val AM_SPACING = 9000
    }
    
    override fun definition() = ModuleDefinition {
        Name("FMRadioModule")
        
        Events("onAntennaStateChanged", "onSignalStrengthChanged", "onRdsDataReceived", 
               "onFrequencyChanged", "onTuneError", "onPlaybackStateChanged")
        
        Function("isAvailable") {
            return@Function mapOf(
                "available" to false,
                "reason" to "Native FM radio hardware APIs are not available on this device",
                "hasFM" to false,
                "hasAM" to false
            )
        }
        
        AsyncFunction("initialize") { promise: Promise ->
            ensureRadioHandler().post {
                try {
                    val context = appContext.reactContext
                    if (context == null) {
                        mainHandler.post { promise.reject("INIT_ERROR", "Context not available", null) }
                        return@post
                    }
                    
                    val hasRecordPermission = ContextCompat.checkSelfPermission(
                        context, Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED
                    
                    audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    audioManager?.registerAudioDeviceCallback(audioDeviceCallback, mainHandler)
                    
                    checkHeadphoneAntenna()
                    
                    audioSessionId = audioManager?.generateAudioSessionId() ?: AudioManager.AUDIO_SESSION_ID_GENERATE
                    
                    isInitialized = true
                    hasFMTuner = false
                    hasAMTuner = false
                    
                    mainHandler.post {
                        promise.resolve(mapOf(
                            "success" to true,
                            "hasFMTuner" to hasFMTuner,
                            "hasAMTuner" to hasAMTuner,
                            "audioSessionId" to audioSessionId,
                            "needsHeadphoneAntenna" to true,
                            "hasHeadphoneAntenna" to hasHeadphoneAntenna,
                            "hasRecordPermission" to hasRecordPermission,
                            "note" to "Native FM radio hardware is not available. Use online radio streaming instead."
                        ))
                    }
                    
                } catch (e: Exception) {
                    mainHandler.post { promise.reject("INIT_ERROR", e.message, e) }
                }
            }
        }
        
        AsyncFunction("getCapabilities") { promise: Promise ->
            ensureRadioHandler().post {
                try {
                    val context = appContext.reactContext
                    if (context == null) {
                        mainHandler.post { promise.reject("CAPABILITIES_ERROR", "Context not available", null) }
                        return@post
                    }
                    
                    val hasRecordPermission = ContextCompat.checkSelfPermission(
                        context, Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED
                    
                    val hasLocationPermission = ContextCompat.checkSelfPermission(
                        context, Manifest.permission.ACCESS_FINE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED
                    
                    mainHandler.post {
                        promise.resolve(mapOf(
                            "hasFM" to false,
                            "hasAM" to false,
                            "needsHeadphoneAntenna" to true,
                            "hasHeadphoneAntenna" to hasHeadphoneAntenna,
                            "hasEffectsSupport" to (audioSessionId != 0),
                            "hasRecordPermission" to hasRecordPermission,
                            "hasLocationPermission" to hasLocationPermission,
                            "supportsRDS" to false,
                            "unavailableReason" to "Native FM/AM radio hardware APIs are not available on most Android devices. Use online radio streaming for internet radio.",
                            "frequencyRange" to mapOf(
                                "fm" to mapOf(
                                    "min" to frequencyToDisplayUnit(FM_LOWER_LIMIT, "fm"),
                                    "max" to frequencyToDisplayUnit(FM_UPPER_LIMIT, "fm"),
                                    "spacing" to 0.1,
                                    "unit" to "MHz"
                                ),
                                "am" to mapOf(
                                    "min" to frequencyToDisplayUnit(AM_LOWER_LIMIT, "am"),
                                    "max" to frequencyToDisplayUnit(AM_UPPER_LIMIT, "am"),
                                    "spacing" to 9.0,
                                    "unit" to "kHz"
                                )
                            )
                        ))
                    }
                    
                } catch (e: Exception) {
                    mainHandler.post { promise.reject("CAPABILITIES_ERROR", e.message, e) }
                }
            }
        }
        
        AsyncFunction("scan") { bandType: String, promise: Promise ->
            mainHandler.post {
                promise.resolve(mapOf(
                    "success" to false,
                    "stations" to emptyList<Map<String, Any>>(),
                    "count" to 0,
                    "bandType" to bandType,
                    "error" to "Native FM/AM radio hardware is not available on this device"
                ))
            }
        }
        
        AsyncFunction("tune") { frequencyHz: Int, bandType: String, promise: Promise ->
            mainHandler.post {
                promise.resolve(mapOf(
                    "success" to false,
                    "error" to "Native FM/AM radio hardware is not available on this device"
                ))
            }
        }
        
        AsyncFunction("seekUp") { promise: Promise ->
            mainHandler.post {
                promise.resolve(mapOf(
                    "success" to false,
                    "error" to "Native FM/AM radio hardware is not available on this device"
                ))
            }
        }
        
        AsyncFunction("seekDown") { promise: Promise ->
            mainHandler.post {
                promise.resolve(mapOf(
                    "success" to false,
                    "error" to "Native FM/AM radio hardware is not available on this device"
                ))
            }
        }
        
        AsyncFunction("play") { promise: Promise ->
            mainHandler.post {
                promise.resolve(mapOf(
                    "success" to false,
                    "error" to "Native FM/AM radio hardware is not available on this device"
                ))
            }
        }
        
        AsyncFunction("stop") { promise: Promise ->
            mainHandler.post {
                promise.resolve(mapOf("success" to true))
            }
        }
        
        AsyncFunction("getAudioSessionId") { promise: Promise ->
            mainHandler.post {
                promise.resolve(mapOf(
                    "audioSessionId" to audioSessionId
                ))
            }
        }
        
        AsyncFunction("release") { promise: Promise ->
            ensureRadioHandler().post {
                try {
                    isPlaying.set(false)
                    
                    try {
                        audioManager?.unregisterAudioDeviceCallback(audioDeviceCallback)
                    } catch (e: Exception) {}
                    
                    isInitialized = false
                    
                    radioHandlerThread?.quitSafely()
                    radioHandlerThread = null
                    radioHandler = null
                    
                    mainHandler.post {
                        promise.resolve(mapOf("success" to true))
                    }
                } catch (e: Exception) {
                    mainHandler.post { promise.reject("RELEASE_ERROR", e.message, e) }
                }
            }
        }
        
        Function("getCurrentState") {
            return@Function mapOf(
                "isPlaying" to isPlaying.get(),
                "frequency" to frequencyToDisplayUnit(currentFrequency, currentBandType),
                "frequencyHz" to currentFrequency,
                "bandType" to currentBandType,
                "signalStrength" to currentSignalStrength,
                "hasAntenna" to hasHeadphoneAntenna,
                "isAvailable" to false,
                "unavailableReason" to "Native FM/AM radio hardware is not available"
            )
        }
    }
}
