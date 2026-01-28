import AsyncStorage from '@react-native-async-storage/async-storage';

const SONGS_JSON_URL = 'https://pub-9b6df67c7b3748c4a8f34a585a1d4ddf.r2.dev/songs.json';
const FAVORITES_KEY = '@streaming_favorites';
const DEVICE_ID_KEY = '@device_id';
const SONGS_CACHE_KEY = '@streaming_songs_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface StreamingSong {
  id: number;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration: number;
  stream_url: string;
  artwork_url?: string;
  file_size?: number;
  bitrate?: number;
  isOnlineStream: true;
}

export interface SearchResult {
  songs: StreamingSong[];
  count: number;
}

export interface SongsListResult {
  songs: StreamingSong[];
  total: number;
  page: number;
  limit: number;
}

export interface Genre {
  genre: string;
  count: number;
}

interface SongsCache {
  songs: StreamingSong[];
  total: number;
  updated: string;
  cachedAt: number;
}

class StreamingServiceClass {
  private deviceId: string | null = null;
  private songsCache: StreamingSong[] | null = null;

  async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;

    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'device_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    this.deviceId = id;
    return id;
  }

  private async loadSongsFromCache(): Promise<StreamingSong[] | null> {
    try {
      const cached = await AsyncStorage.getItem(SONGS_CACHE_KEY);
      if (cached) {
        const data: SongsCache = JSON.parse(cached);
        if (Date.now() - data.cachedAt < CACHE_DURATION) {
          return data.songs.map(s => ({ ...s, isOnlineStream: true as const }));
        }
      }
    } catch (e) {
      console.log('[StreamingService] Cache read error:', e);
    }
    return null;
  }

  private async saveSongsToCache(songs: StreamingSong[], updated: string): Promise<void> {
    try {
      const cache: SongsCache = {
        songs,
        total: songs.length,
        updated,
        cachedAt: Date.now(),
      };
      await AsyncStorage.setItem(SONGS_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.log('[StreamingService] Cache write error:', e);
    }
  }

  private async fetchAllSongs(): Promise<StreamingSong[]> {
    if (this.songsCache) {
      return this.songsCache;
    }

    const cached = await this.loadSongsFromCache();
    if (cached) {
      this.songsCache = cached;
      return cached;
    }

    try {
      console.log('[StreamingService] Fetching songs.json from R2...');
      const response = await fetch(SONGS_JSON_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch songs.json: ${response.status}`);
      }

      const data = await response.json();
      const songs: StreamingSong[] = data.songs.map((s: any) => ({
        ...s,
        isOnlineStream: true as const,
      }));

      this.songsCache = songs;
      await this.saveSongsToCache(songs, data.updated);
      
      console.log(`[StreamingService] Loaded ${songs.length} songs from R2`);
      return songs;
    } catch (error) {
      console.error('[StreamingService] Error fetching songs:', error);
      throw error;
    }
  }

  async search(query: string, limit: number = 20): Promise<StreamingSong[]> {
    if (!query.trim()) return [];

    const allSongs = await this.fetchAllSongs();
    const lowerQuery = query.toLowerCase();

    const results = allSongs.filter(song =>
      song.title.toLowerCase().includes(lowerQuery) ||
      song.artist.toLowerCase().includes(lowerQuery)
    );

    return results.slice(0, limit);
  }

  async getSongs(page: number = 1, limit: number = 50, genre?: string): Promise<SongsListResult> {
    const allSongs = await this.fetchAllSongs();
    
    let filtered = allSongs;
    if (genre) {
      filtered = allSongs.filter(s => s.genre === genre);
    }

    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      songs: paginated,
      total: filtered.length,
      page,
      limit,
    };
  }

  async getSongById(id: number): Promise<StreamingSong | null> {
    const allSongs = await this.fetchAllSongs();
    return allSongs.find(s => s.id === id) || null;
  }

  async getGenres(): Promise<Genre[]> {
    const allSongs = await this.fetchAllSongs();
    const genreMap = new Map<string, number>();
    
    for (const song of allSongs) {
      const genre = song.genre || 'Music';
      genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
    }

    return Array.from(genreMap.entries()).map(([genre, count]) => ({ genre, count }));
  }

  async getFavorites(): Promise<StreamingSong[]> {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (!stored) return [];
      
      const favoriteIds: number[] = JSON.parse(stored);
      const allSongs = await this.fetchAllSongs();
      
      return favoriteIds
        .map(id => allSongs.find(s => s.id === id))
        .filter((s): s is StreamingSong => s !== undefined);
    } catch (error) {
      console.error('[StreamingService] Error getting favorites:', error);
      return [];
    }
  }

  async addToFavorites(songId: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      const favorites: number[] = stored ? JSON.parse(stored) : [];
      
      if (!favorites.includes(songId)) {
        favorites.push(songId);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('[StreamingService] Error adding to favorites:', error);
    }
  }

  async removeFromFavorites(songId: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (!stored) return;
      
      const favorites: number[] = JSON.parse(stored);
      const filtered = favorites.filter(id => id !== songId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('[StreamingService] Error removing from favorites:', error);
    }
  }

  async isFavorite(songId: number): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (!stored) return false;
      
      const favorites: number[] = JSON.parse(stored);
      return favorites.includes(songId);
    } catch (error) {
      return false;
    }
  }

  async refreshCache(): Promise<void> {
    this.songsCache = null;
    await AsyncStorage.removeItem(SONGS_CACHE_KEY);
    await this.fetchAllSongs();
  }
}

export const StreamingService = new StreamingServiceClass();
