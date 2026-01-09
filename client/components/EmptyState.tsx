import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentLightColors,
  FluentDarkColors,
} from "@/constants/fluent2";

interface EmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.colorNeutralBackground3 }]}>
        <MaterialCommunityIcons name={icon} size={48} color={colors.colorNeutralForeground2} />
      </View>
      <FluentText variant="subtitle1" align="center" style={styles.title}>
        {title}
      </FluentText>
      {description ? (
        <FluentText variant="body1" color="secondary" align="center" style={styles.description}>
          {description}
        </FluentText>
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
    paddingHorizontal: FluentSpacing.xxxl,
    paddingVertical: FluentSpacing.xxxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: FluentRadius.circular,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: FluentSpacing.xl,
  },
  title: {
    marginBottom: FluentSpacing.s,
  },
  description: {
    marginBottom: FluentSpacing.l,
  },
  actionContainer: {
    marginTop: FluentSpacing.m,
  },
});
