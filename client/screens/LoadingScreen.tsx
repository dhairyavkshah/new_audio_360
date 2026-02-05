import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentText } from "@/components/fluent";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import { FluentSpacing } from "@/constants/fluent2";

type LoadingScreenProps = {
  message?: string;
};

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemedColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.colorNeutralBackground1, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator 
        size="large" 
        color={colors.colorBrandForeground1} 
        style={styles.loader}
      />
      <FluentText variant="body1" color="secondary" align="center">
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
  loader: {
    marginBottom: FluentSpacing.l,
  },
});
