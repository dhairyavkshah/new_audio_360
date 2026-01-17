let isMusicPlayingGlobal = false;

export function setMusicPlaying(isPlaying: boolean): void {
  isMusicPlayingGlobal = isPlaying;
}

export function isMusicPlaying(): boolean {
  return isMusicPlayingGlobal;
}
