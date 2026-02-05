import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { FluentText } from "@/components/fluent";
import { useThemeContext, useThemeTokens } from "@/contexts/ThemeContext";
import { getProgressBarStyle } from "@/lib/themeUtils";
import {
  FluentSpacing,
  FluentDuration,
  FluentCurve,
  FluentSliderSize,
} from "@/constants/fluent2";

interface ProgressBarProps {
  progress: number;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  isSeeking?: boolean;
  width?: number;
  height?: number;
  showTextShadow?: boolean;
}

const THUMB_SIZE = FluentSliderSize.thumbSmall;
const TRACK_HEIGHT = FluentSliderSize.trackThin;
const ACTIVE_TRACK_HEIGHT = FluentSliderSize.trackMedium;

export function ProgressBar({
  progress,
  duration,
  currentTime,
  onSeek,
  isSeeking = false,
  width = 320,
  height = TRACK_HEIGHT,
  showTextShadow = false,
}: ProgressBarProps) {
  const { isDark } = useThemeContext();
  const tokens = useThemeTokens();
  const { trackStyle, progressStyle, trackRadius } = getProgressBarStyle(tokens);

  const textShadowStyle = showTextShadow ? Platform.select({
    native: {
      textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    default: {
      textShadow: `0px 1px 3px ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)'}`,
    },
  }) : {};
  
  const translateX = useSharedValue(progress * (width - THUMB_SIZE));
  const isDragging = useSharedValue(false);
  const trackHeight = useSharedValue<number>(TRACK_HEIGHT);

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds) || seconds < 0 || seconds > 36000) {
      return "0:00";
    }
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
      trackHeight.value = withTiming(ACTIVE_TRACK_HEIGHT, { 
        duration: FluentDuration.fast,
        easing: FluentCurve.decelerateMid,
      });
    })
    .onUpdate((event) => {
      const newX = Math.max(0, Math.min(event.x, width - THUMB_SIZE));
      translateX.value = newX;
    })
    .onEnd(() => {
      isDragging.value = false;
      trackHeight.value = withTiming(TRACK_HEIGHT, { 
        duration: FluentDuration.normal,
        easing: FluentCurve.decelerateMid,
      });
      const seekTime = (translateX.value / (width - THUMB_SIZE)) * duration;
      runOnJS(handleSeek)(seekTime);
      runOnJS(triggerHaptic)();
    });

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const tapX = Math.max(0, Math.min(event.x, width - THUMB_SIZE));
      translateX.value = withTiming(tapX, { 
        duration: FluentDuration.normal,
        easing: FluentCurve.decelerateMid,
      });
      const seekTime = (tapX / (width - THUMB_SIZE)) * duration;
      runOnJS(handleSeek)(seekTime);
      runOnJS(triggerHaptic)();
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const thumbStyle = useAnimatedStyle(() => {
    // Only update thumb position from progress when NOT dragging and NOT seeking
    // This prevents the slider from jumping back during seek operations
    if (!isDragging.value && !isSeeking) {
      translateX.value = progress * (width - THUMB_SIZE);
    }
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
  }));

  const trackAnimatedStyle = useAnimatedStyle(() => ({
    height: trackHeight.value,
  }));

  return (
    <View style={[styles.container, { width }]}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.trackWrapper}>
          <Animated.View
            style={[
              styles.track,
              trackStyle,
              trackAnimatedStyle,
            ]}
          >
            <Animated.View
              style={[
                styles.fill,
                progressStyle,
                fillStyle,
              ]}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.thumb,
              {
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: tokens.colors.primary,
                ...Platform.select({
                  ios: {
                    shadowColor: progressStyle.shadowColor || tokens.colors.primary,
                    shadowOffset: progressStyle.shadowOffset || { width: 0, height: 2 },
                    shadowOpacity: progressStyle.shadowOpacity || 0.25,
                    shadowRadius: progressStyle.shadowRadius || 4,
                  },
                  android: {
                    elevation: 4,
                  },
                  default: {},
                }),
              },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>
      <View style={styles.timeContainer}>
        <FluentText variant="caption1" color="tertiary" style={textShadowStyle}>
          {formatTime(currentTime)}
        </FluentText>
        <FluentText variant="caption1" color="tertiary" style={textShadowStyle}>
          {formatTime(duration)}
        </FluentText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
  },
  trackWrapper: {
    height: 32,
    justifyContent: "center",
  },
  track: {
    height: TRACK_HEIGHT,
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    height: "100%",
  },
  thumb: {
    position: "absolute",
    top: (32 - THUMB_SIZE) / 2,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: FluentSpacing.s,
  },
});
