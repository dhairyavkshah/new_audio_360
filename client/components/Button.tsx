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
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentSpacing,
  FluentControlRadius,
  FluentDuration,
  FluentEasingValues,
  getShadowStyle,
  FluentLightColors,
  FluentDarkColors,
} from "@/constants/fluent2";

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
    height: 32,
    paddingHorizontal: FluentSpacing.s,
    minWidth: 64,
  },
  default: { 
    height: 36,
    paddingHorizontal: FluentSpacing.m,
    minWidth: 96,
  },
  lg: { 
    height: 44,
    paddingHorizontal: FluentSpacing.l,
    minWidth: 120,
  },
};

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  variant = 'default',
  size = 'default',
}: ButtonProps) {
  const { isDark } = useTheme();
  const { playKeypressSound } = useUiSound();
  const scale = useSharedValue(1);
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);

  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;

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
        duration: FluentDuration.fast,
        easing: Easing.bezier(
          FluentEasingValues.decelerateMid.x1,
          FluentEasingValues.decelerateMid.y1,
          FluentEasingValues.decelerateMid.x2,
          FluentEasingValues.decelerateMid.y2
        ),
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      setIsPressed(false);
      scale.value = withTiming(1, { 
        duration: FluentDuration.normal,
        easing: Easing.bezier(
          FluentEasingValues.decelerateMid.x1,
          FluentEasingValues.decelerateMid.y1,
          FluentEasingValues.decelerateMid.x2,
          FluentEasingValues.decelerateMid.y2
        ),
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
    switch (variant) {
      case 'secondary':
        return {
          rest: fluentColors.colorNeutralBackground3,
          hover: fluentColors.colorNeutralBackground1Hover,
          pressed: fluentColors.colorNeutralBackground1Pressed,
          text: fluentColors.colorNeutralForeground1,
        };
      case 'outline':
        return {
          rest: fluentColors.colorTransparentBackground,
          hover: fluentColors.colorSubtleBackgroundHover,
          pressed: fluentColors.colorSubtleBackgroundPressed,
          text: fluentColors.colorBrandForeground1,
          borderColor: fluentColors.colorNeutralStroke1,
          borderHover: fluentColors.colorBrandStroke1,
          borderPressed: fluentColors.colorBrandStroke1,
        };
      case 'ghost':
        return {
          rest: fluentColors.colorSubtleBackground,
          hover: fluentColors.colorSubtleBackgroundHover,
          pressed: fluentColors.colorSubtleBackgroundPressed,
          text: fluentColors.colorNeutralForeground1,
        };
      case 'subtle':
        return {
          rest: fluentColors.colorSubtleBackground,
          hover: fluentColors.colorSubtleBackgroundHover,
          pressed: fluentColors.colorSubtleBackgroundPressed,
          text: fluentColors.colorBrandForeground1,
        };
      case 'destructive':
        return {
          rest: fluentColors.colorPaletteRedForeground2,
          hover: fluentColors.colorPaletteRedForeground1,
          pressed: fluentColors.colorPaletteRedBorderActive,
          text: fluentColors.colorNeutralForegroundOnBrand,
        };
      default:
        return {
          rest: fluentColors.colorBrandBackground,
          hover: fluentColors.colorBrandBackgroundHover,
          pressed: fluentColors.colorBrandBackgroundPressed,
          text: fluentColors.colorNeutralForegroundOnBrand,
        };
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
    if (isPressed) return colors.borderPressed || fluentColors.colorBrandStroke1;
    if (hoverActive) return colors.borderHover || fluentColors.colorBrandStroke1;
    return colors.borderColor || fluentColors.colorNeutralStroke1;
  };

  const getFocusRingColor = () => {
    return fluentColors.colorStrokeFocus2;
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

  const shadowStyle = variant === 'default' && !disabled 
    ? getShadowStyle('shadow2', isDark) 
    : {};

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
          borderRadius: FluentControlRadius.button,
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
    gap: FluentSpacing.s,
  },
  buttonText: {
    textAlign: "center",
  },
});
