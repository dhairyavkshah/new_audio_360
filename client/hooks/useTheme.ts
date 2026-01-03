import { useContext } from "react";
import { ThemeContext } from "@/contexts/ThemeContext";
import { ThemeColors, ThemeName } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const context = useContext(ThemeContext);

  if (context) {
    return {
      theme: context.theme,
      isDark: context.isDark,
      themeName: context.themeName,
      setThemeName: context.setThemeName,
    };
  }

  const fallbackTheme = ThemeColors.fluent[isDark ? "dark" : "light"];
  return {
    theme: fallbackTheme,
    isDark,
    themeName: "fluent" as ThemeName,
    setThemeName: (() => {}) as (name: ThemeName) => void,
  };
}
