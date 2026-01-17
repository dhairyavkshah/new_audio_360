import React, { useEffect } from "react";
import { StyleSheet, Pressable, View, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useThemeContext, useSkin } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentLightColors,
  FluentDarkColors,
} from "@/constants/fluent2";

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  size?: number;
  isPaused?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const RECORD_BUTTON_SIZE = 72;

export function RecordButton({
  isRecording,
  onPress,
  size = RECORD_BUTTON_SIZE,
  isPaused = false,
}: RecordButtonProps) {
  const { theme, isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { icons, shapes, components } = useSkin();
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withTiming(1.25, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording, pulseScale, pulseOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    onPress();
  };

  const recordButtonColor = theme.recordButton || colors.colorPaletteRedForeground1;

  const bevelStyle = components.useBevel ? {
    borderWidth: shapes.borderWidthThick,
    borderTopColor: 'rgba(255,255,255,0.4)',
    borderLeftColor: 'rgba(255,255,255,0.3)',
    borderBottomColor: 'rgba(0,0,0,0.5)',
    borderRightColor: 'rgba(0,0,0,0.4)',
  } : {};

  const glowStyle = components.useGlow ? {
    shadowColor: recordButtonColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: components.glowIntensity,
    shadowRadius: 15,
  } : {
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size + FluentSpacing.xxl,
            height: size + FluentSpacing.xxl,
            borderRadius: (size + FluentSpacing.xxl) / 2,
            borderWidth: 3,
            borderColor: recordButtonColor,
          },
          pulseStyle,
        ]}
      />
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: recordButtonColor,
          },
          bevelStyle,
          glowStyle,
          animatedStyle,
        ]}
      >
        <MaterialCommunityIcons
          name={(isPaused ? icons.play || 'play' : isRecording ? 'pause' : icons.microphone) as keyof typeof MaterialCommunityIcons.glyphMap}
          size={size * 0.35}
          color="#FFFFFF"
        />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  pulse: {
    position: "absolute",
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
});
