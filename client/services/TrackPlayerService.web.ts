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

export type PlaybackSource = 'music' | 'radio' | null;

export const State = {
  None: 'none',
  Ready: 'ready',
  Playing: 'playing',
  Paused: 'paused',
  Stopped: 'stopped',
  Buffering: 'buffering',
  Loading: 'loading',
  Error: 'error',
  Ended: 'ended',
} as const;

export type StateType = typeof State[keyof typeof State];

export interface Progress {
  position: number;
  duration: number;
  buffered: number;
}

class TrackPlayerServiceClass {
  async initialize(): Promise<boolean> {
    console.log('[TrackPlayerService.web] Web platform - using fallback');
    return false;
  }

  async destroy(): Promise<void> {}

  async addTrack(_track: TrackMetadata): Promise<void> {}

  async addTracks(_tracks: TrackMetadata[]): Promise<void> {}

  async setQueue(_tracks: TrackMetadata[]): Promise<void> {}

  async play(): Promise<void> {}

  async pause(): Promise<void> {}

  async stop(): Promise<void> {}

  async skipToNext(): Promise<void> {}

  async skipToPrevious(): Promise<void> {}

  async skipToTrack(_index: number): Promise<void> {}

  async seekTo(_position: number): Promise<void> {}

  async setVolume(_volume: number): Promise<void> {}

  async setRepeatMode(_mode: 'off' | 'one' | 'all'): Promise<void> {}

  async getProgress(): Promise<Progress | null> {
    return null;
  }

  async getState(): Promise<StateType | null> {
    return null;
  }

  async getQueue(): Promise<any[]> {
    return [];
  }

  async getCurrentTrack(): Promise<any | null> {
    return null;
  }

  async getCurrentTrackIndex(): Promise<number | null> {
    return null;
  }

  async updateMetadata(_metadata: Partial<TrackMetadata>): Promise<void> {}

  setCallbacks(_callbacks: {
    onPlay?: () => void;
    onPause?: () => void;
    onStop?: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    onSeek?: (position: number) => void;
    onTrackChange?: (trackIndex: number | null) => void;
    onProgress?: (progress: Progress) => void;
    onStateChange?: (state: StateType) => void;
  }): void {}

  handleRemotePlay(): void {}

  handleRemotePause(): void {}

  handleRemoteStop(): void {}

  handleRemoteNext(): void {}

  handleRemotePrevious(): void {}

  handleRemoteSeek(_position: number): void {}

  handleTrackChange(_trackIndex: number | null): void {}

  handleProgress(_progress: Progress): void {}

  handleStateChange(_state: StateType): void {}

  isAvailable(): boolean {
    return false;
  }

  getIsInitialized(): boolean {
    return false;
  }

  setPlaybackSource(_source: PlaybackSource): void {}

  getPlaybackSource(): PlaybackSource {
    return null;
  }
}

export const TrackPlayerService = new TrackPlayerServiceClass();

export async function PlaybackService() {}

export const RepeatMode = {
  Off: 0,
  Track: 1,
  Queue: 2,
} as const;
