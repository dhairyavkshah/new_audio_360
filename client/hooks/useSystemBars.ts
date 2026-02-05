import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useThemeContext, useThemedColors } from '@/contexts/ThemeContext';

export function useSystemBars() {
  const { isDark } = useThemeContext();
  const colors = useThemedColors();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const configureNavigationBar = async () => {
      try {
        const backgroundColor = colors.colorNeutralBackground1;
        
        await NavigationBar.setBackgroundColorAsync(backgroundColor);
        await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
      } catch (error) {
        console.log('[useSystemBars] Failed to set navigation bar color:', error);
      }
    };

    configureNavigationBar();
  }, [colors, isDark]);
}

export default useSystemBars;
