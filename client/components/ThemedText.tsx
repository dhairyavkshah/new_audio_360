/**
 * @deprecated Use FluentText from @/components/fluent instead.
 * This component is kept for backward compatibility but will be removed in a future version.
 */
import { Text, type TextProps, TextStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { FluentTypography, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "display"
    | "largeTitle"
    | "title1"
    | "title2"
    | "title3"
    | "subtitle1"
    | "subtitle2"
    | "body1"
    | "body1Strong"
    | "body2"
    | "body2Strong"
    | "caption1"
    | "caption1Strong"
    | "caption2"
    | "link"
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
  type = "body1",
  ...rest
}: ThemedTextProps) {
  const { isDark } = useTheme();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const getColor = (): string => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return colors.colorBrandForegroundLink;
    }

    if (
      type === "caption1" ||
      type === "caption1Strong" ||
      type === "caption2" ||
      type === "caption" ||
      type === "captionSmall" ||
      type === "small" ||
      type === "labelSmall"
    ) {
      return colors.colorNeutralForeground2;
    }

    return colors.colorNeutralForeground1;
  };

  const getTypeStyle = (): TextStyle => {
    switch (type) {
      case "display":
        return FluentTypography.display;
      case "largeTitle":
      case "displayLarge":
        return FluentTypography.largeTitle;
      case "displayMedium":
        return FluentTypography.title1;
      case "displaySmall":
        return FluentTypography.title2;
      case "title1":
      case "titleLarge":
      case "h1":
        return FluentTypography.title1;
      case "title2":
      case "titleMedium":
      case "h2":
        return FluentTypography.title2;
      case "title3":
      case "titleSmall":
      case "h3":
        return FluentTypography.title3;
      case "h4":
        return FluentTypography.subtitle1;
      case "subtitle1":
        return FluentTypography.subtitle1;
      case "subtitle2":
        return FluentTypography.subtitle2;
      case "body1":
      case "body":
      case "bodyMedium":
        return FluentTypography.body1;
      case "body1Strong":
      case "labelLarge":
        return FluentTypography.body1Strong;
      case "body2":
      case "bodyLarge":
        return FluentTypography.body2;
      case "body2Strong":
        return FluentTypography.body2Strong;
      case "bodySmall":
      case "small":
        return FluentTypography.caption1;
      case "caption1":
      case "caption":
      case "labelMedium":
        return FluentTypography.caption1;
      case "caption1Strong":
        return FluentTypography.caption1Strong;
      case "caption2":
      case "captionSmall":
      case "labelSmall":
        return FluentTypography.caption2;
      case "link":
        return FluentTypography.body1;
      default:
        return FluentTypography.body1;
    }
  };

  return (
    <Text 
      style={[{ color: getColor() }, getTypeStyle(), style]} 
      {...rest} 
    />
  );
}
