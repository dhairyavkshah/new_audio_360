import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { Fluent2 } from "@/constants/fluent2";
import { FluentText } from "./FluentText";

interface FluentSectionHeaderProps {
  title: string;
  actionLabel?: string;
  actionIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onAction?: () => void;
}

export function FluentSectionHeader({
  title,
  actionLabel,
  actionIcon,
  onAction,
}: FluentSectionHeaderProps) {
  const { colors } = useFluent2Theme();

  return (
    <View style={styles.container}>
      <FluentText variant="subtitle1" style={styles.title}>
        {title}
      </FluentText>
      {(actionLabel || actionIcon) && onAction && (
        <Pressable onPress={onAction} style={styles.action}>
          {actionLabel && (
            <FluentText
              variant="body2"
              style={{ color: colors.brandPrimary, marginRight: actionIcon ? Fluent2.spacing.xxs : 0 }}
            >
              {actionLabel}
            </FluentText>
          )}
          {actionIcon && (
            <MaterialCommunityIcons
              name={actionIcon}
              size={Fluent2.iconSize.sm}
              color={colors.brandPrimary}
            />
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Fluent2.spacing.xs,
    paddingHorizontal: Fluent2.spacing.m,
  },
  title: {
    flex: 1,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
  },
});
