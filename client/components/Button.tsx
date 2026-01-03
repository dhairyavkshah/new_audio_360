import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSkin } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'default' | 'lg';

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeStyles = {
  sm: { height: Spacing.buttonHeightSm, paddingHorizontal: Spacing.size2 },
  default: { height: Spacing.buttonHeight, paddingHorizontal: Spacing.size3 },
  lg: { height: Spacing.buttonHeightLg, paddingHorizontal: Spacing.size5 },
};

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  variant = 'default',
  size = 'default',
}: ButtonProps) {
  const { theme } = useTheme();
  const { shapes, components } = useSkin();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: theme.backgroundSecondary,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.outline,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'destructive':
        return {
          backgroundColor: theme.error,
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: theme.primary,
          borderWidth: 0,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'secondary':
      case 'outline':
      case 'ghost':
        return theme.text;
      default:
        return theme.buttonText;
    }
  };

  const bevelStyle = components.useBevel ? {
    borderWidth: shapes.borderWidth,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderLeftColor: 'rgba(255,255,255,0.25)',
    borderBottomColor: 'rgba(0,0,0,0.45)',
    borderRightColor: 'rgba(0,0,0,0.35)',
  } : {};

  const glowStyle = components.useGlow && components.glowColor ? {
    shadowColor: components.glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: components.glowIntensity,
    shadowRadius: 10,
  } : {};

  const shadowStyle = components.useShadow ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: components.shadowIntensity,
    shadowRadius: 4,
    elevation: 2,
  } : {};

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.button,
        sizeStyles[size],
        {
          opacity: disabled ? 0.4 : 1,
          borderRadius: shapes.buttonBorderRadius || BorderRadius.button,
        },
        getVariantStyle(),
        variant === 'default' ? bevelStyle : {},
        variant === 'default' ? shadowStyle : {},
        variant === 'default' ? glowStyle : {},
        style,
        animatedStyle,
      ]}
    >
      <ThemedText
        type="labelLarge"
        style={[styles.buttonText, { color: getTextColor() }]}
      >
        {children}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.size2,
  },
  buttonText: {},
});
