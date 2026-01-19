import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useThemeContext } from '@/contexts/ThemeContext';
import { FluentLightColors, FluentDarkColors } from '@/constants/fluent2';

export function useSystemBars() {
  const { isDark } = useThemeContext();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const configureNavigationBar = async () => {
      try {
        const colors = isDark ? FluentDarkColors : FluentLightColors;
        const backgroundColor = colors.colorNeutralBackground1;
        
        await NavigationBar.setBackgroundColorAsync(backgroundColor);
        await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
      } catch (error) {
        console.log('[useSystemBars] Failed to set navigation bar color:', error);
      }
    };

    configureNavigationBar();
  }, [isDark]);
}

export default useSystemBars;
