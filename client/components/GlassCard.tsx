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
import { Spacing, BorderRadius, Fluent2Tokens } from "@/constants/theme";

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
        duration: Fluent2Tokens.durationFast,
        easing: Easing.out(Easing.cubic),
      });
      bgOpacity.value = withTiming(1, { duration: Fluent2Tokens.durationFast });
    }
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { 
      duration: Fluent2Tokens.durationNormal,
      easing: Easing.out(Easing.cubic),
    });
    bgOpacity.value = withTiming(0, { duration: Fluent2Tokens.durationNormal });
  };

  const shadowStyle = Platform.OS === "web" ? {
    boxShadow: Fluent2Tokens.shadow2,
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
              borderWidth: Fluent2Tokens.strokeWidthThin,
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
              borderWidth: Fluent2Tokens.strokeWidthThin,
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
