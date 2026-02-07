import React, { useState } from 'react';
import {
  Pressable,
  PressableProps,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemedColors } from '@/contexts/ThemeContext';
import {
  FluentTypography,
  FluentControlRadius,
  FluentSpacing,
  FluentControlHeight,
  FluentIconSize,
  FluentSpring,
} from '@/constants/fluent2';
import { ThemedFluentColors } from '@/lib/themeUtils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'subtle' | 'transparent';
type ButtonSize = 'small' | 'medium' | 'large';

export interface FluentButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const sizeStyles = {
  small: {
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.xs,
    minHeight: FluentControlHeight.small,
    typography: FluentTypography.caption1Strong,
    iconSize: FluentIconSize.small,
  },
  medium: {
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.s,
    minHeight: FluentControlHeight.medium,
    typography: FluentTypography.body1Strong,
    iconSize: FluentIconSize.small,
  },
  large: {
    paddingHorizontal: FluentSpacing.xl,
    paddingVertical: FluentSpacing.m,
    minHeight: FluentControlHeight.large,
    typography: FluentTypography.body2Strong,
    iconSize: FluentIconSize.regular,
  },
};

interface ButtonColors {
  background: string;
  backgroundHover: string;
  backgroundPressed: string;
  backgroundDisabled: string;
  foreground: string;
  foregroundDisabled: string;
  border?: string;
  borderHover?: string;
  borderPressed?: string;
}

const getButtonColors = (
  variant: ButtonVariant,
  colors: ThemedFluentColors
): ButtonColors => {
  switch (variant) {
    case 'primary':
      return {
        background: colors.colorBrandBackground,
        backgroundHover: colors.colorBrandBackgroundHover,
        backgroundPressed: colors.colorBrandBackgroundPressed,
        backgroundDisabled: colors.colorNeutralBackgroundDisabled,
        foreground: colors.colorNeutralForegroundOnBrand,
        foregroundDisabled: colors.colorNeutralForegroundDisabled,
      };
    case 'secondary':
      return {
        background: colors.colorNeutralBackground1,
        backgroundHover: colors.colorNeutralBackground1Hover,
        backgroundPressed: colors.colorNeutralBackground1Pressed,
        backgroundDisabled: colors.colorNeutralBackgroundDisabled,
        foreground: colors.colorNeutralForeground1,
        foregroundDisabled: colors.colorNeutralForegroundDisabled,
        border: colors.colorNeutralStroke1,
        borderHover: colors.colorNeutralStroke1,
        borderPressed: colors.colorNeutralStroke1,
      };
    case 'outline':
      return {
        background: 'transparent',
        backgroundHover: colors.colorSubtleBackgroundHover,
        backgroundPressed: colors.colorSubtleBackgroundPressed,
        backgroundDisabled: 'transparent',
        foreground: colors.colorBrandForeground1,
        foregroundDisabled: colors.colorNeutralForegroundDisabled,
        border: colors.colorBrandStroke1,
        borderHover: colors.colorBrandStroke1,
        borderPressed: colors.colorBrandStroke1,
      };
    case 'subtle':
      return {
        background: colors.colorSubtleBackground,
        backgroundHover: colors.colorSubtleBackgroundHover,
        backgroundPressed: colors.colorSubtleBackgroundPressed,
        backgroundDisabled: colors.colorSubtleBackground,
        foreground: colors.colorNeutralForeground1,
        foregroundDisabled: colors.colorNeutralForegroundDisabled,
      };
    case 'transparent':
      return {
        background: 'transparent',
        backgroundHover: colors.colorSubtleBackgroundHover,
        backgroundPressed: colors.colorSubtleBackgroundPressed,
        backgroundDisabled: 'transparent',
        foreground: colors.colorNeutralForeground1,
        foregroundDisabled: colors.colorNeutralForegroundDisabled,
      };
    default:
      return getButtonColors('primary', colors);
  }
};

export function FluentButton({
  variant = 'primary',
  size = 'medium',
  loading = false,
  iconBefore,
  iconAfter,
  fullWidth = false,
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  style,
  children,
  accessibilityLabel,
  ...props
}: FluentButtonProps) {
  const colors = useThemedColors();
  const buttonColors = getButtonColors(variant, colors);
  const sizeConfig = sizeStyles[size];

  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    setIsPressed(true);
    scale.value = withSpring(0.97, FluentSpring.standard);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    setIsPressed(false);
    scale.value = withSpring(1, FluentSpring.standard);
    onPressOut?.(e);
  };

  const isDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (isDisabled) return buttonColors.backgroundDisabled;
    if (isPressed) return buttonColors.backgroundPressed;
    if (isHovered) return buttonColors.backgroundHover;
    return buttonColors.background;
  };

  const getBorderColor = () => {
    if (!buttonColors.border) return undefined;
    if (isDisabled) return colors.colorNeutralStrokeDisabled;
    if (isPressed) return buttonColors.borderPressed;
    if (isHovered) return buttonColors.borderHover;
    return buttonColors.border;
  };

  const foregroundColor = isDisabled
    ? buttonColors.foregroundDisabled
    : buttonColors.foreground;

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: buttonColors.border ? 1 : 0,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          minHeight: sizeConfig.minHeight,
          borderRadius: FluentControlRadius.button,
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ disabled: isDisabled }}
      android_ripple={null}
      {...props}
    >
      <Animated.View style={[styles.content, animatedStyle]}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={foregroundColor}
            style={styles.loader}
          />
        ) : (
          <>
            {iconBefore && (
              <View style={[styles.iconWrapper, styles.iconBefore]}>
                {React.cloneElement(iconBefore as React.ReactElement<{ color?: string; size?: number }>, {
                  color: foregroundColor,
                  size: sizeConfig.iconSize,
                })}
              </View>
            )}
            <Text
              style={[
                sizeConfig.typography,
                { color: foregroundColor },
                styles.text,
              ]}
            >
              {children}
            </Text>
            {iconAfter && (
              <View style={[styles.iconWrapper, styles.iconAfter]}>
                {React.cloneElement(iconAfter as React.ReactElement<{ color?: string; size?: number }>, {
                  color: foregroundColor,
                  size: sizeConfig.iconSize,
                })}
              </View>
            )}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBefore: {
    marginRight: FluentSpacing.xs,
  },
  iconAfter: {
    marginLeft: FluentSpacing.xs,
  },
  loader: {
    marginHorizontal: FluentSpacing.xs,
  },
});

export default FluentButton;
