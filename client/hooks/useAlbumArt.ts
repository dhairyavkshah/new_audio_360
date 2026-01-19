import { useMemo } from 'react';
import { getDefaultAlbumArtSvg } from '@/lib/defaultAlbumArts';

export function useAlbumArt(songId: string | undefined, artwork: string | undefined) {
  return useMemo(() => {
    if (artwork && artwork.trim() !== '') {
      return artwork;
    }
    if (songId) {
      return getDefaultAlbumArtSvg(songId);
    }
    return getDefaultAlbumArtSvg('default');
  }, [songId, artwork]);
}

export function getAlbumArt(songId: string | undefined, artwork: string | undefined): string {
  if (artwork && artwork.trim() !== '') {
    return artwork;
  }
  if (songId) {
    return getDefaultAlbumArtSvg(songId);
  }
  return getDefaultAlbumArtSvg('default');
}
