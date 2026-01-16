import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Layout } from "@/constants/theme";

const MIN_BOTTOM_PADDING = 16;

let useBottomTabBarHeightFn: (() => number) | null = null;
try {
  const bottomTabs = require("@react-navigation/bottom-tabs");
  useBottomTabBarHeightFn = bottomTabs.useBottomTabBarHeight;
} catch {
  useBottomTabBarHeightFn = null;
}

export function useSafeTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, MIN_BOTTOM_PADDING) : insets.bottom;
  const fallback = Layout.bottomNavHeight + safeBottom;

  if (!useBottomTabBarHeightFn) {
    return fallback;
  }

  try {
    const height = useBottomTabBarHeightFn();
    if (Number.isFinite(height) && height > 0) {
      return Platform.OS === 'android' ? Math.max(height, fallback) : height;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
