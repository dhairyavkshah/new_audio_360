import React, { useCallback, useRef } from "react";
import { StyleSheet, Pressable, ViewStyle, Platform, StyleProp, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentControlRadius,
  getShadowStyle,
  FluentLightColors,
  FluentDarkColors,
} from "@/constants/fluent2";

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  selected?: boolean;
  disabled?: boolean;
  noBorder?: boolean;
  noShadow?: boolean;
  accessibilityLabel?: string;
}

export function AnimatedCard({
  children,
  onPress,
  onLongPress,
  style,
  borderRadius = FluentRadius.large,
  selected = false,
  disabled = false,
  noBorder = false,
  noShadow = false,
  accessibilityLabel,
}: AnimatedCardProps) {
  const { isDark } = useThemeContext();
  const { playTapSound } = useUiSound();
  const longPressTriggered = useRef(false);

  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    longPressTriggered.current = false;
  }, [disabled]);

  const handlePressOut = useCallback(() => {
  }, []);

  const handlePress = useCallback(() => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    playTapSound();
    onPress?.();
  }, [onPress, playTapSound]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      longPressTriggered.current = true;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      playTapSound();
      onLongPress();
    }
  }, [onLongPress, playTapSound]);

  const shadowStyle = noShadow ? {} : getShadowStyle('shadow2', isDark);

  const borderStyle = noBorder ? {} : {
    borderColor: selected ? colors.colorBrandForeground1 : colors.colorNeutralStroke2,
    borderWidth: 1,
  };

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress ? handleLongPress : undefined}
      delayLongPress={400}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      android_ripple={null}
      style={[
        styles.container,
        {
          backgroundColor: colors.colorNeutralBackground2,
          borderRadius,
        },
        borderStyle,
        shadowStyle,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
