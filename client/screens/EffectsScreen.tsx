import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { EffectChip } from "@/components/EffectChip";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useStudioContext, REVERB_PRESETS, NOISE_REDUCTION_LEVELS } from "@/contexts/StudioContext";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { Spacing, BorderRadius } from "@/constants/theme";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type EffectsRouteProp = RouteProp<CreateStackParamList, "Effects">;

export default function EffectsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EffectsRouteProp>();
  const { theme } = useThemeContext();
  const { selectedReverb, noiseReduction, setSelectedReverb, setNoiseReduction } = useStudioContext();

  const [isPlaying, setIsPlaying] = useState(false);

  const handleNoiseReductionSelect = (level: typeof noiseReduction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNoiseReduction(level);
  };

  const handleReverbSelect = (reverb: typeof selectedReverb) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReverb(reverb);
  };

  const handlePlayPreview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPlaying(!isPlaying);
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Save", { recordingId: route.params.recordingId });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Effect Preview
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Reverb: {selectedReverb} • Noise: {noiseReduction}
              </ThemedText>
            </View>
            <Pressable
              onPress={handlePlayPreview}
              style={[styles.playButton, { backgroundColor: theme.primary }]}
            >
              <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <AudioWaveform
            isAnimating={isPlaying}
            barCount={50}
            barWidth={3}
            height={60}
            color={theme.secondary}
          />
        </GlassCard>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="volume-off" size={20} color={theme.primary} />
            <ThemedText type="h4" style={styles.sectionTitle}>
              Noise Reduction
            </ThemedText>
          </View>
          <ThemedText type="small" style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Reduce background noise from your recording
          </ThemedText>
          <View style={styles.effectsContainer}>
            {NOISE_REDUCTION_LEVELS.map((level) => (
              <EffectChip
                key={level}
                label={level}
                isSelected={noiseReduction === level}
                onPress={() => handleNoiseReductionSelect(level)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="waveform" size={20} color={theme.primary} />
            <ThemedText type="h4" style={styles.sectionTitle}>
              Reverb
            </ThemedText>
          </View>
          <ThemedText type="small" style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Add space and depth to your voice
          </ThemedText>
          <View style={styles.effectsContainer}>
            {REVERB_PRESETS.map((reverb) => (
              <EffectChip
                key={reverb}
                label={reverb}
                isSelected={selectedReverb === reverb}
                onPress={() => handleReverbSelect(reverb)}
              />
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleContinue}
          style={[styles.continueButton, { backgroundColor: theme.primary }]}
        >
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            Save Recording
          </ThemedText>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  previewCard: {
    marginBottom: Spacing.xl,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    marginLeft: Spacing.sm,
  },
  sectionDesc: {
    marginBottom: Spacing.lg,
  },
  effectsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
});
