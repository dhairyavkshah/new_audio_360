import { Platform } from 'react-native';
import { MetadataExtractorModule } from '@/modules/audio-effects';

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
  if (Platform.OS !== 'android') {
    console.log('[getMusicMetadata] Not Android, skipping');
    return null;
  }
  
  const isAvailable = MetadataExtractorModule.isAvailable();
  console.log('[getMusicMetadata] Module available:', isAvailable);
  
  if (!isAvailable) {
    console.warn('[getMusicMetadata] MetadataExtractorModule not available');
    return null;
  }
  
  try {
    console.log('[getMusicMetadata] Extracting from:', localUri);
    const result = await MetadataExtractorModule.extractMetadata(localUri);
    console.log('[getMusicMetadata] Result:', JSON.stringify(result).substring(0, 200));
    
    if (!result.success) {
      console.warn('[getMusicMetadata] Extraction failed:', result.error);
      return null;
    }
    
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
    }
    
    return Object.keys(metadata).length > 0 ? metadata : null;
  } catch (error) {
    console.error('[getMusicMetadata] Error:', error);
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
