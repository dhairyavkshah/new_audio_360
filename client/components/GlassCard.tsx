import React from "react";
import { StyleSheet, Pressable, ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface GlassCardProps {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  intensity?: number;
  disabled?: boolean;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({
  children,
  onPress,
  style,
  intensity = 50,
  disabled = false,
}: GlassCardProps) {
  const { theme, isDark } = useThemeContext();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && onPress) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !onPress}
      style={[styles.card, animatedStyle, style]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={intensity}
          tint={isDark ? "dark" : "light"}
          style={[styles.blur, { borderColor: theme.outlineVariant }]}
        >
          {children}
        </BlurView>
      ) : (
        <Animated.View
          style={[
            styles.blur,
            {
              backgroundColor: theme.surfaceContainerHigh,
              borderColor: theme.outlineVariant,
            },
          ]}
        >
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
    borderWidth: 1,
  },
});
