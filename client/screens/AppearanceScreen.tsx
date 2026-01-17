import React from "react";
import { StyleSheet, ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useThemeContext, useThemeTokens } from "@/contexts/ThemeContext";
import { ThemeName } from "@/constants/theme";
import { FluentSpacing } from "@/constants/fluent2";
import { getCardEffectStyle } from "@/lib/themeUtils";

export default function AppearanceScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { themeName, setThemeName } = useThemeContext();
  const tokens = useThemeTokens();

  const handleThemeChange = (newTheme: ThemeName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeName(newTheme);
  };

  const cardStyle = getCardEffectStyle(tokens);

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
        <View style={[
          styles.sectionCard,
          cardStyle,
          { padding: FluentSpacing.l, marginBottom: FluentSpacing.m }
        ]}>
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
  sectionCard: {},
  sectionHeader: {
    marginBottom: FluentSpacing.xs,
  },
  sectionDesc: {
    marginBottom: FluentSpacing.m,
  },
});
