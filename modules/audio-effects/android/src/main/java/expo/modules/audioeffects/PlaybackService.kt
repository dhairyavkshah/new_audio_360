package expo.modules.audioeffects

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import androidx.annotation.OptIn
import androidx.core.app.NotificationCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.session.CommandButton
import androidx.media3.session.MediaNotification
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.MediaStyleNotificationHelper
import com.google.common.collect.ImmutableList

@OptIn(UnstableApi::class)
class PlaybackService : MediaSessionService() {
    private var mediaSession: MediaSession? = null
    private var exoPlayer: ExoPlayer? = null
    private var dspProcessor: SoftwareDSPAudioProcessor? = null
    private var notificationCallback: MediaNotification.Provider.Callback? = null
    private var cachedActionFactory: MediaNotification.ActionFactory? = null

    companion object {
        var instance: PlaybackService? = null
            private set
        
        private const val NOTIFICATION_CHANNEL_ID = "new_audio_360_playback"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        
        createNotificationChannel()
        
        dspProcessor = SoftwareDSPAudioProcessor.getInstance()
        
        val audioSink = DefaultAudioSink.Builder(this)
            .setAudioProcessors(arrayOf(dspProcessor!!))
            .build()
        
        val renderersFactory = object : DefaultRenderersFactory(this) {
            override fun buildAudioSink(
                context: android.content.Context,
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
        
        exoPlayer = ExoPlayer.Builder(this, renderersFactory)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .build()
        
        exoPlayer?.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                android.util.Log.d("PlaybackService", "onIsPlayingChanged: $isPlaying")
                if (isPlaying) {
                    startOrUpdateForeground()
                } else {
                    updateNotification()
                }
            }
            
            override fun onMediaMetadataChanged(mediaMetadata: MediaMetadata) {
                android.util.Log.d("PlaybackService", "onMediaMetadataChanged: ${mediaMetadata.title}")
                if (exoPlayer?.isPlaying == true || exoPlayer?.playWhenReady == true) {
                    startOrUpdateForeground()
                }
            }
            
            override fun onPlaybackStateChanged(playbackState: Int) {
                android.util.Log.d("PlaybackService", "onPlaybackStateChanged: $playbackState")
                when (playbackState) {
                    Player.STATE_READY -> {
                        if (exoPlayer?.playWhenReady == true) {
                            startOrUpdateForeground()
                        }
                    }
                    Player.STATE_IDLE, Player.STATE_ENDED -> {
                        if (exoPlayer?.playWhenReady == false) {
                            stopForegroundNotification()
                        }
                    }
                }
            }
        })
        
        mediaSession = MediaSession.Builder(this, exoPlayer!!)
            .setCallback(object : MediaSession.Callback {
                override fun onConnect(
                    session: MediaSession,
                    controller: MediaSession.ControllerInfo
                ): MediaSession.ConnectionResult {
                    val connectionResult = super.onConnect(session, controller)
                    val sessionCommands = connectionResult.availableSessionCommands
                        .buildUpon()
                        .build()
                    return MediaSession.ConnectionResult.accept(
                        sessionCommands,
                        connectionResult.availablePlayerCommands
                    )
                }
            })
            .build()
        
        setMediaNotificationProvider(object : MediaNotification.Provider {
            override fun createNotification(
                mediaSession: MediaSession,
                customLayout: ImmutableList<CommandButton>,
                actionFactory: MediaNotification.ActionFactory,
                onNotificationChangedCallback: MediaNotification.Provider.Callback
            ): MediaNotification {
                notificationCallback = onNotificationChangedCallback
                cachedActionFactory = actionFactory
                
                val notification = buildMediaNotification(mediaSession, actionFactory)
                
                if (mediaSession.player.isPlaying || mediaSession.player.playWhenReady) {
                    onNotificationChangedCallback.startOrUpdateForegroundService(notification)
                    android.util.Log.d("PlaybackService", "createNotification: Started foreground service")
                }
                
                return notification
            }
            
            override fun handleCustomCommand(
                session: MediaSession,
                action: String,
                extras: Bundle
            ): Boolean {
                return false
            }
        })
        
        android.util.Log.d("PlaybackService", "PlaybackService created with audioSessionId: ${exoPlayer?.audioSessionId}")
    }
    
    private fun startOrUpdateForeground() {
        val session = mediaSession ?: return
        val factory = cachedActionFactory ?: return
        val callback = notificationCallback ?: return
        
        try {
            val notification = buildMediaNotification(session, factory)
            callback.startOrUpdateForegroundService(notification)
            android.util.Log.d("PlaybackService", "startOrUpdateForeground: Success")
        } catch (e: Exception) {
            android.util.Log.w("PlaybackService", "startOrUpdateForeground failed: ${e.message}")
        }
    }
    
    private fun updateNotification() {
        val session = mediaSession ?: return
        val factory = cachedActionFactory ?: return
        val callback = notificationCallback ?: return
        
        try {
            val notification = buildMediaNotification(session, factory)
            callback.onNotificationChanged(notification)
            android.util.Log.d("PlaybackService", "updateNotification: Success")
        } catch (e: Exception) {
            android.util.Log.w("PlaybackService", "updateNotification failed: ${e.message}")
        }
    }
    
    private fun stopForegroundNotification() {
        val callback = notificationCallback
        if (callback != null) {
            try {
                callback.stopForegroundService(true)
                android.util.Log.d("PlaybackService", "stopForegroundNotification: Success via callback")
            } catch (e: Exception) {
                android.util.Log.w("PlaybackService", "stopForegroundNotification via callback failed: ${e.message}")
            }
        } else {
            android.util.Log.d("PlaybackService", "stopForegroundNotification: No callback, skipping")
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "New Audio 360 Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Audio playback controls"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
            android.util.Log.d("PlaybackService", "Notification channel created")
        }
    }
    
    private fun buildMediaNotification(
        session: MediaSession,
        actionFactory: MediaNotification.ActionFactory
    ): MediaNotification {
        val player = session.player
        val metadata = player.mediaMetadata
        
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val contentIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else null
        
        val builder = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(metadata.title ?: "New Audio 360")
            .setContentText(metadata.artist ?: "Unknown Artist")
            .setSubText(metadata.albumTitle)
            .setOngoing(player.isPlaying)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setSilent(true)
        
        if (contentIntent != null) {
            builder.setContentIntent(contentIntent)
        }
        
        val artworkData = metadata.artworkData
        if (artworkData != null) {
            try {
                val bitmap = BitmapFactory.decodeByteArray(artworkData, 0, artworkData.size)
                builder.setLargeIcon(bitmap)
            } catch (e: Exception) {
                android.util.Log.w("PlaybackService", "Failed to decode artwork: ${e.message}")
            }
        }
        
        val previousAction = actionFactory.createMediaAction(
            session,
            android.R.drawable.ic_media_previous,
            "Previous",
            Player.COMMAND_SEEK_TO_PREVIOUS
        )
        builder.addAction(previousAction)
        
        val playPauseAction = if (player.isPlaying) {
            actionFactory.createMediaAction(
                session,
                android.R.drawable.ic_media_pause,
                "Pause",
                Player.COMMAND_PLAY_PAUSE
            )
        } else {
            actionFactory.createMediaAction(
                session,
                android.R.drawable.ic_media_play,
                "Play",
                Player.COMMAND_PLAY_PAUSE
            )
        }
        builder.addAction(playPauseAction)
        
        val nextAction = actionFactory.createMediaAction(
            session,
            android.R.drawable.ic_media_next,
            "Next",
            Player.COMMAND_SEEK_TO_NEXT
        )
        builder.addAction(nextAction)
        
        val mediaStyle = MediaStyleNotificationHelper.MediaStyle(session)
            .setShowActionsInCompactView(0, 1, 2)
        builder.setStyle(mediaStyle)
        
        val notification = builder.build()
        return MediaNotification(NOTIFICATION_ID, notification)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        android.util.Log.d("PlaybackService", "onStartCommand called, flags: $flags, startId: $startId")
        return result
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = mediaSession?.player
        if (player != null && !player.playWhenReady) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        notificationCallback = null
        cachedActionFactory = null
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        exoPlayer = null
        instance = null
        super.onDestroy()
        android.util.Log.d("PlaybackService", "PlaybackService destroyed")
    }

    fun getPlayer(): ExoPlayer? = exoPlayer
    
    fun getAudioSessionId(): Int = exoPlayer?.audioSessionId ?: 0
    
    fun getMediaSession(): MediaSession? = mediaSession
}
