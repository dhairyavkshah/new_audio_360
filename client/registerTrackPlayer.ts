import { Platform } from 'react-native';
import { PlaybackService } from './services/TrackPlayerService';

export function registerTrackPlayerService() {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const TrackPlayer = require('react-native-track-player').default;
    const Capability = require('react-native-track-player').Capability;
    
    // Check if native module is properly linked
    if (Capability == null || Capability.Play == null) {
      console.log('[registerTrackPlayer] Native module not available');
      return;
    }
    
    TrackPlayer.registerPlaybackService(() => PlaybackService);
  } catch (e) {
    console.log('[registerTrackPlayer] Failed to register:', e);
  }
}
