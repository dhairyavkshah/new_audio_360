import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { VolumeSlider } from "@/components/VolumeSlider";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useStudioContext } from "@/contexts/StudioContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";
import { studioAudioEngine } from "@/services/StudioAudioEngine";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type MixingRouteProp = RouteProp<CreateStackParamList, "Mixing">;

export default function MixingScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MixingRouteProp>();
  const { theme } = useThemeContext();
  const { currentProject, updateProject } = useStudioContext();
  const { plan } = useSubscription();

  const [musicVolume, setMusicVolume] = useState(70);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [syncOffset, setSyncOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [backingTrackAvailable, setBackingTrackAvailable] = useState(true);
  const [backingTrackError, setBackingTrackError] = useState<string | null>(null);

  const isPremium = plan === 'premium';

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
    const loadTracks = async () => {
      try {
        await studioAudioEngine.configureAudioMode();

        const recordedUri = studioAudioEngine.getRecordedUri();
        if (recordedUri) {
          await studioAudioEngine.loadVoiceTrack(recordedUri);
        }

        if (currentProject?.backgroundTrackUri) {
          const audioUri = getAudioUri(currentProject.backgroundTrackUri);
          if (audioUri) {
            try {
              await studioAudioEngine.loadBackingTrack(audioUri);
              setBackingTrackAvailable(true);
              setBackingTrackError(null);
            } catch (e) {
              console.error("Failed to load backing track:", e);
              setBackingTrackAvailable(false);
              setBackingTrackError("Failed to load backing track");
            }
          } else {
            setBackingTrackAvailable(false);
            setBackingTrackError("Demo audio only available in web preview. Music track unavailable in mix.");
          }
        } else {
          setBackingTrackAvailable(false);
        }

        setMusicVolume(studioAudioEngine.getMusicVolume());
        setVoiceVolume(studioAudioEngine.getVoiceVolume());
        setSyncOffset(studioAudioEngine.getSyncOffset());
        setDuration(studioAudioEngine.getDuration());
        setIsLoaded(true);

        studioAudioEngine.setProgressCallback((pos, dur) => {
          setPosition(pos);
          setDuration(dur);
          if (pos >= dur && dur > 0) {
            setIsPlaying(false);
          }
        });
      } catch (error) {
        console.error("Failed to load tracks:", error);
      }
    };

    loadTracks();

    return () => {
      studioAudioEngine.setProgressCallback(null);
    };
  }, [currentProject]);

  const handlePlayPreview = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isPlaying) {
      await studioAudioEngine.pauseMix();
      setIsPlaying(false);
    } else {
      await studioAudioEngine.playMix();
      setIsPlaying(true);
    }
  };

  const handleStopPreview = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await studioAudioEngine.stopMix();
    setIsPlaying(false);
    setPosition(0);
  };

  const handleMusicVolumeChange = (value: number) => {
    setMusicVolume(value);
    studioAudioEngine.setMusicVolume(value);
    
    if (currentProject) {
      updateProject(currentProject.id, { musicVolume: value });
    }
  };

  const handleVoiceVolumeChange = (value: number) => {
    setVoiceVolume(value);
    studioAudioEngine.setVoiceVolume(value);
    
    if (currentProject) {
      updateProject(currentProject.id, { voiceVolume: value });
    }
  };

  const handleSyncOffsetChange = (value: number) => {
    const roundedValue = Math.round(value / 10) * 10;
    setSyncOffset(roundedValue);
    studioAudioEngine.setSyncOffset(roundedValue);
  };

  const handleSeek = async (value: number) => {
    const seekPosition = value * duration;
    await studioAudioEngine.seekMix(seekPosition);
    setPosition(seekPosition);
  };

  const handleTrimPress = () => {
    if (!isPremium) {
      Alert.alert(
        "Premium Feature",
        "Upgrade to Premium to unlock audio trimming.",
        [{ text: "OK" }]
      );
      return;
    }
    
    Alert.alert(
      "Trim Audio",
      "Audio trimming feature is coming soon. You'll be able to remove silence from the start and end of your recording.",
      [{ text: "OK" }]
    );
  };

  const handleContinue = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (isPlaying) {
      await studioAudioEngine.stopMix();
      setIsPlaying(false);
    }
    
    navigation.navigate("Effects", { recordingId: route.params.recordingId });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getSyncOffsetLabel = () => {
    if (syncOffset === 0) return "In sync";
    if (syncOffset > 0) return `Voice ${syncOffset}ms late`;
    return `Voice ${Math.abs(syncOffset)}ms early`;
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + 180 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {backingTrackError ? (
          <GlassCard style={styles.warningCard}>
            <View style={styles.warningContent}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={theme.warning} />
              <View style={styles.warningText}>
                <ThemedText type="body" style={{ fontWeight: "600", color: theme.warning }}>
                  Music Track Unavailable
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {backingTrackError}
                </ThemedText>
              </View>
            </View>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.waveformCard}>
          <View style={styles.waveformHeader}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Preview {!backingTrackAvailable ? "(Voice Only)" : ""}
            </ThemedText>
            <View style={styles.playControls}>
              <Pressable
                onPress={handleStopPreview}
                style={[styles.controlButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <MaterialCommunityIcons name="stop" size={18} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={handlePlayPreview}
                style={[styles.playButton, { backgroundColor: theme.primary }]}
              >
                <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
          
          <View style={styles.waveformRow}>
            <View style={backingTrackAvailable ? styles.waveformTrack : styles.waveformTrackDisabled}>
              <View style={styles.trackLabel}>
                <MaterialCommunityIcons name="music" size={12} color={backingTrackAvailable ? theme.primary : theme.textTertiary} />
                <ThemedText type="caption" style={{ marginLeft: Spacing.xs, color: backingTrackAvailable ? theme.textSecondary : theme.textTertiary }}>
                  Music ({backingTrackAvailable ? `${musicVolume}%` : "N/A"})
                </ThemedText>
              </View>
              <AudioWaveform
                isAnimating={isPlaying && backingTrackAvailable}
                barCount={40}
                barWidth={2}
                height={32}
                color={backingTrackAvailable ? theme.primary : theme.textTertiary}
              />
            </View>
            <View style={styles.waveformTrack}>
              <View style={styles.trackLabel}>
                <MaterialCommunityIcons name="microphone" size={12} color={theme.secondary} />
                <ThemedText type="caption" style={{ marginLeft: Spacing.xs, color: theme.textSecondary }}>
                  Voice ({voiceVolume}%)
                </ThemedText>
              </View>
              <AudioWaveform
                isAnimating={isPlaying}
                barCount={40}
                barWidth={2}
                height={32}
                color={theme.secondary}
              />
            </View>
          </View>

          <View style={styles.progressContainer}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {formatTime(position)}
            </ThemedText>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: theme.primary,
                    width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
                  }
                ]} 
              />
            </View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {formatTime(duration)}
            </ThemedText>
          </View>
        </GlassCard>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Balance
          </ThemedText>
          <ThemedText type="small" style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Adjust the mix between music and voice in real-time
          </ThemedText>

          <View style={styles.slidersRow}>
            <VolumeSlider
              label="Music"
              value={musicVolume}
              onValueChange={handleMusicVolumeChange}
              icon="music"
            />
            <VolumeSlider
              label="Voice"
              value={voiceVolume}
              onValueChange={handleVoiceVolumeChange}
              icon="microphone"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Sync Adjustment
            </ThemedText>
            <View style={[styles.syncBadge, { backgroundColor: theme.primary + "20" }]}>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                {getSyncOffsetLabel()}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Fine-tune the timing between music and voice (-200ms to +200ms)
          </ThemedText>

          <View style={styles.syncSliderContainer}>
            <View style={styles.syncLabels}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Voice Early</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Voice Late</ThemedText>
            </View>
            <Slider
              style={styles.syncSlider}
              value={syncOffset}
              onValueChange={handleSyncOffsetChange}
              minimumValue={-200}
              maximumValue={200}
              step={10}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.backgroundTertiary}
              thumbTintColor={theme.primary}
            />
            <View style={styles.syncMarkers}>
              <ThemedText type="caption" style={{ color: theme.textTertiary }}>-200ms</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600" }}>0</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textTertiary }}>+200ms</ThemedText>
            </View>
          </View>
        </View>

        <Pressable onPress={handleTrimPress}>
          <GlassCard style={isPremium ? styles.trimCard : styles.trimCardLocked}>
            <View style={styles.trimHeader}>
              <View style={styles.trimTitleRow}>
                <MaterialCommunityIcons name="content-cut" size={18} color={isPremium ? theme.primary : theme.textSecondary} />
                <ThemedText type="body" style={[styles.trimTitle, { color: isPremium ? theme.text : theme.textSecondary }]}>
                  Trim Audio
                </ThemedText>
              </View>
              {!isPremium ? (
                <View style={[styles.premiumBadge, { backgroundColor: theme.warning + "20" }]}>
                  <MaterialCommunityIcons name="crown" size={12} color={theme.warning} />
                  <ThemedText type="caption" style={{ color: theme.warning, marginLeft: 4 }}>Premium</ThemedText>
                </View>
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
              )}
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Remove silence from the start and end
            </ThemedText>
          </GlassCard>
        </Pressable>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 80, backgroundColor: theme.surfaceContainer }]}>
        <Pressable
          onPress={handleContinue}
          style={[styles.continueButton, { backgroundColor: theme.primary }]}
        >
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            Continue to Effects
          </ThemedText>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.horizontalPadding,
  },
  warningCard: {
    marginBottom: Spacing.lg,
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  warningText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  waveformCard: {
    marginBottom: Layout.sectionGap,
  },
  waveformHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  playControls: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  waveformRow: {
    gap: Spacing.md,
  },
  waveformTrack: {
    marginBottom: Spacing.sm,
  },
  waveformTrackDisabled: {
    marginBottom: Spacing.sm,
    opacity: 0.5,
  },
  trackLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(128,128,128,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  section: {
    marginBottom: Layout.sectionGap,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionDesc: {
    marginBottom: Spacing.xl,
  },
  slidersRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  syncBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  syncSliderContainer: {
    paddingHorizontal: Spacing.sm,
  },
  syncSlider: {
    width: "100%",
    height: 40,
  },
  syncLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  syncMarkers: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trimCard: {
    marginBottom: Spacing.xl,
  },
  trimCardLocked: {
    marginBottom: Spacing.xl,
    opacity: 0.7,
  },
  trimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  trimTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  trimTitle: {
    marginLeft: Spacing.sm,
    fontWeight: "600",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Layout.horizontalPadding,
    paddingTop: Spacing.lg,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
});
