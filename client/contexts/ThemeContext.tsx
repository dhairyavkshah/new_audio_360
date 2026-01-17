import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, ThemeName, themeRegistry } from '@/constants/theme';
import { SkinDefinition, IconPack, ShapeTokens, ComponentStyles, getSkin } from '@/constants/skins';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ThemeContextValue {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  theme: typeof ThemeColors.fluent.light;
  isDark: boolean;
  skin: SkinDefinition;
  icons: IconPack;
  shapes: ShapeTokens;
  components: ComponentStyles;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@new_audio_360_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeName, setThemeNameState] = useState<ThemeName>('fluent');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored && (stored in ThemeColors)) {
        setThemeNameState(stored as ThemeName);
      }
    });
  }, []);

  const setThemeName = (name: ThemeName) => {
    setThemeNameState(name);
    AsyncStorage.setItem(THEME_STORAGE_KEY, name);
  };

  const themeInfo = themeRegistry.find(t => t.name === themeName);
  const isDark = themeInfo ? themeInfo.isDark : systemColorScheme === 'dark';

  const themeColors = ThemeColors[themeName];
  const theme = themeColors[isDark ? 'dark' : 'light'];

  const currentSkin = useMemo(() => getSkin(themeName), [themeName]);

  return (
    <ThemeContext.Provider value={{ 
      themeName, 
      setThemeName, 
      theme, 
      isDark,
      skin: currentSkin,
      icons: currentSkin.icons,
      shapes: currentSkin.shapes,
      components: currentSkin.components,
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
