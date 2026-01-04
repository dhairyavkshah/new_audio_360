import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';

interface FluentProgressBarProps {
  progress: number;
  height?: number;
  animated?: boolean;
  style?: ViewStyle;
}

export function FluentProgressBar({
  progress,
  height = 4,
  animated = true,
  style,
}: FluentProgressBarProps) {
  const { colors, radius } = useFluent2Theme();
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const clampedProgress = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: clampedProgress,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(clampedProgress);
    }
  }, [clampedProgress, animated]);

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: colors.stroke.secondary,
          borderRadius: radius.full,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: colors.brand.primary,
            borderRadius: radius.full,
            width: animatedWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
