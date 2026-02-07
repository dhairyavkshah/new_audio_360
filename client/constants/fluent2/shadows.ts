import { Platform } from 'react-native';

export interface FluentShadow {
  key: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
  ambient: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
  elevation: number;
}

const createDualShadow = (
  level: number,
  keyOpacity: number,
  ambientOpacity: number,
  elevation: number,
  color: string = '#000000',
  ambientBlurOverride?: number,
  ambientYOverride?: number
): FluentShadow => ({
  key: {
    shadowColor: color,
    shadowOffset: { width: 0, height: level * 0.5 },
    shadowOpacity: keyOpacity,
    shadowRadius: level,
  },
  ambient: {
    shadowColor: color,
    shadowOffset: { width: 0, height: ambientYOverride !== undefined ? ambientYOverride : level * 0.5 },
    shadowOpacity: ambientOpacity,
    shadowRadius: ambientBlurOverride !== undefined ? ambientBlurOverride : level,
  },
  elevation,
});

const shadowLayerToBoxShadow = (layer: FluentShadow['key']): string => {
  const { r, g, b } = hexToRgb(layer.shadowColor);
  return `0px ${layer.shadowOffset.height}px ${layer.shadowRadius}px rgba(${r}, ${g}, ${b}, ${layer.shadowOpacity})`;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
};

export const FluentShadows = {
  shadow2: createDualShadow(2, 0.14, 0.14, 2),
  shadow4: createDualShadow(4, 0.14, 0.14, 4),
  shadow8: createDualShadow(8, 0.14, 0.14, 8),
  shadow16: createDualShadow(16, 0.14, 0.14, 16),
  shadow28: createDualShadow(28, 0.24, 0.20, 24, '#000000', 8, 0),
  shadow64: createDualShadow(64, 0.24, 0.20, 28, '#000000', 8, 0),
} as const;

export const FluentShadowsDark = {
  shadow2: createDualShadow(2, 0.28, 0.14, 2),
  shadow4: createDualShadow(4, 0.28, 0.14, 4),
  shadow8: createDualShadow(8, 0.28, 0.14, 8),
  shadow16: createDualShadow(16, 0.28, 0.14, 16),
  shadow28: createDualShadow(28, 0.28, 0.20, 24, '#000000', 2, 0),
  shadow64: createDualShadow(64, 0.28, 0.20, 28, '#000000', 2, 0),
} as const;

export const getShadowStyle = (level: keyof typeof FluentShadows, isDark: boolean = false) => {
  const shadows = isDark ? FluentShadowsDark : FluentShadows;
  const shadow = shadows[level];

  return Platform.select({
    ios: {
      shadowColor: shadow.key.shadowColor,
      shadowOffset: shadow.key.shadowOffset,
      shadowOpacity: shadow.key.shadowOpacity * 1.2,
      shadowRadius: shadow.key.shadowRadius,
    },
    android: {
      elevation: shadow.elevation,
    },
    default: {
      boxShadow: `${shadowLayerToBoxShadow(shadow.key)}, ${shadowLayerToBoxShadow(shadow.ambient)}`,
    },
  });
};

export type ShadowLevel = keyof typeof FluentShadows;
