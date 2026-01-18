import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export interface ID3Metadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  trackNumber?: string;
  albumArt?: string;
}

export async function parseID3FromUri(uri: string): Promise<ID3Metadata | null> {
  try {
    if (Platform.OS === 'web') {
      return await parseID3Web(uri);
    } else {
      return await parseID3Native(uri);
    }
  } catch (error) {
    console.warn('[ID3Parser] Error parsing:', error);
    return null;
  }
}

async function parseID3Web(url: string): Promise<ID3Metadata | null> {
  try {
    const fullUrl = url.startsWith('/') && typeof window !== 'undefined' 
      ? `${window.location.origin}${url}` 
      : url;
    
    const response = await fetch(fullUrl);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    return parseID3Tags(new Uint8Array(arrayBuffer));
  } catch (error) {
    console.warn('[ID3Parser] Web parse error:', error);
    return null;
  }
}

async function parseID3Native(uri: string): Promise<ID3Metadata | null> {
  try {
    console.warn('[ID3Parser] parseID3Native uri=' + uri?.substring(0, 60));
    
    // Handle different URI formats
    let fileUri = uri;
    if (uri.startsWith('content://')) {
      console.warn('[ID3Parser] content:// URI - expo-file-system may not support');
    } else if (!uri.startsWith('file://')) {
      fileUri = `file://${uri}`;
    }
    
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    console.warn('[ID3Parser] fileInfo exists=' + fileInfo.exists + ' size=' + (fileInfo as any).size);
    
    if (!fileInfo.exists) {
      console.warn('[ID3Parser] File not found: ' + fileUri);
      return null;
    }
    
    const base64Content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });
    
    console.warn('[ID3Parser] Read ' + base64Content.length + ' base64 chars');
    
    // Only use first 512KB for ID3 parsing (ID3 tags are at the start)
    const truncatedBase64 = base64Content.substring(0, 700000);
    
    const binaryString = atob(truncatedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.warn('[ID3Parser] Parsing ' + bytes.length + ' bytes...');
    const result = parseID3Tags(bytes);
    console.warn('[ID3Parser] Result: ' + (result ? Object.keys(result).join(',') : 'null'));
    
    return result;
  } catch (error) {
    console.warn('[ID3Parser] Error: ' + String(error));
    return null;
  }
}

function parseID3Tags(data: Uint8Array): ID3Metadata | null {
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
      offset += 4 + extSize;
    } else {
      const extSize = (data[10] << 24) | (data[11] << 16) | (data[12] << 8) | data[13];
      offset += 4 + extSize;
    }
  }
  
  const tagEnd = Math.min(10 + size, data.length);
  const metadata: ID3Metadata = {};
  
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
    
    const frameData = data.slice(offset + frameHeaderSize, offset + frameHeaderSize + frameSize);
    
    switch (frameId) {
      case 'TIT2':
      case 'TT2':
        metadata.title = parseTextFrame(frameData);
        break;
      case 'TPE1':
      case 'TP1':
        metadata.artist = parseTextFrame(frameData);
        break;
      case 'TALB':
      case 'TAL':
        metadata.album = parseTextFrame(frameData);
        break;
      case 'TYER':
      case 'TYE':
      case 'TDRC':
        metadata.year = parseTextFrame(frameData);
        break;
      case 'TCON':
      case 'TCO':
        metadata.genre = parseTextFrame(frameData);
        break;
      case 'TRCK':
      case 'TRK':
        metadata.trackNumber = parseTextFrame(frameData);
        break;
      case 'APIC':
      case 'PIC':
        const albumArt = parseAPICFrame(frameData, frameId === 'PIC');
        if (albumArt) metadata.albumArt = albumArt;
        break;
    }
    
    offset += frameHeaderSize + frameSize;
  }
  
  return Object.keys(metadata).length > 0 ? metadata : null;
}

function parseTextFrame(data: Uint8Array): string {
  if (data.length < 2) return '';
  
  const encoding = data[0];
  let text = '';
  
  if (encoding === 0 || encoding === 3) {
    for (let i = 1; i < data.length; i++) {
      if (data[i] === 0) break;
      text += String.fromCharCode(data[i]);
    }
  } else if (encoding === 1) {
    let start = 1;
    if (data[1] === 0xFF && data[2] === 0xFE) start = 3;
    else if (data[1] === 0xFE && data[2] === 0xFF) start = 3;
    
    for (let i = start; i < data.length - 1; i += 2) {
      if (data[i] === 0 && data[i + 1] === 0) break;
      const charCode = data[i] | (data[i + 1] << 8);
      text += String.fromCharCode(charCode);
    }
  } else if (encoding === 2) {
    for (let i = 1; i < data.length - 1; i += 2) {
      if (data[i] === 0 && data[i + 1] === 0) break;
      const charCode = (data[i] << 8) | data[i + 1];
      text += String.fromCharCode(charCode);
    }
  }
  
  return text.trim();
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
