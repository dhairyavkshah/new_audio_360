package expo.modules.audioeffects

import android.content.Intent
import android.os.Build
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

@OptIn(UnstableApi::class)
class PlaybackService : MediaSessionService() {
    private var mediaSession: MediaSession? = null
    private var exoPlayer: ExoPlayer? = null
    private var dspProcessor: SoftwareDSPAudioProcessor? = null

    companion object {
        var instance: PlaybackService? = null
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        
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
        
        mediaSession = MediaSession.Builder(this, exoPlayer!!)
            .build()
        
        android.util.Log.d("PlaybackService", "PlaybackService created with audioSessionId: ${exoPlayer?.audioSessionId}")
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = mediaSession?.player
        if (player != null && !player.playWhenReady) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        exoPlayer = null
        instance = null
        super.onDestroy()
    }

    fun getPlayer(): ExoPlayer? = exoPlayer
    
    fun getAudioSessionId(): Int = exoPlayer?.audioSessionId ?: 0
    
    fun getMediaSession(): MediaSession? = mediaSession
}
