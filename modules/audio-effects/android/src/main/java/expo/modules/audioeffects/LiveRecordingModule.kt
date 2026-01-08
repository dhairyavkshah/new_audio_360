package expo.modules.audioeffects

import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.concurrent.thread

class LiveRecordingModule : Module() {
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var isPaused = false
    private var recordingThread: Thread? = null
    private var outputFile: File? = null
    private var fileOutputStream: FileOutputStream? = null
    
    private var echoCanceler: AcousticEchoCanceler? = null
    private var noiseSuppressor: NoiseSuppressor? = null
    private var automaticGainControl: AutomaticGainControl? = null
    
    private var totalBytesWritten: Long = 0
    private var inputGain: Float = 1.0f
    
    companion object {
        private const val SAMPLE_RATE = 48000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val AUDIO_SOURCE = MediaRecorder.AudioSource.VOICE_PERFORMANCE
    }
    
    override fun definition() = ModuleDefinition {
        Name("LiveRecordingModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        Function("getAudioEffectsAvailability") {
            val result = mutableMapOf<String, Boolean>()
            result["acousticEchoCanceler"] = AcousticEchoCanceler.isAvailable()
            result["noiseSuppressor"] = NoiseSuppressor.isAvailable()
            result["automaticGainControl"] = AutomaticGainControl.isAvailable()
            return@Function result
        }
        
        AsyncFunction("startRecording") { outputPath: String, enableEchoCanceler: Boolean, enableNoiseSuppressor: Boolean, enableAgc: Boolean, promise: Promise ->
            try {
                if (isRecording) {
                    promise.reject("ALREADY_RECORDING", "Recording is already in progress", null)
                    return@AsyncFunction
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
                    promise.reject("INIT_FAILED", "Failed to initialize AudioRecord", null)
                    return@AsyncFunction
                }
                
                val audioSessionId = audioRecord!!.audioSessionId
                
                if (enableEchoCanceler && AcousticEchoCanceler.isAvailable()) {
                    echoCanceler = AcousticEchoCanceler.create(audioSessionId)
                    echoCanceler?.enabled = true
                }
                
                if (enableNoiseSuppressor && NoiseSuppressor.isAvailable()) {
                    noiseSuppressor = NoiseSuppressor.create(audioSessionId)
                    noiseSuppressor?.enabled = true
                }
                
                if (enableAgc && AutomaticGainControl.isAvailable()) {
                    automaticGainControl = AutomaticGainControl.create(audioSessionId)
                    automaticGainControl?.enabled = true
                }
                
                outputFile = File(outputPath)
                fileOutputStream = FileOutputStream(outputFile)
                
                writeWavHeader(fileOutputStream!!, SAMPLE_RATE, 1, 16)
                
                totalBytesWritten = 0
                isRecording = true
                isPaused = false
                
                audioRecord?.startRecording()
                
                recordingThread = thread {
                    val buffer = ShortArray(bufferSize / 2)
                    val byteBuffer = ByteArray(bufferSize)
                    
                    while (isRecording) {
                        if (!isPaused) {
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
                            }
                        } else {
                            Thread.sleep(50)
                        }
                    }
                }
                
                val result = mutableMapOf<String, Any>()
                result["success"] = true
                result["audioSessionId"] = audioSessionId
                result["sampleRate"] = SAMPLE_RATE
                result["channels"] = 1
                result["bitDepth"] = 16
                result["echoCancelerEnabled"] = echoCanceler?.enabled == true
                result["noiseSuppressorEnabled"] = noiseSuppressor?.enabled == true
                result["agcEnabled"] = automaticGainControl?.enabled == true
                promise.resolve(result)
                
            } catch (e: Exception) {
                promise.reject("START_ERROR", e.message, e)
            }
        }
        
        AsyncFunction("pauseRecording") { promise: Promise ->
            if (!isRecording) {
                promise.reject("NOT_RECORDING", "No recording in progress", null)
                return@AsyncFunction
            }
            isPaused = true
            promise.resolve(mapOf("success" to true))
        }
        
        AsyncFunction("resumeRecording") { promise: Promise ->
            if (!isRecording) {
                promise.reject("NOT_RECORDING", "No recording in progress", null)
                return@AsyncFunction
            }
            isPaused = false
            promise.resolve(mapOf("success" to true))
        }
        
        AsyncFunction("stopRecording") { promise: Promise ->
            try {
                if (!isRecording) {
                    promise.reject("NOT_RECORDING", "No recording in progress", null)
                    return@AsyncFunction
                }
                
                isRecording = false
                recordingThread?.join(1000)
                
                audioRecord?.stop()
                audioRecord?.release()
                audioRecord = null
                
                echoCanceler?.release()
                echoCanceler = null
                noiseSuppressor?.release()
                noiseSuppressor = null
                automaticGainControl?.release()
                automaticGainControl = null
                
                fileOutputStream?.close()
                fileOutputStream = null
                
                outputFile?.let { file ->
                    updateWavHeader(file, totalBytesWritten)
                }
                
                val durationMs = (totalBytesWritten.toDouble() / (SAMPLE_RATE * 2) * 1000).toLong()
                
                val result = mutableMapOf<String, Any>()
                result["success"] = true
                result["uri"] = outputFile?.absolutePath ?: ""
                result["durationMs"] = durationMs
                result["fileSize"] = outputFile?.length() ?: 0L
                promise.resolve(result)
                
            } catch (e: Exception) {
                promise.reject("STOP_ERROR", e.message, e)
            }
        }
        
        Function("setInputGain") { gain: Double ->
            inputGain = gain.toFloat().coerceIn(0.0f, 3.0f)
            return@Function mapOf("success" to true, "gain" to inputGain)
        }
        
        Function("getRecordingStatus") {
            val result = mutableMapOf<String, Any>()
            result["isRecording"] = isRecording
            result["isPaused"] = isPaused
            result["durationMs"] = if (isRecording) {
                (totalBytesWritten.toDouble() / (SAMPLE_RATE * 2) * 1000).toLong()
            } else 0L
            result["bytesWritten"] = totalBytesWritten
            return@Function result
        }
        
        AsyncFunction("cancelRecording") { promise: Promise ->
            try {
                isRecording = false
                recordingThread?.join(1000)
                
                audioRecord?.stop()
                audioRecord?.release()
                audioRecord = null
                
                echoCanceler?.release()
                echoCanceler = null
                noiseSuppressor?.release()
                noiseSuppressor = null
                automaticGainControl?.release()
                automaticGainControl = null
                
                fileOutputStream?.close()
                fileOutputStream = null
                
                outputFile?.delete()
                outputFile = null
                
                totalBytesWritten = 0
                
                promise.resolve(mapOf("success" to true))
            } catch (e: Exception) {
                promise.reject("CANCEL_ERROR", e.message, e)
            }
        }
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
}
