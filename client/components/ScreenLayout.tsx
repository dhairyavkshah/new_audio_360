import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemedView } from "@/components/ThemedView";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentSpacing } from "@/constants/fluent2";

interface ScreenLayoutProps {
  children: ReactNode;
  hasHeader?: boolean;
  hasTabBar?: boolean;
  hasBottomControls?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  mode?: "listen" | "create";
}

const HEADER_FALLBACK_HEIGHT = 56;

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
    headerHeight = hasHeader ? HEADER_FALLBACK_HEIGHT + insets.top : 0;
  }
  
  const tabBarHeight = useSafeTabBarHeight();

  const topPadding = hasHeader 
    ? headerHeight + FluentSpacing.l 
    : insets.top + FluentSpacing.l;
    
  const bottomPadding = hasTabBar
    ? (hasBottomControls ? tabBarHeight + FluentSpacing.xxl : tabBarHeight + FluentSpacing.l)
    : (hasBottomControls ? insets.bottom + FluentSpacing.xxl : insets.bottom + FluentSpacing.l);

  return (
    <ThemedView style={[styles.container, style]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
            paddingHorizontal: FluentSpacing.l,
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
    marginBottom: FluentSpacing.xxl,
  },
});
