import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Layout, Spacing, Typography } from "@/constants/theme";

interface TopBarProps {
  title: string;
  showHome?: boolean;
  showBack?: boolean;
  actions?: React.ReactNode;
  transparent?: boolean;
}

export function TopBar({
  title,
  showHome = false,
  showBack = true,
  actions,
  transparent = false,
}: TopBarProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useThemeContext();
  
  const canGoBack = navigation.canGoBack();
  const shouldShowBack = showBack && canGoBack;

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  };

  const handleHome = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.reset({
      index: 0,
      routes: [{ name: "ListenTab" as never }],
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: transparent ? "transparent" : theme.surfaceContainer,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {shouldShowBack ? (
            <Pressable
              onPress={handleBack}
              style={[styles.iconButton, { backgroundColor: theme.elevation1 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={theme.onSurface}
              />
            </Pressable>
          ) : null}
          {showHome && !shouldShowBack ? (
            <Pressable
              onPress={handleHome}
              style={[styles.iconButton, { backgroundColor: theme.elevation1 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons
                name="home-outline"
                size={24}
                color={theme.onSurface}
              />
            </Pressable>
          ) : null}
          <ThemedText style={[styles.title, { marginLeft: shouldShowBack || showHome ? Spacing.md : 0 }]}>
            {title}
          </ThemedText>
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

export function TopBarAction({
  icon,
  onPress,
  badge,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  badge?: number;
}) {
  const { theme } = useThemeContext();

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.iconButton, { backgroundColor: theme.elevation1 }]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <MaterialCommunityIcons name={icon} size={24} color={theme.onSurface} />
      {badge && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.error }]}>
          <ThemedText style={styles.badgeText}>{badge > 99 ? "99+" : badge}</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  content: {
    height: Layout.topBarHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.horizontalPadding,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  title: {
    fontSize: Typography.titleLarge.fontSize,
    fontWeight: Typography.titleLarge.fontWeight,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
