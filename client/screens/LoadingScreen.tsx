import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";

const appIcon = require("../../assets/images/icon.png");

type LoadingScreenProps = {
  message?: string;
};

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  return (
    <View style={[styles.container, { backgroundColor: colors.colorNeutralBackground1, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.iconContainer}>
        <Image
          source={appIcon}
          style={styles.icon}
          contentFit="contain"
          priority="high"
          cachePolicy="memory-disk"
        />
      </View>
      <ActivityIndicator 
        size={24}
        color={colors.colorBrandForeground1} 
        style={styles.loader}
      />
      <FluentText variant="caption1" color="secondary" align="center">
        {message}
      </FluentText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: FluentSpacing.l,
  },
  icon: {
    width: 120,
    height: 120,
  },
  loader: {
    marginBottom: FluentSpacing.s,
  },
});
