package expo.modules.audioeffects

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.File

class BackingTrackModule : Module() {
    private var mediaPlayer: MediaPlayer? = null
    private var isPrepared = false
    private var currentUri: String? = null
    private var onCompletionCallback: (() -> Unit)? = null
    
    override fun definition() = ModuleDefinition {
        Name("BackingTrackModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("loadTrack") { uri: String, promise: Promise ->
            try {
                releasePlayer()
                
                mediaPlayer = MediaPlayer().apply {
                    val audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                    setAudioAttributes(audioAttributes)
                    
                    val context = appContext.reactContext ?: throw Exception("Context not available")
                    
                    when {
                        uri.startsWith("content://") -> {
                            setDataSource(context, Uri.parse(uri))
                        }
                        uri.startsWith("file://") -> {
                            setDataSource(uri.removePrefix("file://"))
                        }
                        uri.startsWith("/") -> {
                            setDataSource(uri)
                        }
                        else -> {
                            setDataSource(context, Uri.parse(uri))
                        }
                    }
                    
                    setOnPreparedListener {
                        isPrepared = true
                    }
                    
                    setOnCompletionListener {
                        onCompletionCallback?.invoke()
                    }
                    
                    setOnErrorListener { _, what, extra ->
                        isPrepared = false
                        true
                    }
                    
                    prepare()
                }
                
                currentUri = uri
                isPrepared = true
                
                val result = mutableMapOf<String, Any>()
                result["success"] = true
                result["durationMs"] = mediaPlayer?.duration ?: 0
                result["audioSessionId"] = mediaPlayer?.audioSessionId ?: 0
                promise.resolve(result)
                
            } catch (e: Exception) {
                promise.reject("LOAD_ERROR", e.message, e)
            }
        }
        
        AsyncFunction("play") { promise: Promise ->
            try {
                if (!isPrepared || mediaPlayer == null) {
                    promise.reject("NOT_LOADED", "No track loaded", null)
                    return@AsyncFunction
                }
                
                mediaPlayer?.start()
                promise.resolve(mapOf("success" to true))
                
            } catch (e: Exception) {
                promise.reject("PLAY_ERROR", e.message, e)
            }
        }
        
        AsyncFunction("pause") { promise: Promise ->
            try {
                if (mediaPlayer?.isPlaying == true) {
                    mediaPlayer?.pause()
                }
                promise.resolve(mapOf("success" to true))
            } catch (e: Exception) {
                promise.reject("PAUSE_ERROR", e.message, e)
            }
        }
        
        AsyncFunction("stop") { promise: Promise ->
            try {
                mediaPlayer?.apply {
                    if (isPlaying) {
                        stop()
                    }
                    prepare()
                    seekTo(0)
                }
                promise.resolve(mapOf("success" to true))
            } catch (e: Exception) {
                promise.reject("STOP_ERROR", e.message, e)
            }
        }
        
        AsyncFunction("seekTo") { positionMs: Int, promise: Promise ->
            try {
                if (!isPrepared || mediaPlayer == null) {
                    promise.reject("NOT_LOADED", "No track loaded", null)
                    return@AsyncFunction
                }
                
                mediaPlayer?.seekTo(positionMs)
                promise.resolve(mapOf("success" to true, "positionMs" to positionMs))
                
            } catch (e: Exception) {
                promise.reject("SEEK_ERROR", e.message, e)
            }
        }
        
        Function("setVolume") { volume: Double ->
            val clampedVolume = volume.coerceIn(0.0, 1.0).toFloat()
            mediaPlayer?.setVolume(clampedVolume, clampedVolume)
            return@Function mapOf("success" to true, "volume" to clampedVolume)
        }
        
        Function("getStatus") {
            val result = mutableMapOf<String, Any>()
            result["isLoaded"] = isPrepared
            result["isPlaying"] = mediaPlayer?.isPlaying == true
            result["currentPositionMs"] = mediaPlayer?.currentPosition ?: 0
            result["durationMs"] = mediaPlayer?.duration ?: 0
            result["uri"] = currentUri ?: ""
            return@Function result
        }
        
        AsyncFunction("release") { promise: Promise ->
            try {
                releasePlayer()
                promise.resolve(mapOf("success" to true))
            } catch (e: Exception) {
                promise.reject("RELEASE_ERROR", e.message, e)
            }
        }
        
        Function("getCurrentPosition") {
            return@Function mediaPlayer?.currentPosition ?: 0
        }
        
        Function("getDuration") {
            return@Function mediaPlayer?.duration ?: 0
        }
        
        Function("getAudioSessionId") {
            return@Function mediaPlayer?.audioSessionId ?: 0
        }
    }
    
    private fun releasePlayer() {
        mediaPlayer?.release()
        mediaPlayer = null
        isPrepared = false
        currentUri = null
    }
}
