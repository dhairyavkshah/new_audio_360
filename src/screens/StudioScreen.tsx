import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMessage } from '../context/MessageContext';

export default function StudioScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null);
  const { showMessage } = useMessage();

  const effects = [
    { id: 'echo', name: 'Echo', icon: '🔊' },
    { id: 'reverb', name: 'Reverb', icon: '🎭' },
    { id: 'pitch', name: 'Pitch Shift', icon: '🎼' },
    { id: 'noise', name: 'Noise Cancel', icon: '🔇' },
  ];

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setIsPaused(false);
      showMessage('Recording saved!', 'success');
      setRecordingTime(0);
    } else {
      setIsRecording(true);
      showMessage('Recording started', 'info');
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    showMessage(isPaused ? 'Recording resumed' : 'Recording paused', 'info');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Studio</Text>
        <Text style={styles.subtitle}>Record your voice over backing tracks</Text>
      </View>

      <View style={styles.waveformContainer}>
        <View style={styles.waveform}>
          {[...Array(40)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.waveformBar,
                {
                  height: isRecording && !isPaused
                    ? 10 + Math.random() * 60
                    : 10 + Math.sin(i * 0.3) * 20,
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.timer}>{formatTime(recordingTime)}</Text>
      </View>

      <View style={styles.controls}>
        {isRecording && (
          <TouchableOpacity style={styles.controlButton} onPress={handlePause}>
            <Text style={styles.controlIcon}>{isPaused ? '▶️' : '⏸️'}</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={handleRecord}
        >
          <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
        </TouchableOpacity>

        {isRecording && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              setIsRecording(false);
              setRecordingTime(0);
              showMessage('Recording discarded', 'warning');
            }}
          >
            <Text style={styles.controlIcon}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Voice Effects</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.effectsScroll}>
        <View style={styles.effectsRow}>
          {effects.map(effect => (
            <TouchableOpacity
              key={effect.id}
              style={[styles.effectCard, selectedEffect === effect.id && styles.effectCardActive]}
              onPress={() => {
                setSelectedEffect(selectedEffect === effect.id ? null : effect.id);
                showMessage(`${effect.name} ${selectedEffect === effect.id ? 'disabled' : 'enabled'}`, 'info');
              }}
            >
              <Text style={styles.effectIcon}>{effect.icon}</Text>
              <Text style={styles.effectName}>{effect.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.backingTrack}>
        <Text style={styles.sectionTitle}>Backing Track</Text>
        <TouchableOpacity style={styles.selectTrackButton}>
          <Text style={styles.selectTrackIcon}>🎵</Text>
          <Text style={styles.selectTrackText}>Select a backing track</Text>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  waveformContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    borderRadius: 16,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
    gap: 3,
  },
  waveformBar: {
    width: 4,
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  timer: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 24,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 20,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ef4444',
  },
  recordButtonActive: {
    borderColor: '#22c55e',
  },
  recordInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
  },
  recordInnerActive: {
    borderRadius: 6,
    backgroundColor: '#22c55e',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  effectsScroll: {
    paddingLeft: 16,
  },
  effectsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  effectCard: {
    width: 90,
    height: 90,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  effectCardActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  effectIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  effectName: {
    fontSize: 12,
    color: '#9ca3af',
  },
  backingTrack: {
    marginTop: 8,
  },
  selectTrackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  selectTrackIcon: {
    fontSize: 24,
  },
  selectTrackText: {
    color: '#9ca3af',
    fontSize: 15,
  },
});
