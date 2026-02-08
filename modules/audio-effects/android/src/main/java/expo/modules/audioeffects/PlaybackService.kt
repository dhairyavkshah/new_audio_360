package expo.modules.audioeffects

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.PlaybackException
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.MediaStyleNotificationHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URL
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class PlaybackService : MediaSessionService() {
    
    companion object {
        private const val TAG = "PlaybackService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "newaudio360_playback_channel"
        
        @Volatile
        private var instance: PlaybackService? = null
        
        @Volatile
        private var readyLatch: CountDownLatch? = null
        
        fun getInstance(): PlaybackService? = instance
        
        fun isRunning(): Boolean = instance != null
        
        fun awaitReady(timeoutMs: Long = 5000): Boolean {
            val latch = readyLatch ?: return instance != null
            return try {
                latch.await(timeoutMs, TimeUnit.MILLISECONDS)
            } catch (e: InterruptedException) {
                false
            }
        }
        
        fun prepareForStart() {
            readyLatch = CountDownLatch(1)
        }
    }
    
    private var mediaSession: MediaSession? = null
    private var player: ExoPlayer? = null
    private var dspProcessor: SoftwareDSPAudioProcessor? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    
    private var stateCallback: ((Map<String, Any>) -> Unit)? = null
    private var progressCallback: ((Map<String, Any>) -> Unit)? = null
    private var trackEndedCallback: (() -> Unit)? = null
    private var progressHandler: Handler? = null
    private var progressRunnable: Runnable? = null
    
    private var currentArtwork: Bitmap? = null
    
    // Cached status fields for thread-safe reading without blocking
    // These are updated by player listeners on the main thread
    @Volatile private var cachedIsPlaying: Boolean = false
    @Volatile private var cachedPositionMs: Long = 0L
    @Volatile private var cachedDurationMs: Long = 0L
    @Volatile private var cachedBufferedPositionMs: Long = 0L
    @Volatile private var cachedCurrentIndex: Int = 0
    @Volatile private var cachedQueueLength: Int = 0
    @Volatile private var cachedPlaybackState: String = "idle"
    @Volatile private var cachedRepeatMode: String = "off"
    @Volatile private var cachedShuffleEnabled: Boolean = false
    @Volatile private var cachedAudioSessionId: Int = 0
    @Volatile private var cachedSampleBasedPositionMs: Long = 0L
    @Volatile private var cachedTrackEnded: Boolean = false
    
    override fun onCreate() {
        super.onCreate()
        instance = this
        
        createNotificationChannel()
        
        startForeground(NOTIFICATION_ID, buildInitialNotification())
        
        initializePlayer()
        
        // Preload neural audio processor in background (async, non-blocking)
        // This ensures AI upscaling is ready when user enables it without blocking audio
        preloadNeuralAudioProcessor()
        
        // Signal that service is ready
        readyLatch?.countDown()
        readyLatch = null
        
        Log.d(TAG, "PlaybackService created")
    }
    
    /**
     * Preload the neural audio processor in a background thread.
     * This avoids blocking the audio thread when AI upscaling is enabled.
     */
    private fun preloadNeuralAudioProcessor() {
        Log.d(TAG, "Preloading neural audio processor...")
        NeuralAudioProcessorTFLite.getInstance().initializeAsync(this) { success ->
            if (success) {
                Log.d(TAG, "Neural audio processor preloaded successfully")
            } else {
                Log.w(TAG, "Neural audio processor preload failed - AI upscaling may not be available")
            }
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Music Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Controls for audio playback"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun buildInitialNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            ?: Intent(this, Class.forName("${packageName}.MainActivity")).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("New Audio 360")
            .setContentText("Preparing playback...")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pendingIntent)
            .setSilent(true)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
    
    private fun initializePlayer() {
        if (player != null) return
        
        dspProcessor = SoftwareDSPAudioProcessor.getInstance()
        
        // Set up end-of-stream callback from DSP processor (primary track-end signal)
        // STATE_ENDED fallback may also fire if DSP doesn't detect end-of-stream
        // Both sources check cachedTrackEnded to prevent duplicates
        dspProcessor?.setEndOfStreamCallback {
            // Check if already handled (by STATE_ENDED fallback)
            if (cachedTrackEnded) {
                Log.d(TAG, "DSP end-of-stream callback fired but already handled")
                return@setEndOfStreamCallback
            }
            Log.d(TAG, "DSP end-of-stream callback fired - primary track end signal")
            cachedTrackEnded = true
            val position = cachedPositionMs / 1000
            val duration = cachedDurationMs / 1000
            mainHandler.post {
                trackEndedCallback?.invoke()
                notifyStateChange(mapOf(
                    "type" to "trackEnded",
                    "source" to "dspDecoder",
                    "position" to position,
                    "duration" to duration
                ))
            }
        }
        
        val audioSink = DefaultAudioSink.Builder(this)
            .setAudioProcessors(arrayOf(dspProcessor!!))
            .build()
        
        val renderersFactory = object : DefaultRenderersFactory(this) {
            override fun buildAudioSink(
                context: Context,
                enableFloatOutput: Boolean,
                enableAudioTrackPlaybackParams: Boolean
            ): androidx.media3.exoplayer.audio.AudioSink {
                return audioSink
            }
        }.setEnableAudioFloatOutput(true)
         .setEnableDecoderFallback(true)
        
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()
        
        // Create custom DataSource.Factory that handles OAuth for SoundCloud
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setUserAgent("NewAudio360/1.0")
            .setConnectTimeoutMs(30000)
            .setReadTimeoutMs(30000)
            .setAllowCrossProtocolRedirects(true)
        
        val dataSourceFactory = OAuthDataSourceFactory(this, httpDataSourceFactory)
        val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)
        
        player = ExoPlayer.Builder(this, renderersFactory)
            .setMediaSourceFactory(mediaSourceFactory)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .build().apply {
                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        val stateStr = when (state) {
                            Player.STATE_IDLE -> "idle"
                            Player.STATE_BUFFERING -> "buffering"
                            Player.STATE_READY -> "ready"
                            Player.STATE_ENDED -> "ended"
                            else -> "unknown"
                        }
                        cachedPlaybackState = stateStr
                        updateCachedStatus()
                        notifyStateChange(mapOf("state" to stateStr, "type" to "playbackState"))
                        
                        if (state == Player.STATE_ENDED) {
                            stopProgressUpdates()
                            
                            // FALLBACK: Fire trackEnded if DSP callback hasn't already fired
                            // This handles edge cases where DSP isEnded() check doesn't trigger
                            // (e.g., with Bass Enhancement or AI Upscaling causing buffering delays)
                            // Check both cached flag and DSP's internal flag to avoid duplicates
                            val dspAlreadyFired = dspProcessor?.hasTrackEnded() ?: false
                            if (!cachedTrackEnded && !dspAlreadyFired) {
                                Log.d(TAG, "STATE_ENDED fallback - DSP didn't fire, triggering trackEnded")
                                // Set flag synchronously to prevent DSP callback from also firing
                                cachedTrackEnded = true
                                val position = cachedPositionMs / 1000
                                val duration = cachedDurationMs / 1000
                                mainHandler.post {
                                    trackEndedCallback?.invoke()
                                    notifyStateChange(mapOf(
                                        "type" to "trackEnded",
                                        "source" to "stateEnded",
                                        "position" to position,
                                        "duration" to duration
                                    ))
                                }
                            }
                        }
                    }
                    
                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        cachedIsPlaying = isPlaying
                        updateCachedStatus()
                        notifyStateChange(mapOf("isPlaying" to isPlaying, "type" to "isPlaying"))
                        
                        if (isPlaying) {
                            startProgressUpdates()
                        } else {
                            stopProgressUpdates()
                        }
                    }
                    
                    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                        // Skip processing when mediaItem is null (happens during clearMediaItems())
                        // This prevents redundant buffer clearing
                        if (mediaItem == null) return
                        
                        val index = player?.currentMediaItemIndex ?: 0
                        cachedCurrentIndex = index
                        updateCachedStatus()
                        
                        dspProcessor?.resetSampleCounter(0L)
                        cachedTrackEnded = false
                        
                        notifyStateChange(mapOf(
                            "index" to index,
                            "type" to "trackChanged",
                            "reason" to when (reason) {
                                Player.MEDIA_ITEM_TRANSITION_REASON_AUTO -> "auto"
                                Player.MEDIA_ITEM_TRANSITION_REASON_SEEK -> "seek"
                                Player.MEDIA_ITEM_TRANSITION_REASON_PLAYLIST_CHANGED -> "playlist"
                                Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT -> "repeat"
                                else -> "unknown"
                            }
                        ))
                    }
                    
                    override fun onRepeatModeChanged(repeatMode: Int) {
                        cachedRepeatMode = when (repeatMode) {
                            Player.REPEAT_MODE_ONE -> "one"
                            Player.REPEAT_MODE_ALL -> "all"
                            else -> "off"
                        }
                    }
                    
                    override fun onShuffleModeEnabledChanged(shuffleModeEnabled: Boolean) {
                        cachedShuffleEnabled = shuffleModeEnabled
                    }
                    
                    override fun onPlayerError(error: PlaybackException) {
                        notifyStateChange(mapOf(
                            "type" to "error",
                            "code" to error.errorCode,
                            "message" to (error.message ?: "Unknown error")
                        ))
                    }
                })
                
                // Initialize cached audio session ID
                cachedAudioSessionId = audioSessionId
            }
        
        // Create PendingIntent for notification tap to open app
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val sessionActivityIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else null
        
        mediaSession = MediaSession.Builder(this, player!!)
            .setCallback(object : MediaSession.Callback {
                override fun onConnect(
                    session: MediaSession,
                    controller: MediaSession.ControllerInfo
                ): MediaSession.ConnectionResult {
                    return MediaSession.ConnectionResult.accept(
                        MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS,
                        MediaSession.ConnectionResult.DEFAULT_PLAYER_COMMANDS
                    )
                }
            })
            .apply {
                if (sessionActivityIntent != null) {
                    setSessionActivity(sessionActivityIntent)
                }
            }
            .build()
        
        Log.d(TAG, "Player initialized with audio session: ${player?.audioSessionId}")
    }
    
    /**
     * Updates all cached status values from the player.
     * Called from player listeners on the main thread.
     */
    private fun updateCachedStatus() {
        val p = player ?: return
        cachedPositionMs = p.currentPosition
        val duration = p.duration
        cachedDurationMs = if (duration == C.TIME_UNSET) 0L else duration
        cachedBufferedPositionMs = p.bufferedPosition
        cachedCurrentIndex = p.currentMediaItemIndex
        cachedQueueLength = p.mediaItemCount
        
        // Update sample-based position from DSP processor (more accurate than timing-based)
        dspProcessor?.let {
            cachedSampleBasedPositionMs = it.getSampleBasedPositionMs()
            cachedTrackEnded = it.hasTrackEnded()
        }
    }
    
    /**
     * Returns cached status values without blocking.
     * Safe to call from any thread since all fields are volatile.
     */
    fun getCachedStatus(): Map<String, Any> {
        // Get latest sample-based position (thread-safe volatile read from DSP)
        val samplePosition = dspProcessor?.getSampleBasedPositionMs() ?: 0L
        val trackEnded = dspProcessor?.hasTrackEnded() ?: false
        
        return mapOf(
            "isInitialized" to (player != null),
            "isPlaying" to cachedIsPlaying,
            "currentPositionMs" to cachedPositionMs,
            "sampleBasedPositionMs" to samplePosition,
            "durationMs" to cachedDurationMs,
            "bufferedPositionMs" to cachedBufferedPositionMs,
            "currentIndex" to cachedCurrentIndex,
            "queueLength" to cachedQueueLength,
            "playbackState" to cachedPlaybackState,
            "repeatMode" to cachedRepeatMode,
            "shuffleEnabled" to cachedShuffleEnabled,
            "audioSessionId" to cachedAudioSessionId,
            "trackEnded" to trackEnded
        )
    }
    
    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }
    
    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(TAG, "onTaskRemoved called - stopping playback and service")
        
        // Always stop playback when the app task is removed (user swiped away app)
        // This ensures music stops when the app is force-closed
        player?.let { p ->
            try {
                p.stop()
                p.clearMediaItems()
            } catch (e: Exception) {
                Log.w(TAG, "Error stopping player on task removed: ${e.message}")
            }
        }
        
        // Always stop the service when task is removed
        stopSelf()
    }
    
    override fun onDestroy() {
        Log.d(TAG, "PlaybackService onDestroy called")
        
        // Stop progress updates
        stopProgressUpdates()
        
        // Clear callbacks
        stateCallback = null
        progressCallback = null
        
        // Cancel coroutines
        try {
            serviceScope.cancel()
        } catch (e: Exception) {
            Log.w(TAG, "Error canceling service scope: ${e.message}")
        }
        
        // Release media session
        mediaSession?.run {
            try {
                release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing MediaSession: ${e.message}")
            }
        }
        mediaSession = null
        
        // Release player
        player?.run {
            try {
                stop()
                release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing ExoPlayer: ${e.message}")
            }
        }
        player = null
        
        // Recycle artwork bitmap
        currentArtwork?.recycle()
        currentArtwork = null
        
        // Clear instance
        instance = null
        
        Log.d(TAG, "PlaybackService destroyed")
        super.onDestroy()
    }
    
    fun setStateCallback(callback: ((Map<String, Any>) -> Unit)?) {
        stateCallback = callback
    }
    
    fun setProgressCallback(callback: ((Map<String, Any>) -> Unit)?) {
        progressCallback = callback
    }
    
    fun setTrackEndedCallback(callback: (() -> Unit)?) {
        trackEndedCallback = callback
    }
    
    private fun notifyStateChange(data: Map<String, Any>) {
        mainHandler.post {
            stateCallback?.invoke(data)
        }
    }
    
    private fun startProgressUpdates() {
        stopProgressUpdates()
        
        progressHandler = Handler(Looper.getMainLooper())
        progressRunnable = object : Runnable {
            override fun run() {
                player?.let { p ->
                    if (p.isPlaying) {
                        // Update cached values
                        cachedPositionMs = p.currentPosition
                        val durationMs = p.duration
                        cachedDurationMs = if (durationMs == C.TIME_UNSET) 0L else durationMs
                        cachedBufferedPositionMs = p.bufferedPosition
                        
                        // Convert to SECONDS (integer) for simple, clean updates
                        val positionSeconds = (cachedPositionMs / 1000).toInt()
                        val durationSeconds = (cachedDurationMs / 1000).toInt()
                        
                        // Send progress update in SECONDS (like web's ontimeupdate)
                        progressCallback?.invoke(mapOf(
                            "position" to positionSeconds,
                            "duration" to durationSeconds
                        ))
                        
                        // Note: We DO NOT stop progress updates based on position >= duration
                        // The DSP end-of-stream callback is the authoritative track end signal
                        // It will fire trackEnded and handle repeat/advance logic
                        // Stopping early would prevent the final progress update from being sent
                    }
                }
                progressHandler?.postDelayed(this, 1000) // Update every 1 second
            }
        }
        progressHandler?.post(progressRunnable!!)
    }
    
    private fun stopProgressUpdates() {
        progressRunnable?.let { progressHandler?.removeCallbacks(it) }
        progressHandler = null
        progressRunnable = null
    }
    
    fun getPlayer(): ExoPlayer? = player
    
    fun getAudioSessionId(): Int = player?.audioSessionId ?: 0
    
    fun loadTrack(uri: String, title: String? = null, artist: String? = null, artworkUrl: String? = null): Boolean {
        val p = player ?: return false
        
        try {
            p.stop()
            p.clearMediaItems()
            
            // Reset sample counter for new track
            dspProcessor?.resetSampleCounter(0L)
            cachedTrackEnded = false
            
            val metadata = MediaMetadata.Builder()
                .setTitle(title ?: "Unknown Track")
                .setArtist(artist ?: "Unknown Artist")
                .setArtworkUri(if (artworkUrl != null) Uri.parse(artworkUrl) else null)
                .build()
            
            val mediaItem = MediaItem.Builder()
                .setUri(Uri.parse(uri))
                .setMediaMetadata(metadata)
                .build()
            
            p.setMediaItem(mediaItem)
            p.prepare()
            
            if (artworkUrl != null) {
                loadArtworkAsync(artworkUrl)
            }
            
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error loading track: ${e.message}", e)
            return false
        }
    }
    
    fun setQueue(uris: List<String>, startIndex: Int, metadata: List<Map<String, String>>? = null): Boolean {
        val p = player ?: return false
        
        try {
            p.stop()
            p.clearMediaItems()
            
            // Reset sample counter for new queue
            dspProcessor?.resetSampleCounter(0L)
            cachedTrackEnded = false
            
            val mediaItems = uris.mapIndexed { index, uri ->
                val meta = metadata?.getOrNull(index)
                val metadataBuilder = MediaMetadata.Builder()
                    .setTitle(meta?.get("title") ?: "Unknown Track")
                    .setArtist(meta?.get("artist") ?: "Unknown Artist")
                
                val artworkUrl = meta?.get("artwork")
                if (artworkUrl != null) {
                    metadataBuilder.setArtworkUri(Uri.parse(artworkUrl))
                }
                
                MediaItem.Builder()
                    .setUri(Uri.parse(uri))
                    .setMediaMetadata(metadataBuilder.build())
                    .build()
            }
            
            p.setMediaItems(mediaItems, startIndex, 0)
            p.prepare()
            
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error setting queue: ${e.message}", e)
            return false
        }
    }
    
    fun updateMetadata(title: String?, artist: String?, artworkUrl: String?) {
        val p = player ?: return
        val currentItem = p.currentMediaItem ?: return
        
        val newMetadata = MediaMetadata.Builder()
            .setTitle(title ?: currentItem.mediaMetadata.title ?: "Unknown Track")
            .setArtist(artist ?: currentItem.mediaMetadata.artist ?: "Unknown Artist")
            .setArtworkUri(
                if (artworkUrl != null) Uri.parse(artworkUrl) 
                else currentItem.mediaMetadata.artworkUri
            )
            .build()
        
        val newMediaItem = currentItem.buildUpon()
            .setMediaMetadata(newMetadata)
            .build()
        
        val currentIndex = p.currentMediaItemIndex
        val currentPosition = p.currentPosition
        
        p.replaceMediaItem(currentIndex, newMediaItem)
        p.seekTo(currentIndex, currentPosition)
        
        if (artworkUrl != null) {
            loadArtworkAsync(artworkUrl)
        }
    }
    
    private fun loadArtworkAsync(url: String) {
        serviceScope.launch {
            try {
                val bitmap = withContext(Dispatchers.IO) {
                    try {
                        when {
                            url.startsWith("data:") -> {
                                val base64Data = url.substringAfter(",")
                                val decodedBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
                                BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                            }
                            url.startsWith("file://") || url.startsWith("/") -> {
                                val path = if (url.startsWith("file://")) url.removePrefix("file://") else url
                                BitmapFactory.decodeFile(path)
                            }
                            url.startsWith("http://") || url.startsWith("https://") -> {
                                val connection = URL(url).openConnection()
                                connection.connectTimeout = 5000
                                connection.readTimeout = 5000
                                BitmapFactory.decodeStream(connection.getInputStream())
                            }
                            url.startsWith("content://") -> {
                                val uri = Uri.parse(url)
                                val inputStream = applicationContext.contentResolver.openInputStream(uri)
                                BitmapFactory.decodeStream(inputStream)
                            }
                            else -> {
                                null
                            }
                        }
                    } catch (e: Exception) {
                        Log.d(TAG, "Could not load artwork from: ${url.take(50)}...")
                        null
                    }
                }
                
                if (bitmap != null) {
                    currentArtwork = bitmap
                }
            } catch (e: Exception) {
                Log.d(TAG, "Error loading artwork: ${e.message}")
            }
        }
    }
    
    fun play(): Boolean {
        return try {
            player?.play()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error playing: ${e.message}", e)
            false
        }
    }
    
    fun pause(): Boolean {
        return try {
            player?.pause()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error pausing: ${e.message}", e)
            false
        }
    }
    
    fun stop(): Boolean {
        return try {
            player?.stop()
            stopProgressUpdates()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping: ${e.message}", e)
            false
        }
    }
    
    fun seekTo(positionMs: Long): Boolean {
        return try {
            // Set pending sample position BEFORE seeking
            // This ensures flush() (called by ExoPlayer during seek) uses this value
            dspProcessor?.let { dsp ->
                val sampleRate = dsp.getSampleRate()
                val newSamples = ((positionMs / 1000.0) * sampleRate).toLong()
                dsp.setPendingSamplePosition(newSamples)
            }
            cachedTrackEnded = false
            player?.seekTo(positionMs)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error seeking: ${e.message}", e)
            false
        }
    }
    
    fun skipToNext(): Boolean {
        val p = player ?: return false
        return if (p.hasNextMediaItem()) {
            // Reset sample counter for new track
            dspProcessor?.resetSampleCounter(0L)
            cachedTrackEnded = false
            p.seekToNextMediaItem()
            true
        } else {
            false
        }
    }
    
    fun skipToPrevious(): Boolean {
        val p = player ?: return false
        // Reset sample counter for previous/restart track
        dspProcessor?.resetSampleCounter(0L)
        cachedTrackEnded = false
        return if (p.hasPreviousMediaItem()) {
            p.seekToPreviousMediaItem()
            true
        } else {
            p.seekTo(0)
            true
        }
    }
    
    fun skipToIndex(index: Int): Boolean {
        val p = player ?: return false
        return if (index >= 0 && index < p.mediaItemCount) {
            // Reset sample counter for new track
            dspProcessor?.resetSampleCounter(0L)
            cachedTrackEnded = false
            p.seekTo(index, 0)
            true
        } else {
            false
        }
    }
    
    fun setVolume(volume: Float) {
        player?.volume = volume.coerceIn(0f, 1f)
    }
    
    fun setPlaybackSpeed(speed: Float) {
        player?.setPlaybackSpeed(speed.coerceIn(0.25f, 3f))
    }
    
    fun setRepeatMode(mode: String) {
        player?.repeatMode = when (mode) {
            "one" -> Player.REPEAT_MODE_ONE
            "all" -> Player.REPEAT_MODE_ALL
            else -> Player.REPEAT_MODE_OFF
        }
    }
    
    fun setShuffleMode(enabled: Boolean) {
        player?.shuffleModeEnabled = enabled
    }
    
    fun setEqBands(bands: List<Double>) {
        dspProcessor?.setAllEqBandGains(bands)
        android.util.Log.d("PlaybackService", "EQ bands set: ${bands.take(10).joinToString()}")
    }
    
    fun setBassBoost(gainUnits: Double) {
        dspProcessor?.setBassBoost(gainUnits.toFloat())
    }
    
    fun setTrebleBoost(gainUnits: Double) {
        dspProcessor?.setTrebleBoost(gainUnits.toFloat())
    }
    
    fun getStatus(): Map<String, Any> {
        val p = player
        val duration = p?.duration ?: 0L
        val safeDuration = if (duration == C.TIME_UNSET) 0L else duration
        return mapOf(
            "isInitialized" to (p != null),
            "isPlaying" to (p?.isPlaying == true),
            "currentPositionMs" to (p?.currentPosition ?: 0L),
            "durationMs" to safeDuration,
            "bufferedPositionMs" to (p?.bufferedPosition ?: 0L),
            "currentIndex" to (p?.currentMediaItemIndex ?: 0),
            "queueLength" to (p?.mediaItemCount ?: 0),
            "playbackState" to when (p?.playbackState) {
                Player.STATE_IDLE -> "idle"
                Player.STATE_BUFFERING -> "buffering"
                Player.STATE_READY -> "ready"
                Player.STATE_ENDED -> "ended"
                else -> "unknown"
            },
            "repeatMode" to when (p?.repeatMode) {
                Player.REPEAT_MODE_ONE -> "one"
                Player.REPEAT_MODE_ALL -> "all"
                else -> "off"
            },
            "shuffleEnabled" to (p?.shuffleModeEnabled == true),
            "audioSessionId" to (p?.audioSessionId ?: 0)
        )
    }
}

/**
 * Custom DataSource.Factory that handles OAuth tokens for SoundCloud URLs.
 * Wraps DefaultDataSource.Factory and intercepts DataSpec to inject Authorization headers.
 */
class OAuthDataSourceFactory(
    private val context: Context,
    private val httpDataSourceFactory: DefaultHttpDataSource.Factory
) : DataSource.Factory {
    
    companion object {
        private const val TAG = "OAuthDataSourceFactory"
    }
    
    // Use DefaultDataSource.Factory for proper handling of all URI schemes
    private val defaultDataSourceFactory = DefaultDataSource.Factory(context, httpDataSourceFactory)
    
    override fun createDataSource(): DataSource {
        return OAuthDataSource(defaultDataSourceFactory.createDataSource())
    }
    
    /**
     * Wrapper DataSource that intercepts open() to inject OAuth headers for SoundCloud URLs.
     */
    private class OAuthDataSource(
        private val wrappedDataSource: DataSource
    ) : DataSource {
        
        override fun open(dataSpec: androidx.media3.datasource.DataSpec): Long {
            val uri = dataSpec.uri
            val uriString = uri.toString()
            
            // Check if this is a SoundCloud API URL that needs OAuth
            if (isSoundCloudApiUrl(uriString)) {
                val oauthToken = extractOAuthToken(uri)
                if (oauthToken != null) {
                    Log.d(TAG, "Adding OAuth header for SoundCloud URL: ${uri.host}")
                    
                    // Build new DataSpec with OAuth header and clean URL
                    val cleanUri = removeOAuthTokenFromQuery(uri)
                    val newHeaders = dataSpec.httpRequestHeaders.toMutableMap().apply {
                        put("Authorization", "OAuth $oauthToken")
                    }
                    
                    val newDataSpec = dataSpec.buildUpon()
                        .setUri(cleanUri)
                        .setHttpRequestHeaders(newHeaders)
                        .build()
                    
                    return wrappedDataSource.open(newDataSpec)
                }
            }
            
            // For all other URLs, use the wrapped DataSource directly
            return wrappedDataSource.open(dataSpec)
        }
        
        override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
            return wrappedDataSource.read(buffer, offset, length)
        }
        
        override fun addTransferListener(transferListener: androidx.media3.datasource.TransferListener) {
            wrappedDataSource.addTransferListener(transferListener)
        }
        
        override fun getUri(): Uri? {
            return wrappedDataSource.uri
        }
        
        override fun getResponseHeaders(): Map<String, List<String>> {
            return wrappedDataSource.responseHeaders
        }
        
        override fun close() {
            wrappedDataSource.close()
        }
        
        private fun isSoundCloudApiUrl(url: String): Boolean {
            return url.contains("api.soundcloud.com") || 
                   url.contains("api-v2.soundcloud.com") ||
                   url.contains("soundcloud.com/tracks")
        }
        
        private fun extractOAuthToken(uri: Uri): String? {
            return uri.getQueryParameter("oauth_token")
        }
        
        private fun removeOAuthTokenFromQuery(uri: Uri): Uri {
            val builder = uri.buildUpon().clearQuery()
            uri.queryParameterNames.forEach { param ->
                if (param != "oauth_token") {
                    uri.getQueryParameter(param)?.let { value ->
                        builder.appendQueryParameter(param, value)
                    }
                }
            }
            return builder.build()
        }
    }
}
