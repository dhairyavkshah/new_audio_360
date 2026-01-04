import React, { useCallback, useRef } from "react";
import { StyleSheet, Pressable, ViewStyle, Platform, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { BorderRadius, Fluent2Tokens } from "@/constants/theme";

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedCard({
  children,
  onPress,
  onLongPress,
  style,
  borderRadius = BorderRadius.large,
  selected = false,
  disabled = false,
  noBorder = false,
  noShadow = false,
  accessibilityLabel,
}: AnimatedCardProps) {
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);
  const longPressTriggered = useRef(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    longPressTriggered.current = false;
    scale.value = withTiming(0.98, { 
      duration: Fluent2Tokens.durationFast,
      easing: Easing.out(Easing.cubic),
    });
    bgOpacity.value = withTiming(1, { duration: Fluent2Tokens.durationFast });
  }, [disabled, scale, bgOpacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { 
      duration: Fluent2Tokens.durationNormal,
      easing: Easing.out(Easing.cubic),
    });
    bgOpacity.value = withTiming(0, { duration: Fluent2Tokens.durationNormal });
  }, [scale, bgOpacity]);

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

  const shadowStyle = noShadow ? {} : (Platform.OS === "web" ? {
    boxShadow: Fluent2Tokens.shadow2,
  } : {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  });

  const borderStyle = noBorder ? {} : {
    borderColor: selected ? theme.primary : theme.outlineVariant,
    borderWidth: Fluent2Tokens.strokeWidthThin,
  };

  return (
    <AnimatedPressable
      onPress={onPress ? handlePress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress ? handleLongPress : undefined}
      delayLongPress={400}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceContainerLow,
          borderRadius,
        },
        borderStyle,
        shadowStyle,
        animatedStyle,
        style,
      ]}
    >
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { 
            backgroundColor: theme.surfaceContainerHigh, 
            borderRadius: Math.max(0, borderRadius - 1),
          },
          bgAnimatedStyle,
        ]} 
      />
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
