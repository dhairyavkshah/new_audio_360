import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useThemeContext } from "@/contexts/ThemeContext";
import { ThemeName } from "@/constants/theme";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentFontWeight } from "@/constants/fluent2";

function SectionHeader({ title, isDark }: { title: string; isDark: boolean }) {
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  return (
    <FluentText 
      variant="caption2" 
      style={[styles.sectionHeader, { color: colors.colorNeutralForeground2, fontWeight: FluentFontWeight.medium }]}
    >
      {title.toUpperCase()}
    </FluentText>
  );
}

function SectionCard({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
      {children}
    </View>
  );
}

export default function AppearanceScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const { themeName, setThemeName, isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const handleThemeChange = (newTheme: ThemeName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeName(newTheme);
  };

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + FluentSpacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <SectionHeader title="Themes" isDark={isDark} />
        <SectionCard isDark={isDark}>
          <View style={styles.descriptionContainer}>
            <FluentText variant="caption1" color="secondary">
              Choose a theme that matches your style. Your selection is saved automatically.
            </FluentText>
          </View>
        </SectionCard>

        <View style={styles.themeSelectorContainer}>
          <ThemeSelector currentTheme={themeName} onThemeChange={handleThemeChange} />
        </View>
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: FluentSpacing.l,
  },
  sectionHeader: {
    paddingLeft: FluentSpacing.l,
    paddingTop: FluentSpacing.s,
    paddingBottom: FluentSpacing.s,
    marginTop: FluentSpacing.xxl,
  },
  sectionCard: {
    marginHorizontal: FluentSpacing.l,
    borderRadius: FluentRadius.xLarge,
    overflow: "hidden",
  },
  descriptionContainer: {
    padding: FluentSpacing.l,
  },
  themeSelectorContainer: {
    marginTop: FluentSpacing.l,
    paddingHorizontal: FluentSpacing.l,
  },
});
