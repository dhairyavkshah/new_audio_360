import React from "react";
import { StyleSheet, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText, FluentSectionHeader } from "@/components/fluent";
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
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + FluentSpacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <FluentSectionHeader icon="palette-outline" title="Themes" />
        <FluentText variant="body2" color="secondary" style={styles.sectionDesc}>
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
    paddingTop: FluentSpacing.l,
  },
  sectionDesc: {
    marginBottom: FluentSpacing.m,
  },
});
