import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { FluentText, FluentSurface } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { VolumeSlider } from "@/components/VolumeSlider";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useStudioContext } from "@/contexts/StudioContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { FluentSpacing, FluentControlRadius, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";
import { studioAudioEngine } from "@/services/StudioAudioEngine";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type MixingRouteProp = RouteProp<CreateStackParamList, "Mixing">;

export default function MixingScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MixingRouteProp>();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
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
    <FluentSurface style={styles.container} background="neutral1">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + FluentSpacing.l, paddingBottom: insets.bottom + 180 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {backingTrackError ? (
          <GlassCard style={styles.warningCard}>
            <View style={styles.warningContent}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.colorPaletteYellowForeground1} />
              <View style={styles.warningText}>
                <FluentText variant="body1" color="warning" style={{ fontWeight: "600" }}>
                  Music Track Unavailable
                </FluentText>
                <FluentText variant="body2" color="secondary">
                  {backingTrackError}
                </FluentText>
              </View>
            </View>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.waveformCard}>
          <View style={styles.waveformHeader}>
            <FluentText variant="body1" style={{ fontWeight: "600" }}>
              Preview {!backingTrackAvailable ? "(Voice Only)" : ""}
            </FluentText>
            <View style={styles.playControls}>
              <Pressable
                onPress={handleStopPreview}
                style={[styles.controlButton, { backgroundColor: colors.colorNeutralBackground2 }]}
              >
                <MaterialCommunityIcons name="stop" size={18} color={colors.colorNeutralForeground1} />
              </Pressable>
              <Pressable
                onPress={handlePlayPreview}
                style={[styles.playButton, { backgroundColor: colors.colorBrandBackground }]}
              >
                <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
          
          <View style={styles.waveformRow}>
            <View style={backingTrackAvailable ? styles.waveformTrack : styles.waveformTrackDisabled}>
              <View style={styles.trackLabel}>
                <MaterialCommunityIcons name="music" size={12} color={backingTrackAvailable ? colors.colorBrandForeground1 : colors.colorNeutralForeground3} />
                <FluentText variant="caption" color={backingTrackAvailable ? "secondary" : "tertiary"} style={{ marginLeft: FluentSpacing.xs }}>
                  Music ({backingTrackAvailable ? `${musicVolume}%` : "N/A"})
                </FluentText>
              </View>
              <AudioWaveform
                isAnimating={isPlaying && backingTrackAvailable}
                barCount={40}
                barWidth={2}
                height={32}
                color={backingTrackAvailable ? colors.colorBrandForeground1 : colors.colorNeutralForeground3}
              />
            </View>
            <View style={styles.waveformTrack}>
              <View style={styles.trackLabel}>
                <MaterialCommunityIcons name="microphone" size={12} color={colors.colorBrandForeground2} />
                <FluentText variant="caption" color="secondary" style={{ marginLeft: FluentSpacing.xs }}>
                  Voice ({voiceVolume}%)
                </FluentText>
              </View>
              <AudioWaveform
                isAnimating={isPlaying}
                barCount={40}
                barWidth={2}
                height={32}
                color={colors.colorBrandForeground2}
              />
            </View>
          </View>

          <View style={styles.progressContainer}>
            <FluentText variant="caption" color="secondary">
              {formatTime(position)}
            </FluentText>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: colors.colorBrandForeground1,
                    width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
                  }
                ]} 
              />
            </View>
            <FluentText variant="caption" color="secondary">
              {formatTime(duration)}
            </FluentText>
          </View>
        </GlassCard>

        <View style={styles.section}>
          <FluentText variant="subtitle1" style={styles.sectionTitle}>
            Balance
          </FluentText>
          <FluentText variant="body2" color="secondary" style={styles.sectionDesc}>
            Adjust the mix between music and voice in real-time
          </FluentText>

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
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Sync Adjustment
            </FluentText>
            <View style={[styles.syncBadge, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
              <FluentText variant="caption" color="brand" style={{ fontWeight: "600" }}>
                {getSyncOffsetLabel()}
              </FluentText>
            </View>
          </View>
          <FluentText variant="body2" color="secondary" style={styles.sectionDesc}>
            Fine-tune the timing between music and voice (-200ms to +200ms)
          </FluentText>

          <View style={styles.syncSliderContainer}>
            <View style={styles.syncLabels}>
              <FluentText variant="caption" color="secondary">Voice Early</FluentText>
              <FluentText variant="caption" color="secondary">Voice Late</FluentText>
            </View>
            <Slider
              style={styles.syncSlider}
              value={syncOffset}
              onValueChange={handleSyncOffsetChange}
              minimumValue={-200}
              maximumValue={200}
              step={10}
              minimumTrackTintColor={colors.colorBrandForeground1}
              maximumTrackTintColor={colors.colorNeutralBackground4}
              thumbTintColor={colors.colorBrandForeground1}
            />
            <View style={styles.syncMarkers}>
              <FluentText variant="caption" color="tertiary">-200ms</FluentText>
              <FluentText variant="caption" color="secondary" style={{ fontWeight: "600" }}>0</FluentText>
              <FluentText variant="caption" color="tertiary">+200ms</FluentText>
            </View>
          </View>
        </View>

        <Pressable onPress={handleTrimPress}>
          <GlassCard style={isPremium ? styles.trimCard : styles.trimCardLocked}>
            <View style={styles.trimHeader}>
              <View style={styles.trimTitleRow}>
                <MaterialCommunityIcons name="content-cut" size={18} color={isPremium ? colors.colorBrandForeground1 : colors.colorNeutralForeground2} />
                <FluentText variant="body1" color={isPremium ? "primary" : "secondary"} style={styles.trimTitle}>
                  Trim Audio
                </FluentText>
              </View>
              {!isPremium ? (
                <View style={[styles.premiumBadge, { backgroundColor: colors.colorPaletteYellowForeground1 + "20" }]}>
                  <MaterialCommunityIcons name="crown" size={12} color={colors.colorPaletteYellowForeground1} />
                  <FluentText variant="caption" color="warning" style={{ marginLeft: 4 }}>Premium</FluentText>
                </View>
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.colorNeutralForeground2} />
              )}
            </View>
            <FluentText variant="body2" color="secondary">
              Remove silence from the start and end
            </FluentText>
          </GlassCard>
        </Pressable>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 80, backgroundColor: colors.colorNeutralBackground2 }]}>
        <Pressable
          onPress={handleContinue}
          style={[styles.continueButton, { backgroundColor: colors.colorBrandBackground }]}
        >
          <FluentText variant="body1" color="onBrand" style={{ fontWeight: "600" }}>
            Continue to Effects
          </FluentText>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </FluentSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: FluentSpacing.l,
  },
  warningCard: {
    marginBottom: FluentSpacing.l,
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  warningText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  waveformCard: {
    marginBottom: FluentSpacing.xxl,
  },
  waveformHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: FluentSpacing.l,
  },
  playControls: {
    flexDirection: "row",
    gap: FluentSpacing.s,
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
    gap: FluentSpacing.m,
  },
  waveformTrack: {
    marginBottom: FluentSpacing.s,
  },
  waveformTrackDisabled: {
    marginBottom: FluentSpacing.s,
    opacity: 0.5,
  },
  trackLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xs,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: FluentSpacing.m,
    gap: FluentSpacing.s,
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
    marginBottom: FluentSpacing.xxl,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: FluentSpacing.xs,
  },
  sectionTitle: {
    marginBottom: FluentSpacing.xs,
  },
  sectionDesc: {
    marginBottom: FluentSpacing.xl,
  },
  slidersRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  syncBadge: {
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
  },
  syncSliderContainer: {
    paddingHorizontal: FluentSpacing.s,
  },
  syncSlider: {
    width: "100%",
    height: 40,
  },
  syncLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: FluentSpacing.xs,
  },
  syncMarkers: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trimCard: {
    marginBottom: FluentSpacing.xl,
  },
  trimCardLocked: {
    marginBottom: FluentSpacing.xl,
    opacity: 0.7,
  },
  trimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: FluentSpacing.s,
  },
  trimTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  trimTitle: {
    marginLeft: FluentSpacing.s,
    fontWeight: "600",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: FluentSpacing.l,
    paddingTop: FluentSpacing.l,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
    gap: FluentSpacing.s,
  },
});
