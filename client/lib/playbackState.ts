type PlaybackStateListener = (isPlaying: boolean) => void;

let isMusicPlayingGlobal = false;
const listeners: Set<PlaybackStateListener> = new Set();

export function setMusicPlaying(isPlaying: boolean): void {
  if (isMusicPlayingGlobal !== isPlaying) {
    isMusicPlayingGlobal = isPlaying;
    listeners.forEach(listener => listener(isPlaying));
  }
}

export function isMusicPlaying(): boolean {
  return isMusicPlayingGlobal;
}

export function subscribeToPlaybackState(listener: PlaybackStateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
