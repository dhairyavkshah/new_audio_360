package com.newaudio360.app.ui.screens

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class NowPlayingViewModel @Inject constructor(
    // TODO: Inject AudioPlaybackService, AudioEffectsRepository
) : ViewModel() {
    
    // TODO: Add state for current song
    // val currentSong: StateFlow<Song?> = ...
    
    // TODO: Add state for playback
    // val isPlaying: StateFlow<Boolean> = ...
    // val progress: StateFlow<Float> = ...
    // val duration: StateFlow<Long> = ...
    
    // TODO: Add methods for:
    // - togglePlayPause()
    // - seekTo(position: Float)
    // - skipNext()
    // - skipPrevious()
    // - openQueue()
    // - openSoundLab()
}
