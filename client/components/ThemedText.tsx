import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "display"
    | "titleLarge"
    | "titleMedium"
    | "titleSmall"
    | "bodyLarge"
    | "body"
    | "bodySmall"
    | "labelLarge"
    | "labelMedium"
    | "labelSmall"
    | "caption"
    | "link"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "small";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    if (type === "caption" || type === "small" || type === "labelSmall") {
      return theme.textSecondary;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "display":
        return Typography.display;
      case "titleLarge":
      case "h1":
        return Typography.titleLarge;
      case "titleMedium":
      case "h2":
        return Typography.titleMedium;
      case "titleSmall":
      case "h3":
        return Typography.titleSmall;
      case "h4":
        return Typography.h4;
      case "bodyLarge":
        return Typography.bodyLarge;
      case "body":
        return Typography.body;
      case "bodySmall":
      case "small":
        return Typography.bodySmall;
      case "labelLarge":
        return Typography.labelLarge;
      case "labelMedium":
        return Typography.labelMedium;
      case "labelSmall":
        return Typography.labelSmall;
      case "caption":
        return Typography.caption;
      case "link":
        return Typography.link;
      default:
        return Typography.body;
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
