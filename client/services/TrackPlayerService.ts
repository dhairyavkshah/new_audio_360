import TrackPlayer, {
  Event,
  State,
  Capability,
  RepeatMode,
  AppKilledPlaybackBehavior,
  Track,
  Progress,
  PlaybackState,
} from 'react-native-track-player';
import { Platform } from 'react-native';

export interface TrackMetadata {
  id: string;
  url: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration?: number;
  isLiveStream?: boolean;
}

class TrackPlayerServiceClass {
  private isInitialized = false;
  private onPlayCallback?: () => void;
  private onPauseCallback?: () => void;
  private onStopCallback?: () => void;
  private onNextCallback?: () => void;
  private onPreviousCallback?: () => void;
  private onSeekCallback?: (position: number) => void;
  private onTrackChangeCallback?: (trackIndex: number | null) => void;
  private onProgressCallback?: (progress: Progress) => void;
  private onStateChangeCallback?: (state: State) => void;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (Platform.OS === 'web') {
      console.log('[TrackPlayerService] Web platform - using fallback');
      return false;
    }

    try {
      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
        autoHandleInterruptions: true,
      });

      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        progressUpdateEventInterval: 1,
      });

      this.isInitialized = true;
      console.log('[TrackPlayerService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[TrackPlayerService] Initialization failed:', error);
      return false;
    }
  }

  async destroy(): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      await TrackPlayer.reset();
      this.isInitialized = false;
    } catch (error) {
      console.error('[TrackPlayerService] Destroy failed:', error);
    }
  }

  async addTrack(track: TrackMetadata): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const trackData: Track = {
      id: track.id,
      url: track.url,
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: track.artwork,
      duration: track.duration,
      isLiveStream: track.isLiveStream ?? false,
    };

    await TrackPlayer.add(trackData);
  }

  async addTracks(tracks: TrackMetadata[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const trackDataList: Track[] = tracks.map(track => ({
      id: track.id,
      url: track.url,
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: track.artwork,
      duration: track.duration,
      isLiveStream: track.isLiveStream ?? false,
    }));

    await TrackPlayer.add(trackDataList);
  }

  async setQueue(tracks: TrackMetadata[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await TrackPlayer.reset();
    await this.addTracks(tracks);
  }

  async play(): Promise<void> {
    if (!this.isInitialized) return;
    await TrackPlayer.play();
  }

  async pause(): Promise<void> {
    if (!this.isInitialized) return;
    await TrackPlayer.pause();
  }

  async stop(): Promise<void> {
    if (!this.isInitialized) return;
    await TrackPlayer.stop();
    await TrackPlayer.reset();
  }

  async skipToNext(): Promise<void> {
    if (!this.isInitialized) return;
    
    const queue = await TrackPlayer.getQueue();
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    
    if (currentIndex !== undefined && currentIndex !== null && currentIndex < queue.length - 1) {
      await TrackPlayer.skipToNext();
    }
  }

  async skipToPrevious(): Promise<void> {
    if (!this.isInitialized) return;
    
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    
    if (currentIndex !== undefined && currentIndex !== null && currentIndex > 0) {
      await TrackPlayer.skipToPrevious();
    }
  }

  async skipToTrack(index: number): Promise<void> {
    if (!this.isInitialized) return;
    await TrackPlayer.skip(index);
  }

  async seekTo(position: number): Promise<void> {
    if (!this.isInitialized) return;
    await TrackPlayer.seekTo(position);
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.isInitialized) return;
    await TrackPlayer.setVolume(Math.max(0, Math.min(1, volume)));
  }

  async setRepeatMode(mode: 'off' | 'one' | 'all'): Promise<void> {
    if (!this.isInitialized) return;
    
    const repeatModeMap: Record<string, RepeatMode> = {
      off: RepeatMode.Off,
      one: RepeatMode.Track,
      all: RepeatMode.Queue,
    };
    
    await TrackPlayer.setRepeatMode(repeatModeMap[mode]);
  }

  async getProgress(): Promise<Progress | null> {
    if (!this.isInitialized) return null;
    return await TrackPlayer.getProgress();
  }

  async getState(): Promise<State | null> {
    if (!this.isInitialized) return null;
    const playbackState = await TrackPlayer.getPlaybackState();
    return playbackState.state;
  }

  async getQueue(): Promise<Track[]> {
    if (!this.isInitialized) return [];
    return await TrackPlayer.getQueue();
  }

  async getCurrentTrack(): Promise<Track | null> {
    if (!this.isInitialized) return null;
    return await TrackPlayer.getActiveTrack() || null;
  }

  async getCurrentTrackIndex(): Promise<number | null> {
    if (!this.isInitialized) return null;
    const index = await TrackPlayer.getActiveTrackIndex();
    return index ?? null;
  }

  async updateMetadata(metadata: Partial<TrackMetadata>): Promise<void> {
    if (!this.isInitialized) return;
    
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    if (currentIndex === undefined || currentIndex === null) return;

    await TrackPlayer.updateMetadataForTrack(currentIndex, {
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      artwork: metadata.artwork,
      duration: metadata.duration,
    });
  }

  setCallbacks(callbacks: {
    onPlay?: () => void;
    onPause?: () => void;
    onStop?: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    onSeek?: (position: number) => void;
    onTrackChange?: (trackIndex: number | null) => void;
    onProgress?: (progress: Progress) => void;
    onStateChange?: (state: State) => void;
  }): void {
    this.onPlayCallback = callbacks.onPlay;
    this.onPauseCallback = callbacks.onPause;
    this.onStopCallback = callbacks.onStop;
    this.onNextCallback = callbacks.onNext;
    this.onPreviousCallback = callbacks.onPrevious;
    this.onSeekCallback = callbacks.onSeek;
    this.onTrackChangeCallback = callbacks.onTrackChange;
    this.onProgressCallback = callbacks.onProgress;
    this.onStateChangeCallback = callbacks.onStateChange;
  }

  handleRemotePlay(): void {
    this.onPlayCallback?.();
  }

  handleRemotePause(): void {
    this.onPauseCallback?.();
  }

  handleRemoteStop(): void {
    this.onStopCallback?.();
  }

  handleRemoteNext(): void {
    this.onNextCallback?.();
  }

  handleRemotePrevious(): void {
    this.onPreviousCallback?.();
  }

  handleRemoteSeek(position: number): void {
    this.onSeekCallback?.(position);
  }

  handleTrackChange(trackIndex: number | null): void {
    this.onTrackChangeCallback?.(trackIndex);
  }

  handleProgress(progress: Progress): void {
    this.onProgressCallback?.(progress);
  }

  handleStateChange(state: State): void {
    this.onStateChangeCallback?.(state);
  }

  isAvailable(): boolean {
    return Platform.OS !== 'web';
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}

export const TrackPlayerService = new TrackPlayerServiceClass();

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
    TrackPlayerService.handleRemotePlay();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
    TrackPlayerService.handleRemotePause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
    TrackPlayerService.handleRemoteStop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    const queue = await TrackPlayer.getQueue();
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    
    if (currentIndex !== undefined && currentIndex !== null && currentIndex < queue.length - 1) {
      await TrackPlayer.skipToNext();
      TrackPlayerService.handleRemoteNext();
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    
    if (currentIndex !== undefined && currentIndex !== null && currentIndex > 0) {
      await TrackPlayer.skipToPrevious();
      TrackPlayerService.handleRemotePrevious();
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
    await TrackPlayer.seekTo(position);
    TrackPlayerService.handleRemoteSeek(position);
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ index }) => {
    TrackPlayerService.handleTrackChange(index ?? null);
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (progress) => {
    TrackPlayerService.handleProgress(progress);
  });

  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    TrackPlayerService.handleStateChange(state);
  });
}

export { State, RepeatMode };
export type { Track, Progress, PlaybackState };
