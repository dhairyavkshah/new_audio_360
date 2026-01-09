import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useThemeContext } from '@/contexts/ThemeContext';
import {
  FluentTypography,
  FluentLightColors,
  FluentDarkColors,
  TypographyVariant,
} from '@/constants/fluent2';

type ColorVariant = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'brand' | 'error' | 'success' | 'warning' | 'onBrand' | 'inverted';

export interface FluentTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorVariant;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

const getTextColor = (colorVariant: ColorVariant, colors: typeof FluentLightColors): string => {
  switch (colorVariant) {
    case 'primary':
      return colors.colorNeutralForeground1;
    case 'secondary':
      return colors.colorNeutralForeground2;
    case 'tertiary':
      return colors.colorNeutralForeground3;
    case 'disabled':
      return colors.colorNeutralForegroundDisabled;
    case 'brand':
      return colors.colorBrandForeground1;
    case 'error':
      return colors.colorPaletteRedForeground1;
    case 'success':
      return colors.colorPaletteGreenForeground1;
    case 'warning':
      return colors.colorPaletteYellowForeground1;
    case 'onBrand':
      return colors.colorNeutralForegroundOnBrand;
    case 'inverted':
      return colors.colorNeutralForegroundInverted;
    default:
      return colors.colorNeutralForeground1;
  }
};

export function FluentText({
  variant = 'body1',
  color = 'primary',
  align = 'left',
  style,
  children,
  ...props
}: FluentTextProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const typography = FluentTypography[variant];
  const textColor = getTextColor(color, colors);

  return (
    <Text
      style={[
        typography,
        { color: textColor, textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

export default FluentText;
