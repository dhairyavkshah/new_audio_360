import React, { useState } from 'react';
import {
  Pressable,
  PressableProps,
  Text,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '@/contexts/ThemeContext';
import {
  FluentLightColors,
  FluentDarkColors,
  FluentTypography,
  FluentControlRadius,
  FluentSpacing,
  FluentIconSize,
  FluentSpring,
} from '@/constants/fluent2';

type ChipSize = 'small' | 'medium';

export interface FluentChipProps extends Omit<PressableProps, 'children'> {
  label: string;
  size?: ChipSize;
  selected?: boolean;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeStyles = {
  small: {
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xxs,
    minHeight: 24,
    typography: FluentTypography.caption1,
    iconSize: FluentIconSize.tiny,
    dismissSize: 14,
  },
  medium: {
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.xs,
    minHeight: 32,
    typography: FluentTypography.body1,
    iconSize: FluentIconSize.small,
    dismissSize: 16,
  },
};

export function FluentChip({
  label,
  size = 'medium',
  selected = false,
  icon,
  dismissible = false,
  onDismiss,
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  style,
  accessibilityLabel,
  ...props
}: FluentChipProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const sizeConfig = sizeStyles[size];

  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    setIsPressed(true);
    scale.value = withSpring(0.95, FluentSpring.stiff);
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

  const handleDismiss = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDismiss?.();
  };

  const getBackgroundColor = () => {
    if (disabled) return colors.colorNeutralBackgroundDisabled;
    
    if (selected) {
      if (isPressed) return colors.colorBrandBackgroundPressed;
      if (isHovered) return colors.colorBrandBackgroundHover;
      return colors.colorBrandBackground;
    }
    
    if (isPressed) return colors.colorSubtleBackgroundPressed;
    if (isHovered) return colors.colorSubtleBackgroundHover;
    return colors.colorNeutralBackground3;
  };

  const getBorderColor = () => {
    if (disabled) return colors.colorNeutralStrokeDisabled;
    if (selected) return 'transparent';
    return colors.colorNeutralStroke1;
  };

  const getForegroundColor = () => {
    if (disabled) return colors.colorNeutralForegroundDisabled;
    if (selected) return colors.colorNeutralForegroundOnBrand;
    return colors.colorNeutralForeground1;
  };

  const foregroundColor = getForegroundColor();

  return (
    <AnimatedPressable
      style={[
        styles.chip,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderRadius: FluentControlRadius.chip,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          minHeight: sizeConfig.minHeight,
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
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: disabled || undefined, selected: selected || undefined }}
      {...props}
    >
      <View style={styles.content}>
        {icon && (
          <View style={styles.iconWrapper}>
            {React.cloneElement(icon as React.ReactElement<{ color?: string; size?: number }>, {
              color: foregroundColor,
              size: sizeConfig.iconSize,
            })}
          </View>
        )}
        <Text
          style={[
            sizeConfig.typography,
            { color: foregroundColor },
            styles.label,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {dismissible && (
          <Pressable
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            style={styles.dismissButton}
            accessibilityLabel={`Remove ${label}`}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="close"
              size={sizeConfig.dismissSize}
              color={foregroundColor}
            />
          </Pressable>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    marginRight: FluentSpacing.xs,
  },
  label: {
    flexShrink: 1,
  },
  dismissButton: {
    marginLeft: FluentSpacing.xs,
  },
});

export default FluentChip;
