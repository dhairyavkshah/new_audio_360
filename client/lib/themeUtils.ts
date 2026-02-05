import { ViewStyle, TextStyle, Platform } from 'react-native';
import { ThemeName, ThemeColors } from '@/constants/theme';
import { SkinDefinition, ShapeTokens, ComponentStyles, IconPack, getSkin } from '@/constants/skins';

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
};

const toBoxShadow = (shadow: {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
}): string => {
  const { r, g, b } = hexToRgb(shadow.shadowColor);
  return `${shadow.shadowOffset.width}px ${shadow.shadowOffset.height}px ${shadow.shadowRadius}px rgba(${r}, ${g}, ${b}, ${shadow.shadowOpacity})`;
};

const toTextShadow = (color: string, offsetX: number, offsetY: number, radius: number): string => {
  return `${offsetX}px ${offsetY}px ${radius}px ${color}`;
};

export interface ThemeTokens {
  colors: typeof ThemeColors.fluent.light;
  shapes: ShapeTokens;
  components: ComponentStyles;
  icons: IconPack;
  skin: SkinDefinition;
  isDark: boolean;
}

export function getThemeTokens(themeName: ThemeName, isDark: boolean): ThemeTokens {
  const themeColors = ThemeColors[themeName];
  const skin = getSkin(themeName);
  
  return {
    colors: themeColors[isDark ? 'dark' : 'light'],
    shapes: skin.shapes,
    components: skin.components,
    icons: skin.icons,
    skin,
    isDark,
  };
}

export interface CardEffectStyle {
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
  overflow?: 'visible' | 'hidden';
  boxShadow?: string;
}

export function getCardEffectStyle(
  tokens: ThemeTokens,
  elevation: number = 1
): CardEffectStyle {
  const { components, shapes, colors, isDark } = tokens;
  const style: CardEffectStyle = {
    borderRadius: shapes.cardBorderRadius,
    overflow: 'hidden',
  };

  if (components.cardStyle === 'beveled') {
    style.borderWidth = shapes.borderWidthThick;
    style.borderColor = isDark ? '#444444' : '#CCCCCC';
    style.backgroundColor = colors.surface;
  } else if (components.cardStyle === 'glass') {
    style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)';
    style.borderWidth = 1;
    style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)';
  } else if (components.cardStyle === 'aero') {
    style.backgroundColor = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
    style.borderWidth = 1;
    style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
  } else if (components.cardStyle === 'chrome') {
    style.backgroundColor = colors.surface;
    style.borderWidth = 1;
    style.borderColor = isDark ? '#555555' : '#BBBBBB';
  } else if (components.cardStyle === 'lcd') {
    style.backgroundColor = isDark ? '#1A1A1A' : '#2A3A2A';
    style.borderWidth = 2;
    style.borderColor = '#333333';
  } else if (components.cardStyle === 'flat') {
    style.backgroundColor = colors.surface;
    style.borderWidth = 0;
  } else if (components.cardStyle === 'bordered') {
    style.backgroundColor = colors.surface;
    style.borderWidth = shapes.borderWidth;
    style.borderColor = colors.outline;
  } else {
    style.backgroundColor = colors.cardBackground;
    style.borderWidth = shapes.borderWidth;
    style.borderColor = colors.cardBorder;
    
    if (components.useShadow && elevation > 0) {
      const shadowIntensity = components.shadowIntensity || 0.1;
      const shadowProps = {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: elevation * 2 },
        shadowOpacity: shadowIntensity * elevation,
        shadowRadius: elevation * 4,
      };
      const platformShadow = Platform.select({
        ios: shadowProps,
        android: { elevation: elevation * 2 },
        default: { boxShadow: toBoxShadow(shadowProps) },
      });
      Object.assign(style, platformShadow);
    }
  }

  return style;
}

export interface ButtonEffectStyle {
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
  boxShadow?: string;
}

export function getButtonEffectStyle(
  tokens: ThemeTokens,
  variant: 'primary' | 'secondary' | 'ghost' = 'primary'
): ButtonEffectStyle {
  const { components, shapes, colors, isDark } = tokens;
  const style: ButtonEffectStyle = {
    borderRadius: shapes.buttonBorderRadius,
  };

  if (components.buttonStyle === 'beveled') {
    style.borderWidth = 2;
    style.borderColor = isDark ? '#666666' : '#888888';
    style.backgroundColor = variant === 'primary' ? colors.primary : colors.surface;
  } else if (components.buttonStyle === 'glass') {
    style.backgroundColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)';
    style.borderWidth = 1;
    style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)';
  } else if (components.buttonStyle === 'aero') {
    style.backgroundColor = variant === 'primary' 
      ? colors.primary 
      : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)');
    style.borderWidth = 1;
    style.borderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)';
  } else if (components.buttonStyle === 'chrome') {
    style.backgroundColor = variant === 'primary' ? colors.primary : colors.surfaceVariant;
    style.borderWidth = 1;
    style.borderColor = isDark ? '#666666' : '#AAAAAA';
  } else if (components.buttonStyle === 'pill') {
    style.borderRadius = 9999;
    style.backgroundColor = variant === 'primary' ? colors.primary : colors.surfaceVariant;
  } else if (components.buttonStyle === 'square') {
    style.borderRadius = 0;
    style.backgroundColor = variant === 'primary' ? colors.primary : colors.surfaceVariant;
  } else if (components.buttonStyle === 'flat') {
    style.backgroundColor = variant === 'primary' ? colors.primary : 'transparent';
    style.borderWidth = 0;
  } else {
    style.backgroundColor = variant === 'primary' ? colors.primary : colors.surfaceVariant;
  }

  if (components.useGlow && components.glowColor) {
    const shadowProps = {
      shadowColor: components.glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: components.glowIntensity || 0.5,
      shadowRadius: 8,
    };
    const platformShadow = Platform.select({
      ios: shadowProps,
      android: { elevation: 4 },
      default: { boxShadow: toBoxShadow(shadowProps) },
    });
    Object.assign(style, platformShadow);
  }

  return style;
}

export function getTabBarStyle(tokens: ThemeTokens): ViewStyle {
  const { colors, shapes, components, isDark } = tokens;
  const style: ViewStyle = {
    backgroundColor: colors.backgroundDefault,
    borderTopWidth: shapes.borderWidth,
    borderTopColor: colors.outline,
  };

  if (components.cardStyle === 'glass' || components.useGlass) {
    style.backgroundColor = isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)';
  } else if (components.cardStyle === 'aero') {
    style.backgroundColor = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.85)';
  } else if (components.cardStyle === 'beveled' || components.useBevel) {
    style.borderTopWidth = 2;
    style.borderTopColor = isDark ? '#444444' : '#AAAAAA';
  }

  return style;
}

export function getGlowStyle(tokens: ThemeTokens): ViewStyle | null {
  const { components } = tokens;
  
  if (!components.useGlow || !components.glowColor) {
    return null;
  }

  const shadowProps = {
    shadowColor: components.glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: components.glowIntensity || 0.5,
    shadowRadius: 12,
  };

  return Platform.select({
    ios: shadowProps,
    android: { elevation: 6 },
    default: { boxShadow: toBoxShadow(shadowProps) },
  }) as ViewStyle;
}

export function getTextGlowStyle(tokens: ThemeTokens): TextStyle | null {
  const { components } = tokens;
  
  if (!components.useGlow || !components.glowColor) {
    return null;
  }

  return Platform.select({
    native: {
      textShadowColor: components.glowColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 6,
    },
    default: {
      textShadow: toTextShadow(components.glowColor, 0, 0, 6),
    },
  }) as TextStyle;
}

export function getLcdTextStyle(tokens: ThemeTokens): TextStyle | null {
  const { components, colors } = tokens;
  
  if (!components.useLcdEffect) {
    return null;
  }

  const glowColor = components.glowColor || colors.primary;
  const baseStyle = {
    fontFamily: 'monospace',
    color: glowColor,
  };

  const textShadowStyle = Platform.select({
    native: {
      textShadowColor: glowColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 4,
    },
    default: {
      textShadow: toTextShadow(glowColor, 0, 0, 4),
    },
  });

  return { ...baseStyle, ...textShadowStyle } as TextStyle;
}

export function getProgressBarStyle(tokens: ThemeTokens): {
  trackStyle: ViewStyle;
  progressStyle: ViewStyle;
  trackRadius: number;
} {
  const { components, shapes, colors, isDark } = tokens;
  
  const trackRadius = shapes.sliderTrackRadius;
  
  let trackStyle: ViewStyle = {
    backgroundColor: isDark ? colors.surfaceVariant : colors.outline,
    borderRadius: trackRadius,
  };
  
  let progressStyle: ViewStyle = {
    backgroundColor: colors.primary,
    borderRadius: trackRadius,
  };

  if (components.progressStyle === 'lcd') {
    trackStyle.backgroundColor = '#0A150A';
    trackStyle.borderWidth = 1;
    trackStyle.borderColor = '#333333';
    progressStyle.backgroundColor = components.glowColor || '#00FF00';
  } else if (components.progressStyle === 'segments') {
    trackStyle.backgroundColor = 'transparent';
  } else if (components.progressStyle === 'waveform') {
    trackStyle.backgroundColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  }

  if (components.useGlow && components.glowColor) {
    const shadowProps = {
      shadowColor: components.glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 4,
    };
    const platformShadow = Platform.select({
      ios: shadowProps,
      android: { elevation: 2 },
      default: { boxShadow: toBoxShadow(shadowProps) },
    });
    Object.assign(progressStyle, platformShadow);
  }

  return { trackStyle, progressStyle, trackRadius };
}

export function getSliderThumbStyle(tokens: ThemeTokens): ViewStyle {
  const { shapes, colors, components } = tokens;
  
  const style: ViewStyle = {
    width: shapes.sliderThumbRadius * 2,
    height: shapes.sliderThumbRadius * 2,
    borderRadius: shapes.sliderThumbRadius,
    backgroundColor: colors.primary,
  };

  if (components.sliderStyle === 'lcd') {
    style.backgroundColor = components.glowColor || '#00FF00';
    style.borderWidth = 1;
    style.borderColor = '#444444';
  } else if (components.sliderStyle === 'knob') {
    style.borderWidth = 2;
    style.borderColor = colors.outline;
  }

  if (components.useGlow && components.glowColor) {
    const shadowProps = {
      shadowColor: components.glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 6,
    };
    const platformShadow = Platform.select({
      ios: shadowProps,
      android: { elevation: 3 },
      default: { boxShadow: toBoxShadow(shadowProps) },
    });
    Object.assign(style, platformShadow);
  }

  return style;
}

export function getScreenBackgroundColor(tokens: ThemeTokens): string {
  return tokens.colors.backgroundRoot;
}

export function getSurfaceColor(tokens: ThemeTokens, level: 0 | 1 | 2 | 3 = 1): string {
  const { colors } = tokens;
  switch (level) {
    case 0:
      return colors.backgroundRoot;
    case 1:
      return colors.backgroundDefault;
    case 2:
      return colors.surface;
    case 3:
      return colors.surfaceVariant;
    default:
      return colors.surface;
  }
}

function lighten(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.min(255, Math.round(parseInt(result[1], 16) + (255 - parseInt(result[1], 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(result[2], 16) + (255 - parseInt(result[2], 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(result[3], 16) + (255 - parseInt(result[3], 16)) * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

function darken(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.max(0, Math.round(parseInt(result[1], 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(result[2], 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(result[3], 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

export interface ThemedFluentColors {
  colorNeutralForeground1: string;
  colorNeutralForeground2: string;
  colorNeutralForeground3: string;
  colorNeutralForeground4: string;
  colorNeutralForegroundDisabled: string;
  colorNeutralForegroundInverted: string;
  colorNeutralForegroundOnBrand: string;
  colorNeutralBackground1: string;
  colorNeutralBackground1Hover: string;
  colorNeutralBackground1Pressed: string;
  colorNeutralBackground2: string;
  colorNeutralBackground3: string;
  colorNeutralBackground4: string;
  colorNeutralBackground5: string;
  colorNeutralBackground6: string;
  colorNeutralBackgroundDisabled: string;
  colorNeutralBackgroundInverted: string;
  colorNeutralStroke1: string;
  colorNeutralStroke2: string;
  colorNeutralStroke3: string;
  colorNeutralStrokeDisabled: string;
  colorBrandBackground: string;
  colorBrandBackgroundHover: string;
  colorBrandBackgroundPressed: string;
  colorBrandBackgroundSelected: string;
  colorBrandForeground1: string;
  colorBrandForeground2: string;
  colorBrandStroke1: string;
  colorCompoundBrandForeground1: string;
  colorCompoundBrandBackground: string;
  colorPaletteRedBackground1: string;
  colorPaletteRedBackground2: string;
  colorPaletteRedForeground1: string;
  colorPaletteGreenBackground1: string;
  colorPaletteGreenForeground1: string;
  colorPaletteYellowBackground1: string;
  colorPaletteYellowBackground2: string;
  colorPaletteYellowForeground1: string;
  colorSubtleBackground: string;
  colorSubtleBackgroundHover: string;
  colorSubtleBackgroundPressed: string;
  colorFavorite: string;
}

export function getThemedFluentColors(tokens: ThemeTokens): ThemedFluentColors {
  const { colors, isDark } = tokens;
  
  return {
    colorNeutralForeground1: colors.text,
    colorNeutralForeground2: colors.textSecondary,
    colorNeutralForeground3: colors.textTertiary,
    colorNeutralForeground4: isDark ? darken(colors.textTertiary, 0.2) : lighten(colors.textTertiary, 0.2),
    colorNeutralForegroundDisabled: isDark ? darken(colors.textTertiary, 0.4) : lighten(colors.textTertiary, 0.4),
    colorNeutralForegroundInverted: isDark ? colors.backgroundRoot : '#FFFFFF',
    colorNeutralForegroundOnBrand: colors.onPrimary,
    colorNeutralBackground1: colors.surface,
    colorNeutralBackground1Hover: isDark ? lighten(colors.surface, 0.08) : darken(colors.surface, 0.04),
    colorNeutralBackground1Pressed: isDark ? darken(colors.surface, 0.08) : darken(colors.surface, 0.08),
    colorNeutralBackground2: colors.backgroundDefault,
    colorNeutralBackground3: colors.backgroundSecondary,
    colorNeutralBackground4: colors.backgroundTertiary,
    colorNeutralBackground5: isDark ? darken(colors.backgroundTertiary, 0.1) : lighten(colors.backgroundTertiary, 0.1),
    colorNeutralBackground6: isDark ? darken(colors.backgroundTertiary, 0.2) : lighten(colors.backgroundTertiary, 0.2),
    colorNeutralBackgroundDisabled: isDark ? darken(colors.surface, 0.2) : lighten(colors.surface, 0.1),
    colorNeutralBackgroundInverted: isDark ? '#FFFFFF' : colors.backgroundRoot,
    colorNeutralStroke1: colors.stroke1,
    colorNeutralStroke2: colors.stroke2,
    colorNeutralStroke3: colors.outline,
    colorNeutralStrokeDisabled: isDark ? darken(colors.outline, 0.3) : lighten(colors.outline, 0.3),
    colorBrandBackground: colors.primary,
    colorBrandBackgroundHover: colors.primaryHover,
    colorBrandBackgroundPressed: colors.primaryPressed,
    colorBrandBackgroundSelected: isDark ? darken(colors.primary, 0.2) : darken(colors.primary, 0.15),
    colorBrandForeground1: colors.primary,
    colorBrandForeground2: isDark ? lighten(colors.primary, 0.15) : darken(colors.primary, 0.15),
    colorBrandStroke1: colors.primary,
    colorCompoundBrandForeground1: colors.primary,
    colorCompoundBrandBackground: colors.primary,
    colorPaletteRedBackground1: isDark ? darken(colors.error, 0.7) : lighten(colors.error, 0.85),
    colorPaletteRedBackground2: isDark ? darken(colors.error, 0.5) : lighten(colors.error, 0.7),
    colorPaletteRedForeground1: colors.error,
    colorPaletteGreenBackground1: isDark ? darken(colors.success, 0.7) : lighten(colors.success, 0.85),
    colorPaletteGreenForeground1: colors.success,
    colorPaletteYellowBackground1: isDark ? darken(colors.warning, 0.7) : lighten(colors.warning, 0.85),
    colorPaletteYellowBackground2: isDark ? darken(colors.warning, 0.5) : lighten(colors.warning, 0.7),
    colorPaletteYellowForeground1: colors.warning,
    colorSubtleBackground: 'transparent',
    colorSubtleBackgroundHover: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    colorSubtleBackgroundPressed: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    colorFavorite: isDark ? '#FF6B7D' : '#FF4D67',
  };
}
