import React, { useState } from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Platform,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '@/contexts/ThemeContext';
import {
  FluentLightColors,
  FluentDarkColors,
  FluentSpacing,
  FluentIconSize,
  FluentControlRadius,
  FluentSpring,
  IconSizeToken,
} from '@/constants/fluent2';

type IconButtonVariant = 'subtle' | 'transparent' | 'outline' | 'primary';
type IconButtonSize = 'small' | 'medium' | 'large';

export interface FluentIconButtonProps extends PressableProps {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  selected?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeConfig: Record<IconButtonSize, { containerSize: number; iconSizeToken: IconSizeToken }> = {
  small: { containerSize: 28, iconSizeToken: 'small' },
  medium: { containerSize: 36, iconSizeToken: 'regular' },
  large: { containerSize: 44, iconSizeToken: 'medium' },
};

export function FluentIconButton({
  icon,
  variant = 'subtle',
  size = 'medium',
  selected = false,
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  style,
  accessibilityLabel,
  ...props
}: FluentIconButtonProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const config = sizeConfig[size];
  const iconSize = FluentIconSize[config.iconSizeToken];

  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    setIsPressed(true);
    scale.value = withSpring(0.92, FluentSpring.stiff);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    setIsPressed(false);
    scale.value = withSpring(1, FluentSpring.stiff);
    onPressOut?.(e);
  };

  const getBackgroundColor = () => {
    if (disabled) {
      return variant === 'transparent' ? 'transparent' : colors.colorNeutralBackgroundDisabled;
    }

    switch (variant) {
      case 'primary':
        if (isPressed) return colors.colorBrandBackgroundPressed;
        if (isHovered) return colors.colorBrandBackgroundHover;
        return colors.colorBrandBackground;
      case 'subtle':
        if (selected) return colors.colorNeutralBackground1Pressed;
        if (isPressed) return colors.colorSubtleBackgroundPressed;
        if (isHovered) return colors.colorSubtleBackgroundHover;
        return colors.colorSubtleBackground;
      case 'transparent':
        if (isPressed) return colors.colorTransparentBackgroundPressed;
        if (isHovered) return colors.colorTransparentBackgroundHover;
        return colors.colorTransparentBackground;
      case 'outline':
        if (isPressed) return colors.colorSubtleBackgroundPressed;
        if (isHovered) return colors.colorSubtleBackgroundHover;
        return 'transparent';
      default:
        return 'transparent';
    }
  };

  const getBorderColor = () => {
    if (variant !== 'outline') return undefined;
    if (disabled) return colors.colorNeutralStrokeDisabled;
    if (isPressed) return colors.colorNeutralStrokeAccessiblePressed;
    if (isHovered) return colors.colorNeutralStrokeAccessibleHover;
    return colors.colorNeutralStrokeAccessible;
  };

  const getIconColor = () => {
    if (disabled) return colors.colorNeutralForegroundDisabled;
    
    if (variant === 'primary') {
      return colors.colorNeutralForegroundOnBrand;
    }
    
    if (selected) {
      return colors.colorBrandForeground1;
    }
    
    return colors.colorNeutralForeground1;
  };

  return (
    <AnimatedPressable
      style={[
        styles.button,
        {
          width: config.containerSize,
          height: config.containerSize,
          borderRadius: FluentControlRadius.button,
          backgroundColor: getBackgroundColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: getBorderColor(),
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || undefined, selected: selected || undefined }}
      {...props}
    >
      {React.cloneElement(icon as React.ReactElement<{ color?: string; size?: number }>, {
        color: getIconColor(),
        size: iconSize,
      })}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FluentIconButton;
