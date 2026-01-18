import { MusicInfo } from 'expo-music-info';

export interface MusicMetadata {
  title?: string;
  artist?: string;
  album?: string;
}

export async function getMusicMetadata(localUri: string): Promise<MusicMetadata | null> {
  try {
    const metadata = await MusicInfo.getMusicInfoAsync(localUri, {
      title: true,
      artist: true,
      album: true,
    });
    
    if (metadata) {
      return {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
      };
    }
    return null;
  } catch {
    return null;
  }
}
