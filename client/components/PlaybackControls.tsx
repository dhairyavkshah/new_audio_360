import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useThemeContext, useSkin } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentSpacing,
  FluentIconSize,
  FluentSpring,
  FluentLightColors,
  FluentDarkColors,
} from "@/constants/fluent2";

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
  borderRadius,
  glowColor,
  useGlow,
  fluentColors,
}: {
  icon: string;
  size: number;
  color: string;
  onPress: () => void;
  isPrimary?: boolean;
  backgroundColor?: string;
  isActive?: boolean;
  borderRadius?: number;
  glowColor?: string | null;
  useGlow?: boolean;
  fluentColors: typeof FluentLightColors;
}) {
  const { theme } = useThemeContext();
  const { shapes, components } = useSkin();
  const { playTapSound } = useUiSound();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, FluentSpring.standard);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, FluentSpring.standard);
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

  const buttonRadius = borderRadius ?? (isPrimary ? shapes.controlSizeLg / 2 : shapes.controlSize / 2);
  const buttonSize = isPrimary ? shapes.controlSizeLg : shapes.controlSize;

  const glowStyle = useGlow && glowColor ? {
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: components.glowIntensity,
    shadowRadius: 8,
  } : {};

  const bevelStyle = components.useBevel ? {
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    borderLeftColor: 'rgba(255,255,255,0.2)',
    borderBottomColor: 'rgba(0,0,0,0.4)',
    borderRightColor: 'rgba(0,0,0,0.3)',
  } : {};

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
        isPrimary && { backgroundColor: backgroundColor || fluentColors.colorBrandBackground },
        isActive && { backgroundColor: fluentColors.colorSubtleBackgroundPressed },
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
  const { theme, isDark } = useThemeContext();
  const { icons, shapes, components } = useSkin();
  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;

  return (
    <View style={styles.container}>
      <View style={[styles.secondaryControls, { width: shapes.controlSize }]}>
        {onShuffle ? (
          <ControlButton
            icon={icons.shuffle}
            size={FluentIconSize.regular}
            color={shuffleEnabled ? fluentColors.colorBrandForeground1 : fluentColors.colorNeutralForeground3}
            onPress={onShuffle}
            isActive={shuffleEnabled}
            useGlow={components.useGlow && shuffleEnabled}
            glowColor={components.glowColor}
            fluentColors={fluentColors}
          />
        ) : (
          <View style={{ width: shapes.controlSize, height: shapes.controlSize }} />
        )}
      </View>

      <View style={styles.mainControls}>
        <ControlButton
          icon={icons.skipPrevious}
          size={FluentIconSize.large}
          color={fluentColors.colorNeutralForeground1}
          onPress={onPrevious}
          useGlow={components.useGlow}
          glowColor={components.glowColor}
          fluentColors={fluentColors}
        />
        <ControlButton
          icon={isPlaying ? icons.pause : icons.play}
          size={FluentIconSize.xlarge}
          color={fluentColors.colorNeutralForegroundOnBrand}
          onPress={onPlayPause}
          isPrimary
          useGlow={components.useGlow}
          glowColor={components.glowColor}
          fluentColors={fluentColors}
        />
        <ControlButton
          icon={icons.skipNext}
          size={FluentIconSize.large}
          color={fluentColors.colorNeutralForeground1}
          onPress={onNext}
          useGlow={components.useGlow}
          glowColor={components.glowColor}
          fluentColors={fluentColors}
        />
      </View>

      <View style={[styles.secondaryControls, { width: shapes.controlSize }]}>
        {onRepeat ? (
          <ControlButton
            icon={repeatMode === "one" ? icons.repeatOnce : icons.repeat}
            size={FluentIconSize.regular}
            color={repeatMode !== "off" ? fluentColors.colorBrandForeground1 : fluentColors.colorNeutralForeground3}
            onPress={onRepeat}
            isActive={repeatMode !== "off"}
            useGlow={components.useGlow && repeatMode !== "off"}
            glowColor={components.glowColor}
            fluentColors={fluentColors}
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
