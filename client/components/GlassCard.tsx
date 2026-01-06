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
import { Spacing, BorderRadius, M3Motion } from "@/constants/theme";

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
  const { theme, isDark } = useThemeContext();
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const handlePressIn = () => {
    if (!disabled && onPress) {
      scale.value = withTiming(0.98, { 
        duration: M3Motion.durationShort3,
        easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
      });
      bgOpacity.value = withTiming(1, { duration: M3Motion.durationShort3 });
    }
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { 
      duration: M3Motion.durationShort4,
      easing: Easing.bezier(M3Motion.easingStandard.x1, M3Motion.easingStandard.y1, M3Motion.easingStandard.x2, M3Motion.easingStandard.y2),
    });
    bgOpacity.value = withTiming(0, { duration: M3Motion.durationShort4 });
  };

  const shadowStyle = Platform.OS === "web" ? {
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.14)",
  } : {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  };

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
              borderColor: selected ? theme.primary : theme.outlineVariant,
              borderWidth: 1,
            }
          ]}
        >
          <Animated.View 
            style={[
              StyleSheet.absoluteFill, 
              { backgroundColor: theme.surfaceContainerHigh, borderRadius: BorderRadius.card - 1 },
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
              backgroundColor: theme.surfaceContainerLow,
              borderColor: selected ? theme.primary : theme.outlineVariant,
              borderWidth: 1,
            },
          ]}
        >
          <Animated.View 
            style={[
              StyleSheet.absoluteFill, 
              { backgroundColor: theme.surfaceContainerHigh, borderRadius: BorderRadius.card - 1 },
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
    borderRadius: BorderRadius.card,
    overflow: "hidden",
  },
  blur: {
    padding: Spacing.size4,
    borderRadius: BorderRadius.card,
  },
});
