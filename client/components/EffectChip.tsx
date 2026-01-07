import React from "react";
import { StyleSheet, Pressable, View, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius } from "@/constants/theme";

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
  const { theme } = useThemeContext();
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

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.container,
        {
          backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
          borderColor: isSelected ? theme.primary : theme.backgroundTertiary,
          borderWidth: 1.5,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
      ]}
    >
      <ThemedText
        type="small"
        style={[
          styles.label,
          { color: isLocked ? theme.textSecondary : isSelected ? "#FFFFFF" : theme.text },
        ]}
      >
        {label}
      </ThemedText>
      {isLocked ? (
        <MaterialCommunityIcons name="lock" size={12} color={theme.warning} style={styles.lockIcon} />
      ) : isPremium ? (
        <View style={[styles.premiumIndicator, { backgroundColor: theme.accent }]} />
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  label: {
    fontWeight: "500",
  },
  premiumIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: Spacing.sm,
  },
  lockIcon: {
    marginLeft: Spacing.xs,
  },
});
