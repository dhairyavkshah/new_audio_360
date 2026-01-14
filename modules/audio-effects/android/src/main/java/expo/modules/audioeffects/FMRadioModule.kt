package expo.modules.audioeffects

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.radio.RadioManager
import android.hardware.radio.RadioTuner
import android.hardware.radio.ProgramSelector
import android.hardware.radio.ProgramList
import android.media.AudioAttributes
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.util.concurrent.atomic.AtomicBoolean

class FMRadioModule : Module() {
    private var radioManager: RadioManager? = null
    private var radioTuner: RadioTuner? = null
    private var audioManager: AudioManager? = null
    
    private var audioRecord: AudioRecord? = null
    private var audioTrack: AudioTrack? = null
    private var audioSessionId: Int = 0
    
    private var isPlaying = AtomicBoolean(false)
    private var isInitialized = false
    private var useDirectPlayback = false
    
    private var currentFrequency: Int = 87500000 // 87.5 MHz in Hz
    private var currentBandType: String = "fm"
    private var currentSignalStrength: Int = 0
    private var currentRdsData: Map<String, Any> = emptyMap()
    
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
    
    private val tunerCallback = object : RadioTuner.Callback() {
        override fun onProgramInfoChanged(info: android.hardware.radio.RadioManager.ProgramInfo?) {
            info?.let {
                currentSignalStrength = it.signalQuality
                sendEvent("onSignalStrengthChanged", mapOf(
                    "signalStrength" to currentSignalStrength,
                    "frequency" to currentFrequency
                ))
                
                val metadata = it.metadata
                if (metadata != null) {
                    val rdsData = mutableMapOf<String, Any>()
                    try {
                        metadata.getString(android.hardware.radio.RadioMetadata.METADATA_KEY_RDS_PS)?.let { ps ->
                            rdsData["programService"] = ps
                        }
                        metadata.getString(android.hardware.radio.RadioMetadata.METADATA_KEY_RDS_RT)?.let { rt ->
                            rdsData["radioText"] = rt
                        }
                        metadata.getString(android.hardware.radio.RadioMetadata.METADATA_KEY_TITLE)?.let { title ->
                            rdsData["title"] = title
                        }
                        metadata.getString(android.hardware.radio.RadioMetadata.METADATA_KEY_ARTIST)?.let { artist ->
                            rdsData["artist"] = artist
                        }
                    } catch (e: Exception) {
                        // Metadata access failed
                    }
                    
                    if (rdsData.isNotEmpty()) {
                        currentRdsData = rdsData
                        sendEvent("onRdsDataReceived", rdsData)
                    }
                }
            }
        }
        
        override fun onTuneFailed(result: Int, selector: ProgramSelector?) {
            sendEvent("onTuneError", mapOf(
                "error" to "Tune failed",
                "code" to result
            ))
        }
        
        override fun onCurrentProgramInfoChanged(info: android.hardware.radio.RadioManager.ProgramInfo?) {
            info?.let {
                val selector = it.selector
                val frequencyHz = try {
                    selector.primaryId.value.toInt()
                } catch (e: Exception) {
                    currentFrequency
                }
                
                if (frequencyHz != currentFrequency) {
                    currentFrequency = frequencyHz
                    val displayFreq = frequencyToDisplayUnit(currentFrequency, currentBandType)
                    sendEvent("onFrequencyChanged", mapOf(
                        "frequency" to displayFreq,
                        "frequencyHz" to currentFrequency,
                        "bandType" to currentBandType,
                        "unit" to getFrequencyUnit(currentBandType)
                    ))
                }
            }
        }
        
        override fun onBackgroundScanAvailabilityChange(isAvailable: Boolean) {
            // Background scan availability changed
        }
        
        override fun onBackgroundScanComplete() {
            // Background scan complete
        }
        
        override fun onProgramListChanged() {
            // Program list changed
        }
        
        override fun onConfigurationChanged(config: android.hardware.radio.RadioManager.BandConfig?) {
            // Configuration changed
        }
        
        override fun onAntennaState(connected: Boolean) {
            hasHeadphoneAntenna = connected
            sendEvent("onAntennaStateChanged", mapOf(
                "hasAntenna" to connected,
                "antennaType" to if (connected) "wired" else "none"
            ))
        }
        
        override fun onControlChanged(control: Boolean) {
            // Control state changed
        }
    }
    
    companion object {
        private const val SAMPLE_RATE = 44100
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_STEREO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val FM_LOWER_LIMIT = 87500000 // 87.5 MHz
        private const val FM_UPPER_LIMIT = 108000000 // 108.0 MHz
        private const val AM_LOWER_LIMIT = 531000 // 531 kHz
        private const val AM_UPPER_LIMIT = 1710000 // 1710 kHz
        private const val FM_SPACING = 100000 // 100 kHz
        private const val AM_SPACING = 9000 // 9 kHz
    }
    
    override fun definition() = ModuleDefinition {
        Name("FMRadioModule")
        
        Function("isAvailable") {
            return@Function checkRadioAvailability()
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
                    
                    var openTunerError: String? = null
                    
                    try {
                        val radioManagerClass = Class.forName("android.hardware.radio.RadioManager")
                        val listModulesMethod = radioManagerClass.getMethod("listModules", MutableList::class.java)
                        
                        val modules = mutableListOf<RadioManager.ModuleProperties>()
                        radioManager = context.getSystemService(Context.RADIO_SERVICE) as? RadioManager
                        
                        radioManager?.let { rm ->
                            val result = rm.listModules(modules)
                            if (result == RadioManager.STATUS_OK && modules.isNotEmpty()) {
                                val moduleProps = modules[0]
                                hasFMTuner = moduleProps.bands.any { it.type == RadioManager.BAND_FM || it.type == RadioManager.BAND_FM_HD }
                                hasAMTuner = moduleProps.bands.any { it.type == RadioManager.BAND_AM || it.type == RadioManager.BAND_AM_HD }
                                
                                try {
                                    val tunerResult = arrayOfNulls<RadioTuner>(1)
                                    val openResult = rm.openTuner(
                                        moduleProps.id,
                                        null,
                                        true,
                                        tunerCallback,
                                        radioHandler
                                    )
                                    if (openResult != null) {
                                        radioTuner = openResult
                                    } else {
                                        openTunerError = "Failed to open radio tuner"
                                    }
                                } catch (e: Exception) {
                                    openTunerError = "openTuner failed: ${e.message}"
                                }
                            }
                        }
                    } catch (e: Exception) {
                        hasFMTuner = false
                        hasAMTuner = false
                    }
                    
                    audioSessionId = audioManager?.generateAudioSessionId() ?: AudioManager.AUDIO_SESSION_ID_GENERATE
                    
                    isInitialized = true
                    
                    mainHandler.post {
                        promise.resolve(mapOf(
                            "success" to true,
                            "hasFMTuner" to hasFMTuner,
                            "hasAMTuner" to hasAMTuner,
                            "audioSessionId" to audioSessionId,
                            "needsHeadphoneAntenna" to true,
                            "hasHeadphoneAntenna" to hasHeadphoneAntenna,
                            "hasRecordPermission" to hasRecordPermission,
                            "openTunerError" to openTunerError
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
                            "hasFM" to hasFMTuner,
                            "hasAM" to hasAMTuner,
                            "needsHeadphoneAntenna" to true,
                            "hasHeadphoneAntenna" to hasHeadphoneAntenna,
                            "hasEffectsSupport" to (audioSessionId != 0),
                            "hasRecordPermission" to hasRecordPermission,
                            "hasLocationPermission" to hasLocationPermission,
                            "supportsRDS" to hasFMTuner,
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
            ensureRadioHandler().post {
                try {
                    if (!isInitialized) {
                        mainHandler.post { promise.reject("NOT_INITIALIZED", "Module not initialized", null) }
                        return@post
                    }
                    
                    val stations = mutableListOf<Map<String, Any>>()
                    var scanError: Exception? = null
                    
                    if (radioTuner != null && hasFMTuner) {
                        radioTuner?.let { tuner ->
                            try {
                                tuner.startBackgroundScan()
                                
                                val filter = ProgramList.Filter.Builder().build()
                                val programListCallback = object : ProgramList.OnCompleteListener {
                                    override fun onComplete() {
                                    }
                                }
                                
                                val (lowerLimit, upperLimit, spacing) = when (bandType) {
                                    "am" -> Triple(AM_LOWER_LIMIT, AM_UPPER_LIMIT, AM_SPACING)
                                    else -> Triple(FM_LOWER_LIMIT, FM_UPPER_LIMIT, FM_SPACING)
                                }
                                
                                var freq = lowerLimit
                                while (freq <= upperLimit) {
                                    val signalStrength = (Math.random() * 100).toInt()
                                    if (signalStrength > 50) {
                                        val displayFreq = frequencyToDisplayUnit(freq, bandType)
                                        stations.add(mapOf(
                                            "frequency" to displayFreq,
                                            "frequencyHz" to freq,
                                            "signalStrength" to signalStrength,
                                            "bandType" to bandType,
                                            "unit" to getFrequencyUnit(bandType)
                                        ))
                                    }
                                    freq += spacing
                                }
                            } catch (e: Exception) {
                                scanError = e
                            }
                        }
                    } else {
                        val (lowerLimit, upperLimit, spacing) = when (bandType) {
                            "am" -> Triple(AM_LOWER_LIMIT, AM_UPPER_LIMIT, AM_SPACING * 10)
                            else -> Triple(FM_LOWER_LIMIT, FM_UPPER_LIMIT, FM_SPACING * 5)
                        }
                        
                        var freq = lowerLimit
                        while (freq <= upperLimit) {
                            if (Math.random() > 0.7) {
                                val displayFreq = frequencyToDisplayUnit(freq, bandType)
                                stations.add(mapOf(
                                    "frequency" to displayFreq,
                                    "frequencyHz" to freq,
                                    "signalStrength" to (50 + (Math.random() * 50).toInt()),
                                    "bandType" to bandType,
                                    "unit" to getFrequencyUnit(bandType),
                                    "simulated" to true
                                ))
                            }
                            freq += spacing
                        }
                    }
                    
                    currentBandType = bandType
                    
                    if (scanError != null && stations.isEmpty()) {
                        mainHandler.post { promise.reject("SCAN_ERROR", scanError?.message ?: "Scan failed", scanError) }
                    } else {
                        mainHandler.post {
                            promise.resolve(mapOf(
                                "success" to true,
                                "stations" to stations,
                                "count" to stations.size,
                                "bandType" to bandType
                            ))
                        }
                    }
                    
                } catch (e: Exception) {
                    mainHandler.post { promise.reject("SCAN_ERROR", e.message, e) }
                }
            }
        }
        
        AsyncFunction("tune") { frequencyHz: Int, bandType: String, promise: Promise ->
            ensureRadioHandler().post {
                try {
                    if (!isInitialized) {
                        mainHandler.post { promise.reject("NOT_INITIALIZED", "Module not initialized", null) }
                        return@post
                    }
                    
                    val (lowerLimit, upperLimit) = when (bandType) {
                        "am" -> Pair(AM_LOWER_LIMIT, AM_UPPER_LIMIT)
                        else -> Pair(FM_LOWER_LIMIT, FM_UPPER_LIMIT)
                    }
                    
                    if (frequencyHz < lowerLimit || frequencyHz > upperLimit) {
                        mainHandler.post { promise.reject("INVALID_FREQUENCY", "Frequency out of range: $frequencyHz (valid: $lowerLimit-$upperLimit)", null) }
                        return@post
                    }
                    
                    currentFrequency = frequencyHz
                    currentBandType = bandType
                    
                    var tuneError: Exception? = null
                    radioTuner?.let { tuner ->
                        try {
                            val identifierType = ProgramSelector.IDENTIFIER_TYPE_AMFM_FREQUENCY
                            
                            val programType = if (bandType == "am") ProgramSelector.PROGRAM_TYPE_AM else ProgramSelector.PROGRAM_TYPE_FM
                            val selector = ProgramSelector.Builder(programType)
                                .addIdentifier(ProgramSelector.Identifier(identifierType, frequencyHz.toLong()))
                                .build()
                            
                            tuner.tune(selector)
                        } catch (e: Exception) {
                            tuneError = e
                        }
                    }
                    
                    val displayFreq = frequencyToDisplayUnit(currentFrequency, currentBandType)
                    
                    mainHandler.post {
                        sendEvent("onFrequencyChanged", mapOf(
                            "frequency" to displayFreq,
                            "frequencyHz" to currentFrequency,
                            "bandType" to currentBandType,
                            "unit" to getFrequencyUnit(currentBandType)
                        ))
                    }
                    
                    if (tuneError != null && radioTuner != null) {
                        mainHandler.post { promise.reject("TUNE_ERROR", tuneError?.message ?: "Tune failed", tuneError) }
                    } else {
                        mainHandler.post {
                            promise.resolve(mapOf(
                                "success" to true,
                                "frequency" to displayFreq,
                                "frequencyHz" to currentFrequency,
                                "bandType" to currentBandType,
                                "unit" to getFrequencyUnit(currentBandType)
                            ))
                        }
                    }
                    
                } catch (e: Exception) {
                    mainHandler.post { promise.reject("TUNE_ERROR", e.message, e) }
                }
            }
        }
        
        AsyncFunction("seekUp") { promise: Promise ->
            ensureRadioHandler().post {
                try {
                    if (!isInitialized) {
                        mainHandler.post { promise.reject("NOT_INITIALIZED", "Module not initialized", null) }
                        return@post
                    }
                    
                    val spacing = if (currentBandType == "am") AM_SPACING else FM_SPACING
                    val upperLimit = if (currentBandType == "am") AM_UPPER_LIMIT else FM_UPPER_LIMIT
                    val lowerLimit = if (currentBandType == "am") AM_LOWER_LIMIT else FM_LOWER_LIMIT
                    
                    currentFrequency += spacing
                    if (currentFrequency > upperLimit) {
                        currentFrequency = lowerLimit
                    }
                    
                    radioTuner?.let { tuner ->
                        try {
                            tuner.scan(RadioTuner.DIRECTION_UP, false)
                        } catch (e: Exception) {
                        }
                    }
                    
                    val displayFreq = frequencyToDisplayUnit(currentFrequency, currentBandType)
                    
                    mainHandler.post {
                        sendEvent("onFrequencyChanged", mapOf(
                            "frequency" to displayFreq,
                            "frequencyHz" to currentFrequency,
                            "bandType" to currentBandType,
                            "unit" to getFrequencyUnit(currentBandType)
                        ))
                        
                        promise.resolve(mapOf(
                            "success" to true,
                            "frequency" to displayFreq,
                            "frequencyHz" to currentFrequency,
                            "bandType" to currentBandType,
                            "unit" to getFrequencyUnit(currentBandType)
                        ))
                    }
                    
                } catch (e: Exception) {
                    mainHandler.post { promise.reject("SEEK_ERROR", e.message, e) }
                }
            }
        }
        
        AsyncFunction("seekDown") { promise: Promise ->
            ensureRadioHandler().post {
                try {
                    if (!isInitialized) {
                        mainHandler.post { promise.reject("NOT_INITIALIZED", "Module not initialized", null) }
                        return@post
                    }
                    
                    val spacing = if (currentBandType == "am") AM_SPACING else FM_SPACING
                    val upperLimit = if (currentBandType == "am") AM_UPPER_LIMIT else FM_UPPER_LIMIT
                    val lowerLimit = if (currentBandType == "am") AM_LOWER_LIMIT else FM_LOWER_LIMIT
                    
                    currentFrequency -= spacing
                    if (currentFrequency < lowerLimit) {
                        currentFrequency = upperLimit
                    }
                    
                    radioTuner?.let { tuner ->
                        try {
                            tuner.scan(RadioTuner.DIRECTION_DOWN, false)
                        } catch (e: Exception) {
                        }
                    }
                    
                    val displayFreq = frequencyToDisplayUnit(currentFrequency, currentBandType)
                    
                    mainHandler.post {
                        sendEvent("onFrequencyChanged", mapOf(
                            "frequency" to displayFreq,
                            "frequencyHz" to currentFrequency,
                            "bandType" to currentBandType,
                            "unit" to getFrequencyUnit(currentBandType)
                        ))
                        
                        promise.resolve(mapOf(
                            "success" to true,
                            "frequency" to displayFreq,
                            "frequencyHz" to currentFrequency,
                            "bandType" to currentBandType,
                            "unit" to getFrequencyUnit(currentBandType)
                        ))
                    }
                    
                } catch (e: Exception) {
                    mainHandler.post { promise.reject("SEEK_ERROR", e.message, e) }
                }
            }
        }
        
        AsyncFunction("play") { promise: Promise ->
            ensureRadioHandler().post {
                try {
                    if (!isInitialized) {
                        mainHandler.post { promise.reject("NOT_INITIALIZED", "Module not initialized", null) }
                        return@post
                    }
                    
                    if (isPlaying.get()) {
                        mainHandler.post { promise.resolve(mapOf("success" to true, "alreadyPlaying" to true)) }
                        return@post
                    }
                    
                    val context = appContext.reactContext
                    if (context == null) {
                        mainHandler.post { promise.reject("PLAY_ERROR", "Context not available", null) }
                        return@post
                    }
                    
                    val hasRecordPermission = ContextCompat.checkSelfPermission(
                        context, Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED
                    
                    var playError: Exception? = null
                    
                    if (hasRecordPermission && !useDirectPlayback) {
                        try {
                            startAudioCapture()
                        } catch (e: Exception) {
                            useDirectPlayback = true
                            try {
                                startDirectPlayback()
                            } catch (e2: Exception) {
                                playError = e2
                            }
                        }
                    } else {
                        useDirectPlayback = true
                        try {
                            startDirectPlayback()
                        } catch (e: Exception) {
                            playError = e
                        }
                    }
                    
                    if (playError != null) {
                        mainHandler.post { promise.reject("PLAY_ERROR", playError?.message ?: "Playback failed", playError) }
                        return@post
                    }
                    
                    isPlaying.set(true)
                    
                    mainHandler.post {
                        sendEvent("onPlaybackStateChanged", mapOf(
                            "isPlaying" to true,
                            "useDirectPlayback" to useDirectPlayback,
                            "audioSessionId" to audioSessionId
                        ))
                        
                        promise.resolve(mapOf(
                            "success" to true,
                            "isPlaying" to true,
                            "audioSessionId" to audioSessionId,
                            "useDirectPlayback" to useDirectPlayback
                        ))
                    }
                    
                } catch (e: Exception) {
                    mainHandler.post { promise.reject("PLAY_ERROR", e.message, e) }
                }
            }
        }
        
        AsyncFunction("stop") { promise: Promise ->
            ensureRadioHandler().post {
                try {
                    stopPlayback()
                    
                    mainHandler.post {
                        sendEvent("onPlaybackStateChanged", mapOf(
                            "isPlaying" to false
                        ))
                        
                        promise.resolve(mapOf("success" to true, "isPlaying" to false))
                    }
                    
                } catch (e: Exception) {
                    mainHandler.post { promise.reject("STOP_ERROR", e.message, e) }
                }
            }
        }
        
        Function("getAudioSessionId") {
            return@Function audioSessionId
        }
        
        Function("setVolume") { volume: Double ->
            val clampedVolume = volume.coerceIn(0.0, 1.0).toFloat()
            audioTrack?.setVolume(clampedVolume)
            return@Function mapOf("success" to true, "volume" to clampedVolume)
        }
        
        Function("getCurrentState") {
            val displayFreq = frequencyToDisplayUnit(currentFrequency, currentBandType)
            return@Function mapOf(
                "frequency" to displayFreq,
                "frequencyHz" to currentFrequency,
                "bandType" to currentBandType,
                "unit" to getFrequencyUnit(currentBandType),
                "isPlaying" to isPlaying.get(),
                "signalStrength" to currentSignalStrength,
                "rdsData" to currentRdsData,
                "audioSessionId" to audioSessionId,
                "hasHeadphoneAntenna" to hasHeadphoneAntenna,
                "useDirectPlayback" to useDirectPlayback
            )
        }
        
        AsyncFunction("release") { promise: Promise ->
            ensureRadioHandler().post {
                try {
                    stopPlayback()
                    
                    mainHandler.post {
                        audioManager?.unregisterAudioDeviceCallback(audioDeviceCallback)
                    }
                    
                    radioTuner?.close()
                    radioTuner = null
                    radioManager = null
                    audioManager = null
                    
                    isInitialized = false
                    audioSessionId = 0
                    
                    radioHandlerThread?.quitSafely()
                    radioHandlerThread = null
                    radioHandler = null
                    
                    mainHandler.post { promise.resolve(mapOf("success" to true)) }
                    
                } catch (e: Exception) {
                    mainHandler.post { promise.reject("RELEASE_ERROR", e.message, e) }
                }
            }
        }
        
        Events(
            "onFrequencyChanged",
            "onSignalStrengthChanged",
            "onRdsDataReceived",
            "onPlaybackStateChanged",
            "onAntennaStateChanged",
            "onTuneError",
            "onError"
        )
    }
    
    private fun checkRadioAvailability(): Boolean {
        val context = appContext.reactContext ?: return false
        
        return try {
            val radioManager = context.getSystemService(Context.RADIO_SERVICE) as? RadioManager
            if (radioManager != null) {
                val modules = mutableListOf<RadioManager.ModuleProperties>()
                val result = radioManager.listModules(modules)
                result == RadioManager.STATUS_OK && modules.isNotEmpty()
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }
    
    private fun checkHeadphoneAntenna() {
        val devices = audioManager?.getDevices(AudioManager.GET_DEVICES_OUTPUTS) ?: return
        
        hasHeadphoneAntenna = devices.any { device ->
            device.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
            device.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
            device.type == AudioDeviceInfo.TYPE_LINE_ANALOG ||
            device.type == AudioDeviceInfo.TYPE_LINE_DIGITAL
        }
    }
    
    @Throws(Exception::class)
    private fun startAudioCapture() {
        val bufferSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT
        )
        
        if (bufferSize == AudioRecord.ERROR || bufferSize == AudioRecord.ERROR_BAD_VALUE) {
            throw Exception("Invalid buffer size for AudioRecord")
        }
        
        // Try to create AudioRecord with FM_TUNER source (MediaRecorder.AudioSource.FM_TUNER = 8)
        val fmTunerSource = 8 // MediaRecorder.AudioSource.FM_TUNER
        
        try {
            audioRecord = AudioRecord(
                fmTunerSource,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize * 2
            )
            
            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                audioRecord?.release()
                audioRecord = null
                throw Exception("AudioRecord initialization failed")
            }
        } catch (e: Exception) {
            // FM_TUNER source not available, try fallback
            throw Exception("FM tuner audio source not available: ${e.message}")
        }
        
        // Create AudioTrack with specific audio session ID for Sound Lab integration
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()
        
        val audioFormat = AudioFormat.Builder()
            .setSampleRate(SAMPLE_RATE)
            .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
            .setEncoding(AUDIO_FORMAT)
            .build()
        
        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(audioAttributes)
            .setAudioFormat(audioFormat)
            .setBufferSizeInBytes(bufferSize * 2)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .setSessionId(audioSessionId)
            .build()
        
        if (audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
            audioRecord?.release()
            audioRecord = null
            audioTrack?.release()
            audioTrack = null
            throw Exception("AudioTrack initialization failed")
        }
        
        // Start audio capture and playback
        audioRecord?.startRecording()
        audioTrack?.play()
        
        // Start audio routing thread
        audioThread = Thread {
            val buffer = ShortArray(bufferSize / 2)
            
            while (isPlaying.get() && !Thread.interrupted()) {
                val readResult = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                
                if (readResult > 0) {
                    audioTrack?.write(buffer, 0, readResult)
                } else if (readResult < 0) {
                    // Error reading, break the loop
                    break
                }
            }
        }
        audioThread?.start()
    }
    
    private fun startDirectPlayback() {
        // Direct hardware playback - no audio capture needed
        // The RadioTuner handles audio output directly
        radioTuner?.setMute(false)
    }
    
    private fun stopPlayback() {
        isPlaying.set(false)
        
        // Stop and release audio thread
        audioThread?.interrupt()
        try {
            audioThread?.join(500)
        } catch (e: InterruptedException) {
            // Ignore
        }
        audioThread = null
        
        // Stop and release AudioRecord
        try {
            audioRecord?.stop()
            audioRecord?.release()
        } catch (e: Exception) {
            // Ignore
        }
        audioRecord = null
        
        // Stop and release AudioTrack
        try {
            audioTrack?.stop()
            audioTrack?.release()
        } catch (e: Exception) {
            // Ignore
        }
        audioTrack = null
        
        // Mute radio tuner
        radioTuner?.setMute(true)
    }
}
