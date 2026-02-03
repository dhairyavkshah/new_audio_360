package expo.modules.audioeffects

import android.media.audiofx.Visualizer
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class WaveformAnalyzerModule : Module() {
    private var visualizer: Visualizer? = null
    private var audioSessionId: Int = 0
    private var isCapturing = false
    private var captureHandler: Handler? = null
    private var captureRunnable: Runnable? = null
    private var captureRate = 60 // Default 60 Hz
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    override fun definition() = ModuleDefinition {
        Name("WaveformAnalyzerModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            mainHandler.post {
                try {
                    release()
                    
                    audioSessionId = sessionId
                    android.util.Log.d("WaveformAnalyzer", "Attempting to attach Visualizer to audio session: $sessionId")
                    
                    try {
                        visualizer = Visualizer(sessionId).apply {
                            captureSize = Visualizer.getCaptureSizeRange()[1]
                            scalingMode = Visualizer.SCALING_MODE_NORMALIZED
                            measurementMode = Visualizer.MEASUREMENT_MODE_PEAK_RMS
                        }
                    } catch (e: RuntimeException) {
                        val errorCode = when {
                            e.message?.contains("-3") == true -> -3
                            e.message?.contains("-1") == true -> -1
                            e.message?.contains("-4") == true -> -4
                            else -> 0
                        }
                        
                        val userMessage = when (errorCode) {
                            -3 -> "Cannot initialize audio visualizer. The audio session may not be ready yet or another app is using it. Try playing some audio first."
                            -1 -> "Audio visualizer initialization failed. Please check if the app has RECORD_AUDIO permission."
                            -4 -> "Audio visualizer is already in use. Please stop any other visualizer first."
                            else -> "Audio visualizer initialization failed: ${e.message}. Try restarting the app."
                        }
                        
                        android.util.Log.e("WaveformAnalyzer", "Visualizer init failed with error code $errorCode: ${e.message}")
                        promise.reject("VISUALIZER_INIT_ERROR", userMessage, e)
                        return@post
                    }
                    
                    val vis = visualizer!!
                    android.util.Log.d("WaveformAnalyzer", "Visualizer attached successfully. Capture size: ${vis.captureSize}")
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "captureSize" to vis.captureSize,
                        "samplingRate" to vis.samplingRate,
                        "minCaptureSize" to Visualizer.getCaptureSizeRange()[0],
                        "maxCaptureSize" to Visualizer.getCaptureSizeRange()[1],
                        "maxCaptureRate" to Visualizer.getMaxCaptureRate()
                    ))
                    
                } catch (e: Exception) {
                    android.util.Log.e("WaveformAnalyzer", "Unexpected error attaching visualizer: ${e.message}", e)
                    promise.reject("ATTACH_ERROR", "Failed to attach audio visualizer: ${e.message}", e)
                }
            }
        }
        
        AsyncFunction("startCapture") { rateHz: Int, promise: Promise ->
            mainHandler.post {
                try {
                    val vis = visualizer ?: throw Exception("Visualizer not attached")
                    
                    captureRate = rateHz.coerceIn(1, 60)
                    
                    vis.setDataCaptureListener(object : Visualizer.OnDataCaptureListener {
                        override fun onWaveFormDataCapture(
                            visualizer: Visualizer?,
                            waveform: ByteArray?,
                            samplingRate: Int
                        ) {
                            waveform?.let { data ->
                                val samples = data.map { (it.toInt() and 0xFF) - 128 }
                                val rms = calculateRMS(samples)
                                val peak = samples.maxOfOrNull { kotlin.math.abs(it) } ?: 0
                                
                                val downsampledWaveform = downsample(samples, 64)
                                
                                sendEvent("onWaveformData", mapOf(
                                    "waveform" to downsampledWaveform,
                                    "rms" to rms,
                                    "peak" to peak,
                                    "samplingRate" to samplingRate
                                ))
                            }
                        }
                        
                        override fun onFftDataCapture(
                            visualizer: Visualizer?,
                            fft: ByteArray?,
                            samplingRate: Int
                        ) {
                            fft?.let { data ->
                                val magnitudes = calculateFFTMagnitudes(data)
                                val bands = groupIntoBands(magnitudes, 32)
                                
                                sendEvent("onFftData", mapOf(
                                    "magnitudes" to bands,
                                    "samplingRate" to samplingRate
                                ))
                            }
                        }
                    }, Visualizer.getMaxCaptureRate(), true, true)
                    
                    vis.enabled = true
                    isCapturing = true
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "captureRate" to captureRate
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("CAPTURE_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("stopCapture") { promise: Promise ->
            mainHandler.post {
                try {
                    visualizer?.enabled = false
                    visualizer?.setDataCaptureListener(null, 0, false, false)
                    isCapturing = false
                    
                    promise.resolve(mapOf("success" to true))
                    
                } catch (e: Exception) {
                    promise.reject("STOP_ERROR", e.message, e)
                }
            }
        }
        
        Function("getWaveformSnapshot") {
            val vis = visualizer ?: return@Function mapOf<String, Any>()
            
            if (!vis.enabled) {
                return@Function mapOf("error" to "Visualizer not enabled")
            }
            
            val waveformData = ByteArray(vis.captureSize)
            val status = vis.getWaveForm(waveformData)
            
            if (status != Visualizer.SUCCESS) {
                return@Function mapOf("error" to "Failed to capture waveform")
            }
            
            val samples = waveformData.map { (it.toInt() and 0xFF) - 128 }
            val rms = calculateRMS(samples)
            val peak = samples.maxOfOrNull { kotlin.math.abs(it) } ?: 0
            val downsampled = downsample(samples, 64)
            
            return@Function mapOf(
                "waveform" to downsampled,
                "rms" to rms,
                "peak" to peak,
                "captureSize" to vis.captureSize
            )
        }
        
        Function("getFftSnapshot") {
            val vis = visualizer ?: return@Function mapOf<String, Any>()
            
            if (!vis.enabled) {
                return@Function mapOf("error" to "Visualizer not enabled")
            }
            
            val fftData = ByteArray(vis.captureSize)
            val status = vis.getFft(fftData)
            
            if (status != Visualizer.SUCCESS) {
                return@Function mapOf("error" to "Failed to capture FFT")
            }
            
            val magnitudes = calculateFFTMagnitudes(fftData)
            val bands = groupIntoBands(magnitudes, 32)
            
            return@Function mapOf(
                "magnitudes" to bands,
                "captureSize" to vis.captureSize
            )
        }
        
        Function("getMeasurements") {
            val vis = visualizer ?: return@Function mapOf<String, Any>()
            
            val measurement = Visualizer.MeasurementPeakRms()
            val status = vis.getMeasurementPeakRms(measurement)
            
            if (status != Visualizer.SUCCESS) {
                return@Function mapOf("error" to "Failed to get measurements")
            }
            
            return@Function mapOf(
                "peak" to measurement.mPeak,
                "rms" to measurement.mRms
            )
        }
        
        Function("setCaptureSize") { size: Int ->
            val vis = visualizer ?: return@Function mapOf("success" to false, "error" to "Not attached")
            
            val range = Visualizer.getCaptureSizeRange()
            val clampedSize = size.coerceIn(range[0], range[1])
            
            val wasEnabled = vis.enabled
            if (wasEnabled) {
                vis.enabled = false
            }
            
            vis.captureSize = clampedSize
            
            if (wasEnabled) {
                vis.enabled = true
            }
            
            return@Function mapOf("success" to true, "captureSize" to vis.captureSize)
        }
        
        Function("getProperties") {
            val vis = visualizer ?: return@Function mapOf<String, Any>()
            return@Function mapOf(
                "enabled" to vis.enabled,
                "captureSize" to vis.captureSize,
                "samplingRate" to vis.samplingRate,
                "audioSessionId" to audioSessionId,
                "isCapturing" to isCapturing
            )
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
        
        Events("onWaveformData", "onFftData")
    }
    
    private fun calculateRMS(samples: List<Int>): Double {
        if (samples.isEmpty()) return 0.0
        val sumSquares = samples.sumOf { it.toDouble() * it.toDouble() }
        return kotlin.math.sqrt(sumSquares / samples.size)
    }
    
    private fun downsample(samples: List<Int>, targetSize: Int): List<Int> {
        if (samples.size <= targetSize) return samples
        
        val result = mutableListOf<Int>()
        val step = samples.size.toDouble() / targetSize
        
        for (i in 0 until targetSize) {
            val startIdx = (i * step).toInt()
            val endIdx = ((i + 1) * step).toInt().coerceAtMost(samples.size)
            
            if (startIdx < endIdx) {
                val segment = samples.subList(startIdx, endIdx)
                val maxAbs = segment.maxOfOrNull { kotlin.math.abs(it) } ?: 0
                result.add(maxAbs)
            }
        }
        
        return result
    }
    
    private fun calculateFFTMagnitudes(fft: ByteArray): List<Double> {
        val magnitudes = mutableListOf<Double>()
        
        for (i in 0 until fft.size / 2) {
            val real = fft[2 * i].toDouble()
            val imag = if (2 * i + 1 < fft.size) fft[2 * i + 1].toDouble() else 0.0
            val magnitude = kotlin.math.sqrt(real * real + imag * imag)
            magnitudes.add(magnitude)
        }
        
        return magnitudes
    }
    
    private fun groupIntoBands(magnitudes: List<Double>, numBands: Int): List<Double> {
        if (magnitudes.isEmpty()) return List(numBands) { 0.0 }
        
        val result = mutableListOf<Double>()
        val step = magnitudes.size.toDouble() / numBands
        
        for (i in 0 until numBands) {
            val startIdx = (i * step).toInt()
            val endIdx = ((i + 1) * step).toInt().coerceAtMost(magnitudes.size)
            
            if (startIdx < endIdx) {
                val segment = magnitudes.subList(startIdx, endIdx)
                val avg = segment.average()
                result.add(avg)
            } else {
                result.add(0.0)
            }
        }
        
        return result
    }
    
    private fun release() {
        visualizer?.enabled = false
        visualizer?.release()
        visualizer = null
        isCapturing = false
        audioSessionId = 0
    }
}
