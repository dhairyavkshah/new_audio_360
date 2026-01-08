import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudio } from '../context/AudioContext';
import { useMessage } from '../context/MessageContext';

const { width } = Dimensions.get('window');

interface NowPlayingModalProps {
  onClose: () => void;
}

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function NowPlayingModal({ onClose }: NowPlayingModalProps) {
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    shuffle,
    repeatMode,
    pauseSong,
    resumeSong,
    nextSong,
    previousSong,
    seekTo,
    toggleShuffle,
    toggleRepeat,
  } = useAudio();
  const { showMessage } = useMessage();

  const [sliderValue, setSliderValue] = useState(progress);

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeIcon}>↓</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.artworkContainer}>
        <View style={styles.artwork}>
          <Text style={styles.artworkEmoji}>🎵</Text>
        </View>
      </View>

      <View style={styles.songInfo}>
        <Text style={styles.title}>{currentSong.title}</Text>
        <Text style={styles.artist}>{currentSong.artist}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          <View style={[styles.progressThumb, { left: `${progressPercent}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(progress)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.secondaryControl} 
          onPress={() => {
            toggleShuffle();
            showMessage(shuffle ? 'Shuffle off' : 'Shuffle on', 'info');
          }}
        >
          <Text style={[styles.controlIcon, shuffle && styles.activeControl]}>🔀</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.control} onPress={previousSong}>
          <Text style={styles.controlIcon}>⏮️</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.playButton} 
          onPress={() => isPlaying ? pauseSong() : resumeSong()}
        >
          <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.control} onPress={nextSong}>
          <Text style={styles.controlIcon}>⏭️</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryControl}
          onPress={() => {
            toggleRepeat();
            const modes = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' };
            const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
            showMessage(modes[nextMode], 'info');
          }}
        >
          <Text style={[styles.controlIcon, repeatMode !== 'off' && styles.activeControl]}>
            {repeatMode === 'one' ? '🔂' : '🔁'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🎛️</Text>
          <Text style={styles.actionText}>Sound Lab</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => showMessage('Added to playlist', 'success')}
        >
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionText}>Add to</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: '#fff',
  },
  artworkContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  artwork: {
    width: width - 80,
    height: width - 80,
    maxWidth: 320,
    maxHeight: 320,
    borderRadius: 24,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  artworkEmoji: {
    fontSize: 80,
  },
  songInfo: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  artist: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#2d2d44',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    backgroundColor: '#6366f1',
    borderRadius: 6,
    marginLeft: -6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  time: {
    fontSize: 12,
    color: '#6b7280',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 20,
  },
  secondaryControl: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  control: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 28,
    opacity: 0.7,
  },
  activeControl: {
    opacity: 1,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 32,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingTop: 16,
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
