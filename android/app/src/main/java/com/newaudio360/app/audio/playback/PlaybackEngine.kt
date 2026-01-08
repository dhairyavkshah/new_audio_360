package com.newaudio360.app.audio.playback

import android.content.Context
import android.net.Uri
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

enum class PlaybackState {
    IDLE,
    BUFFERING,
    READY,
    ENDED,
    ERROR
}

enum class RepeatMode {
    OFF,
    ONE,
    ALL
}

data class PlaybackStatus(
    val isInitialized: Boolean = false,
    val isPlaying: Boolean = false,
    val playbackState: PlaybackState = PlaybackState.IDLE,
    val currentPositionMs: Long = 0L,
    val durationMs: Long = 0L,
    val bufferedPositionMs: Long = 0L,
    val currentIndex: Int = 0,
    val queueLength: Int = 0,
    val repeatMode: RepeatMode = RepeatMode.OFF,
    val shuffleEnabled: Boolean = false,
    val audioSessionId: Int = 0
)

data class ProgressEvent(
    val positionMs: Long,
    val durationMs: Long,
    val bufferedMs: Long
)

data class TrackChangedEvent(
    val index: Int,
    val reason: String
)

@Singleton
class PlaybackEngine @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var exoPlayer: ExoPlayer? = null
    private val scope = CoroutineScope(Dispatchers.Main)
    private var progressJob: Job? = null

    private val _playbackState = MutableStateFlow(PlaybackStatus())
    val playbackState: StateFlow<PlaybackStatus> = _playbackState.asStateFlow()

    private val _progressFlow = MutableSharedFlow<ProgressEvent>(replay = 1)
    val progressFlow: SharedFlow<ProgressEvent> = _progressFlow.asSharedFlow()

    private val _trackChangedFlow = MutableSharedFlow<TrackChangedEvent>()
    val trackChangedFlow: SharedFlow<TrackChangedEvent> = _trackChangedFlow.asSharedFlow()

    private val _errorFlow = MutableSharedFlow<PlaybackException>()
    val errorFlow: SharedFlow<PlaybackException> = _errorFlow.asSharedFlow()

    val isInitialized: Boolean get() = exoPlayer != null
    val audioSessionId: Int get() = exoPlayer?.audioSessionId ?: 0

    fun initialize(): Result<Int> {
        return try {
            if (exoPlayer != null) {
                return Result.success(exoPlayer!!.audioSessionId)
            }

            val renderersFactory = DefaultRenderersFactory(context)
                .setEnableAudioFloatOutput(true)
                .setEnableDecoderFallback(true)

            val audioAttributes = AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build()

            exoPlayer = ExoPlayer.Builder(context, renderersFactory)
                .setAudioAttributes(audioAttributes, true)
                .setHandleAudioBecomingNoisy(true)
                .build().apply {
                    addListener(createPlayerListener())
                }

            updateState()
            Result.success(exoPlayer!!.audioSessionId)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun createPlayerListener() = object : Player.Listener {
        override fun onPlaybackStateChanged(state: Int) {
            val playbackState = when (state) {
                Player.STATE_IDLE -> PlaybackState.IDLE
                Player.STATE_BUFFERING -> PlaybackState.BUFFERING
                Player.STATE_READY -> PlaybackState.READY
                Player.STATE_ENDED -> PlaybackState.ENDED
                else -> PlaybackState.IDLE
            }
            _playbackState.value = _playbackState.value.copy(playbackState = playbackState)
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            _playbackState.value = _playbackState.value.copy(isPlaying = isPlaying)
            if (isPlaying) {
                startProgressUpdates()
            } else {
                stopProgressUpdates()
            }
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            val index = exoPlayer?.currentMediaItemIndex ?: 0
            val reasonStr = when (reason) {
                Player.MEDIA_ITEM_TRANSITION_REASON_AUTO -> "auto"
                Player.MEDIA_ITEM_TRANSITION_REASON_SEEK -> "seek"
                Player.MEDIA_ITEM_TRANSITION_REASON_PLAYLIST_CHANGED -> "playlist"
                Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT -> "repeat"
                else -> "unknown"
            }
            _playbackState.value = _playbackState.value.copy(currentIndex = index)
            scope.launch {
                _trackChangedFlow.emit(TrackChangedEvent(index, reasonStr))
            }
        }

        override fun onPlayerError(error: PlaybackException) {
            _playbackState.value = _playbackState.value.copy(playbackState = PlaybackState.ERROR)
            scope.launch {
                _errorFlow.emit(error)
            }
        }
    }

    fun setQueue(uris: List<String>, startIndex: Int = 0): Result<Unit> {
        return try {
            val player = exoPlayer ?: return Result.failure(IllegalStateException("Player not initialized"))

            player.stop()
            player.clearMediaItems()

            val mediaItems = uris.map { uri ->
                MediaItem.Builder()
                    .setUri(Uri.parse(uri))
                    .build()
            }

            player.setMediaItems(mediaItems, startIndex, 0)
            player.prepare()
            updateState()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun loadTrack(uri: String): Result<Unit> {
        return try {
            val player = exoPlayer ?: return Result.failure(IllegalStateException("Player not initialized"))

            player.stop()
            player.clearMediaItems()

            val mediaItem = MediaItem.Builder()
                .setUri(Uri.parse(uri))
                .build()

            player.setMediaItem(mediaItem)
            player.prepare()
            updateState()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun play(): Result<Unit> {
        return try {
            val player = exoPlayer ?: return Result.failure(IllegalStateException("Player not initialized"))
            player.play()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun pause(): Result<Unit> {
        return try {
            val player = exoPlayer ?: return Result.failure(IllegalStateException("Player not initialized"))
            player.pause()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun stop(): Result<Unit> {
        return try {
            val player = exoPlayer ?: return Result.failure(IllegalStateException("Player not initialized"))
            player.stop()
            stopProgressUpdates()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun seekTo(positionMs: Long): Result<Unit> {
        return try {
            val player = exoPlayer ?: return Result.failure(IllegalStateException("Player not initialized"))
            player.seekTo(positionMs)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun skipToNext(): Result<Boolean> {
        return try {
            val player = exoPlayer ?: return Result.failure(IllegalStateException("Player not initialized"))
            if (player.hasNextMediaItem()) {
                player.seekToNextMediaItem()
                updateState()
                Result.success(true)
            } else {
                Result.success(false)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun skipToPrevious(): Result<Boolean> {
        return try {
            val player = exoPlayer ?: return Result.failure(IllegalStateException("Player not initialized"))
            if (player.hasPreviousMediaItem()) {
                player.seekToPreviousMediaItem()
                updateState()
                Result.success(true)
            } else {
                player.seekTo(0)
                Result.success(false)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun skipToIndex(index: Int): Result<Unit> {
        return try {
            val player = exoPlayer ?: return Result.failure(IllegalStateException("Player not initialized"))
            if (index in 0 until player.mediaItemCount) {
                player.seekTo(index, 0)
                updateState()
                Result.success(Unit)
            } else {
                Result.failure(IndexOutOfBoundsException("Index out of bounds"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setVolume(volume: Float): Result<Unit> {
        return try {
            val clampedVolume = volume.coerceIn(0f, 1f)
            exoPlayer?.volume = clampedVolume
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setPlaybackSpeed(speed: Float): Result<Unit> {
        return try {
            val clampedSpeed = speed.coerceIn(0.25f, 3f)
            exoPlayer?.setPlaybackSpeed(clampedSpeed)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setRepeatMode(mode: RepeatMode): Result<Unit> {
        return try {
            val repeatMode = when (mode) {
                RepeatMode.OFF -> Player.REPEAT_MODE_OFF
                RepeatMode.ONE -> Player.REPEAT_MODE_ONE
                RepeatMode.ALL -> Player.REPEAT_MODE_ALL
            }
            exoPlayer?.repeatMode = repeatMode
            _playbackState.value = _playbackState.value.copy(repeatMode = mode)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setShuffleMode(enabled: Boolean): Result<Unit> {
        return try {
            exoPlayer?.shuffleModeEnabled = enabled
            _playbackState.value = _playbackState.value.copy(shuffleEnabled = enabled)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getCurrentPosition(): Long = exoPlayer?.currentPosition ?: 0L

    fun getDuration(): Long = exoPlayer?.duration ?: 0L

    fun getPlayer(): ExoPlayer? = exoPlayer

    private fun startProgressUpdates() {
        stopProgressUpdates()
        progressJob = scope.launch {
            while (isActive) {
                exoPlayer?.let { player ->
                    if (player.isPlaying) {
                        _progressFlow.emit(
                            ProgressEvent(
                                positionMs = player.currentPosition,
                                durationMs = player.duration,
                                bufferedMs = player.bufferedPosition
                            )
                        )
                    }
                }
                delay(250)
            }
        }
    }

    private fun stopProgressUpdates() {
        progressJob?.cancel()
        progressJob = null
    }

    private fun updateState() {
        exoPlayer?.let { player ->
            _playbackState.value = PlaybackStatus(
                isInitialized = true,
                isPlaying = player.isPlaying,
                playbackState = when (player.playbackState) {
                    Player.STATE_IDLE -> PlaybackState.IDLE
                    Player.STATE_BUFFERING -> PlaybackState.BUFFERING
                    Player.STATE_READY -> PlaybackState.READY
                    Player.STATE_ENDED -> PlaybackState.ENDED
                    else -> PlaybackState.IDLE
                },
                currentPositionMs = player.currentPosition,
                durationMs = player.duration,
                bufferedPositionMs = player.bufferedPosition,
                currentIndex = player.currentMediaItemIndex,
                queueLength = player.mediaItemCount,
                repeatMode = when (player.repeatMode) {
                    Player.REPEAT_MODE_OFF -> RepeatMode.OFF
                    Player.REPEAT_MODE_ONE -> RepeatMode.ONE
                    Player.REPEAT_MODE_ALL -> RepeatMode.ALL
                    else -> RepeatMode.OFF
                },
                shuffleEnabled = player.shuffleModeEnabled,
                audioSessionId = player.audioSessionId
            )
        }
    }

    fun release() {
        stopProgressUpdates()
        exoPlayer?.release()
        exoPlayer = null
        _playbackState.value = PlaybackStatus()
    }
}
