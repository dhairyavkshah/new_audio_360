import React from "react";
import { StyleSheet, Pressable, ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useThemeContext } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentControlRadius,
  FluentDuration,
  FluentEasingValues,
  getShadowStyle,
  FluentLightColors,
  FluentDarkColors,
} from "@/constants/fluent2";

interface GlassCardProps {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  intensity?: number;
  disabled?: boolean;
  selected?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({
  children,
  onPress,
  style,
  intensity = 50,
  disabled = false,
  selected = false,
}: GlassCardProps) {
  const { isDark } = useThemeContext();
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const handlePressIn = () => {
    if (!disabled && onPress) {
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
    }
  };

  const handlePressOut = () => {
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
  };

  const shadowStyle = getShadowStyle('shadow2', isDark);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !onPress}
      style={[styles.card, shadowStyle, animatedStyle, style]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={intensity}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.blur, 
            { 
              borderColor: selected ? colors.colorBrandForeground1 : colors.colorNeutralStroke2,
              borderWidth: 1,
            }
          ]}
        >
          <Animated.View 
            style={[
              StyleSheet.absoluteFill, 
              { backgroundColor: colors.colorNeutralBackground3, borderRadius: FluentControlRadius.card - 1 },
              bgAnimatedStyle,
            ]} 
          />
          {children}
        </BlurView>
      ) : (
        <Animated.View
          style={[
            styles.blur,
            {
              backgroundColor: colors.colorNeutralBackground2,
              borderColor: selected ? colors.colorBrandForeground1 : colors.colorNeutralStroke2,
              borderWidth: 1,
            },
          ]}
        >
          <Animated.View 
            style={[
              StyleSheet.absoluteFill, 
              { backgroundColor: colors.colorNeutralBackground3, borderRadius: FluentControlRadius.card - 1 },
              bgAnimatedStyle,
            ]} 
          />
          {children}
        </Animated.View>
      )}
    </AnimatedPressable>
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
