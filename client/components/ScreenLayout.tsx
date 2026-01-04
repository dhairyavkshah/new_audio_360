import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { Fluent2 } from "@/constants/fluent2";

interface ScreenLayoutProps {
  children: ReactNode;
  hasHeader?: boolean;
  hasTabBar?: boolean;
  hasBottomControls?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function ScreenLayout({
  children,
  hasHeader = true,
  hasTabBar = true,
  hasBottomControls = false,
  style,
  contentStyle,
}: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useFluent2Theme();
  
  let headerHeight = 0;
  try {
    headerHeight = useHeaderHeight();
  } catch {
    headerHeight = hasHeader ? 56 + insets.top : insets.top;
  }
  
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = hasTabBar ? 80 + insets.bottom : insets.bottom;
  }

  const topPadding = hasHeader ? headerHeight + spacing.m : insets.top + spacing.m;
  const bottomPadding = hasBottomControls
    ? tabBarHeight + spacing.xl
    : tabBarHeight + spacing.m;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
            paddingHorizontal: spacing.m,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

interface SectionProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function Section({ children, style }: SectionProps) {
  const { spacing } = useFluent2Theme();
  
  return (
    <View style={[styles.section, { marginBottom: spacing.l }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {},
});
