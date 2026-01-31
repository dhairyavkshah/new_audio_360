export { FluentSpacing, FluentGap, FluentPadding, FluentIconSize, FluentBlurIntensity } from './spacing';
export type { SpacingToken, GapToken, PaddingToken, IconSizeToken, BlurIntensityToken } from './spacing';

export { 
  FluentControlHeight, 
  FluentControlMinWidth, 
  FluentSliderSize, 
  FluentBorderWidth, 
  FluentTouchTarget, 
  FluentLayoutSize 
} from './controls';
export type { 
  ControlHeightToken, 
  ControlMinWidthToken, 
  SliderSizeToken, 
  BorderWidthToken, 
  TouchTargetToken, 
  LayoutSizeToken 
} from './controls';

export { FluentTypography, FluentFontWeight } from './typography';
export type { TypographyVariant } from './typography';

export { FluentRadius, FluentControlRadius } from './radii';
export type { RadiusToken, ControlRadiusToken } from './radii';

export { FluentShadows, FluentShadowsDark, getShadowStyle } from './shadows';
export type { FluentShadow, ShadowLevel } from './shadows';

export { FluentDuration, FluentCurve, FluentEasingValues, FluentSpring } from './motion';
export type { DurationToken, CurveToken, SpringToken } from './motion';

export { FluentColorPalette, FluentLightColors, FluentDarkColors } from './colors';
export type { FluentColorToken } from './colors';

export interface FluentTheme {
  colors: typeof import('./colors').FluentLightColors;
  spacing: typeof import('./spacing').FluentSpacing;
  gap: typeof import('./spacing').FluentGap;
  padding: typeof import('./spacing').FluentPadding;
  iconSize: typeof import('./spacing').FluentIconSize;
  typography: typeof import('./typography').FluentTypography;
  radius: typeof import('./radii').FluentRadius;
  controlRadius: typeof import('./radii').FluentControlRadius;
  shadows: typeof import('./shadows').FluentShadows;
  isDark: boolean;
}

import { FluentLightColors, FluentDarkColors } from './colors';
import { FluentSpacing, FluentGap, FluentPadding, FluentIconSize } from './spacing';
import { FluentTypography } from './typography';
import { FluentRadius, FluentControlRadius } from './radii';
import { FluentShadows, FluentShadowsDark } from './shadows';

export const createFluentTheme = (isDark: boolean): FluentTheme => ({
  colors: isDark ? FluentDarkColors : FluentLightColors,
  spacing: FluentSpacing,
  gap: FluentGap,
  padding: FluentPadding,
  iconSize: FluentIconSize,
  typography: FluentTypography,
  radius: FluentRadius,
  controlRadius: FluentControlRadius,
  shadows: isDark ? FluentShadowsDark : FluentShadows,
  isDark,
});

export const fluentLightTheme = createFluentTheme(false);
export const fluentDarkTheme = createFluentTheme(true);
