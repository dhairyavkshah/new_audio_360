import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { VolumeSlider } from "@/components/VolumeSlider";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type MixingRouteProp = RouteProp<CreateStackParamList, "Mixing">;

export default function MixingScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MixingRouteProp>();
  const { theme } = useThemeContext();

  const [musicVolume, setMusicVolume] = useState(70);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPreview = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsPlaying(!isPlaying);
  };

  const handleContinue = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate("Effects", { recordingId: route.params.recordingId });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.waveformCard}>
          <View style={styles.waveformHeader}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Preview
            </ThemedText>
            <Pressable
              onPress={handlePlayPreview}
              style={[styles.playButton, { backgroundColor: theme.primary }]}
            >
              <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={styles.waveformRow}>
            <View style={styles.waveformTrack}>
              <View style={styles.trackLabel}>
                <MaterialCommunityIcons name="music" size={12} color={theme.primary} />
                <ThemedText type="caption" style={{ marginLeft: Spacing.xs, color: theme.textSecondary }}>
                  Music
                </ThemedText>
              </View>
              <AudioWaveform
                isAnimating={isPlaying}
                barCount={40}
                barWidth={2}
                height={32}
                color={theme.primary}
              />
            </View>
            <View style={styles.waveformTrack}>
              <View style={styles.trackLabel}>
                <MaterialCommunityIcons name="microphone" size={12} color={theme.secondary} />
                <ThemedText type="caption" style={{ marginLeft: Spacing.xs, color: theme.textSecondary }}>
                  Voice
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
        </GlassCard>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Balance
          </ThemedText>
          <ThemedText type="small" style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Adjust the mix between music and voice
          </ThemedText>

          <View style={styles.slidersRow}>
            <VolumeSlider
              label="Music"
              value={musicVolume}
              onValueChange={setMusicVolume}
              icon="music"
            />
            <VolumeSlider
              label="Voice"
              value={voiceVolume}
              onValueChange={setVoiceVolume}
              icon="microphone"
            />
          </View>
        </View>

        <GlassCard style={styles.trimCard}>
          <View style={styles.trimHeader}>
            <View style={styles.trimTitleRow}>
              <MaterialCommunityIcons name="content-cut" size={18} color={theme.textSecondary} />
              <ThemedText type="body" style={[styles.trimTitle, { color: theme.textSecondary }]}>
                Trim Audio
              </ThemedText>
            </View>
            <View style={[styles.premiumDot, { backgroundColor: theme.accent }]} />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Remove silence from the start and end
          </ThemedText>
        </GlassCard>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.surfaceContainer }]}>
        <Pressable
          onPress={handleContinue}
          style={[styles.continueButton, { backgroundColor: theme.primary }]}
        >
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            Continue
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
  waveformCard: {
    marginBottom: Layout.sectionGap,
  },
  waveformHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
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
  trackLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  section: {
    marginBottom: Layout.sectionGap,
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
  trimCard: {
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
  premiumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
