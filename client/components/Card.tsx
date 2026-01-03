import React from "react";
import { StyleSheet, Pressable, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSkin } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface CardProps {
  elevation?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const getBackgroundColorForElevation = (
  elevation: number,
  theme: any,
): string => {
  switch (elevation) {
    case 1:
      return theme.backgroundDefault;
    case 2:
      return theme.backgroundSecondary;
    case 3:
      return theme.backgroundTertiary;
    default:
      return theme.backgroundRoot;
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

  const cardBackgroundColor = getBackgroundColorForElevation(elevation, theme);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const glassStyle = components.useGlass ? {
    backgroundColor: cardBackgroundColor + 'CC',
  } : {};

  const bevelStyle = components.useBevel ? {
    borderWidth: shapes.borderWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
    borderLeftColor: 'rgba(255,255,255,0.15)',
    borderBottomColor: 'rgba(0,0,0,0.35)',
    borderRightColor: 'rgba(0,0,0,0.25)',
  } : {};

  const glowStyle = components.useGlow && components.glowColor ? {
    shadowColor: components.glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: components.glowIntensity * 0.5,
    shadowRadius: 12,
  } : {};

  const shadowStyle = components.useShadow ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: components.shadowIntensity,
    shadowRadius: 6,
    elevation: 3,
  } : {};

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          backgroundColor: cardBackgroundColor,
          borderRadius: shapes.cardBorderRadius || BorderRadius.card,
          borderColor: theme.cardBorder || theme.outline,
        },
        glassStyle,
        bevelStyle,
        shadowStyle,
        glowStyle,
        animatedStyle,
        style,
      ]}
    >
      {title ? (
        <ThemedText type="h4" style={styles.cardTitle}>
          {title}
        </ThemedText>
      ) : null}
      {description ? (
        <ThemedText type="small" style={styles.cardDescription}>
          {description}
        </ThemedText>
      ) : null}
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.size4,
    borderWidth: 1,
  },
  cardTitle: {
    marginBottom: Spacing.size2,
  },
  cardDescription: {
    opacity: 0.7,
  },
});
