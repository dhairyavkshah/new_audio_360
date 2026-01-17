import React from "react";
import { StyleSheet, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useThemeContext } from "@/contexts/ThemeContext";
import { ThemeName } from "@/constants/theme";
import { FluentSpacing } from "@/constants/fluent2";

export default function AppearanceScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { themeName, setThemeName } = useThemeContext();

  const handleThemeChange = (newTheme: ThemeName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeName(newTheme);
  };

  return (
    <FluentScreenLayout edges={[]} hasBottomNavigation={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.m, paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <FluentText variant="caption2" color="secondary" style={styles.sectionDesc}>
          Choose a theme that matches your style. Your selection is saved automatically.
        </FluentText>

        <ThemeSelector currentTheme={themeName} onThemeChange={handleThemeChange} />
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: FluentSpacing.l,
  },
  sectionDesc: {
    marginBottom: FluentSpacing.m,
  },
});
