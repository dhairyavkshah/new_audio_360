import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export type MicTestStatus = 
  | 'idle'
  | 'requesting_permission'
  | 'permission_denied'
  | 'testing'
  | 'success'
  | 'failed'
  | 'no_input';

export interface MicTestResult {
  status: MicTestStatus;
  hasPermission: boolean;
  peakLevel: number;
  averageLevel: number;
  noiseFloor: number;
  isInputDetected: boolean;
  errorMessage?: string;
  recommendations: string[];
}

export type MicLevelCallback = (level: number) => void;

const MIC_TEST_DURATION_MS = 3000;
const SAMPLE_INTERVAL_MS = 50;
const SILENCE_THRESHOLD_DB = -50;
const GOOD_LEVEL_MIN_DB = -30;
const GOOD_LEVEL_MAX_DB = -6;

class MicTestService {
  private testRecording: Audio.Recording | null = null;
  private isTestRunning: boolean = false;
  private levelSamples: number[] = [];
  private levelCallback: MicLevelCallback | null = null;
  private samplingInterval: NodeJS.Timeout | null = null;

  async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('Failed to check mic permission:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('Failed to request mic permission:', error);
      return false;
    }
  }

  setLevelCallback(callback: MicLevelCallback | null): void {
    this.levelCallback = callback;
  }

  async runMicTest(): Promise<MicTestResult> {
    if (this.isTestRunning) {
      return {
        status: 'failed',
        hasPermission: true,
        peakLevel: -160,
        averageLevel: -160,
        noiseFloor: -160,
        isInputDetected: false,
        errorMessage: 'Test already in progress',
        recommendations: [],
      };
    }

    this.isTestRunning = true;
    this.levelSamples = [];

    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return {
          status: 'permission_denied',
          hasPermission: false,
          peakLevel: -160,
          averageLevel: -160,
          noiseFloor: -160,
          isInputDetected: false,
          errorMessage: 'Microphone permission was denied',
          recommendations: ['Grant microphone permission in device settings'],
        };
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const recordingOptions: Audio.RecordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      this.testRecording = recording;

      await this.collectSamples(MIC_TEST_DURATION_MS);

      await this.testRecording.stopAndUnloadAsync();
      this.testRecording = null;

      return this.analyzeResults();

    } catch (error) {
      console.error('Mic test failed:', error);
      return {
        status: 'failed',
        hasPermission: true,
        peakLevel: -160,
        averageLevel: -160,
        noiseFloor: -160,
        isInputDetected: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        recommendations: ['Try restarting the app', 'Check if another app is using the microphone'],
      };
    } finally {
      this.isTestRunning = false;
      if (this.samplingInterval) {
        clearInterval(this.samplingInterval);
        this.samplingInterval = null;
      }
    }
  }

  private collectSamples(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      this.samplingInterval = setInterval(async () => {
        if (!this.testRecording || !this.isTestRunning) {
          if (this.samplingInterval) {
            clearInterval(this.samplingInterval);
            this.samplingInterval = null;
          }
          resolve();
          return;
        }

        try {
          const status = await this.testRecording.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            this.levelSamples.push(status.metering);
            this.levelCallback?.(status.metering);
          }
        } catch {
        }

        if (Date.now() - startTime >= durationMs) {
          if (this.samplingInterval) {
            clearInterval(this.samplingInterval);
            this.samplingInterval = null;
          }
          resolve();
        }
      }, SAMPLE_INTERVAL_MS);
    });
  }

  private analyzeResults(): MicTestResult {
    if (this.levelSamples.length === 0) {
      return {
        status: 'no_input',
        hasPermission: true,
        peakLevel: -160,
        averageLevel: -160,
        noiseFloor: -160,
        isInputDetected: false,
        errorMessage: 'No audio input detected',
        recommendations: [
          'Check if microphone is not blocked',
          'Try speaking louder or closer to the device',
          'Ensure no other app is using the microphone',
        ],
      };
    }

    const sortedSamples = [...this.levelSamples].sort((a, b) => b - a);
    const peakLevel = sortedSamples[0];
    const averageLevel = this.levelSamples.reduce((a, b) => a + b, 0) / this.levelSamples.length;

    const quietSamples = sortedSamples.slice(-Math.floor(sortedSamples.length * 0.2));
    const noiseFloor = quietSamples.length > 0 
      ? quietSamples.reduce((a, b) => a + b, 0) / quietSamples.length 
      : -160;

    const isInputDetected = peakLevel > SILENCE_THRESHOLD_DB;

    const recommendations: string[] = [];

    if (!isInputDetected) {
      recommendations.push('No audio detected - check microphone');
      recommendations.push('Try speaking louder');
      return {
        status: 'no_input',
        hasPermission: true,
        peakLevel,
        averageLevel,
        noiseFloor,
        isInputDetected: false,
        recommendations,
      };
    }

    if (peakLevel > GOOD_LEVEL_MAX_DB) {
      recommendations.push('Audio is too loud - move further from mic');
      recommendations.push('Speak softer to avoid distortion');
    } else if (peakLevel < GOOD_LEVEL_MIN_DB) {
      recommendations.push('Audio is quiet - move closer to mic');
      recommendations.push('Speak louder for better recording');
    }

    if (noiseFloor > -40) {
      recommendations.push('High background noise detected');
      recommendations.push('Find a quieter environment');
    }

    if (recommendations.length === 0) {
      recommendations.push('Microphone is working well');
      recommendations.push('Ready to record');
    }

    return {
      status: 'success',
      hasPermission: true,
      peakLevel,
      averageLevel,
      noiseFloor,
      isInputDetected,
      recommendations,
    };
  }

  async cancelTest(): Promise<void> {
    this.isTestRunning = false;

    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = null;
    }

    if (this.testRecording) {
      try {
        await this.testRecording.stopAndUnloadAsync();
      } catch {
      }
      this.testRecording = null;
    }
  }

  isRunning(): boolean {
    return this.isTestRunning;
  }

  getLevelDescription(level: number): string {
    if (level < SILENCE_THRESHOLD_DB) return 'Silent';
    if (level < -40) return 'Very Quiet';
    if (level < -30) return 'Quiet';
    if (level < -20) return 'Normal';
    if (level < -10) return 'Loud';
    if (level < -6) return 'Very Loud';
    return 'Clipping!';
  }

  getLevelQuality(level: number): 'poor' | 'ok' | 'good' | 'warning' {
    if (level < SILENCE_THRESHOLD_DB) return 'poor';
    if (level < GOOD_LEVEL_MIN_DB) return 'ok';
    if (level <= GOOD_LEVEL_MAX_DB) return 'good';
    return 'warning';
  }
}

export const micTestService = new MicTestService();
