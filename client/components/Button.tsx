import React, { ReactNode, useState, useCallback } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, Platform, View } from "react-native";

import { FluentText } from "@/components/fluent";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentSpacing,
  FluentControlRadius,
  getShadowStyle,
  FluentControlHeight,
  FluentControlMinWidth,
  FluentBorderWidth,
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
  accessibilityLabel?: string;
}

const sizeStyles = {
  sm: { 
    height: FluentControlHeight.small,
    paddingHorizontal: FluentSpacing.s,
    minWidth: FluentControlMinWidth.small,
  },
  default: { 
    height: FluentControlHeight.medium,
    paddingHorizontal: FluentSpacing.m,
    minWidth: FluentControlMinWidth.medium,
  },
  lg: { 
    height: FluentControlHeight.large,
    paddingHorizontal: FluentSpacing.l,
    minWidth: FluentControlMinWidth.large,
  },
};

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  variant = 'default',
  size = 'default',
  accessibilityLabel,
}: ButtonProps) {
  const { isDark } = useThemeContext();
  const colors = useThemedColors();
  const { playKeypressSound } = useUiSound();
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);

  const handlePress = useCallback(() => {
    if (!disabled && onPress) {
      playKeypressSound();
      onPress();
    }
  }, [disabled, onPress, playKeypressSound]);

  const handlePressIn = () => {
    if (!disabled) {
      setIsPressed(true);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      setIsPressed(false);
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
          rest: colors.colorNeutralBackground3,
          hover: colors.colorNeutralBackground1Hover,
          pressed: colors.colorNeutralBackground1Pressed,
          text: colors.colorNeutralForeground1,
        };
      case 'outline':
        return {
          rest: 'transparent',
          hover: colors.colorSubtleBackgroundHover,
          pressed: colors.colorSubtleBackgroundPressed,
          text: colors.colorBrandForeground1,
          borderColor: colors.colorNeutralStroke1,
          borderHover: colors.colorBrandStroke1,
          borderPressed: colors.colorBrandStroke1,
        };
      case 'ghost':
        return {
          rest: colors.colorSubtleBackground,
          hover: colors.colorSubtleBackgroundHover,
          pressed: colors.colorSubtleBackgroundPressed,
          text: colors.colorNeutralForeground1,
        };
      case 'subtle':
        return {
          rest: colors.colorSubtleBackground,
          hover: colors.colorSubtleBackgroundHover,
          pressed: colors.colorSubtleBackgroundPressed,
          text: colors.colorBrandForeground1,
        };
      case 'destructive':
        return {
          rest: colors.colorPaletteRedForeground1,
          hover: colors.colorPaletteRedForeground1,
          pressed: colors.colorPaletteRedForeground1,
          text: colors.colorNeutralForegroundOnBrand,
        };
      default:
        return {
          rest: colors.colorBrandBackground,
          hover: colors.colorBrandBackgroundHover,
          pressed: colors.colorBrandBackgroundPressed,
          text: colors.colorNeutralForegroundOnBrand,
        };
    }
  };

  const variantColors = getVariantColors();

  const getBackgroundColor = () => {
    if (isPressed) return variantColors.pressed;
    if (hoverActive) return variantColors.hover;
    return variantColors.rest;
  };

  const getBorderColor = () => {
    if (variant !== 'outline') return 'transparent';
    if (isPressed) return variantColors.borderPressed || colors.colorBrandStroke1;
    if (hoverActive) return variantColors.borderHover || colors.colorBrandStroke1;
    return variantColors.borderColor || colors.colorNeutralStroke1;
  };

  const getFocusRingColor = () => {
    return colors.colorBrandForeground1;
  };

  const focusRingStyle = isFocused ? Platform.select({
    web: {
      outline: `${FluentBorderWidth.thick}px solid ${getFocusRingColor()}`,
      outlineOffset: 2,
    },
    default: {
      borderWidth: FluentBorderWidth.thick,
      borderColor: getFocusRingColor(),
    },
  }) : {};

  const shadowStyle = variant === 'default' && !disabled 
    ? getShadowStyle('shadow2', isDark) 
    : {};

  return (
    <Pressable
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
      accessibilityLabel={accessibilityLabel}
      android_ripple={null}
      style={[
        styles.button,
        sizeStyles[size],
        {
          opacity: disabled ? 0.38 : 1,
          borderRadius: FluentControlRadius.button,
          borderWidth: variant === 'outline' ? FluentBorderWidth.thin : 0,
          borderColor: getBorderColor(),
          backgroundColor: getBackgroundColor() as string,
        },
        shadowStyle,
        focusRingStyle,
        style,
      ]}
    >
      <FluentText
        variant="body1Strong"
        style={[styles.buttonText, { color: variantColors.text }]}
      >
        {children}
      </FluentText>
    </Pressable>
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
