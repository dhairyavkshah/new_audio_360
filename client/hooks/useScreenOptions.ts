import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentLightColors, FluentDarkColors, FluentTypography } from "@/constants/fluent2";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  return {
    headerTitleAlign: "left",
    headerTransparent: Platform.OS === 'ios' ? transparent : false,
    headerBlurEffect: isDark ? "dark" : "light",
    headerTintColor: colors.colorNeutralForeground1,
    headerStyle: {
      backgroundColor: Platform.select({
        ios: transparent ? undefined : colors.colorNeutralBackground2,
        android: colors.colorNeutralBackground2,
        default: colors.colorNeutralBackground2,
      }),
    },
    headerTitleStyle: {
      fontWeight: FluentTypography.subtitle1.fontWeight,
      fontSize: FluentTypography.subtitle1.fontSize,
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: colors.colorNeutralBackground1,
    },
  };
}
