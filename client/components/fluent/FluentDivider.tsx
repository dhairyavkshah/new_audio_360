import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useThemedColors } from '@/contexts/ThemeContext';
import { FluentSpacing } from '@/constants/fluent2';

type Orientation = 'horizontal' | 'vertical';
type DividerAppearance = 'default' | 'strong' | 'brand' | 'subtle';

export interface FluentDividerProps extends ViewProps {
  orientation?: Orientation;
  appearance?: DividerAppearance;
  spacing?: number;
  inset?: boolean;
  insetStart?: number;
  insetEnd?: number;
}

export function FluentDivider({
  orientation = 'horizontal',
  appearance = 'default',
  spacing = 0,
  inset = false,
  insetStart,
  insetEnd,
  style,
  ...props
}: FluentDividerProps) {
  const colors = useThemedColors();

  const getColor = () => {
    switch (appearance) {
      case 'strong':
        return colors.colorNeutralStroke1;
      case 'brand':
        return colors.colorBrandStroke1;
      case 'subtle':
        return colors.colorNeutralStroke3;
      case 'default':
      default:
        return colors.colorNeutralStroke2;
    }
  };

  const dividerColor = getColor();
  const defaultInset = inset ? FluentSpacing.l : 0;
  const marginStart = insetStart ?? defaultInset;
  const marginEnd = insetEnd ?? defaultInset;

  const isHorizontal = orientation === 'horizontal';

  return (
    <View
      style={[
        isHorizontal ? styles.horizontal : styles.vertical,
        {
          backgroundColor: dividerColor,
          marginVertical: isHorizontal ? spacing : 0,
          marginHorizontal: !isHorizontal ? spacing : 0,
          marginLeft: isHorizontal ? marginStart : undefined,
          marginRight: isHorizontal ? marginEnd : undefined,
          marginTop: !isHorizontal ? marginStart : undefined,
          marginBottom: !isHorizontal ? marginEnd : undefined,
        },
        style,
      ]}
      accessibilityRole="none"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    height: '100%',
  },
});

export default FluentDivider;
