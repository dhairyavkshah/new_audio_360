/**
 * @deprecated Use FluentSurface or FluentScreenLayout from @/components/fluent instead.
 * This component is kept for backward compatibility but will be removed in a future version.
 */
import { View, type ViewProps } from "react-native";

import { useThemedColors } from "@/contexts/ThemeContext";
import { useTheme } from "@/hooks/useTheme";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: "background1" | "background2" | "background3" | "background4" | "background5" | "background6";
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  variant = "background1",
  ...otherProps
}: ThemedViewProps) {
  const { isDark } = useTheme();
  const colors = useThemedColors();

  const getBackgroundColor = (): string => {
    if (isDark && darkColor) {
      return darkColor;
    }
    if (!isDark && lightColor) {
      return lightColor;
    }

    switch (variant) {
      case "background1":
        return colors.colorNeutralBackground1;
      case "background2":
        return colors.colorNeutralBackground2;
      case "background3":
        return colors.colorNeutralBackground3;
      case "background4":
        return colors.colorNeutralBackground4;
      case "background5":
        return colors.colorNeutralBackground4;
      case "background6":
        return colors.colorNeutralBackground4;
      default:
        return colors.colorNeutralBackground1;
    }
  };

  return <View style={[{ backgroundColor: getBackgroundColor() }, style]} {...otherProps} />;
}
