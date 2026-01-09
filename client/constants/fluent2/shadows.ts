import { Platform } from 'react-native';

export interface FluentShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const createShadow = (
  offsetY: number,
  blurRadius: number,
  opacity: number,
  elevation: number,
  color: string = '#000000'
): FluentShadow => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: blurRadius,
  elevation,
});

export const FluentShadows = {
  shadow2: createShadow(1, 2, 0.12, 2),
  shadow4: createShadow(2, 4, 0.14, 4),
  shadow8: createShadow(4, 8, 0.14, 8),
  shadow16: createShadow(8, 16, 0.14, 16),
  shadow28: createShadow(14, 28, 0.17, 24),
  shadow64: createShadow(32, 64, 0.22, 28),
} as const;

export const FluentShadowsDark = {
  shadow2: createShadow(1, 2, 0.24, 2),
  shadow4: createShadow(2, 4, 0.28, 4),
  shadow8: createShadow(4, 8, 0.28, 8),
  shadow16: createShadow(8, 16, 0.28, 16),
  shadow28: createShadow(14, 28, 0.32, 24),
  shadow64: createShadow(32, 64, 0.36, 28),
} as const;

export const getShadowStyle = (level: keyof typeof FluentShadows, isDark: boolean = false) => {
  const shadows = isDark ? FluentShadowsDark : FluentShadows;
  const shadow = shadows[level];
  
  return Platform.select({
    ios: {
      shadowColor: shadow.shadowColor,
      shadowOffset: shadow.shadowOffset,
      shadowOpacity: shadow.shadowOpacity,
      shadowRadius: shadow.shadowRadius,
    },
    android: {
      elevation: shadow.elevation,
    },
    default: {
      shadowColor: shadow.shadowColor,
      shadowOffset: shadow.shadowOffset,
      shadowOpacity: shadow.shadowOpacity,
      shadowRadius: shadow.shadowRadius,
    },
  });
};

export type ShadowLevel = keyof typeof FluentShadows;
