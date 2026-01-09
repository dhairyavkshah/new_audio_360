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
import { Layout, Spacing, BorderRadius, M3Motion, M3Shape, M3Elevation, FluentShadow, Typography } from "@/constants/theme";

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

  const shadowStyle = !transparent ? Platform.select({
    ios: {
      shadowColor: FluentShadow.shadow2.key.color,
      shadowOffset: { width: FluentShadow.shadow2.key.x, height: FluentShadow.shadow2.key.y },
      shadowOpacity: 1,
      shadowRadius: FluentShadow.shadow2.key.blur,
    },
    android: {
      elevation: FluentShadow.shadow2.elevation,
    },
    default: {
      boxShadow: FluentShadow.shadow2.combined,
    },
  }) : {};

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: transparent ? "transparent" : theme.surface,
          borderBottomColor: transparent ? "transparent" : theme.outlineVariant,
        },
        shadowStyle,
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
            type="title4" 
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
      duration: M3Motion.durationShort3,
      easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
    });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withTiming(1, { 
      duration: M3Motion.durationShort4,
      easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
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
      borderWidth: 2,
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
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  badge?: number;
  label: string;
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
      duration: M3Motion.durationShort3,
      easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
    });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withTiming(1, { 
      duration: M3Motion.durationShort4,
      easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
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
      borderWidth: 2,
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
      accessibilityLabel={label}
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
    borderBottomWidth: 1,
  },
  content: {
    height: Layout.topBarHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.l,
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
    width: 48,
    height: 48,
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
