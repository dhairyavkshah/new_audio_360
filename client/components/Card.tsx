import React from "react";
import { StyleSheet, Pressable, ViewStyle, View } from "react-native";

import { FluentText } from "@/components/fluent";
import { useThemeTokens } from "@/contexts/ThemeContext";
import {
  FluentSpacing,
  FluentBorderWidth,
} from "@/constants/fluent2";
import { getCardEffectStyle } from "@/lib/themeUtils";

interface CardProps {
  elevation?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({
  elevation = 1,
  title,
  description,
  children,
  onPress,
  style,
}: CardProps) {
  const tokens = useThemeTokens();
  const cardEffectStyle = getCardEffectStyle(tokens, elevation);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      android_ripple={null}
      style={[
        styles.card,
        cardEffectStyle,
        style,
      ]}
    >
      {title ? (
        <FluentText variant="subtitle2" style={styles.cardTitle}>
          {title}
        </FluentText>
      ) : null}
      {description ? (
        <FluentText variant="body2" color="secondary" style={styles.cardDescription}>
          {description}
        </FluentText>
      ) : null}
      {children}
    </Pressable>
  );
}

interface ElevatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function ElevatedCard({ children, onPress, style }: ElevatedCardProps) {
  return (
    <Card elevation={3} onPress={onPress} style={style}>
      {children}
    </Card>
  );
}

interface OutlinedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function OutlinedCard({ children, onPress, style }: OutlinedCardProps) {
  const tokens = useThemeTokens();
  
  const outlinedStyle: ViewStyle = {
    borderWidth: FluentBorderWidth.thin, 
    borderColor: tokens.colors.outline,
  };
  
  const mergedStyle: ViewStyle = style 
    ? { ...outlinedStyle, ...style }
    : outlinedStyle;
  
  return (
    <Card elevation={0} onPress={onPress} style={mergedStyle}>
      {children}
    </Card>
  );
}

interface FilledCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function FilledCard({ children, onPress, style }: FilledCardProps) {
  return (
    <Card elevation={0} onPress={onPress} style={style}>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: FluentSpacing.l,
    borderWidth: FluentBorderWidth.thin,
  },
  cardTitle: {
    marginBottom: FluentSpacing.xs,
  },
  cardDescription: {
    marginBottom: FluentSpacing.m,
  },
});
