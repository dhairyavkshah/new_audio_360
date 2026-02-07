import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'SF Pro Text',
  android: 'Roboto',
  default: 'Segoe UI',
});

const fontFamilyDisplay = Platform.select({
  ios: 'SF Pro Display',
  android: 'Roboto',
  default: 'Segoe UI',
});

export const FluentFontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const FluentTypography = {
  caption2: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FluentFontWeight.regular,
  },
  caption1: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: FluentFontWeight.regular,
  },
  caption1Strong: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: FluentFontWeight.semibold,
  },
  body1: {
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FluentFontWeight.regular,
  },
  body1Strong: {
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FluentFontWeight.semibold,
  },
  body2: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FluentFontWeight.regular,
  },
  body2Strong: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FluentFontWeight.semibold,
  },
  subtitle2: {
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FluentFontWeight.semibold,
  },
  subtitle1: {
    fontFamily,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: FluentFontWeight.semibold,
  },
  title3: {
    fontFamily: fontFamilyDisplay,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: FluentFontWeight.semibold,
  },
  title2: {
    fontFamily: fontFamilyDisplay,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: FluentFontWeight.semibold,
  },
  title1: {
    fontFamily: fontFamilyDisplay,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: FluentFontWeight.semibold,
  },
  largeTitle: {
    fontFamily: fontFamilyDisplay,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: FluentFontWeight.bold,
  },
  display: {
    fontFamily: fontFamilyDisplay,
    fontSize: 60,
    lineHeight: 72,
    fontWeight: FluentFontWeight.bold,
  },
} as const;

export type TypographyVariant = keyof typeof FluentTypography;
