import React, { useState } from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '@/contexts/ThemeContext';
import { FluentText } from './FluentText';
import {
  FluentLightColors,
  FluentDarkColors,
  FluentSpacing,
  FluentControlRadius,
  FluentIconSize,
  FluentTouchTarget,
  getShadowStyle,
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
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    if (disabled || !onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBackgroundColor = () => {
    if (disabled) return colors.colorNeutralBackground2;
    if (isPressed && onPress) return colors.colorNeutralBackground1Pressed;
    return colors.colorNeutralBackground2;
  };

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
      backgroundColor: getBackgroundColor(),
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
    <Pressable
      onPress={handlePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled}
      style={containerStyle}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityState={{ disabled }}
    >
      {content}
    </Pressable>
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
