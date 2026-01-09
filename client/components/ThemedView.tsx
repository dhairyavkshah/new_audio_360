import { View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { SafeAreaSpacing } from "@/constants/theme";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  useSafeTop?: boolean;
  useSafeBottom?: boolean;
  useSafeHorizontal?: boolean;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  useSafeTop = false,
  useSafeBottom = false,
  useSafeHorizontal = false,
  ...otherProps
}: ThemedViewProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const backgroundColor =
    isDark && darkColor
      ? darkColor
      : !isDark && lightColor
        ? lightColor
        : theme.backgroundRoot;

  const safeAreaStyle = {
    paddingTop: useSafeTop ? Math.max(insets.top, SafeAreaSpacing.top) : 0,
    paddingBottom: useSafeBottom ? Math.max(insets.bottom, SafeAreaSpacing.bottom) : 0,
    paddingLeft: useSafeHorizontal ? Math.max(insets.left, SafeAreaSpacing.horizontal) : 0,
    paddingRight: useSafeHorizontal ? Math.max(insets.right, SafeAreaSpacing.horizontal) : 0,
  };

  return (
    <View
      style={[
        { backgroundColor },
        useSafeTop || useSafeBottom || useSafeHorizontal ? safeAreaStyle : null,
        style,
      ]}
      {...otherProps}
    />
  );
}
