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
import { Spacing, BorderRadius, FluentMotion, FluentShadow } from "@/constants/theme";

interface CardProps {
  elevation?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getFluentShadowForElevation = (elevation: number) => {
  if (elevation <= 1) return FluentShadow.shadow2;
  if (elevation === 2) return FluentShadow.shadow4;
  if (elevation === 3) return FluentShadow.shadow8;
  return FluentShadow.shadow8;
};

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: bgOpacity.value,
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withTiming(0.98, { 
        duration: FluentMotion.duration.fast,
        easing: Easing.bezier(
          FluentMotion.easing.accelerate.x1, 
          FluentMotion.easing.accelerate.y1, 
          FluentMotion.easing.accelerate.x2, 
          FluentMotion.easing.accelerate.y2
        ),
      });
      bgOpacity.value = withTiming(0.95, { 
        duration: FluentMotion.duration.fast,
      });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withTiming(1, { 
        duration: FluentMotion.duration.normal,
        easing: Easing.bezier(
          FluentMotion.easing.decelerate.x1, 
          FluentMotion.easing.decelerate.y1, 
          FluentMotion.easing.decelerate.x2, 
          FluentMotion.easing.decelerate.y2
        ),
      });
      bgOpacity.value = withTiming(1, { 
        duration: FluentMotion.duration.normal,
      });
    }
  };

  const getShadowStyle = () => {
    if (!components.useShadow || elevation === 0) return {};
    
    const shadow = getFluentShadowForElevation(elevation);
    
    return Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: shadow.key.x, height: shadow.key.y },
        shadowOpacity: 0.14,
        shadowRadius: shadow.key.blur,
      },
      android: {
        elevation: shadow.elevation,
      },
      default: {
        boxShadow: shadow.combined,
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
          backgroundColor: theme.surface,
          borderRadius: shapes.cardBorderRadius || BorderRadius.large,
          borderColor: theme.stroke1,
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
  const { theme } = useTheme();
  
  const outlinedStyle: ViewStyle = {
    borderWidth: 1, 
    borderColor: theme.stroke1,
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
    padding: Spacing.m,
    borderWidth: 1,
  },
  cardTitle: {
    marginBottom: Spacing.titleToSubtitle,
  },
  cardDescription: {
    marginBottom: Spacing.contentBlock,
  },
});
