import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Layout } from "@/constants/theme";

let useBottomTabBarHeightFn: (() => number) | null = null;
try {
  const bottomTabs = require("@react-navigation/bottom-tabs");
  useBottomTabBarHeightFn = bottomTabs.useBottomTabBarHeight;
} catch {
  useBottomTabBarHeightFn = null;
}

export function useSafeTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  const fallback = Layout.bottomNavHeight + insets.bottom;

  if (!useBottomTabBarHeightFn) {
    return fallback;
  }

  try {
    const height = useBottomTabBarHeightFn();
    return Number.isFinite(height) && height > 0 ? height : fallback;
  } catch {
    return fallback;
  }
}
