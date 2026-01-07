import React, { useEffect, memo } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useThemeContext } from "@/contexts/ThemeContext";

interface LiveAudioWaveformProps {
  audioLevel: number;
  isActive?: boolean;
  barCount?: number;
  barWidth?: number;
  height?: number;
  style?: ViewStyle;
  color?: string;
  sensitivity?: number;
}

interface WaveBarProps {
  audioLevel: number;
  index: number;
  totalBars: number;
  isActive: boolean;
  barWidth: number;
  height: number;
  color: string;
  sensitivity: number;
}

const LiveWaveBar = memo(function LiveWaveBar({
  audioLevel,
  index,
  totalBars,
  isActive,
  barWidth,
  height,
  color,
  sensitivity,
}: WaveBarProps) {
  const animatedHeight = useSharedValue(0.15);
  const lastAudioLevelRef = React.useRef(audioLevel);

  const centerIndex = totalBars / 2;
  const distanceFromCenter = Math.abs(index - centerIndex) / centerIndex;
  const positionMultiplier = 1 - distanceFromCenter * 0.5;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (!isActive) {
      animatedHeight.value = withTiming(0.15, { duration: 200 });
      return;
    }

    const updateAnimation = () => {
      const currentLevel = lastAudioLevelRef.current;
      const hasRealAudio = currentLevel > -120;
      
      if (hasRealAudio) {
        const normalizedLevel = Math.min(1, Math.max(0, (currentLevel + 160) / 160));
        const adjustedLevel = Math.pow(normalizedLevel, 1 / sensitivity);
        
        const phaseOffset = (index / totalBars) * Math.PI * 2;
        const time = Date.now() * 0.003;
        const waveEffect = Math.sin(phaseOffset + time) * 0.15 + 0.85;
        
        const jitter = (Math.random() - 0.5) * 0.1;
        const targetHeight = Math.max(0.2, Math.min(1, adjustedLevel * positionMultiplier * waveEffect + jitter));
        
        animatedHeight.value = withSpring(targetHeight, {
          damping: 10,
          stiffness: 300,
          mass: 0.3,
        });
      } else {
        const time = Date.now() * 0.005;
        const phaseOffset = (index / totalBars) * Math.PI * 2;
        const waveValue = Math.sin(phaseOffset + time) * 0.35 + 0.55;
        const jitter = (Math.random() - 0.5) * 0.2;
        const targetHeight = Math.max(0.25, Math.min(0.9, waveValue * positionMultiplier + jitter));
        
        animatedHeight.value = withSpring(targetHeight, {
          damping: 12,
          stiffness: 180,
          mass: 0.4,
        });
      }
    };

    updateAnimation();
    interval = setInterval(updateAnimation, 60);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, index, totalBars, sensitivity, positionMultiplier]);

  useEffect(() => {
    lastAudioLevelRef.current = audioLevel;
  }, [audioLevel]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: interpolate(
      animatedHeight.value,
      [0, 1],
      [height * 0.15, height],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: barWidth,
          backgroundColor: color,
          borderRadius: barWidth / 2,
        },
        animatedStyle,
      ]}
    />
  );
});

export function LiveAudioWaveform({
  audioLevel,
  isActive = false,
  barCount = 40,
  barWidth = 4,
  height = 100,
  style,
  color,
  sensitivity = 1.5,
}: LiveAudioWaveformProps) {
  const { theme } = useThemeContext();
  const barColor = color || theme.primary;

  const barIndices = Array.from({ length: barCount }, (_, i) => i);

  return (
    <View style={[styles.container, { height }, style]}>
      {barIndices.map((index) => (
        <LiveWaveBar
          key={index}
          audioLevel={audioLevel}
          index={index}
          totalBars={barCount}
          isActive={isActive}
          barWidth={barWidth}
          height={height}
          color={barColor}
          sensitivity={sensitivity}
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
