import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { Fluent2 } from "@/constants/fluent2";
import { FluentText } from "./FluentText";

interface FluentMenuItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}

export function FluentMenuItem({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  showChevron = true,
  rightElement,
}: FluentMenuItemProps) {
  const { colors } = useFluent2Theme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.surfaceSecondary : colors.surfacePrimary,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.surfaceSecondary },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={Fluent2.iconSize.md}
          color={iconColor || colors.brandPrimary}
        />
      </View>
      <View style={styles.textContainer}>
        <FluentText variant="body1" numberOfLines={1}>
          {title}
        </FluentText>
        {subtitle && (
          <FluentText
            variant="caption1"
            style={{ color: colors.textSecondary, marginTop: 2 }}
            numberOfLines={1}
          >
            {subtitle}
          </FluentText>
        )}
      </View>
      {rightElement}
      {showChevron && !rightElement && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={Fluent2.iconSize.md}
          color={colors.textSecondary}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Fluent2.spacing.sNudge,
    paddingHorizontal: Fluent2.spacing.m,
    minHeight: 56,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Fluent2.radius.medium,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Fluent2.spacing.s,
  },
  textContainer: {
    flex: 1,
    marginRight: Fluent2.spacing.xs,
  },
});
