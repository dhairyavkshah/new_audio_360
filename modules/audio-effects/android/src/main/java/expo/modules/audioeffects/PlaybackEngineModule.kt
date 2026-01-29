package expo.modules.audioeffects

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

class PlaybackEngineModule : Module() {
    private var isInitialized = false
    private var currentIndex = 0
    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var mediaController: MediaController? = null
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    /**
     * Runs a block on the main thread synchronously and returns the result.
     * Uses CountDownLatch to block the calling thread until the main thread completes.
     */
    private fun <T> runOnMainThreadBlocking(block: () -> T): T {
        // If already on main thread, run directly
        if (Looper.myLooper() == Looper.getMainLooper()) {
            return block()
        }
        
        val latch = CountDownLatch(1)
        val result = AtomicReference<T>()
        val error = AtomicReference<Exception?>()
        
        mainHandler.post {
            try {
                result.set(block())
            } catch (e: Exception) {
                error.set(e)
            } finally {
                latch.countDown()
            }
        }
        
        // Wait with timeout to avoid deadlocks
        if (!latch.await(5, TimeUnit.SECONDS)) {
            throw Exception("Timeout waiting for main thread")
        }
        
        error.get()?.let { throw it }
        return result.get()
    }
    
    private fun ensureService(): PlaybackService? {
        val service = PlaybackService.getInstance()
        if (service != null) return service
        
        // Service was killed - try to restart it
        val context = appContext.reactContext ?: return null
        
        try {
            PlaybackService.prepareForStart()
            val serviceIntent = Intent(context, PlaybackService::class.java)
            context.startForegroundService(serviceIntent)
            
            // Wait briefly for service to restart
            val ready = PlaybackService.awaitReady(3000)
            if (ready) {
                val newService = PlaybackService.getInstance()
                if (newService != null) {
                    setupServiceCallbacks(newService)
                    return newService
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("PlaybackEngineModule", "Failed to restart service: ${e.message}")
        }
        
        return null
    }
    
    override fun definition() = ModuleDefinition {
        Name("PlaybackEngineModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("initialize") { promise: Promise ->
            Thread {
                try {
                    val context = appContext.reactContext ?: throw Exception("Context not available")
                    
                    if (PlaybackService.isRunning()) {
                        val service = PlaybackService.getInstance()
                        if (service != null) {
                            mainHandler.post { setupServiceCallbacks(service) }
                            isInitialized = true
                            mainHandler.post {
                                promise.resolve(mapOf(
                                    "success" to true, 
                                    "alreadyInitialized" to true,
                                    "audioSessionId" to service.getAudioSessionId()
                                ))
                            }
                            return@Thread
                        }
                    }
                    
                    // Prepare the readiness latch before starting service
                    PlaybackService.prepareForStart()
                    
                    mainHandler.post {
                        val serviceIntent = Intent(context, PlaybackService::class.java)
                        context.startForegroundService(serviceIntent)
                    }
                    
                    // Wait for service to be ready (up to 5 seconds)
                    val ready = PlaybackService.awaitReady(5000)
                    if (!ready) {
                        mainHandler.post {
                            promise.reject("INIT_ERROR", "Timeout waiting for PlaybackService to start", null)
                        }
                        return@Thread
                    }
                    
                    val service = PlaybackService.getInstance()
                    if (service == null) {
                        mainHandler.post {
                            promise.reject("INIT_ERROR", "PlaybackService not available after start", null)
                        }
                        return@Thread
                    }
                    
                    mainHandler.post { setupServiceCallbacks(service) }
                    isInitialized = true
                    
                    // Build MediaController for external control
                    mainHandler.post {
                        try {
                            val sessionToken = SessionToken(
                                context,
                                ComponentName(context, PlaybackService::class.java)
                            )
                            
                            controllerFuture = MediaController.Builder(context, sessionToken).buildAsync()
                            controllerFuture?.addListener({
                                try {
                                    mediaController = controllerFuture?.get()
                                } catch (e: Exception) {
                                    android.util.Log.w("PlaybackEngineModule", "MediaController build failed: ${e.message}")
                                }
                            }, MoreExecutors.directExecutor())
                            
                            promise.resolve(mapOf(
                                "success" to true,
                                "audioSessionId" to service.getAudioSessionId()
                            ))
                        } catch (e: Exception) {
                            promise.reject("INIT_ERROR", e.message, e)
                        }
                    }
                    
                } catch (e: Exception) {
                    mainHandler.post {
                        promise.reject("INIT_ERROR", e.message, e)
                    }
                }
            }.start()
        }
        
        AsyncFunction("setQueue") { uris: List<String>, startIndex: Int, promise: Promise ->
            Thread {
                try {
                    val service = ensureService() ?: throw Exception("Service not initialized")
                    
                    mainHandler.post {
                        try {
                            val success = service.setQueue(uris, startIndex)
                            if (success) {
                                currentIndex = startIndex
                                promise.resolve(mapOf(
                                    "success" to true,
                                    "queueLength" to uris.size,
                                    "currentIndex" to startIndex
                                ))
                            } else {
                                promise.reject("QUEUE_ERROR", "Failed to set queue", null)
                            }
                        } catch (e: Exception) {
                            promise.reject("QUEUE_ERROR", e.message, e)
                        }
                    }
                } catch (e: Exception) {
                    mainHandler.post {
                        promise.reject("QUEUE_ERROR", e.message, e)
                    }
                }
            }.start()
        }
        
        AsyncFunction("setQueueWithMetadata") { uris: List<String>, startIndex: Int, metadata: List<Map<String, String>>, promise: Promise ->
            Thread {
                try {
                    val service = ensureService() ?: throw Exception("Service not initialized")
                    
                    mainHandler.post {
                        try {
                            val success = service.setQueue(uris, startIndex, metadata)
                            if (success) {
                                currentIndex = startIndex
                                promise.resolve(mapOf(
                                    "success" to true,
                                    "queueLength" to uris.size,
                                    "currentIndex" to startIndex
                                ))
                            } else {
                                promise.reject("QUEUE_ERROR", "Failed to set queue", null)
                            }
                        } catch (e: Exception) {
                            promise.reject("QUEUE_ERROR", e.message, e)
                        }
                    }
                } catch (e: Exception) {
                    mainHandler.post {
                        promise.reject("QUEUE_ERROR", e.message, e)
                    }
                }
            }.start()
        }
        
        AsyncFunction("loadTrack") { uri: String, promise: Promise ->
            Thread {
                try {
                    val service = ensureService() ?: throw Exception("Service not initialized")
                    
                    mainHandler.post {
                        try {
                            val success = service.loadTrack(uri)
                            if (success) {
                                currentIndex = 0
                                promise.resolve(mapOf("success" to true))
                            } else {
                                promise.reject("LOAD_ERROR", "Failed to load track", null)
                            }
                        } catch (e: Exception) {
                            promise.reject("LOAD_ERROR", e.message, e)
                        }
                    }
                } catch (e: Exception) {
                    mainHandler.post {
                        promise.reject("LOAD_ERROR", e.message, e)
                    }
                }
            }.start()
        }
        
        AsyncFunction("loadTrackWithMetadata") { uri: String, title: String?, artist: String?, artwork: String?, promise: Promise ->
            Thread {
                try {
                    val service = ensureService() ?: throw Exception("Service not initialized")
                    
                    mainHandler.post {
                        try {
                            val success = service.loadTrack(uri, title, artist, artwork)
                            if (success) {
                                currentIndex = 0
                                promise.resolve(mapOf("success" to true))
                            } else {
                                promise.reject("LOAD_ERROR", "Failed to load track", null)
                            }
                        } catch (e: Exception) {
                            promise.reject("LOAD_ERROR", e.message, e)
                        }
                    }
                } catch (e: Exception) {
                    mainHandler.post {
                        promise.reject("LOAD_ERROR", e.message, e)
                    }
                }
            }.start()
        }
        
        AsyncFunction("updateMetadata") { title: String?, artist: String?, artwork: String?, promise: Promise ->
            mainHandler.post {
                try {
                    val service = PlaybackService.getInstance()
                    if (service == null) {
                        promise.resolve(mapOf("success" to false, "error" to "No active playback"))
                        return@post
                    }
                    service.updateMetadata(title, artist, artwork)
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("METADATA_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("play") { promise: Promise ->
            Thread {
                try {
                    val service = ensureService() ?: throw Exception("Service not initialized")
                    mainHandler.post {
                        try {
                            val success = service.play()
                            if (success) {
                                promise.resolve(mapOf("success" to true))
                            } else {
                                promise.reject("PLAY_ERROR", "Failed to play", null)
                            }
                        } catch (e: Exception) {
                            promise.reject("PLAY_ERROR", e.message, e)
                        }
                    }
                } catch (e: Exception) {
                    mainHandler.post {
                        promise.reject("PLAY_ERROR", e.message, e)
                    }
                }
            }.start()
        }
        
        AsyncFunction("pause") { promise: Promise ->
            mainHandler.post {
                try {
                    val service = PlaybackService.getInstance()
                    if (service == null) {
                        promise.resolve(mapOf("success" to true))
                        return@post
                    }
                    val success = service.pause()
                    if (success) {
                        promise.resolve(mapOf("success" to true))
                    } else {
                        promise.reject("PAUSE_ERROR", "Failed to pause", null)
                    }
                } catch (e: Exception) {
                    promise.reject("PAUSE_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("stop") { promise: Promise ->
            mainHandler.post {
                try {
                    val service = PlaybackService.getInstance()
                    if (service == null) {
                        promise.resolve(mapOf("success" to true))
                        return@post
                    }
                    val success = service.stop()
                    if (success) {
                        promise.resolve(mapOf("success" to true))
                    } else {
                        promise.reject("STOP_ERROR", "Failed to stop", null)
                    }
                } catch (e: Exception) {
                    promise.reject("STOP_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("seekTo") { positionMs: Long, promise: Promise ->
            mainHandler.post {
                try {
                    val service = PlaybackService.getInstance()
                    if (service == null) {
                        promise.reject("SEEK_ERROR", "No active playback", null)
                        return@post
                    }
                    val success = service.seekTo(positionMs)
                    if (success) {
                        promise.resolve(mapOf("success" to true, "positionMs" to positionMs))
                    } else {
                        promise.reject("SEEK_ERROR", "Failed to seek", null)
                    }
                } catch (e: Exception) {
                    promise.reject("SEEK_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("skipToIndex") { index: Int, promise: Promise ->
            mainHandler.post {
                try {
                    val service = PlaybackService.getInstance()
                    if (service == null) {
                        promise.reject("SKIP_ERROR", "No active playback", null)
                        return@post
                    }
                    val success = service.skipToIndex(index)
                    if (success) {
                        currentIndex = index
                        promise.resolve(mapOf("success" to true, "index" to index))
                    } else {
                        promise.reject("INDEX_ERROR", "Index out of bounds", null)
                    }
                } catch (e: Exception) {
                    promise.reject("SKIP_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("skipToNext") { promise: Promise ->
            mainHandler.post {
                try {
                    val service = PlaybackService.getInstance()
                    if (service == null) {
                        promise.reject("SKIP_ERROR", "No active playback", null)
                        return@post
                    }
                    val success = service.skipToNext()
                    if (success) {
                        val status = service.getStatus()
                        currentIndex = (status["currentIndex"] as? Int) ?: currentIndex
                        promise.resolve(mapOf("success" to true, "index" to currentIndex))
                    } else {
                        promise.resolve(mapOf("success" to false, "reason" to "No next track"))
                    }
                } catch (e: Exception) {
                    promise.reject("SKIP_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("skipToPrevious") { promise: Promise ->
            mainHandler.post {
                try {
                    val service = PlaybackService.getInstance()
                    if (service == null) {
                        promise.reject("SKIP_ERROR", "No active playback", null)
                        return@post
                    }
                    val success = service.skipToPrevious()
                    if (success) {
                        val status = service.getStatus()
                        currentIndex = (status["currentIndex"] as? Int) ?: currentIndex
                        promise.resolve(mapOf("success" to true, "index" to currentIndex))
                    } else {
                        promise.resolve(mapOf("success" to true, "seekToStart" to true))
                    }
                } catch (e: Exception) {
                    promise.reject("SKIP_ERROR", e.message, e)
                }
            }
        }
        
        Function("setVolume") { volume: Double ->
            val clampedVolume = volume.coerceIn(0.0, 1.0).toFloat()
            return@Function runOnMainThreadBlocking {
                val service = PlaybackService.getInstance()
                service?.setVolume(clampedVolume)
                mapOf("success" to true, "volume" to clampedVolume)
            }
        }
        
        Function("setPlaybackSpeed") { speed: Double ->
            val clampedSpeed = speed.coerceIn(0.25, 3.0).toFloat()
            return@Function runOnMainThreadBlocking {
                val service = PlaybackService.getInstance()
                service?.setPlaybackSpeed(clampedSpeed)
                mapOf("success" to true, "speed" to clampedSpeed)
            }
        }
        
        Function("setRepeatMode") { mode: String ->
            return@Function runOnMainThreadBlocking {
                val service = PlaybackService.getInstance()
                service?.setRepeatMode(mode)
                mapOf("success" to true, "mode" to mode)
            }
        }
        
        Function("setShuffleMode") { enabled: Boolean ->
            return@Function runOnMainThreadBlocking {
                val service = PlaybackService.getInstance()
                service?.setShuffleMode(enabled)
                mapOf("success" to true, "shuffle" to enabled)
            }
        }
        
        Function("getStatus") {
            return@Function runOnMainThreadBlocking {
                val service = PlaybackService.getInstance()
                if (service != null) {
                    service.getStatus()
                } else {
                    mapOf(
                        "isInitialized" to isInitialized,
                        "isPlaying" to false,
                        "currentPositionMs" to 0L,
                        "durationMs" to 0L,
                        "bufferedPositionMs" to 0L,
                        "currentIndex" to 0,
                        "queueLength" to 0,
                        "playbackState" to "unknown",
                        "repeatMode" to "off",
                        "shuffleEnabled" to false,
                        "audioSessionId" to 0
                    )
                }
            }
        }
        
        Function("getAudioSessionId") {
            return@Function runOnMainThreadBlocking {
                val service = PlaybackService.getInstance()
                service?.getAudioSessionId() ?: 0
            }
        }
        
        Function("getCurrentPosition") {
            return@Function runOnMainThreadBlocking {
                val service = PlaybackService.getInstance()
                val status = service?.getStatus()
                (status?.get("currentPositionMs") as? Long) ?: 0L
            }
        }
        
        Function("getDuration") {
            return@Function runOnMainThreadBlocking {
                val service = PlaybackService.getInstance()
                val status = service?.getStatus()
                (status?.get("durationMs") as? Long) ?: 0L
            }
        }
        
        AsyncFunction("release") { promise: Promise ->
            mainHandler.post {
                try {
                    val context = appContext.reactContext
                    
                    controllerFuture?.let {
                        MediaController.releaseFuture(it)
                    }
                    controllerFuture = null
                    mediaController = null
                    
                    if (context != null) {
                        val serviceIntent = Intent(context, PlaybackService::class.java)
                        context.stopService(serviceIntent)
                    }
                    
                    isInitialized = false
                    currentIndex = 0
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("RELEASE_ERROR", e.message, e)
                }
            }
        }
        
        Events("onPlaybackStateChanged", "onIsPlayingChanged", "onTrackChanged", "onError", "onProgress")
    }
    
    private fun setupServiceCallbacks(service: PlaybackService) {
        service.setStateCallback { data ->
            when (data["type"]) {
                "playbackState" -> sendEvent("onPlaybackStateChanged", mapOf("state" to data["state"]))
                "isPlaying" -> sendEvent("onIsPlayingChanged", mapOf("isPlaying" to data["isPlaying"]))
                "trackChanged" -> sendEvent("onTrackChanged", mapOf(
                    "index" to data["index"],
                    "reason" to data["reason"]
                ))
                "error" -> sendEvent("onError", mapOf(
                    "code" to data["code"],
                    "message" to data["message"]
                ))
            }
        }
        
        service.setProgressCallback { data ->
            sendEvent("onProgress", data)
        }
    }
}
