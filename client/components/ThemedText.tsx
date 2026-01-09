import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "display"
    | "displayLarge"
    | "displayMedium"
    | "displaySmall"
    | "titleLarge"
    | "titleMedium"
    | "titleSmall"
    | "subtitle1"
    | "subtitle2"
    | "bodyLarge"
    | "body"
    | "bodyMedium"
    | "bodySmall"
    | "labelLarge"
    | "labelMedium"
    | "labelSmall"
    | "caption"
    | "captionSmall"
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

    if (type === "caption" || type === "captionSmall" || type === "small" || type === "labelSmall") {
      return theme.textSecondary;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "display":
        return Typography.display;
      case "displayLarge":
        return Typography.displayLarge;
      case "displayMedium":
        return Typography.displayMedium;
      case "displaySmall":
        return Typography.displaySmall;
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
      case "subtitle1":
        return Typography.subtitle1;
      case "subtitle2":
        return Typography.subtitle2;
      case "bodyLarge":
        return Typography.bodyLarge;
      case "body":
      case "bodyMedium":
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
      case "captionSmall":
        return Typography.captionSmall;
      case "link":
        return Typography.link;
      default:
        return Typography.body;
    }
  };

  return (
    <Text 
      style={[{ color: getColor() }, getTypeStyle(), style]} 
      {...rest} 
    />
  );
}
