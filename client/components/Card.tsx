import React from "react";
import { StyleSheet, Pressable, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { FluentText } from "@/components/fluent";
import { useThemeTokens } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentDuration,
  FluentEasingValues,
  FluentBorderWidth,
} from "@/constants/fluent2";
import { getCardEffectStyle } from "@/lib/themeUtils";

interface CardProps {
  elevation?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  elevation = 1,
  title,
  description,
  children,
  onPress,
  style,
}: CardProps) {
  const tokens = useThemeTokens();
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(1);

  const cardEffectStyle = getCardEffectStyle(tokens, elevation);

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

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={[
        styles.card,
        cardEffectStyle,
        animatedStyle,
        style,
      ]}
    >
      {title ? (
        <FluentText variant="subtitle2" style={styles.cardTitle}>
          {title}
        </FluentText>
      ) : null}
      {description ? (
        <FluentText variant="body2" color="secondary" style={styles.cardDescription}>
          {description}
        </FluentText>
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
  const tokens = useThemeTokens();
  
  const outlinedStyle: ViewStyle = {
    borderWidth: FluentBorderWidth.thin, 
    borderColor: tokens.colors.outline,
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
    borderWidth: FluentBorderWidth.thin,
  },
  cardTitle: {
    marginBottom: FluentSpacing.xs,
  },
  cardDescription: {
    marginBottom: FluentSpacing.m,
  },
});
