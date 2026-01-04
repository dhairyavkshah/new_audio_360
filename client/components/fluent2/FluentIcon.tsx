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
        return colors.foreground.primary;
      case 'secondary':
        return colors.foreground.secondary;
      case 'tertiary':
        return colors.foreground.tertiary;
      case 'brand':
        return colors.brand.foreground;
      case 'onAccent':
        return colors.foreground.onAccent;
      case 'error':
        return colors.status.error;
      case 'success':
        return colors.status.success;
      case 'warning':
        return colors.status.warning;
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
