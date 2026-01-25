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
  SELECTED_FOLDERS: '@new_audio_360_selected_folders',
  WEB_FOLDER_DATA: '@new_audio_360_web_folder_data',
  BASS_BOOST_ENABLED: '@new_audio_360_bass_boost_enabled',
  VIRTUALIZER_ENABLED: '@new_audio_360_virtualizer_enabled',
  BASS_BOOST_STRENGTH: '@new_audio_360_bass_boost_strength',
  VIRTUALIZER_STRENGTH: '@new_audio_360_virtualizer_strength',
  CUSTOM_EQ_BANDS: '@new_audio_360_custom_eq_bands',
  CUSTOM_EQ_PRESETS: '@new_audio_360_custom_eq_presets',
  BASS_CONTROL_LEVEL: '@new_audio_360_bass_control_level',
  TREBLE_CONTROL_LEVEL: '@new_audio_360_treble_control_level',
  VIRTUALIZER_LEVEL: '@new_audio_360_virtualizer_level',
  SPATIAL_ENHANCEMENT: '@new_audio_360_spatial_enhancement',
};

export interface CustomEQPreset {
  id: string;
  name: string;
  bands: number[];
  bassControl?: number;
  trebleControl?: number;
  virtualizer?: number;
}

export interface WebFolderSong {
  id: string;
  title: string;
  filename: string;
  path: string;
  blobUrl?: string;
}

export interface WebFolderData {
  id: string;
  name: string;
  path: string;
  songCount: number;
  songs: WebFolderSong[];
}

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

export async function saveBassBoostEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BASS_BOOST_ENABLED, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error saving bass boost setting:', error);
  }
}

export async function getBassBoostEnabled(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BASS_BOOST_ENABLED);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error('Error getting bass boost setting:', error);
    return false;
  }
}

export async function saveVirtualizerEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.VIRTUALIZER_ENABLED, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error saving virtualizer setting:', error);
  }
}

export async function getVirtualizerEnabled(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.VIRTUALIZER_ENABLED);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error('Error getting virtualizer setting:', error);
    return false;
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

export async function getSelectedFolders(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_FOLDERS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting selected folders:', error);
    return [];
  }
}

export async function setSelectedFolders(folders: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_FOLDERS, JSON.stringify(folders));
  } catch (error) {
    console.error('Error saving selected folders:', error);
  }
}

export async function addSelectedFolder(folderPath: string): Promise<void> {
  const folders = await getSelectedFolders();
  if (!folders.includes(folderPath)) {
    folders.push(folderPath);
    await setSelectedFolders(folders);
  }
}

export async function removeSelectedFolder(folderPath: string): Promise<void> {
  const folders = await getSelectedFolders();
  const filtered = folders.filter(f => f !== folderPath);
  await setSelectedFolders(filtered);
}

export async function getWebFolderData(): Promise<WebFolderData[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WEB_FOLDER_DATA);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting web folder data:', error);
    return [];
  }
}

export async function setWebFolderData(folders: WebFolderData[]): Promise<void> {
  try {
    const foldersToSave = folders.map(folder => ({
      ...folder,
      songs: folder.songs.map(song => ({
        id: song.id,
        title: song.title,
        filename: song.filename,
        path: song.path,
      })),
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.WEB_FOLDER_DATA, JSON.stringify(foldersToSave));
  } catch (error) {
    console.error('Error saving web folder data:', error);
  }
}

export async function saveBassBoostStrength(strength: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BASS_BOOST_STRENGTH, JSON.stringify(strength));
  } catch (error) {
    console.error('Error saving bass boost strength:', error);
  }
}

export async function getBassBoostStrength(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BASS_BOOST_STRENGTH);
    return data ? JSON.parse(data) : 200;
  } catch (error) {
    console.error('Error getting bass boost strength:', error);
    return 200;
  }
}

export async function saveVirtualizerStrength(strength: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.VIRTUALIZER_STRENGTH, JSON.stringify(strength));
  } catch (error) {
    console.error('Error saving virtualizer strength:', error);
  }
}

export async function getVirtualizerStrength(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.VIRTUALIZER_STRENGTH);
    return data ? JSON.parse(data) : 200;
  } catch (error) {
    console.error('Error getting virtualizer strength:', error);
    return 200;
  }
}

export async function saveCustomEQBands(bands: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_EQ_BANDS, JSON.stringify(bands));
  } catch (error) {
    console.error('Error saving custom EQ bands:', error);
  }
}

export async function getCustomEQBands(): Promise<number[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_EQ_BANDS);
    return data ? JSON.parse(data) : [0, 0, 0, 0, 0];
  } catch (error) {
    console.error('Error getting custom EQ bands:', error);
    return [0, 0, 0, 0, 0];
  }
}

export async function saveCustomEQPresets(presets: CustomEQPreset[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_EQ_PRESETS, JSON.stringify(presets));
  } catch (error) {
    console.error('Error saving custom EQ presets:', error);
  }
}

export async function getCustomEQPresets(): Promise<CustomEQPreset[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_EQ_PRESETS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting custom EQ presets:', error);
    return [];
  }
}

export async function saveBassControlLevel(level: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BASS_CONTROL_LEVEL, JSON.stringify(level));
  } catch (error) {
    console.error('Error saving bass control level:', error);
  }
}

export async function getBassControlLevel(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BASS_CONTROL_LEVEL);
    return data ? JSON.parse(data) : 0;
  } catch (error) {
    console.error('Error getting bass control level:', error);
    return 0;
  }
}

export async function saveTrebleControlLevel(level: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TREBLE_CONTROL_LEVEL, JSON.stringify(level));
  } catch (error) {
    console.error('Error saving treble control level:', error);
  }
}

export async function getTrebleControlLevel(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TREBLE_CONTROL_LEVEL);
    return data ? JSON.parse(data) : 0;
  } catch (error) {
    console.error('Error getting treble control level:', error);
    return 0;
  }
}

export async function saveVirtualizerLevel(level: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.VIRTUALIZER_LEVEL, JSON.stringify(level));
  } catch (error) {
    console.error('Error saving virtualizer level:', error);
  }
}

export async function getVirtualizerLevel(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.VIRTUALIZER_LEVEL);
    return data ? JSON.parse(data) : 0;
  } catch (error) {
    console.error('Error getting virtualizer level:', error);
    return 0;
  }
}

export async function saveSpatialEnhancement(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SPATIAL_ENHANCEMENT, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error saving spatial enhancement:', error);
  }
}

export async function getSpatialEnhancement(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SPATIAL_ENHANCEMENT);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error('Error getting spatial enhancement:', error);
    return false;
  }
}
