import React from "react";
import { StyleSheet, Pressable, View, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentText } from "@/components/fluent";
import { useThemedColors } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentControlRadius,
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

export function EffectChip({
  label,
  isSelected,
  onPress,
  isPremium = false,
  isLocked = false,
  disabled = false,
}: EffectChipProps) {
  const colors = useThemedColors();

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
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      android_ripple={null}
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          borderWidth: FluentBorderWidth.medium,
          opacity: disabled ? 0.5 : 1,
        },
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
    </Pressable>
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
    width: FluentSpacing.s,
    height: FluentSpacing.s,
    borderRadius: FluentControlRadius.chip,
    marginLeft: FluentSpacing.s,
  },
  lockIcon: {
    marginLeft: FluentSpacing.xs,
  },
});
