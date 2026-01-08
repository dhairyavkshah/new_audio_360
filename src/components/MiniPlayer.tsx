import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAudio } from '../context/AudioContext';

interface MiniPlayerProps {
  onPress: () => void;
  onPlayPause: () => void;
}

export default function MiniPlayer({ onPress, onPlayPause }: MiniPlayerProps) {
  const { currentSong, isPlaying, progress, duration } = useAudio();

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
      
      <View style={styles.content}>
        <View style={styles.artwork}>
          <Text style={styles.artworkText}>🎵</Text>
        </View>
        
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.playButton} onPress={onPlayPause}>
          <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
    backgroundColor: '#6366f1',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkText: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    color: '#9ca3af',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 18,
  },
});
