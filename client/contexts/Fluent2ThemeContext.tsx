import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fluent2, FluentColorScheme, getFluentColors } from '@/constants/fluent2';

type ThemeMode = 'light' | 'dark' | 'system';

interface Fluent2ThemeContextType {
  mode: ThemeMode;
  scheme: FluentColorScheme;
  colors: ReturnType<typeof getFluentColors>;
  typography: typeof Fluent2.typography;
  spacing: typeof Fluent2.spacing;
  radius: typeof Fluent2.radius;
  elevation: typeof Fluent2.elevation;
  iconSize: typeof Fluent2.iconSize;
  duration: typeof Fluent2.duration;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const Fluent2ThemeContext = createContext<Fluent2ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@fluent2_theme_mode';

interface Fluent2ThemeProviderProps {
  children: ReactNode;
}

export function Fluent2ThemeProvider({ children }: Fluent2ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        setModeState(saved as ThemeMode);
      }
      setIsLoaded(true);
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  const scheme: FluentColorScheme = 
    mode === 'system' 
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : mode;

  const colors = getFluentColors(scheme);

  const value: Fluent2ThemeContextType = {
    mode,
    scheme,
    colors,
    typography: Fluent2.typography,
    spacing: Fluent2.spacing,
    radius: Fluent2.radius,
    elevation: Fluent2.elevation,
    iconSize: Fluent2.iconSize,
    duration: Fluent2.duration,
    setMode,
    isDark: scheme === 'dark',
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <Fluent2ThemeContext.Provider value={value}>
      {children}
    </Fluent2ThemeContext.Provider>
  );
}

export function useFluent2Theme() {
  const context = useContext(Fluent2ThemeContext);
  if (!context) {
    throw new Error('useFluent2Theme must be used within a Fluent2ThemeProvider');
  }
  return context;
}
