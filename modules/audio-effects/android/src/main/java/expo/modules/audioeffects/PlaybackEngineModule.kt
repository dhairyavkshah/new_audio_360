package expo.modules.audioeffects

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes as ExoAudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.PlaybackException
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.session.MediaSession
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class PlaybackEngineModule : Module() {
    private var exoPlayer: ExoPlayer? = null
    private var mediaSession: MediaSession? = null
    private var isInitialized = false
    private var currentIndex = 0
    private var progressHandler: Handler? = null
    private var progressRunnable: Runnable? = null
    private var progressCallback: ((Map<String, Any>) -> Unit)? = null
    private var dspProcessor: SoftwareDSPAudioProcessor? = null
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    override fun definition() = ModuleDefinition {
        Name("PlaybackEngineModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("initialize") { promise: Promise ->
            mainHandler.post {
                try {
                    if (exoPlayer != null) {
                        promise.resolve(mapOf("success" to true, "alreadyInitialized" to true))
                        return@post
                    }
                    
                    val context = appContext.reactContext ?: throw Exception("Context not available")
                    
                    dspProcessor = SoftwareDSPAudioProcessor.getInstance()
                    
                    val audioSink = DefaultAudioSink.Builder(context)
                        .setAudioProcessors(arrayOf(dspProcessor!!))
                        .build()
                    
                    val renderersFactory = object : DefaultRenderersFactory(context) {
                        override fun buildAudioSink(
                            context: Context,
                            enableFloatOutput: Boolean,
                            enableAudioTrackPlaybackParams: Boolean
                        ): androidx.media3.exoplayer.audio.AudioSink {
                            return audioSink
                        }
                    }.setEnableAudioFloatOutput(true)
                     .setEnableDecoderFallback(true)
                    
                    val audioAttributes = ExoAudioAttributes.Builder()
                        .setUsage(C.USAGE_MEDIA)
                        .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                        .build()
                    
                    exoPlayer = ExoPlayer.Builder(context, renderersFactory)
                        .setAudioAttributes(audioAttributes, true)
                        .setHandleAudioBecomingNoisy(true)
                        .build().apply {
                            addListener(object : Player.Listener {
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
                                    val index = exoPlayer?.currentMediaItemIndex ?: 0
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
                            })
                        }
                    
                    mediaSession = MediaSession.Builder(context, exoPlayer!!)
                        .build()
                    
                    isInitialized = true
                    promise.resolve(mapOf(
                        "success" to true,
                        "audioSessionId" to (exoPlayer?.audioSessionId ?: 0)
                    ))
                    
                } catch (e: Exception) {
                    promise.reject("INIT_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setMetadata") { title: String, artist: String, album: String, artworkUri: String?, promise: Promise ->
            mainHandler.post {
                try {
                    val player = exoPlayer ?: throw Exception("Player not initialized")
                    
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
                    val player = exoPlayer ?: throw Exception("Player not initialized")
                    
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
                    val player = exoPlayer ?: throw Exception("Player not initialized")
                    
                    player.stop()
                    player.clearMediaItems()
                    
                    val mediaItem = MediaItem.Builder()
                        .setUri(Uri.parse(uri))
                        .build()
                    
                    player.setMediaItem(mediaItem)
                    player.prepare()
                    currentIndex = 0
                    
                    promise.resolve(mapOf("success" to true))
                    
                } catch (e: Exception) {
                    promise.reject("LOAD_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("play") { promise: Promise ->
            mainHandler.post {
                try {
                    val player = exoPlayer ?: throw Exception("Player not initialized")
                    player.play()
                    startProgressUpdates()
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("PLAY_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("pause") { promise: Promise ->
            mainHandler.post {
                try {
                    val player = exoPlayer ?: throw Exception("Player not initialized")
                    player.pause()
                    stopProgressUpdates()
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("PAUSE_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("stop") { promise: Promise ->
            mainHandler.post {
                try {
                    val player = exoPlayer ?: throw Exception("Player not initialized")
                    player.stop()
                    stopProgressUpdates()
                    promise.resolve(mapOf("success" to true))
                } catch (e: Exception) {
                    promise.reject("STOP_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("seekTo") { positionMs: Long, promise: Promise ->
            mainHandler.post {
                try {
                    val player = exoPlayer ?: throw Exception("Player not initialized")
                    player.seekTo(positionMs)
                    promise.resolve(mapOf("success" to true, "positionMs" to positionMs))
                } catch (e: Exception) {
                    promise.reject("SEEK_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("skipToIndex") { index: Int, promise: Promise ->
            mainHandler.post {
                try {
                    val player = exoPlayer ?: throw Exception("Player not initialized")
                    if (index >= 0 && index < player.mediaItemCount) {
                        player.seekTo(index, 0)
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
                    val player = exoPlayer ?: throw Exception("Player not initialized")
                    if (player.hasNextMediaItem()) {
                        player.seekToNextMediaItem()
                        currentIndex = player.currentMediaItemIndex
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
                    val player = exoPlayer ?: throw Exception("Player not initialized")
                    if (player.hasPreviousMediaItem()) {
                        player.seekToPreviousMediaItem()
                        currentIndex = player.currentMediaItemIndex
                        promise.resolve(mapOf("success" to true, "index" to currentIndex))
                    } else {
                        player.seekTo(0)
                        promise.resolve(mapOf("success" to true, "seekToStart" to true))
                    }
                } catch (e: Exception) {
                    promise.reject("SKIP_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setVolume") { volume: Double, promise: Promise ->
            mainHandler.post {
                try {
                    val clampedVolume = volume.coerceIn(0.0, 1.0).toFloat()
                    exoPlayer?.volume = clampedVolume
                    promise.resolve(mapOf("success" to true, "volume" to clampedVolume))
                } catch (e: Exception) {
                    promise.reject("VOLUME_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setPlaybackSpeed") { speed: Double, promise: Promise ->
            mainHandler.post {
                try {
                    val clampedSpeed = speed.coerceIn(0.25, 3.0).toFloat()
                    exoPlayer?.setPlaybackSpeed(clampedSpeed)
                    promise.resolve(mapOf("success" to true, "speed" to clampedSpeed))
                } catch (e: Exception) {
                    promise.reject("SPEED_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setRepeatMode") { mode: String, promise: Promise ->
            mainHandler.post {
                try {
                    val repeatMode = when (mode) {
                        "off" -> Player.REPEAT_MODE_OFF
                        "one" -> Player.REPEAT_MODE_ONE
                        "all" -> Player.REPEAT_MODE_ALL
                        else -> Player.REPEAT_MODE_OFF
                    }
                    exoPlayer?.repeatMode = repeatMode
                    promise.resolve(mapOf("success" to true, "mode" to mode))
                } catch (e: Exception) {
                    promise.reject("REPEAT_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("setShuffleMode") { enabled: Boolean, promise: Promise ->
            mainHandler.post {
                try {
                    exoPlayer?.shuffleModeEnabled = enabled
                    promise.resolve(mapOf("success" to true, "shuffle" to enabled))
                } catch (e: Exception) {
                    promise.reject("SHUFFLE_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("getStatus") { promise: Promise ->
            mainHandler.post {
                try {
                    val player = exoPlayer
                    val result = mutableMapOf<String, Any>()
                    result["isInitialized"] = isInitialized
                    result["isPlaying"] = player?.isPlaying == true
                    result["currentPositionMs"] = player?.currentPosition ?: 0L
                    result["durationMs"] = player?.duration ?: 0L
                    result["bufferedPositionMs"] = player?.bufferedPosition ?: 0L
                    result["currentIndex"] = player?.currentMediaItemIndex ?: 0
                    result["queueLength"] = player?.mediaItemCount ?: 0
                    result["playbackState"] = when (player?.playbackState) {
                        Player.STATE_IDLE -> "idle"
                        Player.STATE_BUFFERING -> "buffering"
                        Player.STATE_READY -> "ready"
                        Player.STATE_ENDED -> "ended"
                        else -> "unknown"
                    }
                    result["repeatMode"] = when (player?.repeatMode) {
                        Player.REPEAT_MODE_OFF -> "off"
                        Player.REPEAT_MODE_ONE -> "one"
                        Player.REPEAT_MODE_ALL -> "all"
                        else -> "off"
                    }
                    result["shuffleEnabled"] = player?.shuffleModeEnabled == true
                    result["audioSessionId"] = player?.audioSessionId ?: 0
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("STATUS_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("getAudioSessionId") { promise: Promise ->
            mainHandler.post {
                promise.resolve(exoPlayer?.audioSessionId ?: 0)
            }
        }
        
        AsyncFunction("getCurrentPosition") { promise: Promise ->
            mainHandler.post {
                promise.resolve(exoPlayer?.currentPosition ?: 0L)
            }
        }
        
        AsyncFunction("getDuration") { promise: Promise ->
            mainHandler.post {
                promise.resolve(exoPlayer?.duration ?: 0L)
            }
        }
        
        AsyncFunction("release") { promise: Promise ->
            mainHandler.post {
                try {
                    stopProgressUpdates()
                    mediaSession?.release()
                    mediaSession = null
                    exoPlayer?.release()
                    exoPlayer = null
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
    
    private fun startProgressUpdates() {
        stopProgressUpdates()
        
        progressHandler = Handler(Looper.getMainLooper())
        progressRunnable = object : Runnable {
            override fun run() {
                exoPlayer?.let { player ->
                    if (player.isPlaying) {
                        sendEvent("onProgress", mapOf(
                            "positionMs" to player.currentPosition,
                            "durationMs" to player.duration,
                            "bufferedMs" to player.bufferedPosition
                        ))
                    }
                }
                progressHandler?.postDelayed(this, 250)
            }
        }
        progressHandler?.post(progressRunnable!!)
    }
    
    private fun stopProgressUpdates() {
        progressRunnable?.let { progressHandler?.removeCallbacks(it) }
        progressHandler = null
        progressRunnable = null
    }
}
