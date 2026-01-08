package com.newaudio360.app.audio.recording

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import javax.inject.Inject
import javax.inject.Singleton

data class RecordingStatus(
    val isRecording: Boolean = false,
    val isPaused: Boolean = false,
    val durationMs: Long = 0L,
    val bytesWritten: Long = 0L
)

data class RecordingConfig(
    val audioSessionId: Int = 0,
    val sampleRate: Int = SAMPLE_RATE,
    val channels: Int = 1,
    val bitDepth: Int = 16,
    val echoCancelerEnabled: Boolean = false,
    val noiseSuppressorEnabled: Boolean = false,
    val agcEnabled: Boolean = false
)

data class RecordingResult(
    val uri: String,
    val durationMs: Long,
    val fileSize: Long
)

data class AudioEffectsAvailability(
    val acousticEchoCanceler: Boolean,
    val noiseSuppressor: Boolean,
    val automaticGainControl: Boolean
)

private const val SAMPLE_RATE = 48000
private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
private const val AUDIO_SOURCE = MediaRecorder.AudioSource.VOICE_PERFORMANCE

@Singleton
class RecordingEngine @Inject constructor() {

    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    private var outputFile: File? = null
    private var fileOutputStream: FileOutputStream? = null

    private var echoCanceler: AcousticEchoCanceler? = null
    private var noiseSuppressor: NoiseSuppressor? = null
    private var automaticGainControl: AutomaticGainControl? = null

    private var totalBytesWritten: Long = 0
    private var inputGain: Float = 1.0f
    private val scope = CoroutineScope(Dispatchers.IO)

    private val _status = MutableStateFlow(RecordingStatus())
    val status: StateFlow<RecordingStatus> = _status.asStateFlow()

    private val _config = MutableStateFlow<RecordingConfig?>(null)
    val config: StateFlow<RecordingConfig?> = _config.asStateFlow()

    fun getAudioEffectsAvailability(): AudioEffectsAvailability {
        return AudioEffectsAvailability(
            acousticEchoCanceler = AcousticEchoCanceler.isAvailable(),
            noiseSuppressor = NoiseSuppressor.isAvailable(),
            automaticGainControl = AutomaticGainControl.isAvailable()
        )
    }

    fun startRecording(
        outputPath: String,
        enableEchoCanceler: Boolean = true,
        enableNoiseSuppressor: Boolean = true,
        enableAgc: Boolean = true
    ): Result<RecordingConfig> {
        return try {
            if (_status.value.isRecording) {
                return Result.failure(IllegalStateException("Recording is already in progress"))
            }

            val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT) * 2

            audioRecord = AudioRecord(
                AUDIO_SOURCE,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                return Result.failure(IllegalStateException("Failed to initialize AudioRecord"))
            }

            val audioSessionId = audioRecord!!.audioSessionId

            var echoCancelerEnabled = false
            var noiseSuppressorEnabled = false
            var agcEnabled = false

            if (enableEchoCanceler && AcousticEchoCanceler.isAvailable()) {
                echoCanceler = AcousticEchoCanceler.create(audioSessionId)
                echoCanceler?.enabled = true
                echoCancelerEnabled = echoCanceler?.enabled == true
            }

            if (enableNoiseSuppressor && NoiseSuppressor.isAvailable()) {
                noiseSuppressor = NoiseSuppressor.create(audioSessionId)
                noiseSuppressor?.enabled = true
                noiseSuppressorEnabled = noiseSuppressor?.enabled == true
            }

            if (enableAgc && AutomaticGainControl.isAvailable()) {
                automaticGainControl = AutomaticGainControl.create(audioSessionId)
                automaticGainControl?.enabled = true
                agcEnabled = automaticGainControl?.enabled == true
            }

            outputFile = File(outputPath)
            fileOutputStream = FileOutputStream(outputFile)

            writeWavHeader(fileOutputStream!!, SAMPLE_RATE, 1, 16)

            totalBytesWritten = 0

            _status.value = RecordingStatus(isRecording = true, isPaused = false)

            audioRecord?.startRecording()

            recordingJob = scope.launch {
                val buffer = ShortArray(bufferSize / 2)
                val byteBuffer = ByteArray(bufferSize)

                while (isActive && _status.value.isRecording) {
                    if (!_status.value.isPaused) {
                        val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                        if (read > 0) {
                            for (i in 0 until read) {
                                var sample = (buffer[i] * inputGain).toInt()
                                sample = sample.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
                                byteBuffer[i * 2] = (sample and 0xFF).toByte()
                                byteBuffer[i * 2 + 1] = ((sample shr 8) and 0xFF).toByte()
                            }
                            fileOutputStream?.write(byteBuffer, 0, read * 2)
                            totalBytesWritten += read * 2

                            _status.value = _status.value.copy(
                                bytesWritten = totalBytesWritten,
                                durationMs = calculateDurationMs()
                            )
                        }
                    } else {
                        kotlinx.coroutines.delay(50)
                    }
                }
            }

            val recordingConfig = RecordingConfig(
                audioSessionId = audioSessionId,
                sampleRate = SAMPLE_RATE,
                channels = 1,
                bitDepth = 16,
                echoCancelerEnabled = echoCancelerEnabled,
                noiseSuppressorEnabled = noiseSuppressorEnabled,
                agcEnabled = agcEnabled
            )

            _config.value = recordingConfig
            Result.success(recordingConfig)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun pauseRecording(): Result<Unit> {
        return try {
            if (!_status.value.isRecording) {
                return Result.failure(IllegalStateException("No recording in progress"))
            }
            _status.value = _status.value.copy(isPaused = true)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun resumeRecording(): Result<Unit> {
        return try {
            if (!_status.value.isRecording) {
                return Result.failure(IllegalStateException("No recording in progress"))
            }
            _status.value = _status.value.copy(isPaused = false)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun stopRecording(): Result<RecordingResult> {
        return try {
            if (!_status.value.isRecording) {
                return Result.failure(IllegalStateException("No recording in progress"))
            }

            _status.value = _status.value.copy(isRecording = false)

            recordingJob?.join()
            recordingJob = null

            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null

            releaseEffects()

            fileOutputStream?.close()
            fileOutputStream = null

            outputFile?.let { file ->
                updateWavHeader(file, totalBytesWritten)
            }

            val durationMs = calculateDurationMs()

            val result = RecordingResult(
                uri = outputFile?.absolutePath ?: "",
                durationMs = durationMs,
                fileSize = outputFile?.length() ?: 0L
            )

            _status.value = RecordingStatus()
            _config.value = null

            Result.success(result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun cancelRecording(): Result<Unit> {
        return try {
            _status.value = _status.value.copy(isRecording = false)

            recordingJob?.join()
            recordingJob = null

            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null

            releaseEffects()

            fileOutputStream?.close()
            fileOutputStream = null

            outputFile?.delete()
            outputFile = null

            totalBytesWritten = 0
            _status.value = RecordingStatus()
            _config.value = null

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setInputGain(gain: Float): Result<Float> {
        return try {
            inputGain = gain.coerceIn(0f, 3f)
            Result.success(inputGain)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun calculateDurationMs(): Long {
        return (totalBytesWritten.toDouble() / (SAMPLE_RATE * 2) * 1000).toLong()
    }

    private fun releaseEffects() {
        echoCanceler?.release()
        echoCanceler = null
        noiseSuppressor?.release()
        noiseSuppressor = null
        automaticGainControl?.release()
        automaticGainControl = null
    }

    private fun writeWavHeader(out: FileOutputStream, sampleRate: Int, channels: Int, bitsPerSample: Int) {
        val byteRate = sampleRate * channels * bitsPerSample / 8
        val blockAlign = channels * bitsPerSample / 8

        val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
        header.put("RIFF".toByteArray())
        header.putInt(0)
        header.put("WAVE".toByteArray())
        header.put("fmt ".toByteArray())
        header.putInt(16)
        header.putShort(1)
        header.putShort(channels.toShort())
        header.putInt(sampleRate)
        header.putInt(byteRate)
        header.putShort(blockAlign.toShort())
        header.putShort(bitsPerSample.toShort())
        header.put("data".toByteArray())
        header.putInt(0)

        out.write(header.array())
    }

    private fun updateWavHeader(file: File, dataSize: Long) {
        val raf = RandomAccessFile(file, "rw")
        raf.seek(4)
        raf.write(intToByteArrayLE((dataSize + 36).toInt()))
        raf.seek(40)
        raf.write(intToByteArrayLE(dataSize.toInt()))
        raf.close()
    }

    private fun intToByteArrayLE(value: Int): ByteArray {
        return byteArrayOf(
            (value and 0xFF).toByte(),
            ((value shr 8) and 0xFF).toByte(),
            ((value shr 16) and 0xFF).toByte(),
            ((value shr 24) and 0xFF).toByte()
        )
    }

    fun release() {
        scope.launch {
            cancelRecording()
        }
    }
}
