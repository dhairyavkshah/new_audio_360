import React from "react";
import { StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useThemeContext } from "@/contexts/ThemeContext";
import { ThemeName } from "@/constants/theme";
import { FluentSpacing } from "@/constants/fluent2";

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const { theme, themeName, setThemeName } = useThemeContext();

  const handleThemeChange = (newTheme: ThemeName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeName(newTheme);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.m, paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <ThemedText type="caption" style={[styles.sectionDesc, { color: theme.textSecondary }]}>
          Choose a theme that matches your style. Your selection is saved automatically.
        </ThemedText>

        <ThemeSelector currentTheme={themeName} onThemeChange={handleThemeChange} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: FluentSpacing.l,
  },
  sectionDesc: {
    marginBottom: FluentSpacing.m,
  },
});
