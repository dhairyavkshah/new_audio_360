import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { FluentText } from "@/components/fluent";
import { useThemedColors } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentSliderSize,
} from "@/constants/fluent2";

interface LoadingStateProps {
  message?: string;
  progress?: number;
}

export function LoadingState({ message = "Loading...", progress }: LoadingStateProps) {
  const colors = useThemedColors();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
      <FluentText 
        variant="body1" 
        color="secondary" 
        style={styles.message}
      >
        {message}
      </FluentText>
      {progress !== undefined && progress >= 0 && progress <= 1 ? (
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.colorNeutralBackground4 }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.colorBrandForeground1, width: `${progress * 100}%` },
              ]}
            />
          </View>
          <FluentText variant="caption1" color="secondary">
            {Math.round(progress * 100)}%
          </FluentText>
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
    paddingHorizontal: FluentSpacing.xxxl,
    paddingVertical: FluentSpacing.xxxl,
  },
  message: {
    marginTop: FluentSpacing.l,
    textAlign: "center",
  },
  progressContainer: {
    marginTop: FluentSpacing.l,
    alignItems: "center",
    width: "100%",
    maxWidth: 200,
  },
  progressTrack: {
    width: "100%",
    height: FluentSliderSize.trackThin,
    borderRadius: FluentRadius.small,
    overflow: "hidden",
    marginBottom: FluentSpacing.s,
  },
  progressFill: {
    height: "100%",
    borderRadius: FluentRadius.small,
  },
});
