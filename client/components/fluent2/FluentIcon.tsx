import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
type IconColor = 'primary' | 'secondary' | 'tertiary' | 'brand' | 'onAccent' | 'error' | 'success' | 'warning';

interface FluentIconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: IconSize;
  color?: IconColor;
  style?: ViewStyle;
}

export function FluentIcon({
  name,
  size = 'md',
  color = 'primary',
  style,
}: FluentIconProps) {
  const { colors, iconSize } = useFluent2Theme();

  const getColor = () => {
    switch (color) {
      case 'primary':
        return colors.textPrimary;
      case 'secondary':
        return colors.textSecondary;
      case 'tertiary':
        return colors.textTertiary;
      case 'brand':
        return colors.brandForeground;
      case 'onAccent':
        return colors.textOnAccent;
      case 'error':
        return colors.statusDanger;
      case 'success':
        return colors.statusSuccess;
      case 'warning':
        return colors.statusWarning;
    }
  };

  return (
    <View style={style}>
      <Ionicons
        name={name}
        size={iconSize[size]}
        color={getColor()}
      />
    </View>
  );
}
