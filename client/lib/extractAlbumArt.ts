import { Platform } from 'react-native';

interface AlbumArtResult {
  dataUrl: string | null;
  error?: string;
}

const MAX_CACHE_SIZE = 100;
const albumArtCache = new Map<string, string | null>();

function evictOldestCacheEntries() {
  if (albumArtCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(albumArtCache.keys()).slice(0, albumArtCache.size - MAX_CACHE_SIZE);
    keysToDelete.forEach(key => albumArtCache.delete(key));
  }
}

export async function extractAlbumArt(url: string): Promise<AlbumArtResult> {
  if (Platform.OS !== 'web') {
    return { dataUrl: null, error: 'Only supported on web' };
  }

  if (albumArtCache.has(url)) {
    return { dataUrl: albumArtCache.get(url) || null };
  }

  try {
    const fullUrl = url.startsWith('/') && typeof window !== 'undefined' 
      ? `${window.location.origin}${url}` 
      : url;
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      albumArtCache.set(url, null);
      evictOldestCacheEntries();
      return { dataUrl: null, error: `Failed to fetch: ${response.status}` };
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const dataUrl = extractID3Picture(new Uint8Array(arrayBuffer));
    
    albumArtCache.set(url, dataUrl);
    evictOldestCacheEntries();
    return { dataUrl };
  } catch (err: any) {
    console.warn('Album art extraction failed for', url, '- Error:', err?.message || err);
    albumArtCache.set(url, null);
    evictOldestCacheEntries();
    return { dataUrl: null, error: err?.message || 'Extraction failed' };
  }
}

function extractID3Picture(data: Uint8Array): string | null {
  if (data.length < 10) return null;
  
  const header = String.fromCharCode(data[0], data[1], data[2]);
  if (header !== 'ID3') return null;
  
  const majorVersion = data[3];
  const flags = data[5];
  const size = ((data[6] & 0x7f) << 21) | ((data[7] & 0x7f) << 14) | 
               ((data[8] & 0x7f) << 7) | (data[9] & 0x7f);
  
  let offset = 10;
  
  if (flags & 0x40) {
    if (majorVersion === 4) {
      const extSize = ((data[10] & 0x7f) << 21) | ((data[11] & 0x7f) << 14) |
                      ((data[12] & 0x7f) << 7) | (data[13] & 0x7f);
      offset += extSize;
    } else {
      const extSize = (data[10] << 24) | (data[11] << 16) | (data[12] << 8) | data[13];
      offset += 4 + extSize;
    }
  }
  
  const tagEnd = Math.min(10 + size, data.length);
  
  while (offset < tagEnd - 10) {
    let frameId: string;
    let frameSize: number;
    let frameHeaderSize: number;
    
    if (majorVersion >= 3) {
      frameId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
      
      if (majorVersion === 4) {
        frameSize = ((data[offset + 4] & 0x7f) << 21) | ((data[offset + 5] & 0x7f) << 14) |
                    ((data[offset + 6] & 0x7f) << 7) | (data[offset + 7] & 0x7f);
      } else {
        frameSize = (data[offset + 4] << 24) | (data[offset + 5] << 16) |
                    (data[offset + 6] << 8) | data[offset + 7];
      }
      frameHeaderSize = 10;
    } else {
      frameId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2]);
      frameSize = (data[offset + 3] << 16) | (data[offset + 4] << 8) | data[offset + 5];
      frameHeaderSize = 6;
    }
    
    if (frameId === '\0\0\0\0' || frameId === '\0\0\0' || frameSize === 0) break;
    if (frameSize > data.length - offset - frameHeaderSize) break;
    
    if (frameId === 'APIC' || frameId === 'PIC') {
      const frameData = data.slice(offset + frameHeaderSize, offset + frameHeaderSize + frameSize);
      const picture = parseAPICFrame(frameData, frameId === 'PIC');
      if (picture) return picture;
    }
    
    offset += frameHeaderSize + frameSize;
  }
  
  return null;
}

function parseAPICFrame(data: Uint8Array, isID3v2_2: boolean): string | null {
  if (data.length < 4) return null;
  
  let pos = 0;
  const encoding = data[pos++];
  
  let mimeType: string;
  
  if (isID3v2_2) {
    mimeType = String.fromCharCode(data[pos], data[pos + 1], data[pos + 2]);
    pos += 3;
    if (mimeType === 'JPG') mimeType = 'image/jpeg';
    else if (mimeType === 'PNG') mimeType = 'image/png';
    else mimeType = 'image/jpeg';
  } else {
    const mimeEnd = data.indexOf(0, pos);
    if (mimeEnd === -1) return null;
    mimeType = '';
    for (let i = pos; i < mimeEnd; i++) {
      mimeType += String.fromCharCode(data[i]);
    }
    pos = mimeEnd + 1;
    if (!mimeType || mimeType === 'image/') mimeType = 'image/jpeg';
  }
  
  pos++;
  
  if (encoding === 0 || encoding === 3) {
    while (pos < data.length && data[pos] !== 0) pos++;
    pos++;
  } else if (encoding === 1 || encoding === 2) {
    while (pos < data.length - 1) {
      if (data[pos] === 0 && data[pos + 1] === 0) {
        pos += 2;
        break;
      }
      pos++;
    }
  }
  
  if (pos >= data.length) return null;
  
  const imageData = data.slice(pos);
  if (imageData.length < 8) return null;
  
  if (imageData[0] === 0xFF && imageData[1] === 0xD8) {
    mimeType = 'image/jpeg';
  } else if (imageData[0] === 0x89 && imageData[1] === 0x50) {
    mimeType = 'image/png';
  }
  
  const base64 = arrayBufferToBase64(imageData);
  return `data:${mimeType};base64,${base64}`;
}

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  
  return btoa(binary);
}
