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
import { BorderRadius, M3Motion, M3Elevation } from "@/constants/theme";

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
      duration: M3Motion.durationShort3,
      easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
    });
    bgOpacity.value = withTiming(1, { duration: M3Motion.durationShort3 });
  }, [disabled, scale, bgOpacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { 
      duration: M3Motion.durationShort4,
      easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
    });
    bgOpacity.value = withTiming(0, { duration: M3Motion.durationShort4 });
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
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.14)",
  } : {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  });

  const borderStyle = noBorder ? {} : {
    borderColor: selected ? theme.primary : theme.outlineVariant,
    borderWidth: 1,
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
