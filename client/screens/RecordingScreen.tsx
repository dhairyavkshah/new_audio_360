import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Image, Pressable, ImageBackground, Platform, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { RecordButton } from "@/components/RecordButton";
import { LiveAudioWaveform } from "@/components/LiveAudioWaveform";
import { GlassCard } from "@/components/GlassCard";
import { Dialog } from "@/components/Dialog";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useStudioContext } from "@/contexts/StudioContext";
import { Spacing, BorderRadius, ModeStyles, Layout } from "@/constants/theme";
import { studioAudioEngine } from "@/services/StudioAudioEngine";
import { audioDeviceService, LatencyWarning } from "@/services/AudioDeviceService";
import { micTestService, MicTestResult, MicTestStatus } from "@/services/MicTestService";

const STUDIO_BLUR_INTENSITY = 35;
import { getSongById } from "@/lib/data";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type RecordingRouteProp = RouteProp<CreateStackParamList, "Recording">;

export default function RecordingScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RecordingRouteProp>();
  const { theme, isDark } = useThemeContext();
  const { updateProject, currentProject } = useStudioContext();

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
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showHeadphoneDialogModal, setShowHeadphoneDialogModal] = useState(true);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [micTestStatus, setMicTestStatus] = useState<MicTestStatus>('idle');
  const [micTestResult, setMicTestResult] = useState<MicTestResult | null>(null);
  const [micTestLevel, setMicTestLevel] = useState<number>(-160);
  const [showMicTestDialog, setShowMicTestDialog] = useState(false);
  const [latencyWarning, setLatencyWarning] = useState<LatencyWarning | null>(null);
  const [inputGain, setInputGain] = useState(100);
  const [showGainControl, setShowGainControl] = useState(false);

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
    console.log("Stop button pressed");
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

    let recordedUri: string | null = null;
    try {
      recordedUri = await studioAudioEngine.stopRecordingWithBackingTrack();
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
    console.log("Close button pressed, isRecording:", isRecording, "isPaused:", isPaused);
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

      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl }]}>
        <View style={styles.header}>
          <Pressable 
            onPress={handleClose} 
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="close" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="body" style={[{ fontWeight: "600" }, textShadowStyle]}>
              Recording
            </ThemedText>
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <View style={[styles.recordingDot, { backgroundColor: theme.recordButton }]} />
                <ThemedText type="small" style={{ color: theme.recordButton }}>
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

        {!usingHeadphones && !showHeadphoneDialog ? (
          <GlassCard style={styles.reminderCard}>
            <View style={styles.reminderContent}>
              <MaterialCommunityIcons name="headphones-off" size={24} color={theme.warning} />
              <View style={styles.reminderText}>
                <ThemedText type="body" style={{ fontWeight: "600", color: theme.warning }}>
                  No Headphones Detected
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
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
                <ThemedText type="body" style={{ fontWeight: "600", color: latencyWarning.level === 'critical' ? theme.error : theme.warning }}>
                  {latencyWarning.message}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
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
                <ThemedText type="body" style={{ fontWeight: "600", color: theme.warning }}>
                  Audio Not Available
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {loadError}
                </ThemedText>
              </View>
            </View>
          </GlassCard>
        ) : null}

        <View style={styles.songInfo}>
          <Image source={{ uri: song.artwork }} style={styles.artwork} />
          <ThemedText type="h4" style={[styles.songTitle, textShadowStyle]} numberOfLines={1}>
            {song.title}
          </ThemedText>
          <ThemedText type="body" style={[textShadowStyle, { color: isDark ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>
            {song.artist}
          </ThemedText>
          {isBackingTrackLoaded ? (
            <View style={[styles.statusBadge, { backgroundColor: theme.primary + "30" }]}>
              <MaterialCommunityIcons name="check-circle" size={14} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 4 }}>
                Ready to record
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.waveformContainer}>
          <LiveAudioWaveform
            audioLevel={audioLevel}
            isActive={isRecording}
            barCount={60}
            barWidth={4}
            height={80}
            color={isRecording ? theme.recordButton : theme.primary}
            sensitivity={1.8}
          />
        </View>

        <View style={styles.controlsContainer}>
          {!isRecording && !isPaused && !hasRecorded ? (
            <View style={styles.preRecordControls}>
              <Pressable 
                onPress={runMicTest}
                style={[styles.micTestButton, { backgroundColor: theme.primaryContainer }]}
                disabled={micTestStatus === 'testing'}
              >
                {micTestStatus === 'testing' ? (
                  <ActivityIndicator size="small" color={theme.onPrimaryContainer} />
                ) : (
                  <MaterialCommunityIcons name="microphone-outline" size={20} color={theme.onPrimaryContainer} />
                )}
                <ThemedText type="body" style={{ marginLeft: Spacing.xs, color: theme.onPrimaryContainer }}>
                  {micTestStatus === 'testing' ? 'Testing...' : 'Test Microphone'}
                </ThemedText>
              </Pressable>

              {micTestResult && micTestResult.status === 'success' && (
                <View style={[styles.micTestButton, { backgroundColor: theme.primaryContainer + '40' }]}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={theme.primary} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.xs, color: theme.primary }}>
                    Mic Ready
                  </ThemedText>
                </View>
              )}
            </View>
          ) : null}

          <ThemedText type="body" style={[styles.instruction, textShadowStyle, { color: isDark ? 'rgba(255,255,255,0.8)' : theme.textSecondary }]}>
            {isRecording && !isPaused 
              ? "Tap to pause recording" 
              : isPaused 
                ? "Tap to resume recording" 
                : "Tap to start recording"}
          </ThemedText>
          <View style={styles.buttonRow}>
            <RecordButton 
              isRecording={isRecording && !isPaused} 
              onPress={handleRecordPress} 
              size={100}
              isPaused={isPaused}
            />
            {(isRecording || isPaused) && (
              <Pressable 
                onPress={handleStopRecording} 
                style={[styles.stopButton, { backgroundColor: theme.surfaceContainer }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="stop" size={32} color={theme.text} />
              </Pressable>
            )}
          </View>

          {!isRecording && !isPaused ? (
            <View style={styles.gainControlContainer}>
              <Pressable 
                onPress={() => setShowGainControl(!showGainControl)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm }}
              >
                <MaterialCommunityIcons name="tune-vertical" size={18} color={theme.textSecondary} />
                <ThemedText type="small" style={{ marginLeft: Spacing.xs, color: theme.textSecondary }}>
                  {showGainControl ? 'Hide Gain Control' : 'Adjust Input Gain'}
                </ThemedText>
                <MaterialCommunityIcons 
                  name={showGainControl ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color={theme.textSecondary} 
                />
              </Pressable>
              {showGainControl && (
                <View style={styles.gainRow}>
                  <MaterialCommunityIcons name="volume-low" size={20} color={theme.textSecondary} />
                  <Slider
                    style={styles.gainSlider}
                    minimumValue={0}
                    maximumValue={200}
                    value={inputGain}
                    onValueChange={handleInputGainChange}
                    minimumTrackTintColor={theme.primary}
                    maximumTrackTintColor={theme.surfaceContainerHighest}
                    thumbTintColor={theme.primary}
                  />
                  <MaterialCommunityIcons name="volume-high" size={20} color={theme.textSecondary} />
                  <ThemedText type="small" style={[styles.gainLabel, { color: theme.text }]}>
                    {inputGain}%
                  </ThemedText>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </View>

      <Dialog
        visible={showHeadphoneDialogModal}
        onDismiss={handleHeadphonesNo}
        title="Use Headphones for Best Results"
        message="For the best recording quality and to avoid audio feedback, we recommend using headphones. Are you using headphones?"
        actions={[
          { label: "No", onPress: handleHeadphonesNo, variant: "ghost" },
          { label: "Yes", onPress: handleHeadphonesYes, variant: "default" },
        ]}
      />

      <Dialog
        visible={showStopDialog}
        onDismiss={() => setShowStopDialog(false)}
        title="Finish Recording?"
        message="Would you like to proceed to the mixing screen?"
        actions={[
          { label: "Cancel", onPress: () => setShowStopDialog(false), variant: "ghost" },
          { label: "Yes, Continue", onPress: handleStopConfirm, variant: "default" },
        ]}
      />

      <Dialog
        visible={showCloseDialog}
        onDismiss={() => setShowCloseDialog(false)}
        title="Recording in Progress"
        message="You have an unsaved recording. What would you like to do?"
        actions={[
          { label: "Cancel", onPress: () => setShowCloseDialog(false), variant: "ghost" },
          { label: "Discard & Exit", onPress: handleDiscardAndExit, variant: "secondary" },
          { label: "Save & Mix", onPress: handleSaveAndMix, variant: "default" },
        ]}
      />

      <Dialog
        visible={showErrorDialog}
        onDismiss={() => setShowErrorDialog(false)}
        title="Error"
        message={errorMessage}
        actions={[
          { label: "OK", onPress: () => setShowErrorDialog(false), variant: "default" },
        ]}
      />

      <Dialog
        visible={showMicTestDialog}
        onDismiss={() => setShowMicTestDialog(false)}
        title={micTestStatus === 'testing' ? 'Testing Microphone...' : 'Microphone Test Complete'}
        message={
          micTestStatus === 'testing' 
            ? 'Speak into the microphone to test audio input levels.' 
            : micTestResult?.recommendations?.[0] || 'Test completed'
        }
        actions={
          micTestStatus === 'testing'
            ? [{ label: "Cancel", onPress: () => { micTestService.cancelTest(); setShowMicTestDialog(false); }, variant: "ghost" }]
            : [{ label: "Done", onPress: () => setShowMicTestDialog(false), variant: "default" }]
        }
      >
        <View style={styles.micTestDialogContent}>
          {micTestStatus === 'testing' ? (
            <>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                Level: {micTestService.getLevelDescription(micTestLevel)}
              </ThemedText>
              <View style={[styles.micLevelBar, { backgroundColor: theme.surfaceContainerHighest }]}>
                <View 
                  style={[
                    styles.micLevelFill, 
                    { 
                      width: `${Math.max(0, Math.min(100, (micTestLevel + 60) * 1.67))}%`,
                      backgroundColor: micTestLevel > -10 ? theme.error : micTestLevel > -30 ? theme.primary : theme.textSecondary 
                    }
                  ]} 
                />
              </View>
            </>
          ) : micTestResult ? (
            <>
              <MaterialCommunityIcons 
                name={micTestResult.isInputDetected ? "microphone-outline" : "microphone-off"} 
                size={48} 
                color={micTestResult.isInputDetected ? theme.primary : theme.error} 
              />
              <ThemedText type="body" style={{ marginTop: Spacing.md, textAlign: 'center', color: theme.text }}>
                Peak Level: {micTestResult.peakLevel.toFixed(1)} dB
              </ThemedText>
              {micTestResult.recommendations.map((rec, i) => (
                <ThemedText key={i} type="small" style={{ marginTop: Spacing.xs, textAlign: 'center', color: theme.textSecondary }}>
                  {rec}
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
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
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
    marginBottom: Spacing.lg,
  },
  errorCard: {
    marginBottom: Spacing.lg,
  },
  reminderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  songInfo: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  artwork: {
    width: 140,
    height: 140,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  songTitle: {
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  waveformContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  controlsContainer: {
    alignItems: "center",
    paddingBottom: Spacing["2xl"],
  },
  instruction: {
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xl,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  micTestButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  gainControlContainer: {
    width: "100%",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  gainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gainSlider: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  gainLabel: {
    width: 40,
    textAlign: "center",
  },
  preRecordControls: {
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  micTestDialogContent: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  micLevelBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    marginTop: Spacing.md,
    overflow: "hidden",
  },
  micLevelFill: {
    height: "100%",
    borderRadius: 4,
  },
});
