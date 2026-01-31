export const FluentSpacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  xxxxxl: 48,
  xxxxxxl: 64,
  xxxxxxxl: 80,
} as const;

export const FluentBlurIntensity = {
  light: 10,
  medium: 20,
  heavy: 30,
} as const;

export const FluentGap = {
  smaller: 4,
  small: 8,
  medium: 12,
  large: 16,
  larger: 20,
} as const;

export const FluentPadding = {
  none: 0,
  xxs: 2,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
} as const;

export const FluentIconSize = {
  tiny: 12,
  small: 16,
  regular: 20,
  medium: 24,
  large: 28,
  xlarge: 32,
  xxlarge: 48,
} as const;

export type SpacingToken = keyof typeof FluentSpacing;
export type GapToken = keyof typeof FluentGap;
export type PaddingToken = keyof typeof FluentPadding;
export type IconSizeToken = keyof typeof FluentIconSize;
export type BlurIntensityToken = keyof typeof FluentBlurIntensity;
