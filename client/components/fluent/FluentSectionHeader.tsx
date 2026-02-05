import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemedColors } from '@/contexts/ThemeContext';
import { FluentText } from './FluentText';
import {
  FluentSpacing,
  FluentIconSize,
} from '@/constants/fluent2';

export interface FluentSectionHeaderProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  iconColor?: string;
  style?: ViewStyle;
}

export function FluentSectionHeader({
  icon,
  title,
  iconColor,
  style,
}: FluentSectionHeaderProps) {
  const colors = useThemedColors();

  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons
        name={icon}
        size={FluentIconSize.regular}
        color={iconColor || colors.colorBrandForeground1}
      />
      <FluentText variant="subtitle1Strong" style={styles.title}>
        {title}
      </FluentText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FluentSpacing.s,
  },
  title: {
    marginLeft: FluentSpacing.s,
  },
});

export default FluentSectionHeader;
