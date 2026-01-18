import { Platform } from 'react-native';
import { MetadataExtractorModule } from '@/modules/audio-effects';
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
  console.log('[getMusicMetadata] Called with URI:', localUri, 'Platform:', Platform.OS);
  
  if (Platform.OS === 'web') {
    console.log('[getMusicMetadata] Using web ID3 parser');
    return await getMetadataFromID3Parser(localUri);
  }
  
  if (Platform.OS !== 'android') {
    console.log('[getMusicMetadata] Platform not supported:', Platform.OS);
    return null;
  }
  
  // Check if MetadataExtractorModule exists and has the isAvailable function
  console.log('[getMusicMetadata] MetadataExtractorModule:', typeof MetadataExtractorModule);
  console.log('[getMusicMetadata] MetadataExtractorModule.isAvailable:', typeof MetadataExtractorModule?.isAvailable);
  
  let isNativeAvailable = false;
  try {
    isNativeAvailable = MetadataExtractorModule?.isAvailable?.() ?? false;
  } catch (e) {
    console.warn('[getMusicMetadata] Error checking native availability:', e);
  }
  console.log('[getMusicMetadata] Native module available:', isNativeAvailable);
  
  if (isNativeAvailable) {
    try {
      console.log('[getMusicMetadata] Trying native extraction for:', localUri);
      const result = await MetadataExtractorModule.extractMetadata(localUri);
      console.log('[getMusicMetadata] Native result:', JSON.stringify(result).substring(0, 500));
      
      if (result.success) {
        console.log('[getMusicMetadata] Native extraction succeeded');
        const metadata: MusicMetadata = {};
        
        if (result.title) metadata.title = result.title;
        if (result.artist) metadata.artist = result.artist;
        if (result.album) metadata.album = result.album;
        if (result.duration) metadata.duration = result.duration;
        if (result.year) metadata.year = result.year;
        if (result.genre) metadata.genre = result.genre;
        if (result.trackNumber) metadata.trackNumber = result.trackNumber;
        
        if (result.albumArt) {
          metadata.albumArt = `data:image/jpeg;base64,${result.albumArt}`;
          console.log('[getMusicMetadata] Album art found, length:', result.albumArt.length);
        }
        
        console.log('[getMusicMetadata] Extracted fields:', Object.keys(metadata));
        if (Object.keys(metadata).length > 0) {
          return metadata;
        }
      } else {
        console.log('[getMusicMetadata] Native extraction failed:', result.error);
      }
    } catch (error) {
      console.warn('[getMusicMetadata] Native extraction error:', error);
    }
  }
  
  console.log('[getMusicMetadata] Falling back to JavaScript ID3 parser');
  const jsResult = await getMetadataFromID3Parser(localUri);
  console.log('[getMusicMetadata] JS parser result:', jsResult ? Object.keys(jsResult) : 'null');
  return jsResult;
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
  if (Platform.OS !== 'android') {
    return null;
  }
  
  if (!MetadataExtractorModule.isAvailable()) {
    return null;
  }
  
  try {
    const result = await MetadataExtractorModule.extractAlbumArt(localUri);
    
    if (result.success && result.albumArt) {
      return `data:image/jpeg;base64,${result.albumArt}`;
    }
    
    return null;
  } catch (error) {
    console.error('[getAlbumArt] Error:', error);
    return null;
  }
}
