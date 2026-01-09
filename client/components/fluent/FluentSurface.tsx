import React from 'react';
import { View, ViewProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useThemeContext } from '@/contexts/ThemeContext';
import {
  FluentLightColors,
  FluentDarkColors,
  FluentRadius,
  getShadowStyle,
  ShadowLevel,
  RadiusToken,
} from '@/constants/fluent2';

type ElevationLevel = 'none' | 'subtle' | 'medium' | 'strong';
type BackgroundVariant = 'neutral1' | 'neutral2' | 'neutral3' | 'neutral4' | 'neutral5' | 'neutral6' | 'brand' | 'subtle' | 'transparent';

export interface FluentSurfaceProps extends ViewProps {
  elevation?: ElevationLevel;
  background?: BackgroundVariant;
  radius?: RadiusToken;
  padding?: number;
  children?: React.ReactNode;
}

const elevationToShadow: Record<ElevationLevel, ShadowLevel | null> = {
  none: null,
  subtle: 'shadow2',
  medium: 'shadow8',
  strong: 'shadow16',
};

const getBackgroundColor = (variant: BackgroundVariant, colors: typeof FluentLightColors): string => {
  switch (variant) {
    case 'neutral1':
      return colors.colorNeutralBackground1;
    case 'neutral2':
      return colors.colorNeutralBackground2;
    case 'neutral3':
      return colors.colorNeutralBackground3;
    case 'neutral4':
      return colors.colorNeutralBackground4;
    case 'neutral5':
      return colors.colorNeutralBackground5;
    case 'neutral6':
      return colors.colorNeutralBackground6;
    case 'brand':
      return colors.colorBrandBackground;
    case 'subtle':
      return colors.colorSubtleBackground;
    case 'transparent':
      return colors.colorTransparentBackground;
    default:
      return colors.colorNeutralBackground1;
  }
};

export function FluentSurface({
  elevation = 'none',
  background = 'neutral1',
  radius = 'none',
  padding,
  style,
  children,
  ...props
}: FluentSurfaceProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const backgroundColor = getBackgroundColor(background, colors);
  const borderRadius = FluentRadius[radius];
  
  const shadowLevel = elevationToShadow[elevation];
  const shadowStyle = shadowLevel ? getShadowStyle(shadowLevel, isDark) : {};

  const containerStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor,
      borderRadius,
      padding,
    },
    shadowStyle,
    style,
  ];

  return (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );
}

export default FluentSurface;
