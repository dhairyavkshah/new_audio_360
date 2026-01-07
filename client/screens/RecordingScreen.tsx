import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Image, Pressable, ImageBackground, Platform, Alert } from "react-native";
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
import { useThemeContext } from "@/contexts/ThemeContext";
import { useStudioContext } from "@/contexts/StudioContext";
import { Spacing, BorderRadius, ModeStyles, Layout } from "@/constants/theme";
import { studioAudioEngine } from "@/services/StudioAudioEngine";

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
  const [showHeadphoneReminder, setShowHeadphoneReminder] = useState(true);
  const [isBackingTrackLoaded, setIsBackingTrackLoaded] = useState(false);
  const [isBackingTrackPlaying, setIsBackingTrackPlaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(-160);
  const [hasRecorded, setHasRecorded] = useState(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        Alert.alert(
          "Cannot Record",
          loadError || "Backing track not loaded. Please try again.",
          [{ text: "OK" }]
        );
        return;
      }

      try {
        setIsRecording(true);
        setIsPaused(false);
        setShowHeadphoneReminder(false);
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
        Alert.alert(
          "Recording Failed",
          "Could not start recording. Please check microphone permissions.",
          [{ text: "OK" }]
        );
      }
    } else if (isRecording && !isPaused) {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      await studioAudioEngine.pauseRecording();
      setIsPaused(true);
      setIsBackingTrackPlaying(false);
    } else if (isPaused) {
      await studioAudioEngine.resumeRecording();
      setIsPaused(false);
      setIsBackingTrackPlaying(true);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const handleStopRecording = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      "Finish Recording?",
      "Would you like to proceed to the mixing screen?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Continue",
          onPress: async () => {
            try {
              if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
              }

              const recordedUri = await studioAudioEngine.stopRecordingWithBackingTrack();
              setIsRecording(false);
              setIsPaused(false);
              setIsBackingTrackPlaying(false);

              if (currentProject) {
                await updateProject(currentProject.id, {
                  voiceRecordingUri: recordedUri,
                  backgroundTrackUri: song?.audioUrl || null,
                  backgroundTrackTitle: song?.title || null,
                  duration: recordingTime,
                });
              }

              const recordingId = `rec_${Date.now()}`;
              navigation.navigate("Mixing", { recordingId });
            } catch (error) {
              console.error("Failed to stop recording:", error);
              setIsRecording(false);
              setIsPaused(false);
              setIsBackingTrackPlaying(false);
            }
          },
        },
      ]
    );
  };

  const handlePreviewPress = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!isBackingTrackLoaded) {
      Alert.alert("Cannot Preview", loadError || "Backing track not loaded");
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isRecording) {
      try {
        await studioAudioEngine.stopRecordingWithBackingTrack();
      } catch {}
    } else if (isBackingTrackPlaying) {
      await studioAudioEngine.stopBackingTrack();
    }
    
    navigation.goBack();
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
          <Pressable onPress={handleClose} style={styles.closeButton}>
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

        {showHeadphoneReminder ? (
          <GlassCard style={styles.reminderCard}>
            <View style={styles.reminderContent}>
              <MaterialCommunityIcons name="headphones" size={24} color={theme.primary} />
              <View style={styles.reminderText}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Use Headphones
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  For the best recording experience
                </ThemedText>
              </View>
              <Pressable onPress={() => setShowHeadphoneReminder(false)}>
                <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
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
              >
                <MaterialCommunityIcons name="stop" size={32} color={theme.text} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
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
});
