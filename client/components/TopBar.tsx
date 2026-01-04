import React, { useState, useRef } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Layout, Spacing, BorderRadius, Fluent2Tokens } from "@/constants/theme";

interface TopBarProps {
  title: string;
  showHome?: boolean;
  showBack?: boolean;
  actions?: React.ReactNode;
  transparent?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
          borderBottomColor: transparent ? "transparent" : theme.outlineVariant,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {shouldShowBack ? (
            <IconButton
              icon="arrow-left"
              onPress={handleBack}
              label="Go back"
              theme={theme}
            />
          ) : null}
          {showHome && !shouldShowBack ? (
            <IconButton
              icon="home-outline"
              onPress={handleHome}
              label="Go to home"
              theme={theme}
            />
          ) : null}
          <ThemedText 
            type="titleMedium" 
            style={[styles.title, { marginLeft: shouldShowBack || showHome ? 0 : Spacing.s }]}
          >
            {title}
          </ThemedText>
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

function IconButton({ 
  icon, 
  onPress, 
  label, 
  theme 
}: { 
  icon: keyof typeof MaterialCommunityIcons.glyphMap; 
  onPress: () => void; 
  label: string;
  theme: any;
}) {
  const scale = useSharedValue(1);
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    setIsPressed(true);
    scale.value = withTiming(0.95, { 
      duration: Fluent2Tokens.durationFast,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withTiming(1, { 
      duration: Fluent2Tokens.durationNormal,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handleHoverIn = () => {
    setHoverActive(true);
  };

  const handleHoverOut = () => {
    setHoverActive(false);
  };

  const getBackgroundColor = () => {
    if (isPressed) return theme.surfaceContainerHighest;
    if (hoverActive) return theme.surfaceContainerHigh;
    return theme.surfaceContainer;
  };

  const focusStyle = isFocused ? Platform.select({
    web: {
      outline: `2px solid ${theme.primary}`,
      outlineOffset: 2,
    },
    default: {
      borderWidth: Fluent2Tokens.strokeWidthThick,
      borderColor: theme.primary,
    },
  }) : {};

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[
        styles.iconButton, 
        { backgroundColor: getBackgroundColor() },
        focusStyle,
        animatedStyle,
      ]}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={theme.onSurface}
      />
    </AnimatedPressable>
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
  const scale = useSharedValue(1);
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const handlePressIn = () => {
    setIsPressed(true);
    scale.value = withTiming(0.95, { 
      duration: Fluent2Tokens.durationFast,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withTiming(1, { 
      duration: Fluent2Tokens.durationNormal,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handleHoverIn = () => {
    setHoverActive(true);
  };

  const handleHoverOut = () => {
    setHoverActive(false);
  };

  const getBackgroundColor = () => {
    if (isPressed) return theme.surfaceContainerHighest;
    if (hoverActive) return theme.surfaceContainerHigh;
    return theme.surfaceContainer;
  };

  const focusStyle = isFocused ? Platform.select({
    web: {
      outline: `2px solid ${theme.primary}`,
      outlineOffset: 2,
    },
    default: {
      borderWidth: Fluent2Tokens.strokeWidthThick,
      borderColor: theme.primary,
    },
  }) : {};

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[
        styles.iconButton, 
        { backgroundColor: getBackgroundColor() },
        focusStyle,
        animatedStyle,
      ]}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={24} color={theme.onSurface} />
      {badge && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.error }]}>
          <ThemedText style={styles.badgeText}>{badge > 99 ? "99+" : badge}</ThemedText>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: Fluent2Tokens.strokeWidthThin,
  },
  content: {
    height: Layout.topBarHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.horizontalPaddingMin,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.iconGap,
  },
  title: {
    flex: 1,
  },
  iconButton: {
    width: Layout.touchTargetMin,
    height: Layout.touchTargetMin,
    borderRadius: BorderRadius.button,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.iconGap,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
});
