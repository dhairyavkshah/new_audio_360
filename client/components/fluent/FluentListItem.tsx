import React, { useState } from 'react';
import { Pressable, View, StyleSheet, ViewStyle, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeContext, useThemedColors } from '@/contexts/ThemeContext';
import { FluentText } from './FluentText';
import {
  FluentSpacing,
  FluentControlRadius,
  FluentIconSize,
  FluentTouchTarget,
  getShadowStyle,
  FluentSpring,
} from '@/constants/fluent2';

export interface FluentListItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  elevation?: boolean;
}

export function FluentListItem({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  showChevron = true,
  rightElement,
  disabled = false,
  style,
  elevation = true,
}: FluentListItemProps) {
  const { isDark } = useThemeContext();
  const colors = useThemedColors();

  const [isPressed, setIsPressed] = useState(false);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled || !onPress) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const handlePressIn = () => {
    setIsPressed(true);
    scale.value = withSpring(0.98, FluentSpring.standard);
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withSpring(1, FluentSpring.standard);
  };

  const backgroundColor = isPressed
    ? colors.colorNeutralBackground3
    : colors.colorNeutralBackground2;

  const shadowStyle = elevation ? getShadowStyle('shadow2', isDark) : {};

  const content = (
    <>
      <View style={[styles.iconContainer, { backgroundColor: colors.colorNeutralBackground3 }]}>
        <MaterialCommunityIcons
          name={icon}
          size={FluentIconSize.medium}
          color={iconColor || colors.colorBrandForeground1}
        />
      </View>
      <View style={styles.textContainer}>
        <FluentText variant="body1Strong" numberOfLines={1}>
          {title}
        </FluentText>
        {subtitle ? (
          <FluentText variant="caption1" color="tertiary" numberOfLines={1}>
            {subtitle}
          </FluentText>
        ) : null}
      </View>
      {rightElement}
      {showChevron && onPress ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={FluentIconSize.medium}
          color={colors.colorNeutralForeground3}
        />
      ) : null}
    </>
  );

  const containerStyle = [
    styles.container,
    { 
      backgroundColor,
      borderColor: colors.colorNeutralStroke2,
    },
    shadowStyle,
    disabled && styles.disabled,
    style,
  ];

  if (!onPress) {
    return (
      <View
        style={containerStyle}
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      >
        {content}
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={containerStyle}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        accessibilityState={{ disabled }}
        android_ripple={null}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    minHeight: 56,
    borderWidth: 1,
    marginBottom: FluentSpacing.s,
  },
  iconContainer: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    gap: FluentSpacing.xxs,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default FluentListItem;
