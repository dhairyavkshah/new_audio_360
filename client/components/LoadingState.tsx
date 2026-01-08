import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing } from "@/constants/theme";

interface LoadingStateProps {
  message?: string;
  progress?: number;
}

export function LoadingState({ message = "Loading...", progress }: LoadingStateProps) {
  const { theme } = useThemeContext();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
      <ThemedText type="bodyMedium" style={[styles.message, { color: theme.onSurfaceVariant }]}>
        {message}
      </ThemedText>
      {progress !== undefined && progress >= 0 && progress <= 1 ? (
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: theme.surfaceContainerHigh }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.primary, width: `${progress * 100}%` },
              ]}
            />
          </View>
          <ThemedText type="labelSmall" style={{ color: theme.onSurfaceVariant }}>
            {Math.round(progress * 100)}%
          </ThemedText>
        </View>
      ) : null}
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
  message: {
    marginTop: Spacing.l,
    textAlign: "center",
  },
  progressContainer: {
    marginTop: Spacing.l,
    alignItems: "center",
    width: "100%",
    maxWidth: 200,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: Spacing.s,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});
