import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_BASE_URL = 'https://api.soundcloud.com';
const OAUTH_TOKEN_URL = `${API_BASE_URL}/oauth2/token`;
const TRACKS_URL = `${API_BASE_URL}/tracks`;
const FAVORITES_KEY = '@soundcloud_favorites';
const ENCRYPTION_KEY = 'NA360_SOUNDCLOUD_2025';

const toBase64 = (str: string): string => {
  return Buffer.from(str, 'binary').toString('base64');
};

const fromBase64 = (str: string): string => {
  return Buffer.from(str, 'base64').toString('binary');
};

const getClientCredentials = () => {
  if (Platform.OS === 'web') {
    const clientId = Constants.expoConfig?.extra?.SOUNDCLOUD_CLIENT_ID || 
                     process.env.SOUNDCLOUD_CLIENT_ID || '';
    const clientSecret = Constants.expoConfig?.extra?.SOUNDCLOUD_CLIENT_SECRET || 
                         process.env.SOUNDCLOUD_CLIENT_SECRET || '';
    return { clientId, clientSecret };
  }
  
  return {
    clientId: process.env.SOUNDCLOUD_CLIENT_ID || '',
    clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET || '',
  };
};

export interface SoundCloudTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  stream_url: string;
  artwork_url: string | null;
  playbackCount: number;
  isOnlineStream: true;
  source: 'soundcloud';
}

export interface StoredSoundCloudTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  encryptedUrl: string;
  artwork_url: string | null;
  playbackCount: number;
  addedAt: number;
  source: 'soundcloud';
}

interface SoundCloudAPITrack {
  id: number;
  title: string;
  user: {
    username: string;
  };
  genre: string;
  duration: number;
  artwork_url: string | null;
  stream_url: string;
  streamable: boolean;
  playback_count: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

class SoundCloudServiceClass {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

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

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const { clientId, clientSecret } = getClientCredentials();
    
    if (!clientId || !clientSecret) {
      throw new Error('SoundCloud credentials not configured');
    }

    try {
      const response = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('[SoundCloudService] Token error:', error);
      throw error;
    }
  }

  async searchTracks(
    query: string,
    limit: number = 10
  ): Promise<{ tracks: SoundCloudTrack[]; total: number }> {
    if (!query.trim()) {
      return { tracks: [], total: 0 };
    }

    try {
      const token = await this.getAccessToken();
      const { clientId } = getClientCredentials();

      const params = new URLSearchParams({
        q: query,
        access: 'playable',
        limit: limit.toString(),
      });

      const response = await fetch(`${TRACKS_URL}?${params}`, {
        headers: {
          'Authorization': `OAuth ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data: SoundCloudAPITrack[] = await response.json();
      
      const streamableTracks = data.filter(track => track.streamable === true);
      
      const tracks: SoundCloudTrack[] = streamableTracks.map(track => ({
        id: `sc_${track.id}`,
        title: track.title,
        artist: track.user.username,
        album: track.genre || '',
        duration: Math.floor(track.duration / 1000),
        stream_url: this.buildStreamUrl(track.id, clientId, token),
        artwork_url: track.artwork_url,
        playbackCount: track.playback_count || 0,
        isOnlineStream: true as const,
        source: 'soundcloud' as const,
      }));

      return {
        tracks,
        total: tracks.length,
      };
    } catch (error) {
      console.error('[SoundCloudService] Search error:', error);
      throw error;
    }
  }

  private buildStreamUrl(trackId: number, clientId: string, token: string): string {
    return `${API_BASE_URL}/tracks/${trackId}/stream?client_id=${clientId}&oauth_token=${token}`;
  }

  async getStreamUrl(trackId: string): Promise<string> {
    const numericId = trackId.replace('sc_', '');
    const token = await this.getAccessToken();
    const { clientId } = getClientCredentials();
    
    return this.buildStreamUrl(parseInt(numericId, 10), clientId, token);
  }

  async getFavorites(): Promise<StoredSoundCloudTrack[]> {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.log('[SoundCloudService] Get favorites error:', e);
    }
    return [];
  }

  async addToFavorites(track: SoundCloudTrack): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      
      if (favorites.some(f => f.id === track.id)) {
        return;
      }

      const storedTrack: StoredSoundCloudTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        encryptedUrl: this.simpleEncrypt(track.stream_url),
        artwork_url: track.artwork_url,
        playbackCount: track.playbackCount,
        addedAt: Date.now(),
        source: 'soundcloud',
      };

      favorites.unshift(storedTrack);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error('[SoundCloudService] Add to favorites error:', e);
      throw e;
    }
  }

  async removeFromFavorites(trackId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filtered = favorites.filter(f => f.id !== trackId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('[SoundCloudService] Remove from favorites error:', e);
      throw e;
    }
  }

  async isFavorite(trackId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some(f => f.id === trackId);
  }

  getStoredStreamUrl(storedTrack: StoredSoundCloudTrack): string {
    return this.simpleDecrypt(storedTrack.encryptedUrl);
  }

  storedToPlayable(stored: StoredSoundCloudTrack): SoundCloudTrack {
    return {
      id: stored.id,
      title: stored.title,
      artist: stored.artist,
      album: stored.album,
      duration: stored.duration,
      stream_url: this.getStoredStreamUrl(stored),
      artwork_url: stored.artwork_url,
      playbackCount: stored.playbackCount,
      isOnlineStream: true,
      source: 'soundcloud',
    };
  }

  formatDuration(ms: number): string {
    if (!ms || ms === 0) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatDurationFromSeconds(seconds: number): string {
    if (!seconds || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatPlaybackCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }
}

export const SoundCloudService = new SoundCloudServiceClass();
export default SoundCloudService;
