import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle, Platform, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useTheme } from "@/hooks/useTheme";
import { Layout, Spacing, SafeAreaSpacing } from "@/constants/theme";

interface ScreenLayoutProps {
  children: ReactNode;
  hasHeader?: boolean;
  withTabBar?: boolean;
  withMiniPlayer?: boolean;
  withKeyboard?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  scrollable?: boolean;
}

export function ScreenLayout({
  children,
  hasHeader = true,
  withTabBar = true,
  withMiniPlayer = true,
  withKeyboard = false,
  style,
  contentStyle,
  scrollable = false,
}: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  let headerHeight = 0;
  try {
    headerHeight = useHeaderHeight();
  } catch {
    headerHeight = hasHeader ? Layout.topBarHeight + insets.top : 0;
  }

  const topPadding = hasHeader
    ? headerHeight + Spacing.l
    : Math.max(insets.top, SafeAreaSpacing.top) + Spacing.l;

  let bottomPadding = Math.max(insets.bottom, SafeAreaSpacing.bottom);
  if (withTabBar) {
    bottomPadding += Layout.bottomNavHeight;
  }
  if (withMiniPlayer) {
    bottomPadding += Layout.miniPlayerHeight + Layout.miniPlayerGapFromNav;
  }
  bottomPadding += Spacing.l;

  const horizontalPadding = Math.max(
    insets.left,
    insets.right,
    SafeAreaSpacing.horizontal,
    Spacing.l
  );

  const containerStyle = [
    styles.container,
    { backgroundColor: theme.backgroundRoot },
    style,
  ];

  const contentContainerStyle = [
    styles.content,
    {
      paddingTop: topPadding,
      paddingBottom: bottomPadding,
      paddingHorizontal: horizontalPadding,
    },
    contentStyle,
  ];

  if (withKeyboard) {
    if (Platform.OS === "web") {
      return (
        <View style={containerStyle}>
          <View style={contentContainerStyle}>{children}</View>
        </View>
      );
    }

    if (scrollable) {
      return (
        <View style={containerStyle}>
          <KeyboardAwareScrollView
            style={styles.keyboardAware}
            contentContainerStyle={contentContainerStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </KeyboardAwareScrollView>
        </View>
      );
    }

    return (
      <View style={containerStyle}>
        <KeyboardAvoidingView
          style={styles.keyboardAware}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={headerHeight}
        >
          <View style={contentContainerStyle}>{children}</View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <View style={contentContainerStyle}>{children}</View>
    </View>
  );
}

interface SectionProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function Section({ children, style }: SectionProps) {
  return <View style={[styles.section, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  keyboardAware: {
    flex: 1,
  },
  section: {
    marginBottom: Layout.sectionGap,
  },
});
