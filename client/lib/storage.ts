import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recording, PlayerState } from './data';

export type { Recording };

const STORAGE_KEYS = {
  RECORDINGS: '@new_audio_360_recordings',
  PLAYER_STATE: '@new_audio_360_player_state',
  THEME: '@new_audio_360_theme',
  EQ_PRESET: '@new_audio_360_eq_preset',
  SOUND_MODE: '@new_audio_360_sound_mode',
  IS_PREMIUM: '@new_audio_360_is_premium',
  PLAYLISTS: '@new_audio_360_playlists',
  HAPTIC_ENABLED: '@new_audio_360_haptic_enabled',
  UI_SOUND_ENABLED: '@new_audio_360_ui_sound_enabled',
  FAVORITES: '@new_audio_360_favorites',
  RECENTLY_PLAYED: '@new_audio_360_recently_played',
  PLAY_COUNTS: '@new_audio_360_play_counts',
  MUSIC_FOLDER_URI: '@new_audio_360_music_folder_uri',
};

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songIds: string[];
  coverArt?: string;
  createdAt: number;
  updatedAt: number;
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  } catch (error) {
    console.error('Error saving playlists:', error);
  }
}

export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting playlists:', error);
    return [];
  }
}

export async function addPlaylist(playlist: Playlist): Promise<void> {
  const playlists = await getPlaylists();
  playlists.unshift(playlist);
  await savePlaylists(playlists);
}

export async function updatePlaylist(id: string, updates: Partial<Playlist>): Promise<void> {
  const playlists = await getPlaylists();
  const index = playlists.findIndex(p => p.id === id);
  if (index !== -1) {
    playlists[index] = { ...playlists[index], ...updates, updatedAt: Date.now() };
    await savePlaylists(playlists);
  }
}

export async function deletePlaylist(id: string): Promise<void> {
  const playlists = await getPlaylists();
  const filtered = playlists.filter(p => p.id !== id);
  await savePlaylists(filtered);
}

export async function isSongInPlaylist(playlistId: string, songId: string): Promise<boolean> {
  const playlists = await getPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  return playlist ? playlist.songIds.includes(songId) : false;
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  const playlists = await getPlaylists();
  const index = playlists.findIndex(p => p.id === playlistId);
  if (index !== -1 && !playlists[index].songIds.includes(songId)) {
    playlists[index].songIds.push(songId);
    playlists[index].updatedAt = Date.now();
    await savePlaylists(playlists);
  }
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  const playlists = await getPlaylists();
  const index = playlists.findIndex(p => p.id === playlistId);
  if (index !== -1) {
    playlists[index].songIds = playlists[index].songIds.filter(id => id !== songId);
    playlists[index].updatedAt = Date.now();
    await savePlaylists(playlists);
  }
}

export async function reorderPlaylistSongs(playlistId: string, newSongIds: string[]): Promise<void> {
  const playlists = await getPlaylists();
  const index = playlists.findIndex(p => p.id === playlistId);
  if (index !== -1) {
    playlists[index].songIds = newSongIds;
    playlists[index].updatedAt = Date.now();
    await savePlaylists(playlists);
  }
}

export async function saveRecordings(recordings: Recording[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.RECORDINGS, JSON.stringify(recordings));
  } catch (error) {
    console.error('Error saving recordings:', error);
  }
}

export async function getRecordings(): Promise<Recording[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RECORDINGS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting recordings:', error);
    return [];
  }
}

export async function addRecording(recording: Recording): Promise<void> {
  const recordings = await getRecordings();
  recordings.unshift(recording);
  await saveRecordings(recordings);
}

export async function deleteRecording(id: string): Promise<void> {
  const recordings = await getRecordings();
  const filtered = recordings.filter(r => r.id !== id);
  await saveRecordings(filtered);
}

export async function savePlayerState(state: PlayerState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PLAYER_STATE, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving player state:', error);
  }
}

export async function getPlayerState(): Promise<PlayerState | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting player state:', error);
    return null;
  }
}

export async function saveEQPreset(preset: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.EQ_PRESET, preset);
  } catch (error) {
    console.error('Error saving EQ preset:', error);
  }
}

export async function getEQPreset(): Promise<string | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EQ_PRESET);
    if (data === null || data === '') return null;
    return data;
  } catch (error) {
    console.error('Error getting EQ preset:', error);
    return null;
  }
}

export async function clearEQPreset(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.EQ_PRESET);
  } catch (error) {
    console.error('Error clearing EQ preset:', error);
  }
}

export async function saveSoundMode(mode: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SOUND_MODE, mode);
  } catch (error) {
    console.error('Error saving sound mode:', error);
  }
}

export async function getSoundMode(): Promise<string | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SOUND_MODE);
    if (data === null || data === '') return null;
    return data;
  } catch (error) {
    console.error('Error getting sound mode:', error);
    return null;
  }
}

export async function clearSoundMode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SOUND_MODE);
  } catch (error) {
    console.error('Error clearing sound mode:', error);
  }
}

export async function setIsPremium(isPremium: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, JSON.stringify(isPremium));
  } catch (error) {
    console.error('Error saving premium status:', error);
  }
}

export async function getIsPremium(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error('Error getting premium status:', error);
    return false;
  }
}

export async function setHapticEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HAPTIC_ENABLED, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error saving haptic setting:', error);
  }
}

export async function getHapticEnabled(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HAPTIC_ENABLED);
    return data !== null ? JSON.parse(data) : true;
  } catch (error) {
    console.error('Error getting haptic setting:', error);
    return true;
  }
}

export async function setUiSoundEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.UI_SOUND_ENABLED, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error saving UI sound setting:', error);
  }
}

export async function getUiSoundEnabled(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.UI_SOUND_ENABLED);
    return data !== null ? JSON.parse(data) : false;
  } catch (error) {
    console.error('Error getting UI sound setting:', error);
    return false;
  }
}

export async function saveFavorites(favorites: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  } catch (error) {
    console.error('Error saving favorites:', error);
  }
}

export async function getFavorites(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

export async function toggleFavorite(songId: string): Promise<boolean> {
  const favorites = await getFavorites();
  const index = favorites.indexOf(songId);
  if (index === -1) {
    favorites.push(songId);
    await saveFavorites(favorites);
    return true;
  } else {
    favorites.splice(index, 1);
    await saveFavorites(favorites);
    return false;
  }
}

export async function saveRecentlyPlayed(songIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(songIds));
  } catch (error) {
    console.error('Error saving recently played:', error);
  }
}

export async function getRecentlyPlayed(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENTLY_PLAYED);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting recently played:', error);
    return [];
  }
}

export async function addToRecentlyPlayed(songId: string): Promise<void> {
  const recentlyPlayed = await getRecentlyPlayed();
  const filtered = recentlyPlayed.filter(id => id !== songId);
  filtered.unshift(songId);
  const limited = filtered.slice(0, 50);
  await saveRecentlyPlayed(limited);
}

export type PlayCounts = Record<string, number>;

export async function getPlayCounts(): Promise<PlayCounts> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAY_COUNTS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting play counts:', error);
    return {};
  }
}

export async function incrementPlayCount(songId: string): Promise<void> {
  const playCounts = await getPlayCounts();
  playCounts[songId] = (playCounts[songId] || 0) + 1;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PLAY_COUNTS, JSON.stringify(playCounts));
  } catch (error) {
    console.error('Error saving play counts:', error);
  }
}

export async function getMostPlayed(limit: number = 10): Promise<string[]> {
  const playCounts = await getPlayCounts();
  const sorted = Object.entries(playCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => id);
  return sorted;
}

export async function saveMusicFolderUri(uri: string | null): Promise<void> {
  try {
    if (uri === null) {
      await AsyncStorage.removeItem(STORAGE_KEYS.MUSIC_FOLDER_URI);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.MUSIC_FOLDER_URI, uri);
    }
  } catch (error) {
    console.error('Error saving music folder URI:', error);
  }
}

export async function getMusicFolderUri(): Promise<string | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MUSIC_FOLDER_URI);
    return data || null;
  } catch (error) {
    console.error('Error getting music folder URI:', error);
    return null;
  }
}
