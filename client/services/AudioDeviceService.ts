import { Platform } from 'react-native';

export type AudioOutputType = 'speaker' | 'wired_headphones' | 'bluetooth' | 'unknown';

// NOTE: Full Android audio device detection requires native modules (e.g., AudioManager via expo-modules)
// Current implementation uses user confirmation for headphone status and web API detection
// For production, consider implementing a native module for Android AudioManager access
// to detect connected audio devices and their latency characteristics

export interface AudioDeviceInfo {
  outputType: AudioOutputType;
  isHeadphonesConnected: boolean;
  isBluetoothConnected: boolean;
  estimatedLatencyMs: number;
  isLowLatencySupported: boolean;
}

export interface LatencyWarning {
  level: 'none' | 'caution' | 'warning' | 'critical';
  message: string;
  recommendation: string;
}

const LATENCY_THRESHOLDS = {
  excellent: 25,
  good: 45,
  acceptable: 80,
  poor: 150,
};

const ESTIMATED_LATENCIES: Record<AudioOutputType, number> = {
  wired_headphones: 20,
  speaker: 50,
  bluetooth: 180,
  unknown: 100,
};

class AudioDeviceService {
  private currentDeviceInfo: AudioDeviceInfo = {
    outputType: 'speaker',
    isHeadphonesConnected: false,
    isBluetoothConnected: false,
    estimatedLatencyMs: ESTIMATED_LATENCIES.speaker,
    isLowLatencySupported: true,
  };

  private listeners: Set<(info: AudioDeviceInfo) => void> = new Set();

  async initialize(): Promise<void> {
    await this.detectAudioDevices();
  }

  async detectAudioDevices(): Promise<AudioDeviceInfo> {
    if (Platform.OS === 'web') {
      return this.detectWebAudioDevices();
    }

    return this.detectNativeAudioDevices();
  }

  private async detectWebAudioDevices(): Promise<AudioDeviceInfo> {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        
        const hasHeadphones = audioOutputs.some(d => 
          d.label.toLowerCase().includes('headphone') ||
          d.label.toLowerCase().includes('earphone') ||
          d.label.toLowerCase().includes('headset')
        );

        const hasBluetooth = audioOutputs.some(d =>
          d.label.toLowerCase().includes('bluetooth') ||
          d.label.toLowerCase().includes('airpod') ||
          d.label.toLowerCase().includes('wireless')
        );

        let outputType: AudioOutputType = 'speaker';
        if (hasBluetooth) {
          outputType = 'bluetooth';
        } else if (hasHeadphones) {
          outputType = 'wired_headphones';
        }

        this.currentDeviceInfo = {
          outputType,
          isHeadphonesConnected: hasHeadphones || hasBluetooth,
          isBluetoothConnected: hasBluetooth,
          estimatedLatencyMs: ESTIMATED_LATENCIES[outputType],
          isLowLatencySupported: outputType !== 'bluetooth',
        };
      }
    } catch (error) {
      console.warn('Failed to detect web audio devices:', error);
    }

    return this.currentDeviceInfo;
  }

  private async detectNativeAudioDevices(): Promise<AudioDeviceInfo> {
    this.currentDeviceInfo = {
      outputType: 'speaker',
      isHeadphonesConnected: false,
      isBluetoothConnected: false,
      estimatedLatencyMs: ESTIMATED_LATENCIES.speaker,
      isLowLatencySupported: true,
    };

    return this.currentDeviceInfo;
  }

  getLatencyWarning(): LatencyWarning {
    const latency = this.currentDeviceInfo.estimatedLatencyMs;

    if (this.currentDeviceInfo.isBluetoothConnected) {
      return {
        level: 'critical',
        message: `Bluetooth audio detected (~${latency}ms latency)`,
        recommendation: 'For karaoke recording, use wired headphones to avoid audio sync issues. Bluetooth adds 100-200ms delay which causes vocals to be out of sync with the music.',
      };
    }

    if (latency <= LATENCY_THRESHOLDS.excellent) {
      return {
        level: 'none',
        message: 'Excellent audio latency',
        recommendation: 'Your audio setup is optimal for karaoke recording.',
      };
    }

    if (latency <= LATENCY_THRESHOLDS.good) {
      return {
        level: 'none',
        message: 'Good audio latency',
        recommendation: 'Your audio setup is suitable for karaoke recording.',
      };
    }

    if (latency <= LATENCY_THRESHOLDS.acceptable) {
      return {
        level: 'caution',
        message: `Moderate latency (~${latency}ms)`,
        recommendation: 'Recording should work, but you may notice slight delay. Consider using wired headphones for best results.',
      };
    }

    if (latency <= LATENCY_THRESHOLDS.poor) {
      return {
        level: 'warning',
        message: `High latency detected (~${latency}ms)`,
        recommendation: 'Audio may be noticeably out of sync. Strongly recommend using wired headphones.',
      };
    }

    return {
      level: 'critical',
      message: `Very high latency (~${latency}ms)`,
      recommendation: 'Recording will likely have significant sync issues. Please use wired headphones.',
    };
  }

  isHeadphonesRecommended(): boolean {
    return !this.currentDeviceInfo.isHeadphonesConnected || 
           this.currentDeviceInfo.isBluetoothConnected;
  }

  shouldShowBluetoothWarning(): boolean {
    return this.currentDeviceInfo.isBluetoothConnected;
  }

  getDeviceInfo(): AudioDeviceInfo {
    return { ...this.currentDeviceInfo };
  }

  addListener(callback: (info: AudioDeviceInfo) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.currentDeviceInfo));
  }

  setDeviceType(type: AudioOutputType): void {
    this.currentDeviceInfo = {
      outputType: type,
      isHeadphonesConnected: type === 'wired_headphones' || type === 'bluetooth',
      isBluetoothConnected: type === 'bluetooth',
      estimatedLatencyMs: ESTIMATED_LATENCIES[type],
      isLowLatencySupported: type !== 'bluetooth',
    };
    this.notifyListeners();
  }

  getRecordingRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.currentDeviceInfo.isBluetoothConnected) {
      recommendations.push('Switch to wired headphones for better sync');
    }

    if (!this.currentDeviceInfo.isHeadphonesConnected) {
      recommendations.push('Use headphones to prevent echo/feedback');
      recommendations.push('Keep device away from speakers');
    }

    recommendations.push('Record in a quiet environment');
    recommendations.push('Hold device steady while recording');

    return recommendations;
  }
}

export const audioDeviceService = new AudioDeviceService();
