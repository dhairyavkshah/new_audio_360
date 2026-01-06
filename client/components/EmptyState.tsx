import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, M3Shape } from "@/constants/theme";

interface EmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { theme } = useThemeContext();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: theme.surfaceContainerHigh }]}>
        <MaterialCommunityIcons name={icon} size={48} color={theme.onSurfaceVariant} />
      </View>
      <ThemedText type="titleMedium" style={[styles.title, { color: theme.onSurface }]}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText type="bodyMedium" style={[styles.description, { color: theme.onSurfaceVariant }]}>
          {description}
        </ThemedText>
      ) : null}
      {action ? <View style={styles.actionContainer}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xxxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: M3Shape.cornerFull,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.s,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.l,
  },
  actionContainer: {
    marginTop: Spacing.m,
  },
});
