import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "display1"
    | "display2"
    | "display3"
    | "title1"
    | "title2"
    | "title3"
    | "title4"
    | "title5"
    | "title6"
    | "subtitle1"
    | "subtitle2"
    | "body1"
    | "body2"
    | "caption1"
    | "caption2"
    | "bodyLargeSemibold"
    | "bodyMediumSemibold"
    | "bodySmallSemibold"
    | "display"
    | "displayLarge"
    | "displayMedium"
    | "displaySmall"
    | "titleLarge"
    | "titleMedium"
    | "titleSmall"
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

    if (
      type === "caption" ||
      type === "caption1" ||
      type === "caption2" ||
      type === "captionSmall" ||
      type === "small" ||
      type === "labelSmall"
    ) {
      return theme.textSecondary;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "display1":
        return Typography.display1;
      case "display2":
        return Typography.display2;
      case "display3":
        return Typography.display3;
      case "title1":
        return Typography.title1;
      case "title2":
        return Typography.title2;
      case "title3":
        return Typography.title3;
      case "title4":
        return Typography.title4;
      case "title5":
        return Typography.title5;
      case "title6":
        return Typography.title6;
      case "subtitle1":
        return Typography.subtitle1;
      case "subtitle2":
        return Typography.subtitle2;
      case "body1":
        return Typography.body1;
      case "body2":
        return Typography.body2;
      case "caption1":
        return Typography.caption1;
      case "caption2":
        return Typography.caption2;
      case "bodyLargeSemibold":
        return Typography.bodyLargeSemibold;
      case "bodyMediumSemibold":
        return Typography.bodyMediumSemibold;
      case "bodySmallSemibold":
        return Typography.bodySmallSemibold;
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
