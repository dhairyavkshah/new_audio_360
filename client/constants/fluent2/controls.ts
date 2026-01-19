export const FluentControlHeight = {
  small: 32,
  medium: 36,
  large: 44,
  xlarge: 48,
} as const;

export const FluentControlMinWidth = {
  small: 64,
  medium: 96,
  large: 120,
} as const;

export const FluentSliderSize = {
  thumbSmall: 16,
  thumbMedium: 20,
  thumbLarge: 24,
  trackThin: 4,
  trackMedium: 6,
  trackThick: 8,
} as const;

export const FluentBorderWidth = {
  none: 0,
  thin: 1,
  medium: 1.5,
  thick: 2,
  thicker: 3,
} as const;

export const FluentTouchTarget = {
  minimum: 44,
  recommended: 48,
} as const;

export const FluentLayoutSize = {
  topBarHeight: 48,
  secondaryBarHeight: 44,
  bottomNavHeight: 64,
  miniPlayerHeight: 64,
  miniPlayerGapFromNav: 4,
  dialogMaxWidth: 400,
  menuWidth: 240,
  menuItemHeight: 48,
  bottomSheetHandleHeight: 24,
  inputFieldHeight: 44,
  chipHeight: 36,
} as const;

export type ControlHeightToken = keyof typeof FluentControlHeight;
export type ControlMinWidthToken = keyof typeof FluentControlMinWidth;
export type SliderSizeToken = keyof typeof FluentSliderSize;
export type BorderWidthToken = keyof typeof FluentBorderWidth;
export type TouchTargetToken = keyof typeof FluentTouchTarget;
export type LayoutSizeToken = keyof typeof FluentLayoutSize;
