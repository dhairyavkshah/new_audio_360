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
import {
  FluentSpacing,
  FluentRadius,
  FluentControlRadius,
  FluentDuration,
  FluentEasingValues,
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);
  const longPressTriggered = useRef(false);

  const colors = isDark ? FluentDarkColors : FluentLightColors;

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
      duration: FluentDuration.fast,
      easing: Easing.bezier(
        FluentEasingValues.decelerateMid.x1,
        FluentEasingValues.decelerateMid.y1,
        FluentEasingValues.decelerateMid.x2,
        FluentEasingValues.decelerateMid.y2
      ),
    });
    bgOpacity.value = withTiming(1, { duration: FluentDuration.fast });
  }, [disabled, scale, bgOpacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { 
      duration: FluentDuration.normal,
      easing: Easing.bezier(
        FluentEasingValues.decelerateMid.x1,
        FluentEasingValues.decelerateMid.y1,
        FluentEasingValues.decelerateMid.x2,
        FluentEasingValues.decelerateMid.y2
      ),
    });
    bgOpacity.value = withTiming(0, { duration: FluentDuration.normal });
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

  const shadowStyle = noShadow ? {} : getShadowStyle('shadow2', isDark);

  const borderStyle = noBorder ? {} : {
    borderColor: selected ? colors.colorBrandForeground1 : colors.colorNeutralStroke2,
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
          backgroundColor: colors.colorNeutralBackground2,
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
            backgroundColor: colors.colorNeutralBackground3, 
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
