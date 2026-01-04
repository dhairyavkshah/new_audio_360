import React from "react";
import { StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { Fluent2 } from "@/constants/fluent2";
import { FluentText } from "./FluentText";

interface FluentSortChipProps {
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  isSelected?: boolean;
  onPress: () => void;
}

export function FluentSortChip({
  label,
  icon,
  isSelected = false,
  onPress,
}: FluentSortChipProps) {
  const { colors } = useFluent2Theme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.container,
        {
          backgroundColor: isSelected ? colors.brandPrimary : colors.surfaceSecondary,
          borderColor: isSelected ? colors.brandPrimary : colors.strokeSubtle,
        },
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={Fluent2.iconSize.xs}
          color={isSelected ? colors.textOnAccent : colors.textSecondary}
          style={styles.icon}
        />
      )}
      <FluentText
        variant="caption1"
        style={{
          color: isSelected ? colors.textOnAccent : colors.textPrimary,
        }}
      >
        {label}
      </FluentText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Fluent2.spacing.xxs,
    paddingHorizontal: Fluent2.spacing.sNudge,
    borderRadius: Fluent2.radius.circular,
    borderWidth: 1,
    marginRight: Fluent2.spacing.xs,
  },
  icon: {
    marginRight: Fluent2.spacing.xxs,
  },
});
