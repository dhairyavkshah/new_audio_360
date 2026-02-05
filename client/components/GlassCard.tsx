import React from "react";
import { StyleSheet, Pressable, ViewStyle, Platform, View } from "react-native";
import { BlurView } from "expo-blur";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentControlRadius,
  getShadowStyle,
  FluentBorderWidth,
} from "@/constants/fluent2";

interface GlassCardProps {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  intensity?: number;
  disabled?: boolean;
  selected?: boolean;
}

export function GlassCard({
  children,
  onPress,
  style,
  intensity = 50,
  disabled = false,
  selected = false,
}: GlassCardProps) {
  const { isDark } = useThemeContext();
  const colors = useThemedColors();
  const shadowStyle = getShadowStyle('shadow2', isDark);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      android_ripple={null}
      style={[styles.card, shadowStyle, style]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={intensity}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.blur, 
            { 
              borderColor: selected ? colors.colorBrandForeground1 : colors.colorNeutralStroke2,
              borderWidth: FluentBorderWidth.thin,
            }
          ]}
        >
          {children}
        </BlurView>
      ) : (
        <View
          style={[
            styles.blur,
            {
              backgroundColor: colors.colorNeutralBackground2,
              borderColor: selected ? colors.colorBrandForeground1 : colors.colorNeutralStroke2,
              borderWidth: FluentBorderWidth.thin,
            },
          ]}
        >
          {children}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: FluentControlRadius.card,
    overflow: "hidden",
  },
  blur: {
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
  },
});
