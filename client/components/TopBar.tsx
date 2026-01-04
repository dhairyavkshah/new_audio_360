import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentText } from "@/components/fluent2";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { Fluent2 } from "@/constants/fluent2";

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
  const { colors, spacing, radius } = useFluent2Theme();
  
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
          backgroundColor: transparent ? "transparent" : colors.background,
        },
      ]}
    >
      <View style={[styles.content, { paddingHorizontal: spacing.m }]}>
        <View style={styles.leftSection}>
          {shouldShowBack && (
            <Pressable
              onPress={handleBack}
              style={[styles.iconButton, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.full }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
          )}
          {showHome && !shouldShowBack && (
            <Pressable
              onPress={handleHome}
              style={[styles.iconButton, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.full }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons
                name="home-outline"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
          )}
          <FluentText 
            variant="title2" 
            style={[styles.title, { marginLeft: shouldShowBack || showHome ? spacing.m : 0 }]}
          >
            {title}
          </FluentText>
        </View>
        {actions && <View style={[styles.actions, { gap: spacing.xs }]}>{actions}</View>}
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
  const { colors, radius } = useFluent2Theme();

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.iconButton, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.full }]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <MaterialCommunityIcons name={icon} size={24} color={colors.textPrimary} />
      {badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.statusDanger }]}>
          <FluentText variant="caption2" style={styles.badgeText}>{badge > 99 ? "99+" : badge}</FluentText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  content: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  title: {
    fontWeight: "700",
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
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
