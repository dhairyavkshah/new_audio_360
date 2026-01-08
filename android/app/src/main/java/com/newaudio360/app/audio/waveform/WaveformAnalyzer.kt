package com.newaudio360.app.audio.waveform

import android.media.audiofx.Visualizer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs
import kotlin.math.sqrt

data class WaveformData(
    val waveform: List<Int> = emptyList(),
    val rms: Double = 0.0,
    val peak: Int = 0,
    val samplingRate: Int = 0,
    val timestamp: Long = 0L
)

data class FftData(
    val magnitudes: List<Double> = emptyList(),
    val samplingRate: Int = 0,
    val timestamp: Long = 0L
)

data class WaveformConfig(
    val captureSize: Int = 0,
    val samplingRate: Int = 0,
    val minCaptureSize: Int = 0,
    val maxCaptureSize: Int = 0,
    val maxCaptureRate: Int = 0
)

@Singleton
class WaveformAnalyzer @Inject constructor() {

    private var visualizer: Visualizer? = null
    private var audioSessionId: Int = 0
    private var isCapturing = false
    private val scope = CoroutineScope(Dispatchers.Main)

    private val _waveformData = MutableStateFlow(WaveformData())
    val waveformData: StateFlow<WaveformData> = _waveformData.asStateFlow()

    private val _fftData = MutableStateFlow(FftData())
    val fftData: StateFlow<FftData> = _fftData.asStateFlow()

    private val _isCapturingState = MutableStateFlow(false)
    val isCapturingState: StateFlow<Boolean> = _isCapturingState.asStateFlow()

    fun attach(sessionId: Int): Result<WaveformConfig> {
        return try {
            release()

            audioSessionId = sessionId
            visualizer = Visualizer(sessionId).apply {
                captureSize = Visualizer.getCaptureSizeRange()[1]
                scalingMode = Visualizer.SCALING_MODE_NORMALIZED
                measurementMode = Visualizer.MEASUREMENT_MODE_PEAK_RMS
            }

            val vis = visualizer!!
            val config = WaveformConfig(
                captureSize = vis.captureSize,
                samplingRate = vis.samplingRate,
                minCaptureSize = Visualizer.getCaptureSizeRange()[0],
                maxCaptureSize = Visualizer.getCaptureSizeRange()[1],
                maxCaptureRate = Visualizer.getMaxCaptureRate()
            )

            Result.success(config)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun startCapture(rateHz: Int = 60): Result<Unit> {
        return try {
            val vis = visualizer ?: return Result.failure(IllegalStateException("Visualizer not attached"))

            val captureRate = rateHz.coerceIn(1, 60)

            vis.setDataCaptureListener(object : Visualizer.OnDataCaptureListener {
                override fun onWaveFormDataCapture(
                    visualizer: Visualizer?,
                    waveform: ByteArray?,
                    samplingRate: Int
                ) {
                    waveform?.let { data ->
                        scope.launch {
                            val samples = data.map { (it.toInt() and 0xFF) - 128 }
                            val rms = calculateRMS(samples)
                            val peak = samples.maxOfOrNull { abs(it) } ?: 0
                            val downsampledWaveform = downsample(samples, 64)

                            _waveformData.value = WaveformData(
                                waveform = downsampledWaveform,
                                rms = rms,
                                peak = peak,
                                samplingRate = samplingRate,
                                timestamp = System.currentTimeMillis()
                            )
                        }
                    }
                }

                override fun onFftDataCapture(
                    visualizer: Visualizer?,
                    fft: ByteArray?,
                    samplingRate: Int
                ) {
                    fft?.let { data ->
                        scope.launch {
                            val magnitudes = calculateFFTMagnitudes(data)
                            val bands = groupIntoBands(magnitudes, 32)

                            _fftData.value = FftData(
                                magnitudes = bands,
                                samplingRate = samplingRate,
                                timestamp = System.currentTimeMillis()
                            )
                        }
                    }
                }
            }, Visualizer.getMaxCaptureRate(), true, true)

            vis.enabled = true
            isCapturing = true
            _isCapturingState.value = true

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun stopCapture(): Result<Unit> {
        return try {
            visualizer?.enabled = false
            visualizer?.setDataCaptureListener(null, 0, false, false)
            isCapturing = false
            _isCapturingState.value = false
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getWaveformSnapshot(): WaveformData? {
        val vis = visualizer ?: return null

        if (!vis.enabled) {
            return null
        }

        val waveformData = ByteArray(vis.captureSize)
        val status = vis.getWaveForm(waveformData)

        if (status != Visualizer.SUCCESS) {
            return null
        }

        val samples = waveformData.map { (it.toInt() and 0xFF) - 128 }
        val rms = calculateRMS(samples)
        val peak = samples.maxOfOrNull { abs(it) } ?: 0
        val downsampled = downsample(samples, 64)

        return WaveformData(
            waveform = downsampled,
            rms = rms,
            peak = peak,
            samplingRate = vis.samplingRate,
            timestamp = System.currentTimeMillis()
        )
    }

    fun getFftSnapshot(): FftData? {
        val vis = visualizer ?: return null

        if (!vis.enabled) {
            return null
        }

        val fftData = ByteArray(vis.captureSize)
        val status = vis.getFft(fftData)

        if (status != Visualizer.SUCCESS) {
            return null
        }

        val magnitudes = calculateFFTMagnitudes(fftData)
        val bands = groupIntoBands(magnitudes, 32)

        return FftData(
            magnitudes = bands,
            samplingRate = vis.samplingRate,
            timestamp = System.currentTimeMillis()
        )
    }

    fun getMeasurements(): Pair<Int, Int>? {
        val vis = visualizer ?: return null

        val measurement = Visualizer.MeasurementPeakRms()
        val status = vis.getMeasurementPeakRms(measurement)

        return if (status == Visualizer.SUCCESS) {
            Pair(measurement.mPeak, measurement.mRms)
        } else {
            null
        }
    }

    fun setCaptureSize(size: Int): Result<Int> {
        return try {
            val vis = visualizer ?: return Result.failure(IllegalStateException("Visualizer not attached"))

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

            Result.success(vis.captureSize)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun calculateRMS(samples: List<Int>): Double {
        if (samples.isEmpty()) return 0.0
        val sumSquares = samples.sumOf { it.toDouble() * it.toDouble() }
        return sqrt(sumSquares / samples.size)
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
                val maxAbs = segment.maxOfOrNull { abs(it) } ?: 0
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
            val magnitude = sqrt(real * real + imag * imag)
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

    fun release() {
        visualizer?.enabled = false
        visualizer?.release()
        visualizer = null
        isCapturing = false
        audioSessionId = 0
        _isCapturingState.value = false
        _waveformData.value = WaveformData()
        _fftData.value = FftData()
    }
}
