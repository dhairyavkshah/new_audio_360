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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '@/contexts/ThemeContext';
import {
  FluentLightColors,
  FluentDarkColors,
  FluentTypography,
  FluentSpacing,
  FluentControlHeight,
  FluentControlMinWidth,
  FluentIconSize,
  FluentTouchTarget,
  FluentDuration,
  FluentCurve,
} from '@/constants/fluent2';

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

const getButtonRadius = (variant: ButtonVariant): number => {
  switch (variant) {
    case 'primary':
      return 22;
    case 'secondary':
      return 18;
    default:
      return 4;
  }
};

const getButtonHeight = (variant: ButtonVariant, size: ButtonSize): number => {
  if (variant === 'primary') return FluentControlHeight.large;
  if (variant === 'secondary') return FluentControlHeight.medium;
  return sizeStyles[size].minHeight;
};

const getButtonMinWidth = (variant: ButtonVariant): number | undefined => {
  if (variant === 'primary') return FluentControlMinWidth.medium;
  return undefined;
};

const timingConfig = {
  duration: FluentDuration.normal,
  easing: FluentCurve.decelerateMid,
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
  colors: typeof FluentLightColors
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
        borderHover: colors.colorNeutralStrokeAccessibleHover,
        borderPressed: colors.colorNeutralStrokeAccessiblePressed,
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
        borderHover: colors.colorCompoundBrandStrokeHover,
        borderPressed: colors.colorCompoundBrandStrokePressed,
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
        background: colors.colorTransparentBackground,
        backgroundHover: colors.colorTransparentBackgroundHover,
        backgroundPressed: colors.colorTransparentBackgroundPressed,
        backgroundDisabled: colors.colorTransparentBackground,
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
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
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
    scale.value = withTiming(0.97, timingConfig);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    setIsPressed(false);
    scale.value = withTiming(1, timingConfig);
    onPressOut?.(e);
  };

  const calculateHitSlop = () => {
    const buttonHeight = getButtonHeight(variant, size);
    const minTouchTarget = FluentTouchTarget.minimum;
    const extraSpace = Math.max(0, (minTouchTarget - buttonHeight) / 2);
    return {
      top: extraSpace,
      bottom: extraSpace,
      left: 0,
      right: 0,
    };
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
    <AnimatedPressable
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: buttonColors.border ? 1 : 0,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          minHeight: getButtonHeight(variant, size),
          minWidth: getButtonMinWidth(variant),
          borderRadius: getButtonRadius(variant),
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      hitSlop={calculateHitSlop()}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      <View style={styles.content}>
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
      </View>
    </AnimatedPressable>
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
