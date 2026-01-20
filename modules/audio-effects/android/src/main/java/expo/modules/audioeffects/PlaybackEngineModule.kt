package expo.modules.audioeffects

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.MoreExecutors
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

@OptIn(UnstableApi::class)
class PlaybackEngineModule : Module() {
    private var exoPlayer: ExoPlayer? = null
    private var mediaController: MediaController? = null
    private var isInitialized = false
    private var currentIndex = 0
    private var progressHandler: Handler? = null
    private var progressRunnable: Runnable? = null
    private var progressCallback: ((Map<String, Any>) -> Unit)? = null
    private var playerListener: Player.Listener? = null
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    override fun definition() = ModuleDefinition {
        Name("PlaybackEngineModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("initialize") { promise: Promise ->
            mainHandler.post {
                try {
                    val context = appContext.reactContext ?: throw Exception("Context not available")
                    
                    if (exoPlayer != null || PlaybackService.instance != null) {
                        val audioSessionId = exoPlayer?.audioSessionId 
                            ?: PlaybackService.instance?.getAudioSessionId() 
                            ?: 0
                        promise.resolve(mapOf(
                            "success" to true, 
                            "alreadyInitialized" to true,
                            "audioSessionId" to audioSessionId
                        ))
                        return@post
                    }
                    
                    val serviceIntent = Intent(context, PlaybackService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent)
                    } else {
                        context.startService(serviceIntent)
                    }
                    
                    val sessionToken = SessionToken(
                        context, 
                        ComponentName(context, PlaybackService::class.java)
                    )
                    
                    val controllerFuture = MediaController.Builder(context, sessionToken).buildAsync()
                    controllerFuture.addListener({
                        try {
                            mediaController = controllerFuture.get()
                            exoPlayer = PlaybackService.instance?.getPlayer()
                            
                            setupPlayerListener()
                            
                            isInitialized = true
                            val audioSessionId = exoPlayer?.audioSessionId ?: 0
                            
                            android.util.Log.d("PlaybackEngineModule", "Initialized with audioSessionId: $audioSessionId")
                            
                            promise.resolve(mapOf(
                                "success" to true,
                                "audioSessionId" to audioSessionId
                            ))
                        } catch (e: Exception) {
                            android.util.Log.e("PlaybackEngineModule", "Failed to get controller: ${e.message}", e)
                            promise.reject("INIT_ERROR", e.message, e)
                        }
                    }, MoreExecutors.directExecutor())
                    
                } catch (e: Exception) {
                    android.util.Log.e("PlaybackEngineModule", "Initialize error: ${e.message}", e)
                    promise.reject("INIT_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setMetadata") { title: String, artist: String, album: String, artworkUri: String?, promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    
                    val metadataBuilder = MediaMetadata.Builder()
                        .setTitle(title)
                        .setArtist(artist)
                        .setAlbumTitle(album)
                    
                    if (!artworkUri.isNullOrEmpty()) {
                        metadataBuilder.setArtworkUri(Uri.parse(artworkUri))
                    }
                    
                    val metadata = metadataBuilder.build()
                    
                    val currentItem = player.currentMediaItem
                    if (currentItem != null) {
                        val updatedItem = currentItem.buildUpon()
                            .setMediaMetadata(metadata)
                            .build()
                        player.replaceMediaItem(player.currentMediaItemIndex, updatedItem)
                    }
                    
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("METADATA_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setQueue") { uris: List<String>, startIndex: Int, promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    
                    player.stop()
                    player.clearMediaItems()
                    
                    val mediaItems = uris.map { uri ->
                        MediaItem.Builder()
                            .setUri(Uri.parse(uri))
                            .build()
                    }
                    
                    player.setMediaItems(mediaItems, startIndex, 0)
                    player.prepare()
                    currentIndex = startIndex
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "queueLength" to mediaItems.size,
                        "currentIndex" to startIndex
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("QUEUE_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("loadTrack") { uri: String, promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    
                    player.stop()
                    player.clearMediaItems()
                    
                    val mediaItem = MediaItem.Builder()
                        .setUri(Uri.parse(uri))
                        .build()
                    
                    player.setMediaItem(mediaItem)
                    player.prepare()
                    currentIndex = 0
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "index" to 0
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("LOAD_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("play") { promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    player.play()
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("PLAY_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("pause") { promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    player.pause()
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("PAUSE_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("stop") { promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    player.stop()
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("STOP_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("seekTo") { positionMs: Long, promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    player.seekTo(positionMs)
                    promise.resolve(mapOf(
                        "success" to true,
                        "positionMs" to positionMs
                    ))
                } catch (e: Exception) {
                    promise.reject("SEEK_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("skipToIndex") { index: Int, promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    
                    if (index >= 0 && index < player.mediaItemCount) {
                        player.seekTo(index, 0)
                        currentIndex = index
                        promise.resolve(mapOf(
                            "success" to true,
                            "index" to index
                        ))
                    } else {
                        promise.reject("INDEX_ERROR", "Invalid index: $index", null)
                    }
                } catch (e: Exception) {
                    promise.reject("SKIP_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("skipToNext") { promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    
                    if (player.hasNextMediaItem()) {
                        player.seekToNext()
                        currentIndex = player.currentMediaItemIndex
                        promise.resolve(mapOf(
                            "success" to true,
                            "index" to currentIndex
                        ))
                    } else {
                        promise.resolve(mapOf(
                            "success" to false,
                            "reason" to "No next track"
                        ))
                    }
                } catch (e: Exception) {
                    promise.reject("NEXT_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("skipToPrevious") { promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    
                    if (player.currentPosition > 3000) {
                        player.seekTo(0)
                        promise.resolve(mapOf(
                            "success" to true,
                            "index" to currentIndex,
                            "seekToStart" to true
                        ))
                    } else if (player.hasPreviousMediaItem()) {
                        player.seekToPrevious()
                        currentIndex = player.currentMediaItemIndex
                        promise.resolve(mapOf(
                            "success" to true,
                            "index" to currentIndex
                        ))
                    } else {
                        player.seekTo(0)
                        promise.resolve(mapOf(
                            "success" to true,
                            "index" to currentIndex,
                            "seekToStart" to true
                        ))
                    }
                } catch (e: Exception) {
                    promise.reject("PREVIOUS_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setVolume") { volume: Double, promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    val clampedVolume = volume.coerceIn(0.0, 1.0).toFloat()
                    player.volume = clampedVolume
                    promise.resolve(mapOf(
                        "success" to true,
                        "volume" to clampedVolume
                    ))
                } catch (e: Exception) {
                    promise.reject("VOLUME_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setPlaybackSpeed") { speed: Double, promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    val clampedSpeed = speed.coerceIn(0.5, 2.0).toFloat()
                    player.setPlaybackSpeed(clampedSpeed)
                    promise.resolve(mapOf(
                        "success" to true,
                        "speed" to clampedSpeed
                    ))
                } catch (e: Exception) {
                    promise.reject("SPEED_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setRepeatMode") { mode: String, promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    player.repeatMode = when (mode) {
                        "off" -> Player.REPEAT_MODE_OFF
                        "one" -> Player.REPEAT_MODE_ONE
                        "all" -> Player.REPEAT_MODE_ALL
                        else -> Player.REPEAT_MODE_OFF
                    }
                    promise.resolve(mapOf(
                        "success" to true,
                        "mode" to mode
                    ))
                } catch (e: Exception) {
                    promise.reject("REPEAT_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setShuffleMode") { enabled: Boolean, promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer() ?: throw Exception("Player not initialized")
                    player.shuffleModeEnabled = enabled
                    promise.resolve(mapOf(
                        "success" to true,
                        "shuffle" to enabled
                    ))
                } catch (e: Exception) {
                    promise.reject("SHUFFLE_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("getStatus") { promise: Promise ->
            mainHandler.post {
                try {
                    val player = getPlayer()
                    
                    if (player == null) {
                        promise.resolve(mapOf(
                            "isInitialized" to false,
                            "isPlaying" to false,
                            "currentPositionMs" to 0,
                            "durationMs" to 0,
                            "bufferedPositionMs" to 0,
                            "currentIndex" to 0,
                            "queueLength" to 0,
                            "playbackState" to "idle",
                            "repeatMode" to "off",
                            "shuffleEnabled" to false,
                            "audioSessionId" to 0
                        ))
                        return@post
                    }
                    
                    promise.resolve(mapOf(
                        "isInitialized" to isInitialized,
                        "isPlaying" to player.isPlaying,
                        "currentPositionMs" to player.currentPosition,
                        "durationMs" to player.duration.coerceAtLeast(0),
                        "bufferedPositionMs" to player.bufferedPosition,
                        "currentIndex" to player.currentMediaItemIndex,
                        "queueLength" to player.mediaItemCount,
                        "playbackState" to when (player.playbackState) {
                            Player.STATE_IDLE -> "idle"
                            Player.STATE_BUFFERING -> "buffering"
                            Player.STATE_READY -> "ready"
                            Player.STATE_ENDED -> "ended"
                            else -> "unknown"
                        },
                        "repeatMode" to when (player.repeatMode) {
                            Player.REPEAT_MODE_OFF -> "off"
                            Player.REPEAT_MODE_ONE -> "one"
                            Player.REPEAT_MODE_ALL -> "all"
                            else -> "off"
                        },
                        "shuffleEnabled" to player.shuffleModeEnabled,
                        "audioSessionId" to (player.audioSessionId)
                    ))
                } catch (e: Exception) {
                    promise.reject("STATUS_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("getAudioSessionId") { promise: Promise ->
            mainHandler.post {
                val audioSessionId = getPlayer()?.audioSessionId ?: 0
                promise.resolve(audioSessionId)
            }
        }
        
        AsyncFunction("getCurrentPosition") { promise: Promise ->
            mainHandler.post {
                val position = getPlayer()?.currentPosition ?: 0L
                promise.resolve(position)
            }
        }
        
        AsyncFunction("getDuration") { promise: Promise ->
            mainHandler.post {
                val duration = getPlayer()?.duration?.coerceAtLeast(0) ?: 0L
                promise.resolve(duration)
            }
        }
        
        AsyncFunction("release") { promise: Promise ->
            mainHandler.post {
                try {
                    removePlayerListener()
                    
                    mediaController?.release()
                    mediaController = null
                    exoPlayer = null
                    isInitialized = false
                    
                    val context = appContext.reactContext
                    if (context != null) {
                        val serviceIntent = Intent(context, PlaybackService::class.java)
                        context.stopService(serviceIntent)
                    }
                    
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("RELEASE_ERROR", e.message, e)
                }
            }
        }
        
        Events("onPlaybackStateChanged", "onIsPlayingChanged", "onTrackChanged", "onError", "onProgress")
    }
    
    private fun getPlayer(): ExoPlayer? {
        return exoPlayer ?: PlaybackService.instance?.getPlayer()
    }
    
    private fun setupPlayerListener() {
        val player = getPlayer() ?: return
        
        playerListener = object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                sendEvent("onPlaybackStateChanged", mapOf(
                    "state" to when (state) {
                        Player.STATE_IDLE -> "idle"
                        Player.STATE_BUFFERING -> "buffering"
                        Player.STATE_READY -> "ready"
                        Player.STATE_ENDED -> "ended"
                        else -> "unknown"
                    }
                ))
            }
            
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                sendEvent("onIsPlayingChanged", mapOf("isPlaying" to isPlaying))
            }
            
            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                val index = getPlayer()?.currentMediaItemIndex ?: 0
                currentIndex = index
                sendEvent("onTrackChanged", mapOf(
                    "index" to index,
                    "reason" to when (reason) {
                        Player.MEDIA_ITEM_TRANSITION_REASON_AUTO -> "auto"
                        Player.MEDIA_ITEM_TRANSITION_REASON_SEEK -> "seek"
                        Player.MEDIA_ITEM_TRANSITION_REASON_PLAYLIST_CHANGED -> "playlist"
                        Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT -> "repeat"
                        else -> "unknown"
                    }
                ))
            }
            
            override fun onPlayerError(error: PlaybackException) {
                sendEvent("onError", mapOf(
                    "code" to error.errorCode,
                    "message" to (error.message ?: "Unknown error")
                ))
            }
        }
        
        player.addListener(playerListener!!)
    }
    
    private fun removePlayerListener() {
        playerListener?.let { listener ->
            getPlayer()?.removeListener(listener)
        }
        playerListener = null
    }
}
