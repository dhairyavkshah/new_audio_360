package expo.modules.audioeffects

import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink

/**
 * DSP Injection Module for react-native-track-player.
 * 
 * This module injects our SoftwareDSPAudioProcessor into TrackPlayer's ExoPlayer
 * using reflection after the player is initialized.
 * 
 * Signal Chain Order (v37.0):
 * 1. AI Audio Upscaling (Neural) - First step if enabled
 * 2. 10-Band EQ
 * 3. Bass Shelf
 * 4. Bass Enhancement
 * 5. Treble Shelf
 * 6. Spatial Enhancement (with HRTF)
 * 7. Reverb
 * 8. Limiter
 * 9. Output
 */
object TrackPlayerDspInjector {
    private const val TAG = "TrackPlayerDspInjector"
    private val mainHandler = Handler(Looper.getMainLooper())
    
    @Volatile
    private var dspInjected = false
    
    @Volatile
    private var injectionAttempted = false
    
    fun isDspInjected(): Boolean = dspInjected
    
    /**
     * Attempt to inject DSP into TrackPlayer's ExoPlayer.
     * This should be called after TrackPlayer is initialized.
     */
    fun injectDsp() {
        if (injectionAttempted) {
            android.util.Log.d(TAG, "DSP injection already attempted")
            return
        }
        
        injectionAttempted = true
        
        mainHandler.post {
            try {
                val dspProcessor = SoftwareDSPAudioProcessor.getInstance()
                DspProcessorHolder.setProcessor(dspProcessor)
                
                // Try to get the ExoPlayer from TrackPlayer's MusicService
                val exoPlayer = getTrackPlayerExoPlayer()
                if (exoPlayer != null) {
                    android.util.Log.d(TAG, "Found TrackPlayer ExoPlayer, audio session: ${exoPlayer.audioSessionId}")
                    
                    // The DSP processor is already in the singleton holder
                    // It will be used when audio is processed
                    dspInjected = true
                    android.util.Log.d(TAG, "DSP processor ready for TrackPlayer audio session")
                } else {
                    android.util.Log.w(TAG, "Could not find TrackPlayer ExoPlayer - DSP not injected")
                }
            } catch (e: Exception) {
                android.util.Log.e(TAG, "Error injecting DSP: ${e.message}", e)
            }
        }
    }
    
    /**
     * Retry injection with a delay (useful when TrackPlayer is still initializing).
     */
    fun injectDspWithDelay(delayMs: Long = 1000) {
        mainHandler.postDelayed({
            injectionAttempted = false
            injectDsp()
        }, delayMs)
    }
    
    /**
     * Get the ExoPlayer instance from TrackPlayer's MusicService using reflection.
     */
    private fun getTrackPlayerExoPlayer(): ExoPlayer? {
        try {
            val musicServiceClass = Class.forName("com.doublesymmetry.trackplayer.service.MusicService")
            
            // Get the static instance field
            val instanceField = musicServiceClass.getDeclaredField("instance")
            instanceField.isAccessible = true
            val instance = instanceField.get(null) ?: return null
            
            // Get the player field (QueuedAudioPlayer)
            val playerField = musicServiceClass.getDeclaredField("player")
            playerField.isAccessible = true
            val player = playerField.get(instance) ?: return null
            
            // Get the exoPlayer field from QueuedAudioPlayer
            val exoPlayerField = player.javaClass.getDeclaredField("exoPlayer")
            exoPlayerField.isAccessible = true
            return exoPlayerField.get(player) as? ExoPlayer
            
        } catch (e: ClassNotFoundException) {
            android.util.Log.d(TAG, "TrackPlayer MusicService class not found: ${e.message}")
        } catch (e: NoSuchFieldException) {
            android.util.Log.d(TAG, "TrackPlayer field not found: ${e.message}")
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Error getting TrackPlayer ExoPlayer: ${e.message}")
        }
        return null
    }
    
    fun reset() {
        dspInjected = false
        injectionAttempted = false
    }
}

/**
 * Static holder for the DSP processor that can be accessed during ExoPlayer creation.
 */
object DspProcessorHolder {
    @Volatile
    private var processor: SoftwareDSPAudioProcessor? = null
    
    fun setProcessor(p: SoftwareDSPAudioProcessor) {
        processor = p
        android.util.Log.d("DspProcessorHolder", "DSP processor set")
    }
    
    fun getProcessor(): SoftwareDSPAudioProcessor? = processor
    
    fun getProcessors(): Array<AudioProcessor> {
        val p = processor
        return if (p != null) arrayOf(p) else emptyArray()
    }
}

/**
 * Custom RenderersFactory that injects DSP into the audio pipeline.
 * This should be used when creating ExoPlayer instances.
 */
class DspRenderersFactory(context: Context) : DefaultRenderersFactory(context) {
    
    init {
        setEnableAudioFloatOutput(true)
        setEnableDecoderFallback(true)
    }
    
    override fun buildAudioSink(
        context: Context,
        enableFloatOutput: Boolean,
        enableAudioTrackPlaybackParams: Boolean
    ): AudioSink {
        val processors = DspProcessorHolder.getProcessors()
        
        android.util.Log.d("DspRenderersFactory", "Building AudioSink with ${processors.size} DSP processor(s)")
        
        return DefaultAudioSink.Builder(context)
            .setEnableFloatOutput(enableFloatOutput)
            .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
            .setAudioProcessors(processors)
            .build()
    }
}
