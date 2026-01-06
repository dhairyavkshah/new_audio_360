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
import { Spacing, BorderRadius, VoiceEffects } from "@/constants/theme";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type EffectsRouteProp = RouteProp<CreateStackParamList, "Effects">;

export default function EffectsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EffectsRouteProp>();
  const { theme } = useThemeContext();

  const [selectedEffect, setSelectedEffect] = useState<string>("Studio Clean");
  const [isPlaying, setIsPlaying] = useState(false);

  const handleEffectSelect = (effect: string, isPremium: boolean) => {
    if (isPremium) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEffect(effect);
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
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
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
                {selectedEffect}
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
            <MaterialCommunityIcons name="microphone" size={20} color={theme.primary} />
            <ThemedText type="h4" style={styles.sectionTitle}>
              Free Effects
            </ThemedText>
          </View>
          <ThemedText type="small" style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Natural voice enhancement
          </ThemedText>
          <View style={styles.effectsContainer}>
            {VoiceEffects.free.map((effect) => (
              <EffectChip
                key={effect}
                label={effect}
                isSelected={selectedEffect === effect}
                onPress={() => handleEffectSelect(effect, false)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="star" size={20} color={theme.primary} />
            <ThemedText type="h4" style={styles.sectionTitle}>
              Premium Effects
            </ThemedText>
            <View style={[styles.premiumBadge, { backgroundColor: theme.primary + "20" }]}>
              <MaterialCommunityIcons name="lock" size={10} color={theme.primary} />
            </View>
          </View>
          <ThemedText type="small" style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Studio-quality voice transformations
          </ThemedText>

          <ThemedText type="small" style={[styles.categoryLabel, { color: theme.textSecondary }]}>
            Studio Spaces
          </ThemedText>
          <View style={styles.effectsContainer}>
            {["Mini Studio", "Medium Studio", "Large Studio", "Concert Hall", "Cathedral"].map(
              (effect) => (
                <EffectChip
                  key={effect}
                  label={effect}
                  isSelected={selectedEffect === effect}
                  onPress={() => handleEffectSelect(effect, true)}
                  isPremium
                />
              )
            )}
          </View>

          <ThemedText type="small" style={[styles.categoryLabel, { color: theme.textSecondary }]}>
            Fun Effects
          </ThemedText>
          <View style={styles.effectsContainer}>
            {["Cave", "Bathroom", "Underwater", "Radio Voice", "Robot", "Helium"].map(
              (effect) => (
                <EffectChip
                  key={effect}
                  label={effect}
                  isSelected={selectedEffect === effect}
                  onPress={() => handleEffectSelect(effect, true)}
                  isPremium
                />
              )
            )}
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
  premiumBadge: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  categoryLabel: {
    fontWeight: "500",
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
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
