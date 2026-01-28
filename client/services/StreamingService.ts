import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAMING_API_BASE = process.env.EXPO_PUBLIC_STREAMING_API_URL || '';
const FAVORITES_KEY = '@streaming_favorites';
const DEVICE_ID_KEY = '@device_id';

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

class StreamingServiceClass {
  private deviceId: string | null = null;

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

  private async fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${STREAMING_API_BASE}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Streaming API error:', error);
      throw error;
    }
  }

  async search(query: string, limit: number = 20): Promise<StreamingSong[]> {
    if (!query.trim()) return [];

    const result = await this.fetchAPI<SearchResult>(
      `/api/streaming/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    return result.songs.map(song => ({ ...song, isOnlineStream: true as const }));
  }

  async getSongs(page: number = 1, limit: number = 50, genre?: string): Promise<SongsListResult> {
    let url = `/api/streaming/songs?page=${page}&limit=${limit}`;
    if (genre) {
      url += `&genre=${encodeURIComponent(genre)}`;
    }

    const result = await this.fetchAPI<SongsListResult>(url);
    
    return {
      ...result,
      songs: result.songs.map(song => ({ ...song, isOnlineStream: true as const }))
    };
  }

  async getSongById(id: number): Promise<StreamingSong | null> {
    try {
      const song = await this.fetchAPI<StreamingSong>(`/api/streaming/song/${id}`);
      return { ...song, isOnlineStream: true as const };
    } catch {
      return null;
    }
  }

  async getGenres(): Promise<Genre[]> {
    return this.fetchAPI<Genre[]>('/api/streaming/genres');
  }

  async getPopular(limit: number = 20): Promise<StreamingSong[]> {
    const songs = await this.fetchAPI<StreamingSong[]>(
      `/api/streaming/popular?limit=${limit}`
    );
    return songs.map(song => ({ ...song, isOnlineStream: true as const }));
  }

  async getFavorites(): Promise<number[]> {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async addToFavorites(songId: number): Promise<void> {
    const favorites = await this.getFavorites();
    if (!favorites.includes(songId)) {
      favorites.push(songId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  }

  async removeFromFavorites(songId: number): Promise<void> {
    const favorites = await this.getFavorites();
    const filtered = favorites.filter(id => id !== songId);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
  }

  async isFavorite(songId: number): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.includes(songId);
  }

  async getFavoriteSongs(): Promise<StreamingSong[]> {
    const favoriteIds = await this.getFavorites();
    const songs: StreamingSong[] = [];

    for (const id of favoriteIds) {
      const song = await this.getSongById(id);
      if (song) songs.push(song);
    }

    return songs;
  }

  isStreamingSong(song: any): song is StreamingSong {
    return song && song.isOnlineStream === true;
  }

  getStreamQualityLabel(bitrate?: number): string {
    if (!bitrate) return 'Standard';
    if (bitrate >= 320) return 'High (320kbps)';
    if (bitrate >= 256) return 'High (256kbps)';
    if (bitrate >= 192) return 'Standard (192kbps)';
    return 'Basic (128kbps)';
  }
}

export const StreamingService = new StreamingServiceClass();
export default StreamingService;
