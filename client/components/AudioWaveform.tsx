import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";

interface AudioWaveformProps {
  isAnimating?: boolean;
  barCount?: number;
  barWidth?: number;
  height?: number;
  style?: ViewStyle;
  color?: string;
}

function WaveBar({
  delay,
  isAnimating,
  barWidth,
  height,
  color,
}: {
  delay: number;
  isAnimating: boolean;
  barWidth: number;
  height: number;
  color: string;
}) {
  const animatedHeight = useSharedValue(0.3);

  useEffect(() => {
    if (isAnimating) {
      animatedHeight.value = withDelay(
        delay,
        withRepeat(
          withTiming(Math.random() * 0.7 + 0.3, {
            duration: 300 + Math.random() * 200,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        )
      );
    } else {
      animatedHeight.value = withTiming(0.2, { duration: 300 });
    }
  }, [isAnimating]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height * animatedHeight.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { width: barWidth, backgroundColor: color, borderRadius: barWidth / 2 },
        animatedStyle,
      ]}
    />
  );
}

export function AudioWaveform({
  isAnimating = false,
  barCount = 40,
  barWidth = 4,
  height = 100,
  style,
  color,
}: AudioWaveformProps) {
  const { colors } = useFluent2Theme();
  const barColor = color || colors.brandPrimary;

  return (
    <View style={[styles.container, { height }, style]}>
      {Array.from({ length: barCount }).map((_, index) => (
        <WaveBar
          key={index}
          delay={index * 50}
          isAnimating={isAnimating}
          barWidth={barWidth}
          height={height}
          color={barColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  bar: {
    minHeight: 8,
  },
});
