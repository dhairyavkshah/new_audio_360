import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";

const FEATURES = [
  { icon: "music-note", text: "Full music playback" },
  { icon: "palette", text: "All 55 themes included" },
  { icon: "tune-vertical", text: "All equalizer presets" },
  { icon: "headphones", text: "All immersive modes" },
  { icon: "infinity", text: "Unlimited usage" },
];

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = Layout.bottomNavHeight + insets.bottom;
  }
  const { theme } = useThemeContext();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const handleSupportDeveloper = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("SupportDeveloper");
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.sm, paddingBottom: tabBarHeight + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <GlassCard style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={[styles.planBadge, { backgroundColor: theme.success }]}>
              <MaterialCommunityIcons name="check-decagram" size={16} color="#FFFFFF" />
              <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing["2xs"] }}>
                ACTIVE
              </ThemedText>
            </View>
          </View>

          <View style={styles.planInfo}>
            <ThemedText type="h4" style={{ fontWeight: "700" }}>
              Standard Plan
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing["2xs"] }}>
              Free forever
            </ThemedText>
          </View>

          <View style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <MaterialCommunityIcons
                  name={feature.icon as any}
                  size={18}
                  color={theme.success}
                />
                <ThemedText type="small" style={styles.featureText}>
                  {feature.text}
                </ThemedText>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.supportCard}>
          <View style={styles.supportContent}>
            <MaterialCommunityIcons name="heart" size={28} color={theme.error} />
            <View style={styles.supportText}>
              <ThemedText type="body" style={{ fontWeight: "700" }}>
                Love the app?
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing["2xs"] }}>
                Help us keep it free and growing by supporting the developer
              </ThemedText>
            </View>
          </View>

          <Pressable
            onPress={handleSupportDeveloper}
            style={[styles.supportButton, { backgroundColor: theme.primary }]}
          >
            <MaterialCommunityIcons name="gift-outline" size={18} color="#FFFFFF" />
            <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.xs }}>
              Support the Developer
            </ThemedText>
          </Pressable>
        </GlassCard>

        <ThemedText
          type="caption"
          style={[styles.disclaimer, { color: theme.textSecondary }]}
        >
          New Audio 360 is free to use with all features included. If you enjoy the app, consider supporting the developer with a voluntary donation.
        </ThemedText>
      </ScrollView>
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
  planCard: {
    marginBottom: Spacing.lg,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: Spacing.sm,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing["2xs"],
    borderRadius: BorderRadius.full,
  },
  planInfo: {
    marginBottom: Spacing.md,
  },
  featuresContainer: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    marginLeft: Spacing.sm,
  },
  supportCard: {
    marginBottom: Spacing.lg,
  },
  supportContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  supportText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  disclaimer: {
    textAlign: "center",
  },
});
