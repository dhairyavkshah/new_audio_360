import React from "react";
import { StyleSheet, Pressable, View, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentControlRadius,
  FluentLightColors,
  FluentDarkColors,
  FluentIconSize,
  FluentBorderWidth,
} from "@/constants/fluent2";

interface EffectChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  isPremium?: boolean;
  isLocked?: boolean;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function EffectChip({
  label,
  isSelected,
  onPress,
  isPremium = false,
  isLocked = false,
  disabled = false,
}: EffectChipProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const backgroundColor = isSelected 
    ? colors.colorBrandBackground 
    : colors.colorNeutralBackground3;
  const borderColor = isSelected 
    ? colors.colorBrandStroke1 
    : colors.colorNeutralStroke2;
  const textColor = isLocked 
    ? colors.colorNeutralForeground2 
    : isSelected 
      ? colors.colorNeutralForegroundOnBrand 
      : colors.colorNeutralForeground1;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          borderWidth: FluentBorderWidth.medium,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
      ]}
    >
      <FluentText
        variant="body1Strong"
        style={[styles.label, { color: textColor }]}
      >
        {label}
      </FluentText>
      {isLocked ? (
        <MaterialCommunityIcons 
          name="lock" 
          size={FluentIconSize.tiny} 
          color={colors.colorPaletteYellowForeground1} 
          style={styles.lockIcon} 
        />
      ) : isPremium ? (
        <View style={[styles.premiumIndicator, { backgroundColor: colors.colorBrandForeground1 }]} />
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.xl,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.circular,
  },
  label: {
    fontWeight: "600",
  },
  premiumIndicator: {
    width: 6,
    height: 6,
    borderRadius: FluentControlRadius.button,
    marginLeft: FluentSpacing.s,
  },
  lockIcon: {
    marginLeft: FluentSpacing.xs,
  },
});
