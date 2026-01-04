import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext, useSkin } from "@/contexts/ThemeContext";
import { Spacing } from "@/constants/theme";

interface VolumeSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  icon?: string;
  showValue?: boolean;
  vertical?: boolean;
}

const SLIDER_HEIGHT = 160;
const SLIDER_WIDTH = 48;
const THUMB_SIZE = 24;
const TRACK_HEIGHT = SLIDER_HEIGHT - THUMB_SIZE;

export function VolumeSlider({
  label,
  value,
  onValueChange,
  icon,
  showValue = false,
  vertical = true,
}: VolumeSliderProps) {
  const { theme } = useThemeContext();
  const { icons, shapes, components } = useSkin();
  const thumbPosition = useSharedValue(TRACK_HEIGHT - (value / 100) * TRACK_HEIGHT);

  const volumeIcon = icon || icons.volumeHigh;

  useEffect(() => {
    thumbPosition.value = withSpring(TRACK_HEIGHT - (value / 100) * TRACK_HEIGHT, {
      damping: 15,
      stiffness: 150,
    });
  }, [value, thumbPosition]);

  const triggerTickHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleValueChange = (newValue: number) => {
    onValueChange(newValue);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newY = Math.max(0, Math.min(TRACK_HEIGHT, event.y - THUMB_SIZE / 2));
      thumbPosition.value = newY;
      const newValue = Math.round(((TRACK_HEIGHT - newY) / TRACK_HEIGHT) * 100);
      const clampedValue = Math.max(0, Math.min(100, newValue));
      scheduleOnRN(handleValueChange, clampedValue);
    })
    .onEnd(() => {
      scheduleOnRN(triggerTickHaptic);
    });

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const tapY = Math.max(0, Math.min(TRACK_HEIGHT, event.y - THUMB_SIZE / 2));
      thumbPosition.value = withSpring(tapY, { damping: 15 });
      const newValue = Math.round(((TRACK_HEIGHT - tapY) / TRACK_HEIGHT) * 100);
      const clampedValue = Math.max(0, Math.min(100, newValue));
      scheduleOnRN(handleValueChange, clampedValue);
      scheduleOnRN(triggerTickHaptic);
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: thumbPosition.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    height: TRACK_HEIGHT - thumbPosition.value + THUMB_SIZE / 2,
  }));

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
    shadowOpacity: components.glowIntensity * 0.6,
    shadowRadius: 8,
  } : {};

  return (
    <View style={styles.container}>
      <View style={[
        styles.labelContainer, 
        { 
          backgroundColor: theme.backgroundSecondary,
          borderRadius: shapes.controlSize / 2,
          width: shapes.controlSize,
          height: shapes.controlSize,
        }
      ]}>
        <MaterialCommunityIcons 
          name={volumeIcon as keyof typeof MaterialCommunityIcons.glyphMap} 
          size={20} 
          color={theme.primary} 
        />
      </View>
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.sliderTrack,
            {
              backgroundColor: theme.backgroundSecondary,
              height: SLIDER_HEIGHT,
              borderRadius: shapes.sliderTrackRadius,
            },
            bevelStyle,
          ]}
        >
          <Animated.View
            style={[
              styles.sliderFill,
              { 
                backgroundColor: theme.primary,
                borderRadius: shapes.sliderTrackRadius,
              },
              glowStyle,
              fillStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.sliderThumb,
              { 
                backgroundColor: "#FFFFFF", 
                borderColor: theme.primary,
                borderRadius: shapes.sliderThumbRadius,
                width: THUMB_SIZE,
                height: THUMB_SIZE,
              },
              thumbStyle,
            ]}
          />
        </Animated.View>
      </GestureDetector>
      <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginHorizontal: Spacing["2xl"],
  },
  labelContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  sliderFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sliderThumb: {
    position: "absolute",
    left: (SLIDER_WIDTH - THUMB_SIZE) / 2,
    borderWidth: 3,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  label: {
    marginTop: Spacing.md,
    fontWeight: "500",
    textAlign: "center",
  },
});
