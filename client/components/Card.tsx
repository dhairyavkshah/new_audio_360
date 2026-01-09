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
import {
  FluentSpacing,
  FluentControlRadius,
  FluentDuration,
  FluentEasingValues,
  getShadowStyle,
  FluentLightColors,
  FluentDarkColors,
} from "@/constants/fluent2";

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
  fluentColors: typeof FluentLightColors,
): string => {
  switch (elevation) {
    case 0:
      return fluentColors.colorNeutralBackground1;
    case 1:
      return fluentColors.colorNeutralBackground2;
    case 2:
      return fluentColors.colorNeutralBackground3;
    case 3:
      return fluentColors.colorNeutralBackground4;
    case 4:
      return fluentColors.colorNeutralBackground5;
    default:
      return fluentColors.colorNeutralBackground1;
  }
};

const getShadowForElevation = (elevation: number, isDark: boolean) => {
  if (elevation === 0) return {};
  if (elevation <= 1) return getShadowStyle('shadow2', isDark);
  if (elevation <= 2) return getShadowStyle('shadow4', isDark);
  if (elevation <= 3) return getShadowStyle('shadow8', isDark);
  return getShadowStyle('shadow16', isDark);
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
  const { isDark, theme } = useTheme();
  const { components } = useSkin();
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(1);

  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;
  const cardBackgroundColor = getBackgroundColorForElevation(elevation, fluentColors);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: bgOpacity.value,
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withTiming(0.98, { 
        duration: FluentDuration.fast,
        easing: Easing.bezier(
          FluentEasingValues.decelerateMid.x1,
          FluentEasingValues.decelerateMid.y1,
          FluentEasingValues.decelerateMid.x2,
          FluentEasingValues.decelerateMid.y2
        ),
      });
      bgOpacity.value = withTiming(0.95, { 
        duration: FluentDuration.fast,
      });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withTiming(1, { 
        duration: FluentDuration.normal,
        easing: Easing.bezier(
          FluentEasingValues.decelerateMid.x1,
          FluentEasingValues.decelerateMid.y1,
          FluentEasingValues.decelerateMid.x2,
          FluentEasingValues.decelerateMid.y2
        ),
      });
      bgOpacity.value = withTiming(1, { 
        duration: FluentDuration.normal,
      });
    }
  };

  const getCardShadowStyle = () => {
    if (!components.useShadow) return {};
    return getShadowForElevation(elevation, isDark);
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
          borderRadius: FluentControlRadius.card,
          borderColor: fluentColors.colorNeutralStroke2,
        },
        getCardShadowStyle(),
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
        <ThemedText type="bodySmall" style={[styles.cardDescription, { color: fluentColors.colorNeutralForeground2 }]}>
          {description}
        </ThemedText>
      ) : null}
      {children}
    </AnimatedPressable>
  );
}

interface ElevatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function ElevatedCard({ children, onPress, style }: ElevatedCardProps) {
  return (
    <Card elevation={3} onPress={onPress} style={style}>
      {children}
    </Card>
  );
}

interface OutlinedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function OutlinedCard({ children, onPress, style }: OutlinedCardProps) {
  const { isDark } = useTheme();
  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;
  
  const outlinedStyle: ViewStyle = {
    borderWidth: 1, 
    borderColor: fluentColors.colorNeutralStroke1,
  };
  
  const mergedStyle: ViewStyle = style 
    ? { ...outlinedStyle, ...style }
    : outlinedStyle;
  
  return (
    <Card elevation={0} onPress={onPress} style={mergedStyle}>
      {children}
    </Card>
  );
}

interface FilledCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function FilledCard({ children, onPress, style }: FilledCardProps) {
  return (
    <Card elevation={0} onPress={onPress} style={style}>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: FluentSpacing.l,
    borderWidth: 1,
  },
  cardTitle: {
    marginBottom: FluentSpacing.xs,
  },
  cardDescription: {
    marginBottom: FluentSpacing.m,
  },
});
