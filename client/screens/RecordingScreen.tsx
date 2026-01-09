import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Image, Pressable, ImageBackground, Platform, ActivityIndicator, ScrollView } from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { RecordButton } from "@/components/RecordButton";
import { LiveAudioWaveform } from "@/components/LiveAudioWaveform";
import { GlassCard } from "@/components/GlassCard";
import { Dialog } from "@/components/Dialog";
import { EffectChip } from "@/components/EffectChip";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useStudioContext, REVERB_PRESETS, NOISE_REDUCTION_LEVELS } from "@/contexts/StudioContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Spacing, BorderRadius, ModeStyles, Layout } from "@/constants/theme";
import { studioAudioEngine } from "@/services/StudioAudioEngine";
import { audioDeviceService, LatencyWarning } from "@/services/AudioDeviceService";
import { micTestService, MicTestResult, MicTestStatus } from "@/services/MicTestService";
import { LiveRecordingModule } from "../../modules/audio-effects";

const STUDIO_BLUR_INTENSITY = 35;
import { getSongById } from "@/lib/data";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type RecordingRouteProp = RouteProp<CreateStackParamList, "Recording">;

export default function RecordingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RecordingRouteProp>();
  const { theme, isDark } = useThemeContext();
  const { updateProject, currentProject, selectedReverb, noiseReduction, setSelectedReverb, setNoiseReduction } = useStudioContext();
  const { isNoiseReductionUnlocked, isReverbUnlocked } = useSubscription();

  const song = getSongById(route.params.songId);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showHeadphoneDialog, setShowHeadphoneDialog] = useState(true);
  const [usingHeadphones, setUsingHeadphones] = useState(false);
  const [isBackingTrackLoaded, setIsBackingTrackLoaded] = useState(false);
  const [isBackingTrackPlaying, setIsBackingTrackPlaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(-160);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showHeadphoneDialogModal, setShowHeadphoneDialogModal] = useState(true);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showReRecordDialog, setShowReRecordDialog] = useState(false);
  
  const [micTestStatus, setMicTestStatus] = useState<MicTestStatus>('idle');
  const [micTestResult, setMicTestResult] = useState<MicTestResult | null>(null);
  const [micTestLevel, setMicTestLevel] = useState<number>(-160);
  const [showMicTestDialog, setShowMicTestDialog] = useState(false);
  const [latencyWarning, setLatencyWarning] = useState<LatencyWarning | null>(null);
  const [inputGain, setInputGain] = useState(100);
  const [showGainControl, setShowGainControl] = useState(false);
  
  const isWebPlatform = Platform.OS === 'web';
  const nativeRecordingAvailable = LiveRecordingModule.isAvailable();

  const topPadding = insets.top + Spacing.l;
  const bottomPadding = insets.bottom + Spacing.xl;

  const textShadowStyle = {
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  };

  const getAudioUri = (audioUrl: string): string | null => {
    if (!audioUrl) return null;
    
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://') || audioUrl.startsWith('file://')) {
      return audioUrl;
    }
    
    if (Platform.OS === 'web') {
      return audioUrl.startsWith('/') ? audioUrl : `/${audioUrl}`;
    }
    
    return null;
  };

  const handleHeadphonesYes = () => {
    setUsingHeadphones(true);
    setShowHeadphoneDialog(false);
    setShowHeadphoneDialogModal(false);
    audioDeviceService.setDeviceType('wired_headphones');
    checkLatencyWarning();
  };

  const handleHeadphonesNo = () => {
    setUsingHeadphones(false);
    setShowHeadphoneDialog(false);
    setShowHeadphoneDialogModal(false);
    audioDeviceService.setDeviceType('speaker');
    checkLatencyWarning();
  };

  const checkLatencyWarning = useCallback(() => {
    const warning = audioDeviceService.getLatencyWarning();
    if (warning.level !== 'none') {
      setLatencyWarning(warning);
    } else {
      setLatencyWarning(null);
    }
  }, []);

  const runMicTest = useCallback(async () => {
    if (micTestStatus === 'testing') return;
    
    setMicTestStatus('testing');
    setShowMicTestDialog(true);
    setMicTestLevel(-160);
    
    micTestService.setLevelCallback((level) => {
      setMicTestLevel(level);
    });
    
    try {
      const result = await micTestService.runMicTest();
      setMicTestResult(result);
      setMicTestStatus(result.status);
    } catch (error) {
      setMicTestStatus('failed');
      setMicTestResult({
        status: 'failed',
        hasPermission: true,
        peakLevel: -160,
        averageLevel: -160,
        noiseFloor: -160,
        isInputDetected: false,
        errorMessage: 'Mic test failed',
        recommendations: ['Try again'],
      });
    } finally {
      micTestService.setLevelCallback(null);
    }
  }, [micTestStatus]);

  const handleInputGainChange = useCallback((value: number) => {
    const roundedValue = Math.round(value);
    setInputGain(roundedValue);
    studioAudioEngine.setInputGain(roundedValue);
  }, []);

  const handleNoiseReductionSelect = useCallback((level: typeof noiseReduction) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!isNoiseReductionUnlocked(level)) {
      return;
    }
    setNoiseReduction(level);
  }, [isNoiseReductionUnlocked, setNoiseReduction]);

  const handleReverbSelect = useCallback((reverb: typeof selectedReverb) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!isReverbUnlocked(reverb)) {
      return;
    }
    setSelectedReverb(reverb);
  }, [isReverbUnlocked, setSelectedReverb]);

  const handlePlayRecording = useCallback(async () => {
    if (!recordedUri) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (isPlayingRecording) {
      await studioAudioEngine.pauseMix();
      setIsPlayingRecording(false);
    } else {
      await studioAudioEngine.loadVoiceTrack(recordedUri);
      await studioAudioEngine.playMix();
      setIsPlayingRecording(true);
    }
  }, [recordedUri, isPlayingRecording]);

  const handleReRecord = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowReRecordDialog(true);
  }, []);

  const confirmReRecord = useCallback(async () => {
    setShowReRecordDialog(false);
    setHasRecorded(false);
    setRecordedUri(null);
    setRecordingTime(0);
    setIsPlayingRecording(false);
    try {
      await studioAudioEngine.stopMix();
    } catch {}
  }, []);

  useEffect(() => {
    const initAudio = async () => {
      try {
        await studioAudioEngine.configureAudioMode();
        
        if (song?.audioUrl) {
          const audioUri = getAudioUri(song.audioUrl);
          
          if (audioUri) {
            await studioAudioEngine.loadBackingTrack(audioUri);
            setIsBackingTrackLoaded(true);
            setLoadError(null);
          } else {
            setLoadError("Demo audio only available in web preview. Use your device's music library for recording.");
          }
        } else {
          setLoadError("This song doesn't have an audio file for recording");
        }
      } catch (error) {
        console.error("Failed to load backing track:", error);
        setLoadError("Failed to load backing track");
      }
    };

    initAudio();

    studioAudioEngine.setRecordingProgressCallback((durationMs) => {
      setRecordingTime(Math.floor(durationMs / 1000));
    });

    studioAudioEngine.setMeteringCallback((level) => {
      setAudioLevel(level);
    });

    return () => {
      studioAudioEngine.setRecordingProgressCallback(null);
      studioAudioEngine.setMeteringCallback(null);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [song]);

  const handleRecordPress = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!isRecording && !isPaused) {
      if (!isBackingTrackLoaded) {
        setErrorMessage(loadError || "Backing track not loaded. Please try again.");
        setShowErrorDialog(true);
        return;
      }

      try {
        setIsRecording(true);
        setIsPaused(false);
        setRecordingTime(0);
        setHasRecorded(true);
        
        await studioAudioEngine.startRecordingWithBackingTrack();
        setIsBackingTrackPlaying(true);
        
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (error) {
        console.error("Failed to start recording:", error);
        setIsRecording(false);
        setErrorMessage("Could not start recording. Please check microphone permissions.");
        setShowErrorDialog(true);
      }
    } else if (isRecording && !isPaused) {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      await studioAudioEngine.pauseRecording();
      setIsPaused(true);
      setIsBackingTrackPlaying(false);
      setAudioLevel(-160);
    } else if (isPaused) {
      await studioAudioEngine.resumeRecording();
      setIsPaused(false);
      setIsBackingTrackPlaying(true);
    }
  };

  const handleStopRecording = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setShowStopDialog(true);
  };

  const handleStopConfirm = async () => {
    setShowStopDialog(false);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    let uri: string | null = null;
    try {
      uri = await studioAudioEngine.stopRecordingWithBackingTrack();
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setIsRecording(false);
      setIsPaused(false);
      setIsBackingTrackPlaying(false);
      setErrorMessage("No recording was captured. This may happen if recording failed to start or microphone access was denied.");
      setShowErrorDialog(true);
      return;
    }

    setIsRecording(false);
    setIsPaused(false);
    setIsBackingTrackPlaying(false);
    setRecordedUri(uri);

    if (currentProject && uri) {
      try {
        await updateProject(currentProject.id, {
          voiceRecordingUri: uri,
          backgroundTrackUri: song?.audioUrl || null,
          backgroundTrackTitle: song?.title || null,
          duration: recordingTime,
        });
      } catch (error) {
        console.error("Failed to update project:", error);
      }
    }

    const recordingId = `rec_${Date.now()}`;
    navigation.navigate("Mixing", { recordingId });
  };

  const handlePreviewPress = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!isBackingTrackLoaded) {
      setErrorMessage(loadError || "Backing track not loaded");
      setShowErrorDialog(true);
      return;
    }

    if (isBackingTrackPlaying) {
      await studioAudioEngine.pauseBackingTrack();
      setIsBackingTrackPlaying(false);
    } else {
      await studioAudioEngine.playBackingTrack();
      setIsBackingTrackPlaying(true);
    }
  };

  const handleClose = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isRecording || isPaused) {
      setShowCloseDialog(true);
    } else {
      if (isBackingTrackPlaying) {
        await studioAudioEngine.stopBackingTrack();
        setIsBackingTrackPlaying(false);
      }
      navigation.goBack();
    }
  };

  const handleDiscardAndExit = async () => {
    setShowCloseDialog(false);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    try {
      await studioAudioEngine.stopRecording();
    } catch {}
    try {
      await studioAudioEngine.stopBackingTrack();
    } catch {}
    
    setIsRecording(false);
    setIsPaused(false);
    setIsBackingTrackPlaying(false);
    navigation.goBack();
  };

  const handleSaveAndMix = async () => {
    setShowCloseDialog(false);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    let recordedUri: string | null = null;
    try {
      recordedUri = await studioAudioEngine.stopRecordingWithBackingTrack();
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setErrorMessage("No recording was captured.");
      setShowErrorDialog(true);
      return;
    }

    setIsRecording(false);
    setIsPaused(false);
    setIsBackingTrackPlaying(false);

    if (currentProject && recordedUri) {
      try {
        await updateProject(currentProject.id, {
          voiceRecordingUri: recordedUri,
          backgroundTrackUri: song?.audioUrl || null,
          backgroundTrackTitle: song?.title || null,
          duration: recordingTime,
        });
      } catch (error) {
        console.error("Failed to update project:", error);
      }
    }

    const recordingId = `rec_${Date.now()}`;
    navigation.navigate("Mixing", { recordingId });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!song) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: song.artwork }}
        style={StyleSheet.absoluteFill}
        blurRadius={Platform.OS === "ios" ? STUDIO_BLUR_INTENSITY : STUDIO_BLUR_INTENSITY / 2}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? `rgba(0,0,0,${ModeStyles.studio.overlayOpacityDark + 0.15})` : `rgba(255,255,255,${ModeStyles.studio.overlayOpacityLight + 0.1})` }]} />
      </ImageBackground>

      <View style={[styles.content, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
        <View style={styles.header}>
          <Pressable 
            onPress={handleClose} 
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="close" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="body1" style={[{ fontWeight: "600" }, textShadowStyle]}>
              Recording
            </ThemedText>
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <View style={[styles.recordingDot, { backgroundColor: theme.recordButton }]} />
                <ThemedText type="caption1" style={{ color: theme.recordButton }}>
                  {formatTime(recordingTime)}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <Pressable 
            onPress={handlePreviewPress} 
            style={styles.closeButton}
            disabled={isRecording}
          >
            {!isRecording && isBackingTrackLoaded ? (
              <MaterialCommunityIcons 
                name={isBackingTrackPlaying ? "pause" : "play"} 
                size={24} 
                color={theme.primary} 
              />
            ) : <View style={{ width: 24 }} />}
          </Pressable>
        </View>

        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {!usingHeadphones && !showHeadphoneDialog ? (
            <GlassCard style={styles.reminderCard}>
              <View style={styles.reminderContent}>
                <MaterialCommunityIcons name="headphones-off" size={24} color={theme.warning} />
                <View style={styles.reminderText}>
                  <ThemedText type="body1" style={{ fontWeight: "600", color: theme.warning }}>
                    No Headphones Detected
                  </ThemedText>
                  <ThemedText type="caption1" style={{ color: theme.textSecondary }}>
                    Recording quality may be affected. Use headphones for cleaner vocals.
                  </ThemedText>
                </View>
              </View>
            </GlassCard>
          ) : null}

          {latencyWarning && latencyWarning.level !== 'none' ? (
            <GlassCard style={styles.reminderCard}>
              <View style={styles.reminderContent}>
                <MaterialCommunityIcons 
                  name={latencyWarning.level === 'critical' ? "bluetooth-off" : "clock-alert-outline"} 
                  size={24} 
                  color={latencyWarning.level === 'critical' ? theme.error : theme.warning} 
                />
                <View style={styles.reminderText}>
                  <ThemedText type="body1" style={{ fontWeight: "600", color: latencyWarning.level === 'critical' ? theme.error : theme.warning }}>
                    {latencyWarning.message}
                  </ThemedText>
                  <ThemedText type="caption1" style={{ color: theme.textSecondary }}>
                    {latencyWarning.recommendation}
                  </ThemedText>
                </View>
              </View>
            </GlassCard>
          ) : null}

          {loadError ? (
            <GlassCard style={styles.errorCard}>
              <View style={styles.reminderContent}>
                <MaterialCommunityIcons name="alert-circle" size={24} color={theme.warning} />
                <View style={styles.reminderText}>
                  <ThemedText type="body1" style={{ fontWeight: "600", color: theme.warning }}>
                    Audio Not Available
                  </ThemedText>
                  <ThemedText type="caption1" style={{ color: theme.textSecondary }}>
                    {loadError}
                  </ThemedText>
                </View>
              </View>
            </GlassCard>
          ) : null}

          {isWebPlatform ? (
            <GlassCard style={styles.reminderCard}>
              <View style={styles.reminderContent}>
                <MaterialCommunityIcons name="information-outline" size={24} color={theme.primary} />
                <View style={styles.reminderText}>
                  <ThemedText type="body1" style={{ fontWeight: "600", color: theme.primary }}>
                    Web Preview Mode
                  </ThemedText>
                  <ThemedText type="caption1" style={{ color: theme.textSecondary }}>
                    Recording works with basic features. For best quality with noise reduction and echo cancellation, use the Android app.
                  </ThemedText>
                </View>
              </View>
            </GlassCard>
          ) : null}

          {!isRecording && !isPaused && !hasRecorded ? (
            <Pressable onPress={() => setShowEffects(!showEffects)}>
              <GlassCard style={styles.effectsCard}>
                <View style={styles.effectsHeader}>
                  <View style={styles.effectsTitleRow}>
                    <MaterialCommunityIcons name="tune-variant" size={20} color={theme.primary} />
                    <ThemedText type="body1" style={{ fontWeight: "600", marginLeft: Spacing.s }}>
                      Voice Effects
                    </ThemedText>
                  </View>
                  <View style={styles.effectsBadge}>
                    <ThemedText type="caption1" style={{ color: theme.textSecondary }}>
                      {selectedReverb !== 'None' ? selectedReverb : 'No Reverb'} • {noiseReduction !== 'Off' ? noiseReduction : 'No NR'}
                    </ThemedText>
                    <MaterialCommunityIcons 
                      name={showEffects ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={theme.textSecondary} 
                    />
                  </View>
                </View>
                {showEffects ? (
                  <View style={styles.effectsContent}>
                    {!nativeRecordingAvailable && !isWebPlatform ? (
                      <View style={styles.effectsWarning}>
                        <MaterialCommunityIcons name="android" size={16} color={theme.warning} />
                        <ThemedText type="caption1" style={{ color: theme.warning, marginLeft: Spacing.xs }}>
                          Effects require Android native build
                        </ThemedText>
                      </View>
                    ) : null}
                    <View style={styles.effectSection}>
                      <ThemedText type="caption1" style={{ fontWeight: "600", marginBottom: Spacing.s }}>
                        Noise Reduction
                      </ThemedText>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.effectChipsRow}>
                          {NOISE_REDUCTION_LEVELS.map((level) => (
                            <EffectChip
                              key={level}
                              label={level}
                              isSelected={noiseReduction === level}
                              onPress={() => handleNoiseReductionSelect(level)}
                              isLocked={!isNoiseReductionUnlocked(level)}
                            />
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                    <View style={styles.effectSection}>
                      <ThemedText type="caption1" style={{ fontWeight: "600", marginBottom: Spacing.s }}>
                        Reverb
                      </ThemedText>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.effectChipsRow}>
                          {REVERB_PRESETS.map((reverb) => (
                            <EffectChip
                              key={reverb}
                              label={reverb}
                              isSelected={selectedReverb === reverb}
                              onPress={() => handleReverbSelect(reverb)}
                              isLocked={!isReverbUnlocked(reverb)}
                            />
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                ) : null}
              </GlassCard>
            </Pressable>
          ) : null}

          {hasRecorded && !isRecording ? (
            <GlassCard style={styles.takeManagementCard}>
              <View style={styles.takeManagementHeader}>
                <View style={styles.takeManagementTitleRow}>
                  <MaterialCommunityIcons name="microphone-variant" size={20} color={theme.primary} />
                  <ThemedText type="body1" style={{ fontWeight: "600", marginLeft: Spacing.s }}>
                    Your Recording
                  </ThemedText>
                </View>
                <View style={styles.takeManagementActions}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: theme.primaryContainer }]}
                    onPress={handlePlayRecording}
                  >
                    <MaterialCommunityIcons 
                      name={isPlayingRecording ? "pause" : "play"} 
                      size={18} 
                      color={theme.primary} 
                    />
                    <ThemedText type="caption1" style={{ color: theme.primary }}>
                      {isPlayingRecording ? "Pause" : "Preview"}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: theme.errorContainer }]}
                    onPress={handleReRecord}
                  >
                    <MaterialCommunityIcons name="refresh" size={18} color={theme.error} />
                    <ThemedText type="caption1" style={{ color: theme.error }}>Re-record</ThemedText>
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          ) : null}
        </ScrollView>

        <View style={styles.songInfoContainer}>
          <Image source={{ uri: song.artwork }} style={styles.songArtwork} />
          <View style={styles.songDetails}>
            <ThemedText type="body1" numberOfLines={1} style={[{ fontWeight: "600" }, textShadowStyle]}>
              {song.title}
            </ThemedText>
            <ThemedText type="caption1" numberOfLines={1} style={[{ color: theme.textSecondary }, textShadowStyle]}>
              {song.artist}
            </ThemedText>
          </View>
        </View>

        <View style={styles.waveformContainer}>
          <LiveAudioWaveform 
            audioLevel={audioLevel} 
            isActive={isRecording && !isPaused}
            height={Spacing.waveformHeight}
          />
        </View>

        <View style={styles.preRecordControls}>
          <Pressable
            style={[styles.micTestButton, { backgroundColor: theme.surfaceContainerHigh }]}
            onPress={runMicTest}
          >
            <MaterialCommunityIcons name="microphone-settings" size={18} color={theme.primary} />
            <ThemedText type="caption1" style={{ color: theme.primary, marginLeft: Spacing.xs }}>
              Test Mic
            </ThemedText>
          </Pressable>
          
          <Pressable
            style={[styles.micTestButton, { backgroundColor: theme.surfaceContainerHigh }]}
            onPress={() => setShowGainControl(!showGainControl)}
          >
            <MaterialCommunityIcons name="tune" size={18} color={theme.primary} />
            <ThemedText type="caption1" style={{ color: theme.primary, marginLeft: Spacing.xs }}>
              Input Gain
            </ThemedText>
          </Pressable>
        </View>

        {showGainControl ? (
          <View style={styles.gainControlContainer}>
            <View style={styles.gainRow}>
              <MaterialCommunityIcons name="volume-low" size={20} color={theme.text} />
              <Slider
                style={styles.gainSlider}
                value={inputGain}
                minimumValue={0}
                maximumValue={200}
                step={1}
                onValueChange={handleInputGainChange}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={theme.surfaceContainerHigh}
                thumbTintColor={theme.primary}
              />
              <ThemedText type="caption1" style={styles.gainLabel}>{inputGain}%</ThemedText>
            </View>
          </View>
        ) : null}

        <View style={styles.controls}>
          {isRecording || isPaused ? (
            <Pressable style={styles.stopButton} onPress={handleStopRecording}>
              <View style={[styles.stopIcon, { backgroundColor: theme.error }]} />
            </Pressable>
          ) : null}
          <RecordButton
            isRecording={isRecording && !isPaused}
            isPaused={isPaused}
            onPress={handleRecordPress}
            disabled={!isBackingTrackLoaded}
          />
        </View>
      </View>

      <Dialog
        visible={showHeadphoneDialogModal}
        title="Are you using headphones?"
        message="For the best recording quality, we recommend using headphones to prevent the backing track from being picked up by your microphone."
        actions={[
          { label: "No", onPress: handleHeadphonesNo },
          { label: "Yes", onPress: handleHeadphonesYes, primary: true },
        ]}
      />

      <Dialog
        visible={showStopDialog}
        title="Stop Recording?"
        message="This will finalize your recording and take you to the mixing screen."
        actions={[
          { label: "Continue Recording", onPress: () => setShowStopDialog(false) },
          { label: "Stop & Mix", onPress: handleStopConfirm, primary: true },
        ]}
      />

      <Dialog
        visible={showCloseDialog}
        title="Exit Recording?"
        message="You have an active recording. What would you like to do?"
        actions={[
          { label: "Discard & Exit", onPress: handleDiscardAndExit, destructive: true },
          { label: "Save & Mix", onPress: handleSaveAndMix, primary: true },
        ]}
      />

      <Dialog
        visible={showErrorDialog}
        title="Recording Error"
        message={errorMessage}
        actions={[
          { label: "OK", onPress: () => setShowErrorDialog(false), primary: true },
        ]}
      />

      <Dialog
        visible={showReRecordDialog}
        title="Re-record?"
        message="This will discard your current recording. Are you sure?"
        actions={[
          { label: "Cancel", onPress: () => setShowReRecordDialog(false) },
          { label: "Re-record", onPress: confirmReRecord, destructive: true },
        ]}
      />

      <Dialog
        visible={showMicTestDialog}
        title="Microphone Test"
        onClose={() => setShowMicTestDialog(false)}
        actions={[
          { label: "Close", onPress: () => setShowMicTestDialog(false), primary: true },
        ]}
      >
        <View style={styles.micTestDialogContent}>
          {micTestStatus === 'testing' ? (
            <>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText type="body1" style={{ marginTop: Spacing.m }}>Testing microphone...</ThemedText>
              <View style={[styles.micLevelBar, { backgroundColor: theme.surfaceContainerHigh }]}>
                <View 
                  style={[
                    styles.micLevelFill, 
                    { 
                      backgroundColor: theme.primary,
                      width: `${Math.max(0, Math.min(100, ((micTestLevel + 60) / 60) * 100))}%`,
                    }
                  ]} 
                />
              </View>
            </>
          ) : micTestResult ? (
            <>
              <MaterialCommunityIcons 
                name={micTestResult.status === 'passed' ? "check-circle" : "alert-circle"} 
                size={48} 
                color={micTestResult.status === 'passed' ? theme.success : theme.error} 
              />
              <ThemedText type="body1" style={{ marginTop: Spacing.m, fontWeight: "600" }}>
                {micTestResult.status === 'passed' ? "Microphone Ready!" : "Issues Detected"}
              </ThemedText>
              {micTestResult.recommendations.map((rec, idx) => (
                <ThemedText key={idx} type="caption1" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  • {rec}
                </ThemedText>
              ))}
            </>
          ) : null}
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.l,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: Spacing.m,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.m,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  reminderCard: {
    marginBottom: Spacing.m,
  },
  errorCard: {
    marginBottom: Spacing.m,
  },
  reminderContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  reminderText: {
    flex: 1,
    marginLeft: Spacing.m,
  },
  songInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  songArtwork: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.medium,
  },
  songDetails: {
    flex: 1,
    marginLeft: Spacing.m,
  },
  waveformContainer: {
    marginBottom: Spacing.l,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.l,
    marginTop: Spacing.l,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.small,
  },
  micTestButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.medium,
    minHeight: 40,
  },
  gainControlContainer: {
    width: "100%",
    marginTop: Spacing.m,
    paddingHorizontal: Spacing.m,
  },
  gainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gainSlider: {
    flex: 1,
    marginHorizontal: Spacing.s,
  },
  gainLabel: {
    width: 40,
    textAlign: "center",
  },
  preRecordControls: {
    alignItems: "center",
    marginBottom: Spacing.m,
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.s,
  },
  micTestDialogContent: {
    alignItems: "center",
    paddingVertical: Spacing.m,
  },
  micLevelBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    marginTop: Spacing.m,
    overflow: "hidden",
  },
  micLevelFill: {
    height: "100%",
    borderRadius: 4,
  },
  effectsCard: {
    marginBottom: Spacing.l,
  },
  effectsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  effectsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  effectsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  effectsContent: {
    marginTop: Spacing.l,
  },
  effectsWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.small,
    marginBottom: Spacing.m,
  },
  effectSection: {
    marginBottom: Spacing.m,
  },
  effectChipsRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  takeManagementCard: {
    marginBottom: Spacing.l,
  },
  takeManagementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  takeManagementTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  takeManagementActions: {
    flexDirection: "row",
    gap: Spacing.s,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.medium,
    gap: Spacing.xs,
    minHeight: 40,
  },
});
