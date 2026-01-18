import { Platform } from 'react-native';
import { MetadataExtractorModule } from '@/modules/audio-effects';
import { parseID3FromUri } from './id3Parser';

// Use console.warn for production visibility (console.log may be stripped)
console.warn('=== musicInfo.ts module loaded (v3) ===');

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
  console.warn('[getMusicMetadata] START uri=' + localUri?.substring(0, 50) + ' platform=' + Platform.OS);
  
  if (Platform.OS === 'web') {
    console.warn('[getMusicMetadata] Using web ID3 parser');
    return await getMetadataFromID3Parser(localUri);
  }
  
  if (Platform.OS !== 'android') {
    console.warn('[getMusicMetadata] Platform not supported: ' + Platform.OS);
    return null;
  }
  
  // Check native module availability
  const moduleExists = !!MetadataExtractorModule;
  const hasIsAvailable = typeof MetadataExtractorModule?.isAvailable === 'function';
  console.warn('[getMusicMetadata] moduleExists=' + moduleExists + ' hasIsAvailable=' + hasIsAvailable);
  
  let isNativeAvailable = false;
  try {
    isNativeAvailable = MetadataExtractorModule?.isAvailable?.() ?? false;
    console.warn('[getMusicMetadata] isAvailable() returned: ' + isNativeAvailable);
  } catch (e) {
    console.warn('[getMusicMetadata] isAvailable() threw: ' + String(e));
  }
  
  if (isNativeAvailable) {
    try {
      console.warn('[getMusicMetadata] Calling native extractMetadata...');
      const result = await MetadataExtractorModule.extractMetadata(localUri);
      console.warn('[getMusicMetadata] Native result success=' + result?.success + ' error=' + result?.error);
      
      if (result && result.success) {
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
        
        console.warn('[getMusicMetadata] Extracted: ' + Object.keys(metadata).join(','));
        if (Object.keys(metadata).length > 0) {
          return metadata;
        }
      }
    } catch (error) {
      console.warn('[getMusicMetadata] Native error: ' + String(error));
    }
  }
  
  // Fallback to JS ID3 parser
  console.warn('[getMusicMetadata] Trying JS ID3 parser fallback...');
  try {
    const jsResult = await getMetadataFromID3Parser(localUri);
    console.warn('[getMusicMetadata] JS result: ' + (jsResult ? Object.keys(jsResult).join(',') : 'null'));
    return jsResult;
  } catch (jsError) {
    console.warn('[getMusicMetadata] JS parser error: ' + String(jsError));
    return null;
  }
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
