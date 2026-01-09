import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, Dimensions } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentText, FluentSurface } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { EffectChip } from "@/components/EffectChip";
import { AudioWaveform } from "@/components/AudioWaveform";
import { ProgressBar } from "@/components/ProgressBar";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useStudioContext, REVERB_PRESETS, NOISE_REDUCTION_LEVELS } from "@/contexts/StudioContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";
import { studioAudioEngine } from "@/services/StudioAudioEngine";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type EffectsRouteProp = RouteProp<CreateStackParamList, "Effects">;

export default function EffectsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EffectsRouteProp>();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { selectedReverb, noiseReduction, setSelectedReverb, setNoiseReduction } = useStudioContext();
  const { isNoiseReductionUnlocked, isReverbUnlocked } = useSubscription();

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setDuration(studioAudioEngine.getDuration());
    
    studioAudioEngine.setProgressCallback((pos, dur) => {
      setPosition(pos);
      setDuration(dur);
      if (pos >= dur && dur > 0) {
        setIsPlaying(false);
      }
    });

    return () => {
      studioAudioEngine.setProgressCallback(null);
      studioAudioEngine.stopMix();
    };
  }, []);

  const handleNoiseReductionSelect = (level: typeof noiseReduction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isNoiseReductionUnlocked(level)) {
      return;
    }
    setNoiseReduction(level);
  };

  const handleReverbSelect = (reverb: typeof selectedReverb) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isReverbUnlocked(reverb)) {
      return;
    }
    setSelectedReverb(reverb);
  };

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

  const handleRestart = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await studioAudioEngine.restartMix();
    setIsPlaying(true);
  };

  const handleSeek = async (timeInSeconds: number) => {
    const positionMs = timeInSeconds * 1000;
    await studioAudioEngine.seekMix(positionMs);
  };

  const handleContinue = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (isPlaying) {
      await studioAudioEngine.stopMix();
      setIsPlaying(false);
    }
    
    navigation.navigate("Save", { recordingId: route.params.recordingId });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <FluentSurface style={styles.container} background="neutral1">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + FluentSpacing.xl, paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View>
              <FluentText variant="body1" style={{ fontWeight: "600" }}>
                Effect Preview
              </FluentText>
              <FluentText variant="body2" color="secondary">
                Reverb: {selectedReverb} • Noise: {noiseReduction}
              </FluentText>
            </View>
            <Pressable
              onPress={handlePlayPreview}
              style={[styles.playButton, { backgroundColor: colors.colorBrandBackground }]}
            >
              <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={FluentIconSize.regular} color="#FFFFFF" />
            </Pressable>
          </View>
          <AudioWaveform
            isAnimating={isPlaying}
            barCount={50}
            barWidth={3}
            height={60}
            color={colors.colorBrandForeground2}
          />
        </GlassCard>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="volume-off" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Noise Reduction
            </FluentText>
          </View>
          <FluentText variant="body2" color="secondary" style={styles.sectionDesc}>
            Reduce background noise from your recording
          </FluentText>
          <View style={styles.effectsContainer}>
            {NOISE_REDUCTION_LEVELS.map((level) => (
              <EffectChip
                key={level}
                label={level}
                isSelected={noiseReduction === level}
                isLocked={!isNoiseReductionUnlocked(level)}
                onPress={() => handleNoiseReductionSelect(level)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="waveform" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
            <FluentText variant="subtitle1" style={styles.sectionTitle}>
              Reverb
            </FluentText>
          </View>
          <FluentText variant="body2" color="secondary" style={styles.sectionDesc}>
            Add space and depth to your voice
          </FluentText>
          <View style={styles.effectsContainer}>
            {REVERB_PRESETS.map((reverb) => (
              <EffectChip
                key={reverb}
                label={reverb}
                isSelected={selectedReverb === reverb}
                isLocked={!isReverbUnlocked(reverb)}
                onPress={() => handleReverbSelect(reverb)}
              />
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleContinue}
          style={[styles.continueButton, { backgroundColor: colors.colorBrandBackground }]}
        >
          <FluentText variant="body1" color="onBrand" style={{ fontWeight: "600" }}>
            Save Recording
          </FluentText>
          <MaterialCommunityIcons name="arrow-right" size={FluentIconSize.regular} color="#FFFFFF" />
        </Pressable>
      </ScrollView>
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
  previewCard: {
    marginBottom: FluentSpacing.xl,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: FluentSpacing.l,
  },
  playButton: {
    width: FluentSpacing.xxxxxl,
    height: FluentSpacing.xxxxxl,
    borderRadius: FluentSpacing.xxl,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: FluentSpacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xs,
  },
  sectionTitle: {
    marginLeft: FluentSpacing.s,
  },
  sectionDesc: {
    marginBottom: FluentSpacing.l,
  },
  effectsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.s,
    marginTop: FluentSpacing.l,
  },
});
