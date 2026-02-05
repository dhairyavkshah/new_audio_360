import { Platform, StatusBar } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import { FluentTypography } from "@/constants/fluent2";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { isDark } = useThemeContext();
  const colors = useThemedColors();

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
    fullScreenGestureEnabled: true,
    contentStyle: {
      backgroundColor: colors.colorNeutralBackground1,
    },
    statusBarStyle: isDark ? "light" : "dark",
    statusBarBackgroundColor: colors.colorNeutralBackground2,
    statusBarTranslucent: false,
    animation: "none",
  };
}
