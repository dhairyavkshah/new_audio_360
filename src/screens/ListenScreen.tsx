import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudio, Song } from '../context/AudioContext';
import { useMessage } from '../context/MessageContext';
import SongCard from '../components/SongCard';
import MiniPlayer from '../components/MiniPlayer';
import NowPlayingModal from '../components/NowPlayingModal';

const SAMPLE_SONGS: Song[] = [
  { id: '1', title: 'Midnight Dreams', artist: 'Aurora Sky', album: 'Nocturne', duration: 234000, uri: '', isFavorite: true },
  { id: '2', title: 'Electric Soul', artist: 'Neon Pulse', album: 'Voltage', duration: 198000, uri: '', isFavorite: false },
  { id: '3', title: 'Ocean Waves', artist: 'Calm Waters', album: 'Serenity', duration: 312000, uri: '', isFavorite: false },
  { id: '4', title: 'City Lights', artist: 'Urban Echo', album: 'Metropolis', duration: 267000, uri: '', isFavorite: true },
  { id: '5', title: 'Mountain High', artist: 'Nature Sound', album: 'Peaks', duration: 289000, uri: '', isFavorite: false },
];

export default function ListenScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const { currentSong, playSong, isPlaying, pauseSong, resumeSong, setQueue } = useAudio();
  const { showMessage } = useMessage();

  const sortOptions = ['Recent', 'Title', 'Artist', 'Duration'];

  const filteredSongs = SAMPLE_SONGS.filter(
    song =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlaySong = (song: Song) => {
    playSong(song);
    setQueue(SAMPLE_SONGS);
    showMessage(`Now playing: ${song.title}`, 'success');
  };

  const handleFavorite = (song: Song) => {
    showMessage(song.isFavorite ? 'Removed from favorites' : 'Added to favorites', 'success');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Listen</Text>
        <View style={styles.headerControls}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <Text style={styles.sortText}>{sortBy}</Text>
            <Text style={styles.sortIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showSortMenu && (
        <View style={styles.sortMenu}>
          {sortOptions.map(option => (
            <TouchableOpacity
              key={option}
              style={styles.sortOption}
              onPress={() => {
                setSortBy(option);
                setShowSortMenu(false);
              }}
            >
              <Text style={[styles.sortOptionText, sortBy === option && styles.sortOptionActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={filteredSongs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <SongCard
            song={item}
            onPress={() => handlePlaySong(item)}
            onFavorite={() => handleFavorite(item)}
            isPlaying={currentSong?.id === item.id && isPlaying}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {currentSong && (
        <MiniPlayer
          onPress={() => setShowNowPlaying(true)}
          onPlayPause={() => (isPlaying ? pauseSong() : resumeSong())}
        />
      )}

      <Modal
        visible={showNowPlaying}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <NowPlayingModal onClose={() => setShowNowPlaying(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
    gap: 4,
  },
  sortText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  sortIcon: {
    color: '#9ca3af',
    fontSize: 10,
  },
  sortMenu: {
    position: 'absolute',
    top: 110,
    right: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 4,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sortOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sortOptionText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  sortOptionActive: {
    color: '#6366f1',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
});
