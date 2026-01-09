import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Image, Pressable, ImageBackground, Platform, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentText } from "@/components/fluent";
import { RecordButton } from "@/components/RecordButton";
import { LiveAudioWaveform } from "@/components/LiveAudioWaveform";
import { GlassCard } from "@/components/GlassCard";
import { Dialog } from "@/components/Dialog";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useStudioContext } from "@/contexts/StudioContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { ModeStyles } from "@/constants/theme";
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
  const colors = isDark ? FluentDarkColors : FluentLightColors;
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

      <View style={[styles.content, { paddingTop: insets.top + FluentSpacing.l, paddingBottom: tabBarHeight + FluentSpacing.xl }]}>
        <View style={styles.header}>
          <Pressable 
            onPress={handleClose} 
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.colorNeutralForeground1} />
          </Pressable>
          <View style={styles.headerCenter}>
            <FluentText variant="body1" style={[{ fontWeight: "600" }, textShadowStyle]}>
              Recording
            </FluentText>
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <View style={[styles.recordingDot, { backgroundColor: theme.recordButton }]} />
                <FluentText variant="body2" style={{ color: theme.recordButton }}>
                  {formatTime(recordingTime)}
                </FluentText>
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
                color={colors.colorBrandForeground1} 
              />
            ) : <View style={{ width: 24 }} />}
          </Pressable>
        </View>

        {!usingHeadphones && !showHeadphoneDialog ? (
          <GlassCard style={styles.reminderCard}>
            <View style={styles.reminderContent}>
              <MaterialCommunityIcons name="headphones-off" size={24} color={colors.colorPaletteYellowForeground1} />
              <View style={styles.reminderText}>
                <FluentText variant="body1" color="warning" style={{ fontWeight: "600" }}>
                  No Headphones Detected
                </FluentText>
                <FluentText variant="body2" color="secondary">
                  Recording quality may be affected. Use headphones for cleaner vocals.
                </FluentText>
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
                color={latencyWarning.level === 'critical' ? colors.colorPaletteRedForeground1 : colors.colorPaletteYellowForeground1} 
              />
              <View style={styles.reminderText}>
                <FluentText variant="body1" color={latencyWarning.level === 'critical' ? "error" : "warning"} style={{ fontWeight: "600" }}>
                  {latencyWarning.message}
                </FluentText>
                <FluentText variant="body2" color="secondary">
                  {latencyWarning.recommendation}
                </FluentText>
              </View>
            </View>
          </GlassCard>
        ) : null}

        {loadError ? (
          <GlassCard style={styles.errorCard}>
            <View style={styles.reminderContent}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={colors.colorPaletteYellowForeground1} />
              <View style={styles.reminderText}>
                <FluentText variant="body1" color="warning" style={{ fontWeight: "600" }}>
                  Audio Not Available
                </FluentText>
                <FluentText variant="body2" color="secondary">
                  {loadError}
                </FluentText>
              </View>
            </View>
          </GlassCard>
        ) : null}

        <View style={styles.songInfo}>
          <Image source={{ uri: song.artwork }} style={styles.artwork} />
          <FluentText variant="subtitle1" style={[styles.songTitle, textShadowStyle]} numberOfLines={1}>
            {song.title}
          </FluentText>
          <FluentText variant="body1" style={[textShadowStyle, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.colorNeutralForeground2 }]}>
            {song.artist}
          </FluentText>
          {isBackingTrackLoaded ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.colorBrandForeground1 + "30" }]}>
              <MaterialCommunityIcons name="check-circle" size={14} color={colors.colorBrandForeground1} />
              <FluentText variant="caption" color="brand" style={{ marginLeft: 4 }}>
                Ready to record
              </FluentText>
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
            color={isRecording ? theme.recordButton : colors.colorBrandForeground1}
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
                <FluentText variant="body1" style={{ marginLeft: FluentSpacing.xs, color: theme.onPrimaryContainer }}>
                  {micTestStatus === 'testing' ? 'Testing...' : 'Test Microphone'}
                </FluentText>
              </Pressable>

              {micTestResult && micTestResult.status === 'success' && (
                <View style={[styles.micTestButton, { backgroundColor: theme.primaryContainer + '40' }]}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.colorBrandForeground1} />
                  <FluentText variant="body1" color="brand" style={{ marginLeft: FluentSpacing.xs }}>
                    Mic Ready
                  </FluentText>
                </View>
              )}
            </View>
          ) : null}

          <FluentText variant="body1" color="secondary" style={[styles.instruction, textShadowStyle, { color: isDark ? 'rgba(255,255,255,0.8)' : colors.colorNeutralForeground2 }]}>
            {isRecording && !isPaused 
              ? "Tap to pause recording" 
              : isPaused 
                ? "Tap to resume recording" 
                : "Tap to start recording"}
          </FluentText>
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
                style={[styles.stopButton, { backgroundColor: colors.colorNeutralBackground2 }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="stop" size={32} color={colors.colorNeutralForeground1} />
              </Pressable>
            )}
          </View>

          {!isRecording && !isPaused ? (
            <View style={styles.gainControlContainer}>
              <Pressable 
                onPress={() => setShowGainControl(!showGainControl)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: FluentSpacing.s }}
              >
                <MaterialCommunityIcons name="tune-vertical" size={18} color={colors.colorNeutralForeground2} />
                <FluentText variant="body2" color="secondary" style={{ marginLeft: FluentSpacing.xs }}>
                  {showGainControl ? 'Hide Gain Control' : 'Adjust Input Gain'}
                </FluentText>
                <MaterialCommunityIcons 
                  name={showGainControl ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color={colors.colorNeutralForeground2} 
                />
              </Pressable>
              {showGainControl && (
                <View style={styles.gainRow}>
                  <MaterialCommunityIcons name="volume-low" size={20} color={colors.colorNeutralForeground2} />
                  <Slider
                    style={styles.gainSlider}
                    minimumValue={0}
                    maximumValue={200}
                    value={inputGain}
                    onValueChange={handleInputGainChange}
                    minimumTrackTintColor={colors.colorBrandForeground1}
                    maximumTrackTintColor={colors.colorNeutralBackground4}
                    thumbTintColor={colors.colorBrandForeground1}
                  />
                  <MaterialCommunityIcons name="volume-high" size={20} color={colors.colorNeutralForeground2} />
                  <FluentText variant="body2" style={[styles.gainLabel, { color: colors.colorNeutralForeground1 }]}>
                    {inputGain}%
                  </FluentText>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </View>

      <Dialog
        visible={showHeadphoneDialogModal}
        title="Are you using headphones?"
        message="For best results, use wired headphones to prevent audio feedback while recording."
        actions={[
          { label: "No", onPress: handleHeadphonesNo, variant: "secondary" },
          { label: "Yes", onPress: handleHeadphonesYes, variant: "default" },
        ]}
        onDismiss={() => setShowHeadphoneDialogModal(false)}
      />

      <Dialog
        visible={showErrorDialog}
        title="Error"
        message={errorMessage}
        actions={[
          { label: "OK", onPress: () => setShowErrorDialog(false), variant: "default" },
        ]}
        onDismiss={() => setShowErrorDialog(false)}
      />

      <Dialog
        visible={showStopDialog}
        title="Finish Recording?"
        message="Your recording will be saved and you can mix and apply effects in the next step."
        actions={[
          { label: "Cancel", onPress: () => setShowStopDialog(false), variant: "secondary" },
          { label: "Yes, Continue", onPress: handleStopConfirm, variant: "default" },
        ]}
        onDismiss={() => setShowStopDialog(false)}
      />

      <Dialog
        visible={showCloseDialog}
        title="Recording in Progress"
        message="What would you like to do with your current recording?"
        actions={[
          { label: "Discard & Exit", onPress: handleDiscardAndExit, variant: "secondary" },
          { label: "Save & Mix", onPress: handleSaveAndMix, variant: "default" },
        ]}
        onDismiss={() => setShowCloseDialog(false)}
      />

      <Dialog
        visible={showMicTestDialog}
        title={micTestStatus === 'testing' ? "Testing Microphone..." : micTestResult?.status === 'success' ? "Microphone Ready" : "Microphone Issue"}
        message={
          micTestStatus === 'testing' 
            ? "Please speak or make a sound to test your microphone."
            : micTestResult?.status === 'success'
              ? "Your microphone is working correctly and ready for recording."
              : micTestResult?.errorMessage || "There was an issue with your microphone."
        }
        actions={
          micTestStatus === 'testing'
            ? []
            : [
                { label: "Close", onPress: () => setShowMicTestDialog(false), variant: "default" },
              ]
        }
        onDismiss={() => {
          if (micTestStatus !== 'testing') {
            setShowMicTestDialog(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: FluentSpacing.l,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: FluentSpacing.l,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: FluentSpacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: FluentSpacing.xs,
  },
  reminderCard: {
    marginBottom: FluentSpacing.m,
  },
  errorCard: {
    marginBottom: FluentSpacing.m,
  },
  reminderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  songInfo: {
    alignItems: "center",
    marginBottom: FluentSpacing.xl,
  },
  artwork: {
    width: 160,
    height: 160,
    borderRadius: FluentRadius.large,
    marginBottom: FluentSpacing.l,
  },
  songTitle: {
    marginBottom: FluentSpacing.xs,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
    marginTop: FluentSpacing.m,
  },
  waveformContainer: {
    marginBottom: FluentSpacing.xl,
  },
  controlsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  preRecordControls: {
    flexDirection: "row",
    gap: FluentSpacing.m,
    marginBottom: FluentSpacing.l,
  },
  micTestButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.large,
  },
  instruction: {
    marginBottom: FluentSpacing.l,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.xl,
  },
  stopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  gainControlContainer: {
    marginTop: FluentSpacing.xl,
    width: "100%",
  },
  gainRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
  },
  gainSlider: {
    flex: 1,
    marginHorizontal: FluentSpacing.m,
  },
  gainLabel: {
    width: 45,
    textAlign: "right",
  },
});
