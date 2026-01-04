import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Fluent2 } from "@/constants/fluent2";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onShuffle?: () => void;
  onRepeat?: () => void;
  shuffleEnabled?: boolean;
  repeatMode?: "off" | "one" | "all";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ControlButton({
  icon,
  size,
  color,
  onPress,
  isPrimary = false,
  backgroundColor,
  isActive = false,
}: {
  icon: string;
  size: number;
  color: string;
  onPress: () => void;
  isPrimary?: boolean;
  backgroundColor?: string;
  isActive?: boolean;
}) {
  const { colors, radius } = useFluent2Theme();
  const { playTapSound } = useUiSound();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    playTapSound();
    Haptics.impactAsync(
      isPrimary ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    onPress();
  };

  const buttonSize = isPrimary ? 64 : 48;
  const buttonRadius = isPrimary ? radius.full : radius.full;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonRadius,
          justifyContent: "center",
          alignItems: "center",
        },
        isPrimary && { backgroundColor: backgroundColor || colors.brandPrimary },
        isActive && { backgroundColor: colors.brandPrimary + "30" },
        animatedStyle,
      ]}
    >
      <MaterialCommunityIcons 
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap} 
        size={size} 
        color={color} 
      />
    </AnimatedPressable>
  );
}

export function PlaybackControls({
  isPlaying,
  onPlayPause,
  onPrevious,
  onNext,
  onShuffle,
  onRepeat,
  shuffleEnabled = false,
  repeatMode = "off",
}: PlaybackControlsProps) {
  const { colors, spacing } = useFluent2Theme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.xl }]}>
      <View style={styles.secondaryControls}>
        {onShuffle ? (
          <ControlButton
            icon="shuffle"
            size={20}
            color={shuffleEnabled ? colors.brandPrimary : colors.textSecondary}
            onPress={onShuffle}
            isActive={shuffleEnabled}
          />
        ) : (
          <View style={{ width: 48, height: 48 }} />
        )}
      </View>

      <View style={[styles.mainControls, { gap: spacing.xl }]}>
        <ControlButton
          icon="skip-previous"
          size={28}
          color={colors.textPrimary}
          onPress={onPrevious}
        />
        <ControlButton
          icon={isPlaying ? "pause" : "play"}
          size={32}
          color="#FFFFFF"
          onPress={onPlayPause}
          isPrimary
        />
        <ControlButton
          icon="skip-next"
          size={28}
          color={colors.textPrimary}
          onPress={onNext}
        />
      </View>

      <View style={styles.secondaryControls}>
        {onRepeat ? (
          <ControlButton
            icon={repeatMode === "one" ? "repeat-once" : "repeat"}
            size={20}
            color={repeatMode !== "off" ? colors.brandPrimary : colors.textSecondary}
            onPress={onRepeat}
            isActive={repeatMode !== "off"}
          />
        ) : (
          <View style={{ width: 48, height: 48 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mainControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  secondaryControls: {
    alignItems: "center",
    width: 48,
  },
});
