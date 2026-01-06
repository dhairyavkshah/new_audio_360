import React from "react";
import { StyleSheet, Pressable, ViewStyle, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSkin } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, M3Motion, M3Elevation } from "@/constants/theme";

interface CardProps {
  elevation?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const getBackgroundColorForElevation = (
  elevation: number,
  theme: any,
): string => {
  switch (elevation) {
    case 0:
      return theme.surfaceContainerLowest;
    case 1:
      return theme.surfaceContainerLow;
    case 2:
      return theme.surfaceContainer;
    case 3:
      return theme.surfaceContainerHigh;
    case 4:
      return theme.surfaceContainerHighest;
    default:
      return theme.surface;
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  elevation = 1,
  title,
  description,
  children,
  onPress,
  style,
}: CardProps) {
  const { theme } = useTheme();
  const { shapes, components } = useSkin();
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(1);

  const cardBackgroundColor = getBackgroundColorForElevation(elevation, theme);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: bgOpacity.value,
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withTiming(0.98, { 
        duration: M3Motion.durationShort3,
        easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
      });
      bgOpacity.value = withTiming(0.95, { 
        duration: M3Motion.durationShort3,
      });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withTiming(1, { 
        duration: M3Motion.durationShort4,
        easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
      });
      bgOpacity.value = withTiming(1, { 
        duration: M3Motion.durationShort4,
      });
    }
  };

  const getShadowStyle = () => {
    if (!components.useShadow) return {};
    
    return Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: elevation },
        shadowOpacity: 0.08 + (elevation * 0.02),
        shadowRadius: elevation * 2,
      },
      android: {
        elevation: elevation,
      },
      default: {
        boxShadow: elevation >= 2 ? "0 2px 4px rgba(0, 0, 0, 0.14)" : "0 1px 2px rgba(0, 0, 0, 0.14)",
      },
    }) || {};
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={[
        styles.card,
        {
          backgroundColor: cardBackgroundColor,
          borderRadius: shapes.cardBorderRadius || BorderRadius.large,
          borderColor: theme.outlineVariant,
        },
        getShadowStyle(),
        animatedStyle,
        style,
      ]}
    >
      {title ? (
        <ThemedText type="titleSmall" style={styles.cardTitle}>
          {title}
        </ThemedText>
      ) : null}
      {description ? (
        <ThemedText type="bodySmall" style={[styles.cardDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      ) : null}
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.l,
    borderWidth: 1,
  },
  cardTitle: {
    marginBottom: Spacing.titleToSubtitle,
  },
  cardDescription: {
    marginBottom: Spacing.contentBlock,
  },
});
