import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';

type TextVariant = 
  | 'display'
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption1'
  | 'caption2';

type TextColor = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'brand' | 'error' | 'success';

interface FluentTextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: TextColor;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  style?: TextStyle;
}

export function FluentText({
  children,
  variant = 'body1',
  color = 'primary',
  weight,
  align = 'left',
  numberOfLines,
  style,
}: FluentTextProps) {
  const { colors, typography } = useFluent2Theme();

  const getTextColor = () => {
    switch (color) {
      case 'primary':
        return colors.textPrimary;
      case 'secondary':
        return colors.textSecondary;
      case 'tertiary':
        return colors.textTertiary;
      case 'disabled':
        return colors.textDisabled;
      case 'brand':
        return colors.brandForeground;
      case 'error':
        return colors.statusDanger;
      case 'success':
        return colors.statusSuccess;
    }
  };

  const variantStyles: Record<TextVariant, { fontSize: number; fontWeight: string }> = {
    display: { 
      fontSize: typography.fontSize.display, 
      fontWeight: typography.fontWeight.bold 
    },
    largeTitle: { 
      fontSize: typography.fontSize.largeTitle, 
      fontWeight: typography.fontWeight.bold 
    },
    title1: { 
      fontSize: typography.fontSize.title1, 
      fontWeight: typography.fontWeight.bold 
    },
    title2: { 
      fontSize: typography.fontSize.title2, 
      fontWeight: typography.fontWeight.semibold 
    },
    title3: { 
      fontSize: typography.fontSize.title3, 
      fontWeight: typography.fontWeight.semibold 
    },
    subtitle1: { 
      fontSize: typography.fontSize.subtitle1, 
      fontWeight: typography.fontWeight.semibold 
    },
    subtitle2: { 
      fontSize: typography.fontSize.subtitle2, 
      fontWeight: typography.fontWeight.medium 
    },
    body1: { 
      fontSize: typography.fontSize.body1, 
      fontWeight: typography.fontWeight.regular 
    },
    body2: { 
      fontSize: typography.fontSize.body2, 
      fontWeight: typography.fontWeight.regular 
    },
    caption1: { 
      fontSize: typography.fontSize.caption1, 
      fontWeight: typography.fontWeight.regular 
    },
    caption2: { 
      fontSize: typography.fontSize.caption2, 
      fontWeight: typography.fontWeight.regular 
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          color: getTextColor(),
          fontSize: currentVariant.fontSize,
          fontWeight: weight 
            ? typography.fontWeight[weight] 
            : currentVariant.fontWeight as any,
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
