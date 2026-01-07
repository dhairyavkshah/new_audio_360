import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemedView } from "@/components/ThemedView";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { Layout, Spacing } from "@/constants/theme";

interface ScreenLayoutProps {
  children: ReactNode;
  hasHeader?: boolean;
  hasTabBar?: boolean;
  hasBottomControls?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  mode?: "listen" | "create";
}

export function ScreenLayout({
  children,
  hasHeader = true,
  hasTabBar = true,
  hasBottomControls = false,
  style,
  contentStyle,
  mode = "listen",
}: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  
  let headerHeight = 0;
  try {
    headerHeight = useHeaderHeight();
  } catch {
    headerHeight = hasHeader ? Layout.topBarHeight + insets.top : insets.top;
  }
  
  const tabBarHeight = useSafeTabBarHeight();

  const topPadding = hasHeader ? headerHeight + Spacing.l : insets.top + Layout.safeAreaPadding;
  const bottomPadding = hasBottomControls
    ? tabBarHeight + Spacing.xxl
    : tabBarHeight + Spacing.l;

  return (
    <ThemedView style={[styles.container, style]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
            paddingHorizontal: Layout.horizontalPadding,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </ThemedView>
  );
}

interface SectionProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function Section({ children, style }: SectionProps) {
  return (
    <View style={[styles.section, style]}>
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
  section: {
    marginBottom: Layout.sectionGap,
  },
});
