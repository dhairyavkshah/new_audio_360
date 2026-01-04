import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';
import { SkinDefinition, IconPack, ShapeTokens, ComponentStyles, getFluentDefaults } from '@/constants/skins';

type ThemeName = 'fluent' | 'fluent_dark' | 'fluent_light';

interface LegacyTheme {
  backgroundRoot: string;
  backgroundDefault: string;
  backgroundSecondary: string;
  backgroundElevated: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  secondary: string;
  tertiary: string;
  outline: string;
  error: string;
  success: string;
  warning: string;
}

interface ThemeContextValue {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  theme: LegacyTheme;
  isDark: boolean;
  skin: SkinDefinition;
  icons: IconPack;
  shapes: ShapeTokens;
  components: ComponentStyles;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colors, isDark, mode, setMode } = useFluent2Theme();

  const theme: LegacyTheme = useMemo(() => ({
    backgroundRoot: colors.background.primary,
    backgroundDefault: colors.background.primary,
    backgroundSecondary: colors.background.secondary,
    backgroundElevated: colors.background.elevated,
    surface: colors.surface.card,
    surfaceVariant: colors.background.tertiary,
    text: colors.foreground.primary,
    textSecondary: colors.foreground.secondary,
    textTertiary: colors.foreground.tertiary,
    primary: colors.brand.primary,
    secondary: colors.brand.secondary,
    tertiary: colors.brand.tertiary,
    outline: colors.stroke.primary,
    error: colors.status.error,
    success: colors.status.success,
    warning: colors.status.warning,
  }), [colors]);

  const fluentDefaults = useMemo(() => getFluentDefaults(), []);
  
  const fluentSkin: SkinDefinition = useMemo(() => ({
    id: 'fluent',
    name: 'Fluent',
    family: 'fluent' as const,
    icons: fluentDefaults.icons,
    shapes: fluentDefaults.shapes,
    components: fluentDefaults.components,
    specialFeatures: {
      hasLcdDisplay: false,
      hasChromeFrame: false,
      hasAeroGlass: false,
      hasVisualizer: false,
      hasMetallicTexture: false,
    },
  }), [fluentDefaults]);

  const setThemeName = (name: ThemeName) => {
    if (name === 'fluent_dark') {
      setMode('dark');
    } else if (name === 'fluent_light') {
      setMode('light');
    } else {
      setMode('system');
    }
  };

  const themeName: ThemeName = mode === 'dark' ? 'fluent_dark' : mode === 'light' ? 'fluent_light' : 'fluent';

  return (
    <ThemeContext.Provider value={{ 
      themeName, 
      setThemeName, 
      theme, 
      isDark,
      skin: fluentSkin,
      icons: fluentDefaults.icons,
      shapes: fluentDefaults.shapes,
      components: fluentDefaults.components,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}

export function useSkin() {
  const { skin, icons, shapes, components } = useThemeContext();
  return { skin, icons, shapes, components };
}

export function useIcons() {
  const { icons } = useThemeContext();
  return icons;
}

export function useShapes() {
  const { shapes } = useThemeContext();
  return shapes;
}

export function useComponentStyles() {
  const { components } = useThemeContext();
  return components;
}
