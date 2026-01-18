import { parseID3FromUri } from './id3Parser';

export interface MusicMetadata {
  title?: string;
  artist?: string;
  album?: string;
  albumArt?: string;
  duration?: number;
  year?: string;
  genre?: string;
  trackNumber?: string;
}

export async function getMusicMetadata(localUri: string): Promise<MusicMetadata | null> {
  // Use JavaScript ID3 parser for all platforms (works on web and Android)
  return await getMetadataFromID3Parser(localUri);
}

async function getMetadataFromID3Parser(localUri: string): Promise<MusicMetadata | null> {
  try {
    const id3Data = await parseID3FromUri(localUri);
    if (!id3Data) return null;
    
    const metadata: MusicMetadata = {};
    if (id3Data.title) metadata.title = id3Data.title;
    if (id3Data.artist) metadata.artist = id3Data.artist;
    if (id3Data.album) metadata.album = id3Data.album;
    if (id3Data.year) metadata.year = id3Data.year;
    if (id3Data.genre) metadata.genre = id3Data.genre;
    if (id3Data.trackNumber) metadata.trackNumber = id3Data.trackNumber;
    if (id3Data.albumArt) metadata.albumArt = id3Data.albumArt;
    
    return Object.keys(metadata).length > 0 ? metadata : null;
  } catch (error) {
    console.warn('[getMusicMetadata] ID3 parser error:', error);
    return null;
  }
}

export async function getAlbumArt(localUri: string): Promise<string | null> {
  // Use JS ID3 parser to extract album art
  try {
    const metadata = await getMusicMetadata(localUri);
    return metadata?.albumArt || null;
  } catch (error) {
    console.warn('[getAlbumArt] Error:', error);
    return null;
  }
}
