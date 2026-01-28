import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_API_URL = 'https://archive.org/advancedsearch.php';
const METADATA_API_URL = 'https://archive.org/metadata';
const DOWNLOAD_BASE_URL = 'https://archive.org/download';
const SEARCH_CACHE_KEY = '@archive_org_search_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

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

interface SearchCache {
  query: string;
  quality: AudioQuality;
  results: ArchiveOrgTrack[];
  cachedAt: number;
}

class ArchiveOrgServiceClass {
  private searchCache: Map<string, SearchCache> = new Map();

  private getCacheKey(query: string, quality: AudioQuality): string {
    return `${query.toLowerCase().trim()}_${quality}`;
  }

  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(SEARCH_CACHE_KEY);
      if (cached) {
        const entries = JSON.parse(cached);
        this.searchCache = new Map(entries);
      }
    } catch (e) {
      console.log('[ArchiveOrgService] Cache load error:', e);
    }
  }

  private async saveCacheToStorage(): Promise<void> {
    try {
      const entries = Array.from(this.searchCache.entries());
      await AsyncStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.log('[ArchiveOrgService] Cache save error:', e);
    }
  }

  async searchMusic(
    query: string,
    quality: AudioQuality = 'all',
    page: number = 1,
    limit: number = 50
  ): Promise<{ tracks: ArchiveOrgTrack[]; total: number }> {
    const cacheKey = this.getCacheKey(query, quality);
    
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_DURATION) {
      const start = (page - 1) * limit;
      return {
        tracks: cached.results.slice(start, start + limit),
        total: cached.results.length,
      };
    }

    const searchQuery = query
      ? `mediatype:audio AND (title:"${query}" OR creator:"${query}" OR subject:"${query}")`
      : 'mediatype:audio AND collection:(audio_music OR opensource_audio)';

    const params = new URLSearchParams({
      q: searchQuery,
      'fl[]': 'identifier,title,creator,date,licenseurl,downloads',
      output: 'json',
      rows: '100',
      page: page.toString(),
      'sort[]': 'downloads desc',
    });

    try {
      const response = await fetch(`${SEARCH_API_URL}?${params}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      const items: ArchiveOrgItem[] = data.response?.docs || [];
      
      const tracksPromises = items.slice(0, 20).map(item => 
        this.getItemTracks(item, quality)
      );
      
      const tracksArrays = await Promise.all(tracksPromises);
      const allTracks = tracksArrays.flat();

      this.searchCache.set(cacheKey, {
        query,
        quality,
        results: allTracks,
        cachedAt: Date.now(),
      });
      this.saveCacheToStorage();

      return {
        tracks: allTracks.slice(0, limit),
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

      return audioFiles.map((file, index) => {
        const bitrate = parseInt(file.bitrate || '128', 10);
        const duration = parseFloat(file.length || '0');
        const fileSize = parseInt(file.size || '0', 10);
        
        const trackTitle = file.title || 
                          file.name?.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') ||
                          `Track ${index + 1}`;

        return {
          id: `${item.identifier}_${file.name}`,
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

  async getPopularMusic(quality: AudioQuality = 'all', limit: number = 50): Promise<ArchiveOrgTrack[]> {
    const { tracks } = await this.searchMusic('', quality, 1, limit);
    return tracks;
  }

  async getItemDetails(identifier: string): Promise<ArchiveOrgItem | null> {
    try {
      const response = await fetch(`${METADATA_API_URL}/${identifier}/metadata`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.result as ArchiveOrgItem;
    } catch (error) {
      console.error('[ArchiveOrgService] Get item details error:', error);
      return null;
    }
  }

  formatBitrate(bitrate: number): string {
    if (bitrate >= 320) return '320 kbps (High)';
    if (bitrate >= 256) return '256 kbps';
    if (bitrate >= 192) return '192 kbps';
    if (bitrate >= 128) return '128 kbps';
    return `${bitrate} kbps`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  formatDuration(seconds: number): string {
    if (!seconds || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async clearCache(): Promise<void> {
    this.searchCache.clear();
    await AsyncStorage.removeItem(SEARCH_CACHE_KEY);
  }
}

export const ArchiveOrgService = new ArchiveOrgServiceClass();
export default ArchiveOrgService;
