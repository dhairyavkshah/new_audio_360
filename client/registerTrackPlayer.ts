import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './services/TrackPlayerService';

export function registerTrackPlayerService() {
  TrackPlayer.registerPlaybackService(() => PlaybackService);
}
