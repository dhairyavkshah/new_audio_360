import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';

const SEARCH_API_URL = 'https://archive.org/advancedsearch.php';
const METADATA_API_URL = 'https://archive.org/metadata';
// Use cors.archive.org on web for CORS support (enables DSP processing)
const DOWNLOAD_BASE_URL = Platform.OS === 'web' 
  ? 'https://cors.archive.org/download'
  : 'https://archive.org/download';
const FAVORITES_KEY = '@archive_org_favorites';
const ENCRYPTION_KEY = 'NA360_ARCHIVE_2025';

const toBase64 = (str: string): string => {
  return Buffer.from(str, 'binary').toString('base64');
};

const fromBase64 = (str: string): string => {
  return Buffer.from(str, 'base64').toString('binary');
};

export type AudioQuality = '128' | '192' | '256' | '320' | 'all';

export interface ArchiveOrgTrack {
  id: string;
  itemId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  stream_url: string;
  bitrate: number;
  format: string;
  fileSize: number;
  licenseUrl?: string;
  isOnlineStream: true;
  source: 'archive.org';
}

export interface StoredArchiveTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  encryptedUrl: string;
  bitrate: number;
  addedAt: number;
  source: 'archive.org';
}

export interface ArchiveOrgItem {
  identifier: string;
  title: string;
  creator?: string;
  date?: string;
  description?: string;
  licenseurl?: string;
  collection?: string[];
  downloads?: number;
}

export interface ArchiveOrgFile {
  name: string;
  format: string;
  size?: string;
  length?: string;
  bitrate?: string;
  title?: string;
  track?: string;
  artist?: string;
  album?: string;
  source?: string;
}

class ArchiveOrgServiceClass {
  private simpleEncrypt(text: string): string {
    const key = ENCRYPTION_KEY;
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return toBase64(result);
  }

  private simpleDecrypt(encoded: string): string {
    try {
      const decoded = fromBase64(encoded);
      const key = ENCRYPTION_KEY;
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch {
      return '';
    }
  }

  async searchMusic(
    query: string,
    quality: AudioQuality = 'all',
    limit: number = 10
  ): Promise<{ tracks: ArchiveOrgTrack[]; total: number }> {
    if (!query.trim()) {
      return { tracks: [], total: 0 };
    }

    const searchQuery = `mediatype:audio AND (title:"${query}" OR creator:"${query}")`;

    const params = new URLSearchParams({
      q: searchQuery,
      'fl[]': 'identifier,title,creator,date,licenseurl,downloads',
      output: 'json',
      rows: '20',
      page: '1',
      'sort[]': 'downloads desc',
    });

    try {
      const response = await fetch(`${SEARCH_API_URL}?${params}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      const items: ArchiveOrgItem[] = data.response?.docs || [];
      
      // Process more items to get 25+ tracks (each item may have multiple tracks)
      const tracksPromises = items.slice(0, 10).map(item => 
        this.getItemTracks(item, quality)
      );
      
      const tracksArrays = await Promise.all(tracksPromises);
      const allTracks = tracksArrays.flat().slice(0, limit);

      return {
        tracks: allTracks,
        total: data.response?.numFound || allTracks.length,
      };
    } catch (error) {
      console.error('[ArchiveOrgService] Search error:', error);
      throw error;
    }
  }

  async getItemTracks(
    item: ArchiveOrgItem,
    quality: AudioQuality = 'all'
  ): Promise<ArchiveOrgTrack[]> {
    try {
      const response = await fetch(`${METADATA_API_URL}/${item.identifier}/files`);
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const files: ArchiveOrgFile[] = data.result || [];
      
      const audioFiles = files.filter(file => {
        const format = file.format?.toLowerCase() || '';
        const name = file.name?.toLowerCase() || '';
        
        const isAudio = format.includes('mp3') || 
                       format.includes('vbr mp3') ||
                       name.endsWith('.mp3');
        
        if (!isAudio) return false;

        if (quality === 'all') return true;

        const fileBitrate = parseInt(file.bitrate || '0', 10);
        const targetBitrate = parseInt(quality, 10);
        
        return Math.abs(fileBitrate - targetBitrate) <= 16;
      });

      // Take up to 5 tracks per item to get 25+ total (10 items * 5 tracks max)
      return audioFiles.slice(0, 5).map((file, index) => {
        const bitrate = parseInt(file.bitrate || '128', 10);
        const duration = parseFloat(file.length || '0');
        const fileSize = parseInt(file.size || '0', 10);
        
        const trackTitle = file.title || 
                          file.name?.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') ||
                          `Track ${index + 1}`;

        return {
          id: `archive_${item.identifier}_${file.name}`,
          itemId: item.identifier,
          title: trackTitle,
          artist: file.artist || item.creator || 'Unknown Artist',
          album: file.album || item.title,
          duration: duration,
          stream_url: `${DOWNLOAD_BASE_URL}/${item.identifier}/${encodeURIComponent(file.name)}`,
          bitrate: bitrate,
          format: 'MP3',
          fileSize: fileSize,
          licenseUrl: item.licenseurl,
          isOnlineStream: true as const,
          source: 'archive.org' as const,
        };
      });
    } catch (error) {
      console.log('[ArchiveOrgService] Get tracks error for', item.identifier, error);
      return [];
    }
  }

  async getFavorites(): Promise<StoredArchiveTrack[]> {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.log('[ArchiveOrgService] Get favorites error:', e);
    }
    return [];
  }

  async addToFavorites(track: ArchiveOrgTrack): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      
      if (favorites.some(f => f.id === track.id)) {
        return;
      }

      const storedTrack: StoredArchiveTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        encryptedUrl: this.simpleEncrypt(track.stream_url),
        bitrate: track.bitrate,
        addedAt: Date.now(),
        source: 'archive.org',
      };

      favorites.unshift(storedTrack);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error('[ArchiveOrgService] Add to favorites error:', e);
      throw e;
    }
  }

  async removeFromFavorites(trackId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filtered = favorites.filter(f => f.id !== trackId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('[ArchiveOrgService] Remove from favorites error:', e);
      throw e;
    }
  }

  async isFavorite(trackId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some(f => f.id === trackId);
  }

  getStreamUrl(storedTrack: StoredArchiveTrack): string {
    return this.simpleDecrypt(storedTrack.encryptedUrl);
  }

  storedToPlayable(stored: StoredArchiveTrack): ArchiveOrgTrack {
    return {
      id: stored.id,
      itemId: stored.id.split('_')[1] || '',
      title: stored.title,
      artist: stored.artist,
      album: stored.album,
      duration: stored.duration,
      stream_url: this.getStreamUrl(stored),
      bitrate: stored.bitrate,
      format: 'MP3',
      fileSize: 0,
      isOnlineStream: true,
      source: 'archive.org',
    };
  }

  formatBitrate(bitrate: number): string {
    if (bitrate >= 320) return '320k';
    if (bitrate >= 256) return '256k';
    if (bitrate >= 192) return '192k';
    if (bitrate >= 128) return '128k';
    return `${bitrate}k`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  formatDuration(seconds: number): string {
    if (!seconds || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const ArchiveOrgService = new ArchiveOrgServiceClass();
export default ArchiveOrgService;
