import jsmediatags from 'jsmediatags';

interface AlbumArtResult {
  dataUrl: string | null;
  error?: string;
}

export async function extractAlbumArt(url: string): Promise<AlbumArtResult> {
  return new Promise((resolve) => {
    try {
      jsmediatags.read(url, {
        onSuccess: (tag: any) => {
          const picture = tag.tags?.picture;
          if (picture) {
            const { data, format } = picture;
            const base64String = data.reduce((acc: string, byte: number) => acc + String.fromCharCode(byte), '');
            const dataUrl = `data:${format};base64,${btoa(base64String)}`;
            resolve({ dataUrl });
          } else {
            resolve({ dataUrl: null, error: 'No album art found' });
          }
        },
        onError: (error: any) => {
          console.warn('Album art extraction failed:', error);
          resolve({ dataUrl: null, error: error.type || 'Unknown error' });
        },
      });
    } catch (err) {
      resolve({ dataUrl: null, error: 'Failed to read file' });
    }
  });
}

const albumArtCache = new Map<string, string | null>();

export async function getAlbumArtForSong(songUri: string): Promise<string | null> {
  if (albumArtCache.has(songUri)) {
    return albumArtCache.get(songUri) || null;
  }
  
  const result = await extractAlbumArt(songUri);
  albumArtCache.set(songUri, result.dataUrl);
  return result.dataUrl;
}
