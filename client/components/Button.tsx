import React, { ReactNode, useState, useCallback } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSkin } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Spacing, BorderRadius, M3Motion } from "@/constants/theme";

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'subtle';
type ButtonSize = 'sm' | 'default' | 'lg';

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeStyles = {
  sm: { 
    height: 36,
    paddingHorizontal: Spacing.l,
    minWidth: 64,
  },
  default: { 
    height: 44,
    paddingHorizontal: Spacing.xl,
    minWidth: 96,
  },
  lg: { 
    height: 48,
    paddingHorizontal: Spacing.xxl,
    minWidth: 120,
  },
};

const adjustBrightness = (color: string, amount: number): string => {
  if (!color || color === 'transparent') return color;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return color;
  
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  variant = 'default',
  size = 'default',
}: ButtonProps) {
  const { theme, isDark } = useTheme();
  const { shapes } = useSkin();
  const { playKeypressSound } = useUiSound();
  const scale = useSharedValue(1);
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (!disabled && onPress) {
      playKeypressSound();
      onPress();
    }
  }, [disabled, onPress, playKeypressSound]);

  const handlePressIn = () => {
    if (!disabled) {
      setIsPressed(true);
      scale.value = withTiming(0.98, { 
        duration: M3Motion.durationShort3,
        easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      setIsPressed(false);
      scale.value = withTiming(1, { 
        duration: M3Motion.durationShort4,
        easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
      });
    }
  };

  const handleHoverIn = () => {
    if (!disabled) {
      setHoverActive(true);
    }
  };

  const handleHoverOut = () => {
    if (!disabled) {
      setHoverActive(false);
    }
  };

  const getVariantColors = () => {
    const hoverAdjust = isDark ? 15 : -10;
    const pressedAdjust = isDark ? 25 : -20;
    
    switch (variant) {
      case 'secondary':
        return {
          rest: theme.surfaceContainer,
          hover: theme.surfaceContainerHigh,
          pressed: theme.surfaceContainerHighest,
          text: theme.onSurface,
        };
      case 'outline':
        return {
          rest: 'transparent',
          hover: theme.surfaceContainerLow,
          pressed: theme.surfaceContainer,
          text: theme.primary,
          borderColor: theme.outline,
          borderHover: theme.primary,
          borderPressed: theme.primary,
        };
      case 'ghost':
        return {
          rest: 'transparent',
          hover: theme.surfaceContainerLow,
          pressed: theme.surfaceContainer,
          text: theme.onSurface,
        };
      case 'subtle':
        return {
          rest: theme.surfaceContainerLow,
          hover: theme.surfaceContainer,
          pressed: theme.surfaceContainerHigh,
          text: theme.primary,
        };
      case 'destructive': {
        const errorBase = theme.error || '#DC3545';
        return {
          rest: errorBase,
          hover: adjustBrightness(errorBase, hoverAdjust),
          pressed: adjustBrightness(errorBase, pressedAdjust),
          text: '#FFFFFF',
        };
      }
      default: {
        const primaryBase = theme.primary || '#0078D4';
        return {
          rest: primaryBase,
          hover: theme.primaryHover || adjustBrightness(primaryBase, hoverAdjust),
          pressed: theme.primaryPressed || adjustBrightness(primaryBase, pressedAdjust),
          text: theme.onPrimary || '#FFFFFF',
        };
      }
    }
  };

  const colors = getVariantColors();

  const getBackgroundColor = () => {
    if (isPressed) return colors.pressed;
    if (hoverActive) return colors.hover;
    return colors.rest;
  };

  const getBorderColor = () => {
    if (variant !== 'outline') return 'transparent';
    if (isPressed) return colors.borderPressed || theme.primary;
    if (hoverActive) return colors.borderHover || theme.primary;
    return colors.borderColor || theme.outline;
  };

  const getFocusRingColor = () => {
    if (variant === 'default') {
      return isDark ? '#FFFFFF' : '#000000';
    }
    return theme.primary;
  };

  const focusRingStyle = isFocused ? Platform.select({
    web: {
      outline: `2px solid ${getFocusRingColor()}`,
      outlineOffset: 2,
    },
    default: {
      borderWidth: 2,
      borderColor: getFocusRingColor(),
    },
  }) : {};

  const shadowStyle = variant === 'default' && !disabled ? Platform.select({
    ios: {
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isPressed ? 0.1 : 0.15,
      shadowRadius: isPressed ? 1 : 2,
    },
    android: {
      elevation: isPressed ? 1 : 2,
    },
    default: {},
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
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        sizeStyles[size],
        {
          opacity: disabled ? 0.38 : 1,
          borderRadius: shapes.buttonBorderRadius || BorderRadius.medium,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: getBorderColor(),
          backgroundColor: getBackgroundColor() as string,
        },
        shadowStyle,
        focusRingStyle,
        style,
        animatedStyle,
      ]}
    >
      <ThemedText
        type="labelMedium"
        style={[styles.buttonText, { color: colors.text }]}
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
    gap: Spacing.s,
  },
  buttonText: {
    textAlign: "center",
  },
});
