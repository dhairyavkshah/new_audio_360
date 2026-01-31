/**
 * SoundCloud Integration Service
 * 
 * Supports two authentication modes:
 * 1. Client Credentials - For public track search (30-second previews)
 * 2. Authorization Code + PKCE - For full track playback with user login
 * 
 * SECURITY NOTE: For production web builds, consider implementing a backend
 * proxy for OAuth token exchange to avoid exposing client_secret in browser code.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

const API_BASE_URL = 'https://api.soundcloud.com';
const API_V2_BASE_URL = 'https://api-v2.soundcloud.com';
const OAUTH_AUTHORIZE_URL = 'https://secure.soundcloud.com/authorize';
const OAUTH_TOKEN_URL = 'https://secure.soundcloud.com/oauth/token';
const TRACKS_URL = `${API_BASE_URL}/tracks`;
const ME_URL = `${API_BASE_URL}/me`;
const FAVORITES_KEY = '@soundcloud_favorites';
const USER_TOKEN_KEY = '@soundcloud_user_token';
const PKCE_VERIFIER_KEY = '@soundcloud_pkce_verifier';
const PKCE_STATE_KEY = '@soundcloud_pkce_state';
const ENCRYPTION_KEY = 'NA360_SOUNDCLOUD_2025';

const getRedirectUri = (): string => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      // On Replit, the proxy removes the port, so we need to strip it
      const url = new URL(window.location.origin);
      // Remove port for https URLs (Replit proxy handles this)
      // Use explicit .html file at root to bypass Expo's SPA routing
      if (url.protocol === 'https:') {
        return `${url.protocol}//${url.hostname}/soundcloud-callback.html`;
      }
      return `${window.location.origin}/soundcloud-callback.html`;
    }
    return 'http://localhost:5000/soundcloud-callback.html';
  }
  return 'newaudio360://auth/soundcloud';
};

const toBase64 = (str: string): string => {
  return Buffer.from(str, 'binary').toString('base64');
};

const fromBase64 = (str: string): string => {
  return Buffer.from(str, 'base64').toString('binary');
};

const toBase64Url = (buffer: Uint8Array): string => {
  const base64 = Buffer.from(buffer).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const getClientCredentials = () => {
  const clientId = Constants.expoConfig?.extra?.SOUNDCLOUD_CLIENT_ID || 
                   (Platform.OS === 'web' ? process.env.EXPO_PUBLIC_SOUNDCLOUD_CLIENT_ID : '') ||
                   '';
  const clientSecret = Constants.expoConfig?.extra?.SOUNDCLOUD_CLIENT_SECRET || 
                       (Platform.OS === 'web' ? process.env.EXPO_PUBLIC_SOUNDCLOUD_CLIENT_SECRET : '') ||
                       '';
  return { clientId, clientSecret };
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

export interface SoundCloudPlaylist {
  id: string;
  title: string;
  trackCount: number;
  duration: number;
  artwork_url: string | null;
  user: string;
  likesCount: number;
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

interface UserTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface SoundCloudUserProfile {
  id: number;
  username: string;
  avatar_url: string | null;
  full_name: string;
  permalink_url: string;
}

class SoundCloudServiceClass {
  private clientAccessToken: string | null = null;
  private clientTokenExpiresAt: number = 0;
  private userTokenData: UserTokenData | null = null;
  private pkceVerifier: string | null = null;

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

  // ============================================================
  // PKCE Helpers
  // ============================================================

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
    } else {
      for (let i = 0; i < length; i++) {
        randomValues[i] = Math.floor(Math.random() * 256);
      }
    }
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
    return result;
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // ============================================================
  // User Authentication (Authorization Code + PKCE)
  // ============================================================

  async isUserAuthenticated(): Promise<boolean> {
    try {
      await this.loadUserToken();
      if (!this.userTokenData) return false;
      
      if (Date.now() >= this.userTokenData.expires_at - 60000) {
        if (this.userTokenData.refresh_token) {
          try {
            await this.refreshUserToken();
            return true;
          } catch {
            await this.clearUserToken();
            return false;
          }
        }
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private async loadUserToken(): Promise<void> {
    if (this.userTokenData) return;
    
    try {
      const stored = await AsyncStorage.getItem(USER_TOKEN_KEY);
      if (stored) {
        this.userTokenData = JSON.parse(stored);
      }
    } catch (error) {
      console.log('[SoundCloudService] Error loading user token:', error);
    }
  }

  private async saveUserToken(data: UserTokenData): Promise<void> {
    this.userTokenData = data;
    await AsyncStorage.setItem(USER_TOKEN_KEY, JSON.stringify(data));
  }

  private async clearUserToken(): Promise<void> {
    this.userTokenData = null;
    await AsyncStorage.removeItem(USER_TOKEN_KEY);
    await AsyncStorage.removeItem(PKCE_VERIFIER_KEY);
    await AsyncStorage.removeItem(PKCE_STATE_KEY);
  }

  async getAuthorizationUrl(): Promise<{ url: string; redirectUri: string; state: string }> {
    const { clientId } = getClientCredentials();
    const redirectUri = getRedirectUri();
    
    console.log('[SoundCloudService] Auth URL params:', {
      clientId: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
      redirectUri,
    });
    
    this.pkceVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(this.pkceVerifier);
    const state = this.generateRandomString(32);
    
    await AsyncStorage.setItem(PKCE_VERIFIER_KEY, this.pkceVerifier);
    await AsyncStorage.setItem(PKCE_STATE_KEY, state);
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'non-expiring',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      display: 'popup',
      prompt: 'login',
    });

    return {
      url: `${OAUTH_AUTHORIZE_URL}?${params.toString()}`,
      redirectUri,
      state,
    };
  }

  async validateState(returnedState: string): Promise<boolean> {
    const savedState = await AsyncStorage.getItem(PKCE_STATE_KEY);
    if (savedState === returnedState) {
      await AsyncStorage.removeItem(PKCE_STATE_KEY);
      return true;
    }
    return false;
  }

  async exchangeCodeForToken(code: string): Promise<void> {
    const { clientId, clientSecret } = getClientCredentials();
    const redirectUri = getRedirectUri();
    
    let verifier = this.pkceVerifier;
    if (!verifier) {
      verifier = await AsyncStorage.getItem(PKCE_VERIFIER_KEY);
    }

    if (!verifier) {
      throw new Error('PKCE verifier not found - please restart login');
    }

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    };

    try {
      const response = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SoundCloudService] Token exchange error:', errorText);
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      
      await this.saveUserToken({
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
        expires_at: Date.now() + (data.expires_in * 1000),
        scope: data.scope,
      });

      await AsyncStorage.removeItem(PKCE_VERIFIER_KEY);
      this.pkceVerifier = null;
      
      console.log('[SoundCloudService] User authenticated successfully');
    } catch (error) {
      console.error('[SoundCloudService] Token exchange error:', error);
      throw error;
    }
  }

  private async refreshUserToken(): Promise<void> {
    if (!this.userTokenData?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const { clientId, clientSecret } = getClientCredentials();

    try {
      const response = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: this.userTokenData.refresh_token,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      
      await this.saveUserToken({
        access_token: data.access_token,
        refresh_token: data.refresh_token || this.userTokenData.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
        scope: data.scope,
      });

      console.log('[SoundCloudService] Token refreshed successfully');
    } catch (error) {
      console.error('[SoundCloudService] Token refresh error:', error);
      throw error;
    }
  }

  private async ensureValidUserToken(): Promise<string> {
    await this.loadUserToken();
    
    if (!this.userTokenData) {
      throw new Error('User not authenticated');
    }

    if (Date.now() >= this.userTokenData.expires_at - 60000) {
      await this.refreshUserToken();
    }

    return this.userTokenData!.access_token;
  }

  async getUserProfile(): Promise<{ username: string; avatar_url: string | null } | null> {
    try {
      const token = await this.ensureValidUserToken();
      
      const response = await fetch(ME_URL, {
        headers: {
          'Authorization': `OAuth ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Profile fetch failed: ${response.status}`);
      }

      const data: SoundCloudUserProfile = await response.json();
      
      return {
        username: data.username,
        avatar_url: data.avatar_url,
      };
    } catch (error) {
      console.error('[SoundCloudService] Get profile error:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    await this.clearUserToken();
    console.log('[SoundCloudService] User logged out');
  }

  async getAccessToken(): Promise<string | null> {
    try {
      await this.loadUserToken();
      if (!this.userTokenData) return null;
      
      if (Date.now() >= this.userTokenData.expires_at - 60000) {
        if (this.userTokenData.refresh_token) {
          try {
            await this.refreshUserToken();
          } catch {
            return null;
          }
        } else {
          return null;
        }
      }
      
      return this.userTokenData.access_token;
    } catch {
      return null;
    }
  }

  // ============================================================
  // Client Credentials (for public search fallback)
  // ============================================================

  private async getClientAccessToken(): Promise<string> {
    if (this.clientAccessToken && Date.now() < this.clientTokenExpiresAt - 60000) {
      return this.clientAccessToken;
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
      
      this.clientAccessToken = data.access_token;
      this.clientTokenExpiresAt = Date.now() + (data.expires_in * 1000);
      
      return this.clientAccessToken;
    } catch (error) {
      console.error('[SoundCloudService] Client token error:', error);
      throw error;
    }
  }

  // ============================================================
  // Search Methods
  // ============================================================

  async searchTracksAuthenticated(
    query: string,
    limit: number = 15
  ): Promise<{ tracks: SoundCloudTrack[]; total: number }> {
    if (!query.trim()) {
      return { tracks: [], total: 0 };
    }

    try {
      const token = await this.ensureValidUserToken();
      return this.performSearch(query, token, limit);
    } catch (error) {
      console.error('[SoundCloudService] Authenticated search error:', error);
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
      const token = await this.getClientAccessToken();
      return this.performSearch(query, token, limit);
    } catch (error) {
      console.error('[SoundCloudService] Search error:', error);
      throw error;
    }
  }

  // ============================================================
  // Search by Type (Tracks, Playlists, Albums)
  // ============================================================

  async searchPlaylists(
    query: string,
    limit: number = 25
  ): Promise<SoundCloudPlaylist[]> {
    if (!query.trim()) return [];

    try {
      const token = await this.ensureValidUserToken() || await this.getClientAccessToken();
      
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
      });

      const response = await fetch(`${API_BASE_URL}/playlists?${params}`, {
        headers: {
          'Authorization': `OAuth ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Playlist search failed: ${response.status}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.collection || []);
      
      return items.map((playlist: any) => ({
        id: `sc_playlist_${playlist.id}`,
        title: playlist.title,
        trackCount: playlist.track_count || 0,
        duration: Math.floor((playlist.duration || 0) / 1000),
        artwork_url: playlist.artwork_url,
        user: playlist.user?.username || 'Unknown',
        likesCount: playlist.likes_count || 0,
      }));
    } catch (error) {
      console.error('[SoundCloudService] Search playlists error:', error);
      throw error;
    }
  }

  async searchAlbums(
    query: string,
    limit: number = 25
  ): Promise<SoundCloudPlaylist[]> {
    if (!query.trim()) return [];

    try {
      const token = await this.ensureValidUserToken() || await this.getClientAccessToken();
      
      // SoundCloud treats albums as playlists with playlist_type = "album"
      // We search playlists and filter for albums
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
      });

      const response = await fetch(`${API_BASE_URL}/playlists?${params}`, {
        headers: {
          'Authorization': `OAuth ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Album search failed: ${response.status}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.collection || []);
      
      // Filter for albums (playlist_type === 'album' or similar indicators)
      const albums = items.filter((item: any) => 
        item.playlist_type === 'album' || 
        item.is_album === true ||
        item.set_type === 'album'
      );
      
      // If no explicit albums found, return playlists with album-like characteristics
      const results = albums.length > 0 ? albums : items.slice(0, Math.min(limit, 10));
      
      return results.map((playlist: any) => ({
        id: `sc_playlist_${playlist.id}`,
        title: playlist.title,
        trackCount: playlist.track_count || 0,
        duration: Math.floor((playlist.duration || 0) / 1000),
        artwork_url: playlist.artwork_url,
        user: playlist.user?.username || 'Unknown',
        likesCount: playlist.likes_count || 0,
      }));
    } catch (error) {
      console.error('[SoundCloudService] Search albums error:', error);
      throw error;
    }
  }

  private async performSearch(
    query: string,
    token: string,
    limit: number
  ): Promise<{ tracks: SoundCloudTrack[]; total: number }> {
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
    
    const tracksWithUrls = await Promise.all(
      streamableTracks.map(async (track) => {
        try {
          let resolvedUrl: string;
          
          if (Platform.OS === 'web') {
            resolvedUrl = `widget:${track.id}`;
            console.log('[SoundCloudService] Web platform - using widget player for track', track.id);
          } else {
            resolvedUrl = await this.resolveStreamUrlWithToken(track.id, token);
          }
          
          return {
            id: `sc_${track.id}`,
            title: track.title,
            artist: track.user.username,
            album: track.genre || '',
            duration: Math.floor(track.duration / 1000),
            stream_url: resolvedUrl,
            artwork_url: track.artwork_url,
            playbackCount: track.playback_count || 0,
            isOnlineStream: true as const,
            source: 'soundcloud' as const,
          };
        } catch (err) {
          console.log('[SoundCloudService] Failed to resolve URL for track', track.id);
          return null;
        }
      })
    );

    const tracks: SoundCloudTrack[] = tracksWithUrls.filter((t): t is SoundCloudTrack => t !== null);

    return {
      tracks,
      total: tracks.length,
    };
  }

  // ============================================================
  // Stream URL Resolution
  // ============================================================

  private buildStreamApiUrl(trackId: number): string {
    return `${API_BASE_URL}/tracks/${trackId}/streams`;
  }

  private async resolveStreamUrlWithToken(trackId: number, token: string): Promise<string> {
    const { clientId } = getClientCredentials();
    const streamApiUrl = this.buildStreamApiUrl(trackId);
    
    try {
      console.log('[SoundCloudService] Fetching streams for track', trackId, 'URL:', streamApiUrl);
      
      const response = await fetch(streamApiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `OAuth ${token}`,
          'Accept': 'application/json; charset=utf-8',
        },
      });

      console.log('[SoundCloudService] Response status:', response.status, 'ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error text');
        console.error('[SoundCloudService] Streams API failed:', response.status, errorText);
        throw new Error(`Failed to get streams: ${response.status}`);
      }

      const data = await response.json();
      console.log('[SoundCloudService] Streams for track', trackId, ':', Object.keys(data).join(', '));
      
      const tryResolveApiUrl = async (apiUrl: string): Promise<string | null> => {
        const urlWithAuth = apiUrl.includes('?') 
          ? `${apiUrl}&oauth_token=${token}`
          : `${apiUrl}?oauth_token=${token}`;
        
        try {
          const redirectResponse = await fetch(urlWithAuth, {
            method: 'GET',
            redirect: 'follow',
            mode: 'cors',
            headers: {
              'Authorization': `OAuth ${token}`,
            },
          });
          
          if (redirectResponse.ok && redirectResponse.url) {
            const finalUrl = redirectResponse.url;
            if (finalUrl.includes('sndcdn.com') || finalUrl.includes('cf-media') || finalUrl.includes('cloudfront') || finalUrl.includes('media-streaming')) {
              console.log('[SoundCloudService] Resolved to CDN URL for track', trackId);
              return finalUrl;
            }
          }
          
          const contentType = redirectResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const responseData = await redirectResponse.json();
            if (responseData && responseData.url) {
              console.log('[SoundCloudService] Got URL from JSON response');
              return responseData.url;
            }
          }
        } catch (err: any) {
          console.log('[SoundCloudService] API URL resolution failed:', err?.message);
        }
        return null;
      };

      const urlsToTry = [
        data.http_mp3_128_url,
        data.hls_mp3_128_url,
        data.hls_aac_160_url,
        data.hls_aac_96_url,
      ].filter(Boolean);

      for (const streamUrl of urlsToTry) {
        console.log('[SoundCloudService] Trying URL type for track', trackId, 'URL prefix:', streamUrl.substring(0, 50));
        
        // Direct CDN URLs - use as-is
        if (streamUrl.includes('sndcdn.com') || streamUrl.includes('cf-media') || streamUrl.includes('media-streaming')) {
          console.log('[SoundCloudService] Direct CDN URL found');
          return streamUrl;
        }
        
        // On native platforms (Android/iOS), pass the API URL directly with oauth_token
        // ExoPlayer/AVPlayer can follow redirects and the token will be in the URL
        if (Platform.OS !== 'web') {
          const urlWithToken = streamUrl.includes('?') 
            ? `${streamUrl}&oauth_token=${token}`
            : `${streamUrl}?oauth_token=${token}`;
          console.log('[SoundCloudService] Native platform - returning URL with token for ExoPlayer to resolve');
          return urlWithToken;
        }
        
        // On web, try to resolve API URLs (both api.soundcloud.com and api-v2.soundcloud.com)
        if (streamUrl.includes('api.soundcloud.com') || streamUrl.includes('api-v2.soundcloud.com')) {
          const resolved = await tryResolveApiUrl(streamUrl);
          if (resolved) {
            return resolved;
          }
        }
      }
      
      if (data.preview_mp3_128_url) {
        console.log('[SoundCloudService] Using preview URL for track', trackId, '(full stream not available)');
        return data.preview_mp3_128_url;
      }
      
      console.log('[SoundCloudService] Available keys:', JSON.stringify(data));
      throw new Error('No streamable URL found');
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        console.error('[SoundCloudService] CORS or network error for track', trackId);
      } else {
        console.error('[SoundCloudService] Error resolving stream URL for track', trackId, ':', error?.message || String(error));
      }
      throw error;
    }
  }

  async resolveStreamUrl(trackId: number): Promise<string> {
    try {
      await this.loadUserToken();
      if (this.userTokenData && Date.now() < this.userTokenData.expires_at - 60000) {
        return this.resolveStreamUrlWithToken(trackId, this.userTokenData.access_token);
      }
    } catch {
      // Fall through to client token
    }
    
    const token = await this.getClientAccessToken();
    return this.resolveStreamUrlWithToken(trackId, token);
  }

  async getStreamUrl(trackId: string): Promise<string> {
    const numericId = parseInt(trackId.replace('sc_', ''), 10);
    return this.resolveStreamUrl(numericId);
  }

  // ============================================================
  // Favorites Management
  // ============================================================

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

  // ============================================================
  // SoundCloud Account Likes Sync
  // ============================================================

  /**
   * Like a track on SoundCloud (syncs to user's account)
   * Uses v2 API endpoint for track likes
   */
  async likeTrackOnSoundCloud(trackId: string): Promise<boolean> {
    try {
      const token = await this.ensureValidUserToken();
      if (!token) {
        console.log('[SoundCloudService] Cannot like - not authenticated');
        return false;
      }

      const numericId = trackId.replace('sc_', '');
      
      // Try v2 API first (track_likes endpoint)
      let response = await fetch(`${API_V2_BASE_URL}/users/me/track_likes/${numericId}`, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok || response.status === 201 || response.status === 200) {
        console.log('[SoundCloudService] Track liked on SoundCloud (v2):', numericId);
        return true;
      }

      // Fallback to v1 API (favorites endpoint)
      console.log('[SoundCloudService] v2 like failed, trying v1:', response.status);
      response = await fetch(`${ME_URL}/favorites/${numericId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `OAuth ${token}`,
        },
      });

      if (response.ok || response.status === 201 || response.status === 200) {
        console.log('[SoundCloudService] Track liked on SoundCloud (v1):', numericId);
        return true;
      }

      console.log('[SoundCloudService] Like failed on both APIs:', response.status);
      return false;
    } catch (error) {
      console.error('[SoundCloudService] Like track error:', error);
      return false;
    }
  }

  /**
   * Unlike a track on SoundCloud (syncs to user's account)
   * Uses v2 API endpoint for track likes
   */
  async unlikeTrackOnSoundCloud(trackId: string): Promise<boolean> {
    try {
      const token = await this.ensureValidUserToken();
      if (!token) {
        console.log('[SoundCloudService] Cannot unlike - not authenticated');
        return false;
      }

      const numericId = trackId.replace('sc_', '');
      
      // Try v2 API first
      let response = await fetch(`${API_V2_BASE_URL}/users/me/track_likes/${numericId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `OAuth ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok || response.status === 200 || response.status === 204) {
        console.log('[SoundCloudService] Track unliked on SoundCloud (v2):', numericId);
        return true;
      }

      // Fallback to v1 API
      response = await fetch(`${ME_URL}/favorites/${numericId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `OAuth ${token}`,
        },
      });

      if (response.ok || response.status === 200 || response.status === 204) {
        console.log('[SoundCloudService] Track unliked on SoundCloud (v1):', numericId);
        return true;
      }

      console.log('[SoundCloudService] Unlike failed on both APIs:', response.status);
      return false;
    } catch (error) {
      console.error('[SoundCloudService] Unlike track error:', error);
      return false;
    }
  }

  /**
   * Check if a track is liked on user's SoundCloud account
   */
  async isLikedOnSoundCloud(trackId: string): Promise<boolean> {
    try {
      const token = await this.ensureValidUserToken();
      if (!token) return false;

      const numericId = trackId.replace('sc_', '');
      
      // Check by fetching the specific favorite
      const response = await fetch(`${ME_URL}/favorites/${numericId}`, {
        method: 'GET',
        headers: {
          'Authorization': `OAuth ${token}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Toggle like status on SoundCloud - syncs to user's account
   */
  async toggleLikeOnSoundCloud(trackId: string): Promise<{ liked: boolean; success: boolean }> {
    const isLiked = await this.isLikedOnSoundCloud(trackId);
    
    if (isLiked) {
      const success = await this.unlikeTrackOnSoundCloud(trackId);
      return { liked: false, success };
    } else {
      const success = await this.likeTrackOnSoundCloud(trackId);
      return { liked: true, success };
    }
  }

  getStoredStreamUrl(storedTrack: StoredSoundCloudTrack): string {
    return this.simpleDecrypt(storedTrack.encryptedUrl);
  }

  async storedToPlayable(stored: StoredSoundCloudTrack): Promise<SoundCloudTrack> {
    const freshStreamUrl = await this.getStreamUrl(stored.id);
    return {
      id: stored.id,
      title: stored.title,
      artist: stored.artist,
      album: stored.album,
      duration: stored.duration,
      stream_url: freshStreamUrl,
      artwork_url: stored.artwork_url,
      playbackCount: stored.playbackCount,
      isOnlineStream: true,
      source: 'soundcloud',
    };
  }

  // ============================================================
  // User Library Methods (Likes & Playlists)
  // ============================================================

  async getLikedTracks(limit: number = 50): Promise<SoundCloudTrack[]> {
    try {
      const token = await this.ensureValidUserToken();
      
      const response = await fetch(`${ME_URL}/likes/tracks?limit=${limit}`, {
        headers: {
          'Authorization': `OAuth ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch liked tracks: ${response.status}`);
      }

      const data = await response.json();
      const items = data.collection || data;
      
      const tracks: SoundCloudTrack[] = await Promise.all(
        items
          .filter((item: any) => {
            const track = item.track || item;
            return track && track.streamable === true;
          })
          .map(async (item: any) => {
            const track = item.track || item;
            try {
              let resolvedUrl: string;
              
              if (Platform.OS === 'web') {
                resolvedUrl = `widget:${track.id}`;
              } else {
                resolvedUrl = await this.resolveStreamUrlWithToken(track.id, token);
              }
              
              return {
                id: `sc_${track.id}`,
                title: track.title,
                artist: track.user?.username || 'Unknown Artist',
                album: track.genre || '',
                duration: Math.floor(track.duration / 1000),
                stream_url: resolvedUrl,
                artwork_url: track.artwork_url,
                playbackCount: track.playback_count || 0,
                isOnlineStream: true as const,
                source: 'soundcloud' as const,
              };
            } catch {
              return null;
            }
          })
      );

      return tracks.filter((t): t is SoundCloudTrack => t !== null);
    } catch (error) {
      console.error('[SoundCloudService] Get liked tracks error:', error);
      throw error;
    }
  }

  async getUserPlaylists(limit: number = 50): Promise<SoundCloudPlaylist[]> {
    try {
      const token = await this.ensureValidUserToken();
      
      const response = await fetch(`${ME_URL}/playlists?limit=${limit}`, {
        headers: {
          'Authorization': `OAuth ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch playlists: ${response.status}`);
      }

      const data = await response.json();
      const items = data.collection || data;
      
      const playlists: SoundCloudPlaylist[] = items.map((playlist: any) => ({
        id: `sc_playlist_${playlist.id}`,
        title: playlist.title,
        trackCount: playlist.track_count || 0,
        duration: Math.floor((playlist.duration || 0) / 1000),
        artwork_url: playlist.artwork_url,
        user: playlist.user?.username || 'Unknown',
        likesCount: playlist.likes_count || 0,
      }));

      return playlists;
    } catch (error) {
      console.error('[SoundCloudService] Get user playlists error:', error);
      throw error;
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<SoundCloudTrack[]> {
    try {
      const token = await this.ensureValidUserToken();
      const numericId = playlistId.replace('sc_playlist_', '');
      
      const response = await fetch(`${API_BASE_URL}/playlists/${numericId}`, {
        headers: {
          'Authorization': `OAuth ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch playlist tracks: ${response.status}`);
      }

      const data = await response.json();
      const trackList = data.tracks || [];
      
      const tracks: SoundCloudTrack[] = await Promise.all(
        trackList
          .filter((track: any) => track.streamable === true)
          .map(async (track: any) => {
            try {
              let resolvedUrl: string;
              
              if (Platform.OS === 'web') {
                resolvedUrl = `widget:${track.id}`;
              } else {
                resolvedUrl = await this.resolveStreamUrlWithToken(track.id, token);
              }
              
              return {
                id: `sc_${track.id}`,
                title: track.title,
                artist: track.user?.username || 'Unknown Artist',
                album: track.genre || '',
                duration: Math.floor(track.duration / 1000),
                stream_url: resolvedUrl,
                artwork_url: track.artwork_url,
                playbackCount: track.playback_count || 0,
                isOnlineStream: true as const,
                source: 'soundcloud' as const,
              };
            } catch {
              return null;
            }
          })
      );

      return tracks.filter((t): t is SoundCloudTrack => t !== null);
    } catch (error) {
      console.error('[SoundCloudService] Get playlist tracks error:', error);
      throw error;
    }
  }

  // ============================================================
  // Utility Methods
  // ============================================================

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
