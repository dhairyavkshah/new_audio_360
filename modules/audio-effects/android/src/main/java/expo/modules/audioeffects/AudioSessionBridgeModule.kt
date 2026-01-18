package expo.modules.audioeffects

import android.content.Context
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class AudioSessionBridgeModule : Module() {
    private var generatedSessionId: Int = 0
    
    override fun definition() = ModuleDefinition {
        Name("AudioSessionBridgeModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        Function("generateAudioSessionId") {
            val context = appContext.reactContext ?: return@Function 0
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            
            if (audioManager != null) {
                generatedSessionId = audioManager.generateAudioSessionId()
                android.util.Log.d("AudioSessionBridge", "Generated audio session ID: $generatedSessionId")
                return@Function generatedSessionId
            }
            return@Function 0
        }
        
        Function("getGeneratedSessionId") {
            return@Function generatedSessionId
        }
        
        AsyncFunction("getTrackPlayerSessionId") { promise: Promise ->
            try {
                val sessionId = getTrackPlayerAudioSessionId()
                if (sessionId != null && sessionId > 0) {
                    promise.resolve(mapOf(
                        "success" to true,
                        "sessionId" to sessionId
                    ))
                } else {
                    promise.resolve(mapOf(
                        "success" to false,
                        "error" to "Could not get TrackPlayer audio session ID",
                        "sessionId" to 0
                    ))
                }
            } catch (e: Exception) {
                promise.resolve(mapOf(
                    "success" to false,
                    "error" to e.message,
                    "sessionId" to 0
                ))
            }
        }
        
        Function("getActiveAudioSessionId") {
            return@Function getActivePlayingSessionId()
        }
    }
    
    private fun getTrackPlayerAudioSessionId(): Int? {
        try {
            val musicServiceClass = Class.forName("com.doublesymmetry.trackplayer.service.MusicService")
            val instanceField = musicServiceClass.getDeclaredField("instance")
            instanceField.isAccessible = true
            val instance = instanceField.get(null) ?: return null
            
            val playerField = musicServiceClass.getDeclaredField("player")
            playerField.isAccessible = true
            val player = playerField.get(instance) ?: return null
            
            val exoPlayerField = player.javaClass.getDeclaredField("exoPlayer")
            exoPlayerField.isAccessible = true
            val exoPlayer = exoPlayerField.get(player) ?: return null
            
            val audioSessionIdMethod = exoPlayer.javaClass.getMethod("getAudioSessionId")
            return audioSessionIdMethod.invoke(exoPlayer) as? Int
        } catch (e: ClassNotFoundException) {
            android.util.Log.d("AudioSessionBridge", "TrackPlayer MusicService class not found: ${e.message}")
        } catch (e: NoSuchFieldException) {
            android.util.Log.d("AudioSessionBridge", "TrackPlayer field not found: ${e.message}")
        } catch (e: Exception) {
            android.util.Log.e("AudioSessionBridge", "Error getting TrackPlayer session: ${e.message}")
        }
        return null
    }
    
    private fun getActivePlayingSessionId(): Int {
        val context = appContext.reactContext ?: return 0
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return 0
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val sessionsField = audioManager.javaClass.getDeclaredMethod("getActivePlaybackConfigurations")
                val configs = sessionsField.invoke(audioManager) as? List<*>
                
                configs?.forEach { config ->
                    if (config != null) {
                        try {
                            val sessionIdMethod = config.javaClass.getMethod("getAudioAttributes")
                            val attrs = sessionIdMethod.invoke(config)
                            if (attrs != null) {
                                val contentTypeMethod = attrs.javaClass.getMethod("getContentType")
                                val contentType = contentTypeMethod.invoke(attrs) as? Int
                                if (contentType == 2) {
                                    val playerStateMethod = config.javaClass.getMethod("getPlayerState")
                                    val playerState = playerStateMethod.invoke(config) as? Int
                                    if (playerState == 2) {
                                        val clientInfoMethod = config.javaClass.getMethod("getClientUid")
                                        val clientUid = clientInfoMethod.invoke(config) as? Int
                                        android.util.Log.d("AudioSessionBridge", "Found active music playback from UID: $clientUid")
                                    }
                                }
                            }
                        } catch (e: Exception) {
                            android.util.Log.d("AudioSessionBridge", "Error inspecting config: ${e.message}")
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.d("AudioSessionBridge", "Error getting playback configs: ${e.message}")
            }
        }
        
        return 0
    }
}
