import React from "react";
import { View, StyleSheet, Pressable, Platform, ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeTokens } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { getButtonEffectStyle, getGlowStyle, ThemeTokens } from "@/lib/themeUtils";
import {
  FluentSpacing,
  FluentIconSize,
  FluentTouchTarget,
} from "@/constants/fluent2";

const SPRING_CONFIG = { damping: 22, stiffness: 250, mass: 1 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

function ControlButton({
  icon,
  size,
  color,
  onPress,
  isPrimary = false,
  isActive = false,
  tokens,
}: {
  icon: string;
  size: number;
  color: string;
  onPress: () => void;
  isPrimary?: boolean;
  isActive?: boolean;
  tokens: ThemeTokens;
}) {
  const { playTapSound } = useUiSound();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(isPrimary ? 0.92 : 0.9, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const handlePress = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        isPrimary ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
      );
    }
    onPress();
  };

  const { shapes, components, colors } = tokens;
  const buttonSize = isPrimary ? shapes.controlSizeLg : Math.max(shapes.controlSize, FluentTouchTarget.minimum);

  const buttonEffectStyle = isPrimary ? getButtonEffectStyle(tokens, 'primary') : {};
  const glowStyle = (components.useGlow && (isPrimary || isActive)) ? getGlowStyle(tokens) : null;

  const bevelStyle = components.useBevel ? {
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    borderLeftColor: 'rgba(255,255,255,0.2)',
    borderBottomColor: 'rgba(0,0,0,0.4)',
    borderRightColor: 'rgba(0,0,0,0.3)',
  } : {};

  const baseStyle: ViewStyle = {
    width: buttonSize,
    height: buttonSize,
    borderRadius: isPrimary ? shapes.buttonBorderRadius : shapes.controlSize / 2,
    justifyContent: "center",
    alignItems: "center",
  };

  const activeStyle: ViewStyle = isActive && !isPrimary ? { 
    backgroundColor: colors.surfaceVariant 
  } : {};

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={null}
      style={[
        baseStyle,
        isPrimary && buttonEffectStyle,
        activeStyle,
        glowStyle,
        bevelStyle,
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
  const tokens = useThemeTokens();
  const { icons, shapes, colors } = tokens;

  return (
    <View style={styles.container}>
      <View style={[styles.secondaryControls, { width: Math.max(shapes.controlSize, FluentTouchTarget.minimum) }]}>
        {onShuffle ? (
          <ControlButton
            icon={icons.shuffle}
            size={FluentIconSize.regular}
            color={shuffleEnabled ? colors.primary : colors.textSecondary}
            onPress={onShuffle}
            isActive={shuffleEnabled}
            tokens={tokens}
          />
        ) : (
          <View style={{ width: shapes.controlSize, height: shapes.controlSize }} />
        )}
      </View>

      <View style={styles.mainControls}>
        <ControlButton
          icon={icons.skipPrevious}
          size={FluentIconSize.large}
          color={colors.text}
          onPress={onPrevious}
          tokens={tokens}
        />
        <ControlButton
          icon={isPlaying ? icons.pause : icons.play}
          size={FluentIconSize.xlarge}
          color={colors.onPrimary}
          onPress={onPlayPause}
          isPrimary
          tokens={tokens}
        />
        <ControlButton
          icon={icons.skipNext}
          size={FluentIconSize.large}
          color={colors.text}
          onPress={onNext}
          tokens={tokens}
        />
      </View>

      <View style={[styles.secondaryControls, { width: Math.max(shapes.controlSize, FluentTouchTarget.minimum) }]}>
        {onRepeat ? (
          <ControlButton
            icon={repeatMode === "one" ? icons.repeatOnce : icons.repeat}
            size={FluentIconSize.regular}
            color={repeatMode !== "off" ? colors.primary : colors.textSecondary}
            onPress={onRepeat}
            isActive={repeatMode !== "off"}
            tokens={tokens}
          />
        ) : (
          <View style={{ width: shapes.controlSize, height: shapes.controlSize }} />
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
    paddingHorizontal: FluentSpacing.xxl,
  },
  mainControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.xl,
  },
  secondaryControls: {
    alignItems: "center",
  },
});
