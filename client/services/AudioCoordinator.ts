type AudioSource = 'music' | 'radio' | null;
type StopCallback = () => Promise<void>;

interface AudioCoordinatorType {
  currentSource: AudioSource;
  registerMusicStopCallback: (callback: StopCallback) => void;
  registerRadioStopCallback: (callback: StopCallback) => void;
  requestPlayback: (source: AudioSource) => Promise<void>;
  notifyPlaybackStarted: (source: AudioSource) => void;
  notifyPlaybackStopped: (source: AudioSource) => void;
  getCurrentSource: () => AudioSource;
}

class AudioCoordinatorClass implements AudioCoordinatorType {
  currentSource: AudioSource = null;
  private musicStopCallback: StopCallback | null = null;
  private radioStopCallback: StopCallback | null = null;

  registerMusicStopCallback(callback: StopCallback): void {
    this.musicStopCallback = callback;
  }

  registerRadioStopCallback(callback: StopCallback): void {
    this.radioStopCallback = callback;
  }

  async requestPlayback(source: AudioSource): Promise<void> {
    if (this.currentSource === source) {
      return;
    }

    if (this.currentSource === 'music' && source === 'radio') {
      if (this.musicStopCallback) {
        console.log('[AudioCoordinator] Stopping music before playing radio');
        await this.musicStopCallback();
      }
    } else if (this.currentSource === 'radio' && source === 'music') {
      if (this.radioStopCallback) {
        console.log('[AudioCoordinator] Stopping radio before playing music');
        await this.radioStopCallback();
      }
    }
  }

  notifyPlaybackStarted(source: AudioSource): void {
    this.currentSource = source;
    console.log(`[AudioCoordinator] Playback started: ${source}`);
  }

  notifyPlaybackStopped(source: AudioSource): void {
    if (this.currentSource === source) {
      this.currentSource = null;
      console.log(`[AudioCoordinator] Playback stopped: ${source}`);
    }
  }

  getCurrentSource(): AudioSource {
    return this.currentSource;
  }
}

export const AudioCoordinator = new AudioCoordinatorClass();
export type { AudioSource };
