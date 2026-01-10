import React from "react";
import { StyleSheet, ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useThemeContext } from "@/contexts/ThemeContext";
import { ThemeName } from "@/constants/theme";
import { FluentSpacing, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";

export default function AppearanceScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { themeName, setThemeName, isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

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
        <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
          <FluentText variant="subtitle1" style={styles.sectionHeader}>
            Themes
          </FluentText>
          <FluentText variant="body2" color="secondary" style={styles.sectionDesc}>
            Choose a theme that matches your style. Your selection is saved automatically.
          </FluentText>

          <ThemeSelector currentTheme={themeName} onThemeChange={handleThemeChange} />
        </View>
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: FluentSpacing.l,
  },
  sectionCard: {
    borderRadius: 12,
    padding: FluentSpacing.l,
    marginBottom: FluentSpacing.m,
  },
  sectionHeader: {
    marginBottom: FluentSpacing.xs,
  },
  sectionDesc: {
    marginBottom: FluentSpacing.m,
  },
});
