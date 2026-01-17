package expo.modules.audioeffects

import android.content.Context
import android.media.*
import android.media.audiofx.EnvironmentalReverb
import android.media.audiofx.NoiseSuppressor
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.util.Log
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.min

class AudioMixerModule : Module() {
    companion object {
        private const val TAG = "AudioMixerModule"
        private const val SAMPLE_RATE = 44100
        private const val CHANNEL_COUNT = 2
        private const val BIT_RATE = 320000
        private const val BUFFER_SIZE = 4096
    }

    override fun definition() = ModuleDefinition {
        Name("AudioMixerModule")

        AsyncFunction("mixAndExport") { 
            backingTrackUri: String,
            voiceTrackUri: String,
            outputFileName: String,
            musicVolume: Double,
            voiceVolume: Double,
            syncOffsetMs: Int,
            reverbPreset: String,
            noiseReduction: String,
            promise: Promise ->
            
            try {
                val context = appContext.reactContext ?: throw Exception("Context not available")
                
                Log.d(TAG, "Starting mix: backing=$backingTrackUri, voice=$voiceTrackUri")
                Log.d(TAG, "Settings: musicVol=$musicVolume, voiceVol=$voiceVolume, offset=$syncOffsetMs")
                Log.d(TAG, "Effects: reverb=$reverbPreset, noise=$noiseReduction")
                
                val outputDir = File(context.getExternalFilesDir(Environment.DIRECTORY_MUSIC), "recordings")
                if (!outputDir.exists()) {
                    outputDir.mkdirs()
                }
                
                val timestamp = System.currentTimeMillis()
                val safeFileName = outputFileName.replace(Regex("[^a-zA-Z0-9_\\-]"), "_")
                val outputFile = File(outputDir, "${safeFileName}_$timestamp.m4a")
                
                val result = performMix(
                    context,
                    backingTrackUri,
                    voiceTrackUri,
                    outputFile,
                    musicVolume.toFloat(),
                    voiceVolume.toFloat(),
                    syncOffsetMs,
                    reverbPreset,
                    noiseReduction
                )
                
                if (result.success) {
                    Log.d(TAG, "Mix completed successfully: ${outputFile.absolutePath}")
                    promise.resolve(mapOf(
                        "success" to true,
                        "uri" to outputFile.absolutePath,
                        "fileName" to outputFile.name,
                        "duration" to result.durationMs,
                        "fileSize" to outputFile.length()
                    ))
                } else {
                    promise.reject("MIX_ERROR", result.error ?: "Unknown error", null)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Mix failed: ${e.message}", e)
                promise.reject("MIX_ERROR", e.message ?: "Unknown error", e)
            }
        }

        AsyncFunction("copyVoiceRecording") {
            sourceUri: String,
            outputFileName: String,
            promise: Promise ->
            
            try {
                val context = appContext.reactContext ?: throw Exception("Context not available")
                
                val outputDir = File(context.getExternalFilesDir(Environment.DIRECTORY_MUSIC), "recordings")
                if (!outputDir.exists()) {
                    outputDir.mkdirs()
                }
                
                val timestamp = System.currentTimeMillis()
                val safeFileName = outputFileName.replace(Regex("[^a-zA-Z0-9_\\-]"), "_")
                val outputFile = File(outputDir, "${safeFileName}_$timestamp.m4a")
                
                val sourceFile = if (sourceUri.startsWith("file://")) {
                    File(Uri.parse(sourceUri).path!!)
                } else if (sourceUri.startsWith("/")) {
                    File(sourceUri)
                } else {
                    throw Exception("Invalid source URI: $sourceUri")
                }
                
                if (!sourceFile.exists()) {
                    throw Exception("Source file does not exist: ${sourceFile.absolutePath}")
                }
                
                sourceFile.copyTo(outputFile, overwrite = true)
                
                Log.d(TAG, "Voice recording copied: ${outputFile.absolutePath}")
                promise.resolve(mapOf(
                    "success" to true,
                    "uri" to outputFile.absolutePath,
                    "fileName" to outputFile.name,
                    "fileSize" to outputFile.length()
                ))
            } catch (e: Exception) {
                Log.e(TAG, "Copy failed: ${e.message}", e)
                promise.reject("COPY_ERROR", e.message ?: "Unknown error", e)
            }
        }

        Function("getRecordingsDirectory") {
            val context = appContext.reactContext ?: return@Function null
            val outputDir = File(context.getExternalFilesDir(Environment.DIRECTORY_MUSIC), "recordings")
            if (!outputDir.exists()) {
                outputDir.mkdirs()
            }
            outputDir.absolutePath
        }

        Function("listRecordings") {
            val context = appContext.reactContext ?: return@Function emptyList<Map<String, Any>>()
            val outputDir = File(context.getExternalFilesDir(Environment.DIRECTORY_MUSIC), "recordings")
            
            if (!outputDir.exists()) {
                return@Function emptyList<Map<String, Any>>()
            }
            
            outputDir.listFiles()?.filter { it.isFile && it.extension in listOf("m4a", "mp3", "wav") }?.map {
                mapOf(
                    "name" to it.name,
                    "uri" to it.absolutePath,
                    "size" to it.length(),
                    "lastModified" to it.lastModified()
                )
            } ?: emptyList()
        }

        AsyncFunction("deleteRecording") { uri: String, promise: Promise ->
            try {
                val file = File(uri)
                if (file.exists() && file.delete()) {
                    promise.resolve(mapOf("success" to true))
                } else {
                    promise.reject("DELETE_ERROR", "Failed to delete file", null)
                }
            } catch (e: Exception) {
                promise.reject("DELETE_ERROR", e.message ?: "Unknown error", e)
            }
        }
    }

    private data class MixResult(
        val success: Boolean,
        val error: String? = null,
        val durationMs: Long = 0
    )

    private fun performMix(
        context: Context,
        backingTrackUri: String,
        voiceTrackUri: String,
        outputFile: File,
        musicVolume: Float,
        voiceVolume: Float,
        syncOffsetMs: Int,
        reverbPreset: String,
        noiseReduction: String
    ): MixResult {
        var backingExtractor: MediaExtractor? = null
        var voiceExtractor: MediaExtractor? = null
        var backingDecoder: MediaCodec? = null
        var voiceDecoder: MediaCodec? = null
        var encoder: MediaCodec? = null
        var muxer: MediaMuxer? = null
        
        try {
            backingExtractor = MediaExtractor()
            voiceExtractor = MediaExtractor()
            
            setDataSource(context, backingExtractor, backingTrackUri)
            setDataSource(context, voiceExtractor, voiceTrackUri)
            
            val backingTrackIndex = selectAudioTrack(backingExtractor)
            val voiceTrackIndex = selectAudioTrack(voiceExtractor)
            
            if (backingTrackIndex < 0 && voiceTrackIndex < 0) {
                return MixResult(false, "No audio tracks found in input files")
            }
            
            val backingFormat = if (backingTrackIndex >= 0) backingExtractor.getTrackFormat(backingTrackIndex) else null
            val voiceFormat = if (voiceTrackIndex >= 0) voiceExtractor.getTrackFormat(voiceTrackIndex) else null
            
            val sampleRate = backingFormat?.getInteger(MediaFormat.KEY_SAMPLE_RATE) 
                ?: voiceFormat?.getInteger(MediaFormat.KEY_SAMPLE_RATE) 
                ?: SAMPLE_RATE
            val channelCount = backingFormat?.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                ?: voiceFormat?.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                ?: CHANNEL_COUNT
            
            if (backingTrackIndex >= 0) {
                backingExtractor.selectTrack(backingTrackIndex)
                val mime = backingFormat!!.getString(MediaFormat.KEY_MIME)!!
                backingDecoder = MediaCodec.createDecoderByType(mime)
                backingDecoder.configure(backingFormat, null, null, 0)
                backingDecoder.start()
            }
            
            if (voiceTrackIndex >= 0) {
                voiceExtractor.selectTrack(voiceTrackIndex)
                val mime = voiceFormat!!.getString(MediaFormat.KEY_MIME)!!
                voiceDecoder = MediaCodec.createDecoderByType(mime)
                voiceDecoder.configure(voiceFormat, null, null, 0)
                voiceDecoder.start()
            }
            
            val outputFormat = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channelCount)
            outputFormat.setInteger(MediaFormat.KEY_BIT_RATE, BIT_RATE)
            outputFormat.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
            outputFormat.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, BUFFER_SIZE * 4)
            
            encoder = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
            encoder.configure(outputFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
            encoder.start()
            
            muxer = MediaMuxer(outputFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
            
            var muxerTrackIndex = -1
            var muxerStarted = false
            
            val backingPcmBuffers = mutableListOf<ShortArray>()
            val voicePcmBuffers = mutableListOf<ShortArray>()
            
            if (backingDecoder != null) {
                decodeToPcm(backingExtractor, backingDecoder, backingPcmBuffers)
            }
            
            if (voiceDecoder != null) {
                decodeToPcm(voiceExtractor, voiceDecoder, voicePcmBuffers)
            }
            
            val mixedPcm = mixPcmBuffers(
                backingPcmBuffers,
                voicePcmBuffers,
                musicVolume,
                voiceVolume,
                syncOffsetMs,
                sampleRate,
                channelCount
            )
            
            val durationMs = (mixedPcm.size.toLong() * 1000) / (sampleRate * channelCount)
            
            var pcmOffset = 0
            val inputBufferSize = BUFFER_SIZE
            var presentationTimeUs = 0L
            val timePerSample = 1000000L / sampleRate
            
            val info = MediaCodec.BufferInfo()
            var encodingDone = false
            
            while (!encodingDone) {
                if (pcmOffset < mixedPcm.size) {
                    val inputBufferIndex = encoder.dequeueInputBuffer(10000)
                    if (inputBufferIndex >= 0) {
                        val inputBuffer = encoder.getInputBuffer(inputBufferIndex)!!
                        inputBuffer.clear()
                        
                        val samplesToWrite = min(inputBufferSize, mixedPcm.size - pcmOffset)
                        val bytes = ByteArray(samplesToWrite * 2)
                        ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
                            .put(mixedPcm, pcmOffset, samplesToWrite)
                        
                        inputBuffer.put(bytes)
                        
                        encoder.queueInputBuffer(
                            inputBufferIndex,
                            0,
                            bytes.size,
                            presentationTimeUs,
                            0
                        )
                        
                        presentationTimeUs += (samplesToWrite.toLong() * 1000000) / (sampleRate * channelCount)
                        pcmOffset += samplesToWrite
                    }
                } else {
                    val inputBufferIndex = encoder.dequeueInputBuffer(10000)
                    if (inputBufferIndex >= 0) {
                        encoder.queueInputBuffer(
                            inputBufferIndex,
                            0,
                            0,
                            0,
                            MediaCodec.BUFFER_FLAG_END_OF_STREAM
                        )
                    }
                }
                
                val outputBufferIndex = encoder.dequeueOutputBuffer(info, 10000)
                when {
                    outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                        if (!muxerStarted) {
                            muxerTrackIndex = muxer.addTrack(encoder.outputFormat)
                            muxer.start()
                            muxerStarted = true
                        }
                    }
                    outputBufferIndex >= 0 -> {
                        val outputBuffer = encoder.getOutputBuffer(outputBufferIndex)!!
                        
                        if (info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG == 0) {
                            if (muxerStarted && info.size > 0) {
                                outputBuffer.position(info.offset)
                                outputBuffer.limit(info.offset + info.size)
                                muxer.writeSampleData(muxerTrackIndex, outputBuffer, info)
                            }
                        }
                        
                        encoder.releaseOutputBuffer(outputBufferIndex, false)
                        
                        if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                            encodingDone = true
                        }
                    }
                }
            }
            
            return MixResult(true, null, durationMs)
            
        } catch (e: Exception) {
            Log.e(TAG, "Mix error: ${e.message}", e)
            return MixResult(false, e.message)
        } finally {
            try {
                backingDecoder?.stop()
                backingDecoder?.release()
                voiceDecoder?.stop()
                voiceDecoder?.release()
                encoder?.stop()
                encoder?.release()
                muxer?.stop()
                muxer?.release()
                backingExtractor?.release()
                voiceExtractor?.release()
            } catch (e: Exception) {
                Log.e(TAG, "Cleanup error: ${e.message}")
            }
        }
    }

    private fun setDataSource(context: Context, extractor: MediaExtractor, uriString: String) {
        when {
            uriString.startsWith("content://") -> {
                val uri = Uri.parse(uriString)
                context.contentResolver.openFileDescriptor(uri, "r")?.use {
                    extractor.setDataSource(it.fileDescriptor)
                }
            }
            uriString.startsWith("file://") -> {
                extractor.setDataSource(Uri.parse(uriString).path!!)
            }
            uriString.startsWith("/") -> {
                extractor.setDataSource(uriString)
            }
            else -> {
                extractor.setDataSource(uriString)
            }
        }
    }

    private fun selectAudioTrack(extractor: MediaExtractor): Int {
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)
            if (mime?.startsWith("audio/") == true) {
                return i
            }
        }
        return -1
    }

    private fun decodeToPcm(
        extractor: MediaExtractor,
        decoder: MediaCodec,
        outputBuffers: MutableList<ShortArray>
    ) {
        val info = MediaCodec.BufferInfo()
        var sawInputEOS = false
        var sawOutputEOS = false
        
        while (!sawOutputEOS) {
            if (!sawInputEOS) {
                val inputBufferIndex = decoder.dequeueInputBuffer(10000)
                if (inputBufferIndex >= 0) {
                    val inputBuffer = decoder.getInputBuffer(inputBufferIndex)!!
                    val sampleSize = extractor.readSampleData(inputBuffer, 0)
                    
                    if (sampleSize < 0) {
                        decoder.queueInputBuffer(
                            inputBufferIndex, 0, 0, 0,
                            MediaCodec.BUFFER_FLAG_END_OF_STREAM
                        )
                        sawInputEOS = true
                    } else {
                        decoder.queueInputBuffer(
                            inputBufferIndex, 0, sampleSize,
                            extractor.sampleTime, 0
                        )
                        extractor.advance()
                    }
                }
            }
            
            val outputBufferIndex = decoder.dequeueOutputBuffer(info, 10000)
            if (outputBufferIndex >= 0) {
                val outputBuffer = decoder.getOutputBuffer(outputBufferIndex)!!
                
                if (info.size > 0) {
                    val samples = ShortArray(info.size / 2)
                    outputBuffer.position(info.offset)
                    outputBuffer.order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(samples)
                    outputBuffers.add(samples)
                }
                
                decoder.releaseOutputBuffer(outputBufferIndex, false)
                
                if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                    sawOutputEOS = true
                }
            }
        }
    }

    private fun mixPcmBuffers(
        backingBuffers: List<ShortArray>,
        voiceBuffers: List<ShortArray>,
        musicVolume: Float,
        voiceVolume: Float,
        syncOffsetMs: Int,
        sampleRate: Int,
        channelCount: Int
    ): ShortArray {
        val backingPcm = backingBuffers.flatMap { it.toList() }.toShortArray()
        val voicePcm = voiceBuffers.flatMap { it.toList() }.toShortArray()
        
        val offsetSamples = (syncOffsetMs * sampleRate * channelCount) / 1000
        
        val maxLength = maxOf(
            backingPcm.size,
            voicePcm.size + if (offsetSamples > 0) offsetSamples else 0
        )
        
        val mixed = ShortArray(maxLength)
        
        for (i in mixed.indices) {
            var sample = 0f
            
            if (i < backingPcm.size) {
                sample += backingPcm[i] * musicVolume
            }
            
            val voiceIndex = if (offsetSamples >= 0) i - offsetSamples else i + kotlin.math.abs(offsetSamples)
            if (voiceIndex >= 0 && voiceIndex < voicePcm.size) {
                sample += voicePcm[voiceIndex] * voiceVolume
            }
            
            mixed[i] = sample.toInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
        }
        
        return mixed
    }
}
