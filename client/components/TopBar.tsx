import React, { useState, useRef } from "react";
import { View, StyleSheet, Pressable, Platform, Text } from "react-native";
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
import { Layout } from "@/constants/theme";
import {
  FluentSpacing,
  FluentIconSize,
  FluentTypography,
  FluentControlRadius,
  FluentDuration,
  FluentEasingValues,
  FluentLightColors,
  FluentDarkColors,
  getShadowStyle,
} from "@/constants/fluent2";

interface TopBarProps {
  title: string;
  titleSlot?: React.ReactNode;
  showHome?: boolean;
  showBack?: boolean;
  actions?: React.ReactNode;
  transparent?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TopBar({
  title,
  titleSlot,
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

  const { isDark } = useThemeContext();
  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;
  const shadowStyle = !transparent ? getShadowStyle('shadow4', isDark) : {};

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: transparent ? "transparent" : fluentColors.colorNeutralBackground1,
          borderBottomColor: transparent ? "transparent" : fluentColors.colorNeutralStroke2,
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
              isDark={isDark}
            />
          ) : null}
          {showHome && !shouldShowBack ? (
            <IconButton
              icon="home-outline"
              onPress={handleHome}
              label="Go to home"
              theme={theme}
              isDark={isDark}
            />
          ) : null}
          {titleSlot ? (
            <View style={{ flex: 1, marginLeft: shouldShowBack || showHome ? 0 : FluentSpacing.s }}>
              {titleSlot}
            </View>
          ) : (
            <Text 
              style={[
                styles.title, 
                FluentTypography.title3,
                { 
                  color: fluentColors.colorNeutralForeground1,
                  marginLeft: shouldShowBack || showHome ? 0 : FluentSpacing.s,
                }
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
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
  theme,
  isDark,
}: { 
  icon: keyof typeof MaterialCommunityIcons.glyphMap; 
  onPress: () => void; 
  label: string;
  theme: any;
  isDark: boolean;
}) {
  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;
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
      duration: FluentDuration.fast,
      easing: Easing.bezier(FluentEasingValues.easeMax.x1, FluentEasingValues.easeMax.y1, FluentEasingValues.easeMax.x2, FluentEasingValues.easeMax.y2),
    });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withTiming(1, { 
      duration: FluentDuration.normal,
      easing: Easing.bezier(FluentEasingValues.easeMax.x1, FluentEasingValues.easeMax.y1, FluentEasingValues.easeMax.x2, FluentEasingValues.easeMax.y2),
    });
  };

  const handleHoverIn = () => {
    setHoverActive(true);
  };

  const handleHoverOut = () => {
    setHoverActive(false);
  };

  const getBackgroundColor = () => {
    if (isPressed) return fluentColors.colorNeutralBackground1Pressed;
    if (hoverActive) return fluentColors.colorNeutralBackground1Hover;
    return fluentColors.colorNeutralBackground1;
  };

  const focusStyle = isFocused ? Platform.select({
    web: {
      outline: `2px solid ${fluentColors.colorBrandForeground1}`,
      outlineOffset: 2,
    },
    default: {
      borderWidth: 2,
      borderColor: fluentColors.colorBrandForeground1,
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
        size={FluentIconSize.medium}
        color={fluentColors.colorNeutralForeground1}
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
  const { theme, isDark } = useThemeContext();
  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;
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
      duration: FluentDuration.fast,
      easing: Easing.bezier(FluentEasingValues.easeMax.x1, FluentEasingValues.easeMax.y1, FluentEasingValues.easeMax.x2, FluentEasingValues.easeMax.y2),
    });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withTiming(1, { 
      duration: FluentDuration.normal,
      easing: Easing.bezier(FluentEasingValues.easeMax.x1, FluentEasingValues.easeMax.y1, FluentEasingValues.easeMax.x2, FluentEasingValues.easeMax.y2),
    });
  };

  const handleHoverIn = () => {
    setHoverActive(true);
  };

  const handleHoverOut = () => {
    setHoverActive(false);
  };

  const getBackgroundColor = () => {
    if (isPressed) return fluentColors.colorNeutralBackground1Pressed;
    if (hoverActive) return fluentColors.colorNeutralBackground1Hover;
    return fluentColors.colorNeutralBackground1;
  };

  const focusStyle = isFocused ? Platform.select({
    web: {
      outline: `2px solid ${fluentColors.colorBrandForeground1}`,
      outlineOffset: 2,
    },
    default: {
      borderWidth: 2,
      borderColor: fluentColors.colorBrandForeground1,
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
      <MaterialCommunityIcons name={icon} size={FluentIconSize.medium} color={fluentColors.colorNeutralForeground1} />
      {badge && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: fluentColors.colorPaletteRedForeground2 }]}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
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
    paddingHorizontal: FluentSpacing.l,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: FluentSpacing.s,
  },
  title: {
    flex: 1,
  },
  iconButton: {
    width: Layout.touchTargetMin,
    height: Layout.touchTargetMin,
    borderRadius: FluentControlRadius.button,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.s,
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
    paddingHorizontal: FluentSpacing.xs,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: FluentTypography.caption2.fontSize,
    fontWeight: "600",
  },
});
