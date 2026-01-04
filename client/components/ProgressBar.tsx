import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext, useSkin } from "@/contexts/ThemeContext";
import { Spacing } from "@/constants/theme";

interface ProgressBarProps {
  progress: number;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  width?: number;
  height?: number;
  showTextShadow?: boolean;
}

const THUMB_SIZE = 14;
const DEFAULT_HEIGHT = Spacing.waveformHeight;

export function ProgressBar({
  progress,
  duration,
  currentTime,
  onSeek,
  width = 320,
  height = DEFAULT_HEIGHT,
  showTextShadow = false,
}: ProgressBarProps) {
  const { theme, isDark } = useThemeContext();
  const { shapes, components } = useSkin();

  const textShadowStyle = showTextShadow ? {
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } : {};
  const translateX = useSharedValue(progress * (width - THUMB_SIZE));
  const isDragging = useSharedValue(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSeek = (seekTime: number) => {
    onSeek(seekTime);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      const newX = Math.max(0, Math.min(event.x, width - THUMB_SIZE));
      translateX.value = newX;
    })
    .onEnd(() => {
      isDragging.value = false;
      const seekTime = (translateX.value / (width - THUMB_SIZE)) * duration;
      scheduleOnRN(handleSeek, seekTime);
      scheduleOnRN(triggerHaptic);
    });

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const tapX = Math.max(0, Math.min(event.x, width - THUMB_SIZE));
      translateX.value = withSpring(tapX, { damping: 15, stiffness: 150 });
      const seekTime = (tapX / (width - THUMB_SIZE)) * duration;
      scheduleOnRN(handleSeek, seekTime);
      scheduleOnRN(triggerHaptic);
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const thumbStyle = useAnimatedStyle(() => {
    if (!isDragging.value) {
      translateX.value = progress * (width - THUMB_SIZE);
    }
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
  }));

  const trackRadius = components.progressStyle === 'lcd' || components.progressStyle === 'segments' 
    ? shapes.sliderTrackRadius 
    : height / 2;

  const bevelStyle = components.useBevel ? {
    borderWidth: shapes.borderWidth,
    borderTopColor: 'rgba(0,0,0,0.4)',
    borderLeftColor: 'rgba(0,0,0,0.3)',
    borderBottomColor: 'rgba(255,255,255,0.2)',
    borderRightColor: 'rgba(255,255,255,0.15)',
  } : {};

  const glowStyle = components.useGlow && components.glowColor ? {
    shadowColor: components.glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: components.glowIntensity * 0.7,
    shadowRadius: 6,
  } : {};

  const lcdStyle = components.useLcdEffect ? {
    backgroundColor: 'rgba(0,0,0,0.9)',
  } : {};

  return (
    <View style={[styles.container, { width }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.track,
            {
              height,
              borderRadius: trackRadius,
              backgroundColor: theme.backgroundSecondary,
            },
            bevelStyle,
            lcdStyle,
          ]}
        >
          <Animated.View
            style={[
              styles.fill,
              {
                height,
                borderRadius: trackRadius,
                backgroundColor: theme.primary,
              },
              glowStyle,
              fillStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.thumb,
              {
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: shapes.sliderThumbRadius,
                backgroundColor: "#FFFFFF",
                top: (height - THUMB_SIZE) / 2,
                borderColor: theme.primary,
              },
              thumbStyle,
            ]}
          />
        </Animated.View>
      </GestureDetector>
      <View style={styles.timeContainer}>
        <ThemedText type="caption" style={[{ color: theme.text }, textShadowStyle]}>
          {formatTime(currentTime)}
        </ThemedText>
        <ThemedText type="caption" style={[{ color: theme.text }, textShadowStyle]}>
          {formatTime(duration)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
  },
  track: {
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
  },
  thumb: {
    position: "absolute",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
});
