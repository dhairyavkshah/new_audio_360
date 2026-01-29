/**
 * SoundCloud Widget Player for Web
 * 
 * Uses the official SoundCloud Widget API to bypass CORS restrictions.
 * The widget runs inside an iframe from SoundCloud's domain.
 */

import { Platform } from 'react-native';

declare global {
  interface Window {
    SC?: {
      Widget: (iframe: HTMLIFrameElement | string) => SCWidget;
    };
  }
}

interface SCWidget {
  bind: (event: string, callback: (data?: any) => void) => void;
  unbind: (event: string) => void;
  load: (url: string, options?: SCWidgetLoadOptions) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (milliseconds: number) => void;
  setVolume: (volume: number) => void;
  getVolume: (callback: (volume: number) => void) => void;
  getDuration: (callback: (duration: number) => void) => void;
  getPosition: (callback: (position: number) => void) => void;
  getSounds: (callback: (sounds: any[]) => void) => void;
  getCurrentSound: (callback: (sound: any) => void) => void;
  getCurrentSoundIndex: (callback: (index: number) => void) => void;
  isPaused: (callback: (paused: boolean) => void) => void;
}

interface SCWidgetLoadOptions {
  auto_play?: boolean;
  buying?: boolean;
  liking?: boolean;
  download?: boolean;
  sharing?: boolean;
  show_artwork?: boolean;
  show_comments?: boolean;
  show_playcount?: boolean;
  show_user?: boolean;
  start_track?: number;
  single_active?: boolean;
  callback?: () => void;
}

type PlaybackEventCallback = (data: {
  position: number;
  duration: number;
  relativePosition: number;
}) => void;

type EventCallback = () => void;

class SoundCloudWidgetPlayer {
  private widget: SCWidget | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private isReady = false;
  private pendingTrackUrl: string | null = null;
  private sdkLoaded = false;
  private onPlayCallback: EventCallback | null = null;
  private onPauseCallback: EventCallback | null = null;
  private onFinishCallback: EventCallback | null = null;
  private onProgressCallback: PlaybackEventCallback | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private currentVolume = 100;

  async initialize(): Promise<void> {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      console.log('[SCWidget] Not initializing - not on web platform');
      return;
    }

    if (this.sdkLoaded && this.widget) {
      console.log('[SCWidget] Already initialized');
      return;
    }

    await this.loadSDK();
    this.createHiddenIframe();
    this.initializeWidget();
  }

  private loadSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.SC) {
        this.sdkLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.async = true;
      script.onload = () => {
        console.log('[SCWidget] SDK loaded');
        this.sdkLoaded = true;
        resolve();
      };
      script.onerror = () => {
        console.error('[SCWidget] Failed to load SDK');
        reject(new Error('Failed to load SoundCloud Widget SDK'));
      };
      document.head.appendChild(script);
    });
  }

  private createHiddenIframe(): void {
    if (this.iframe) {
      return;
    }

    this.iframe = document.createElement('iframe');
    this.iframe.id = 'sc-widget-player';
    this.iframe.width = '1';
    this.iframe.height = '1';
    this.iframe.style.position = 'absolute';
    this.iframe.style.left = '-9999px';
    this.iframe.style.top = '-9999px';
    this.iframe.style.visibility = 'hidden';
    this.iframe.allow = 'autoplay';
    this.iframe.src = 'https://w.soundcloud.com/player/?url=https://api.soundcloud.com/tracks/293&auto_play=false';
    
    document.body.appendChild(this.iframe);
    console.log('[SCWidget] Hidden iframe created');
  }

  private initializeWidget(): void {
    if (!this.iframe || !window.SC) {
      console.error('[SCWidget] Cannot initialize - iframe or SDK not ready');
      return;
    }

    this.widget = window.SC.Widget(this.iframe);

    this.widget.bind('ready', () => {
      console.log('[SCWidget] Widget ready');
      this.isReady = true;
      
      if (this.pendingTrackUrl) {
        this.loadTrack(this.pendingTrackUrl, true);
        this.pendingTrackUrl = null;
      }
    });

    this.widget.bind('play', () => {
      console.log('[SCWidget] Play event');
      this.onPlayCallback?.();
    });

    this.widget.bind('pause', () => {
      console.log('[SCWidget] Pause event');
      this.onPauseCallback?.();
    });

    this.widget.bind('finish', () => {
      console.log('[SCWidget] Finish event');
      this.onFinishCallback?.();
    });

    this.widget.bind('playProgress', (data: any) => {
      if (this.onProgressCallback && data) {
        const position = data.currentPosition || 0;
        const relativePosition = data.relativePosition || 0;
        let duration = 0;
        
        if (relativePosition > 0 && relativePosition <= 1) {
          duration = position / relativePosition;
        }
        
        this.onProgressCallback({
          position,
          duration,
          relativePosition,
        });
      }
    });

    this.widget.bind('error', () => {
      console.error('[SCWidget] Playback error');
      this.onErrorCallback?.('Playback error');
    });
  }

  loadTrack(trackUrl: string, autoPlay = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isReady || !this.widget) {
        console.log('[SCWidget] Not ready, queuing track:', trackUrl);
        this.pendingTrackUrl = trackUrl;
        
        if (!this.sdkLoaded) {
          this.initialize().then(() => resolve()).catch(reject);
        } else {
          resolve();
        }
        return;
      }

      console.log('[SCWidget] Loading track:', trackUrl);
      
      this.widget.load(trackUrl, {
        auto_play: autoPlay,
        buying: false,
        liking: false,
        download: false,
        sharing: false,
        show_artwork: false,
        show_comments: false,
        show_playcount: false,
        show_user: false,
        callback: () => {
          console.log('[SCWidget] Track loaded');
          this.widget?.setVolume(this.currentVolume);
          resolve();
        },
      });
    });
  }

  loadTrackById(trackId: number, autoPlay = false): Promise<void> {
    const trackUrl = `https://api.soundcloud.com/tracks/${trackId}`;
    return this.loadTrack(trackUrl, autoPlay);
  }

  play(): void {
    if (this.widget && this.isReady) {
      this.widget.play();
    }
  }

  pause(): void {
    if (this.widget && this.isReady) {
      this.widget.pause();
    }
  }

  toggle(): void {
    if (this.widget && this.isReady) {
      this.widget.toggle();
    }
  }

  seekTo(milliseconds: number): void {
    if (this.widget && this.isReady) {
      this.widget.seekTo(milliseconds);
    }
  }

  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(100, volume));
    if (this.widget && this.isReady) {
      this.widget.setVolume(this.currentVolume);
    }
  }

  getPosition(): Promise<number> {
    return new Promise((resolve) => {
      if (this.widget && this.isReady) {
        this.widget.getPosition((position) => resolve(position));
      } else {
        resolve(0);
      }
    });
  }

  getDuration(): Promise<number> {
    return new Promise((resolve) => {
      if (this.widget && this.isReady) {
        this.widget.getDuration((duration) => resolve(duration));
      } else {
        resolve(0);
      }
    });
  }

  isPaused(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.widget && this.isReady) {
        this.widget.isPaused((paused) => resolve(paused));
      } else {
        resolve(true);
      }
    });
  }

  onPlay(callback: EventCallback): void {
    this.onPlayCallback = callback;
  }

  onPause(callback: EventCallback): void {
    this.onPauseCallback = callback;
  }

  onFinish(callback: EventCallback): void {
    this.onFinishCallback = callback;
  }

  onProgress(callback: PlaybackEventCallback): void {
    this.onProgressCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  clearCallbacks(): void {
    this.onPlayCallback = null;
    this.onPauseCallback = null;
    this.onFinishCallback = null;
    this.onProgressCallback = null;
    this.onErrorCallback = null;
  }

  isInitialized(): boolean {
    return this.isReady;
  }

  destroy(): void {
    if (this.widget) {
      this.widget.unbind('ready');
      this.widget.unbind('play');
      this.widget.unbind('pause');
      this.widget.unbind('finish');
      this.widget.unbind('playProgress');
      this.widget.unbind('error');
    }

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }

    this.widget = null;
    this.iframe = null;
    this.isReady = false;
    this.pendingTrackUrl = null;
    
    console.log('[SCWidget] Destroyed');
  }
}

export const soundCloudWidgetPlayer = new SoundCloudWidgetPlayer();
export default soundCloudWidgetPlayer;
