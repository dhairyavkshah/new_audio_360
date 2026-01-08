import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Song } from '../context/AudioContext';

interface SongCardProps {
  song: Song;
  onPress: () => void;
  onFavorite: () => void;
  isPlaying?: boolean;
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function SongCard({ song, onPress, onFavorite, isPlaying }: SongCardProps) {
  return (
    <TouchableOpacity 
      style={[styles.container, isPlaying && styles.containerPlaying]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.artwork, isPlaying && styles.artworkPlaying]}>
        <Text style={styles.artworkText}>🎵</Text>
        {isPlaying && (
          <View style={styles.playingIndicator}>
            <View style={styles.bar} />
            <View style={[styles.bar, styles.barMid]} />
            <View style={styles.bar} />
          </View>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={[styles.title, isPlaying && styles.titlePlaying]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>
      
      <Text style={styles.duration}>{formatDuration(song.duration)}</Text>
      
      <TouchableOpacity style={styles.favoriteButton} onPress={onFavorite}>
        <Text style={styles.favoriteIcon}>{song.isFavorite ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  containerPlaying: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  artworkPlaying: {
    backgroundColor: '#6366f1',
  },
  artworkText: {
    fontSize: 20,
  },
  playingIndicator: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 2,
  },
  bar: {
    width: 3,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  barMid: {
    height: 14,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  titlePlaying: {
    color: '#6366f1',
  },
  artist: {
    fontSize: 13,
    color: '#9ca3af',
  },
  duration: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  favoriteButton: {
    padding: 8,
  },
  favoriteIcon: {
    fontSize: 18,
  },
});
