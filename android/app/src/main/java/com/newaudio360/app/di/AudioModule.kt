package com.newaudio360.app.di

import android.content.Context
import com.newaudio360.app.audio.effects.AudioEffectsManager
import com.newaudio360.app.audio.playback.PlaybackEngine
import com.newaudio360.app.audio.recording.RecordingEngine
import com.newaudio360.app.audio.waveform.WaveformAnalyzer
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AudioModule {

    @Provides
    @Singleton
    fun providePlaybackEngine(
        @ApplicationContext context: Context
    ): PlaybackEngine {
        return PlaybackEngine(context)
    }

    @Provides
    @Singleton
    fun provideAudioEffectsManager(): AudioEffectsManager {
        return AudioEffectsManager()
    }

    @Provides
    @Singleton
    fun provideWaveformAnalyzer(): WaveformAnalyzer {
        return WaveformAnalyzer()
    }

    @Provides
    @Singleton
    fun provideRecordingEngine(): RecordingEngine {
        return RecordingEngine()
    }
}
