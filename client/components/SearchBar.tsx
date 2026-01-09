import React from "react";
import { View, StyleSheet, TextInput, Pressable, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Spacing, M3Shape, Layout, Typography, M3Elevation } from "@/constants/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = "Search..." }: SearchBarProps) {
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();

  const handleClear = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onChangeText("");
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surfaceContainer, borderBottomColor: theme.outlineVariant }]}>
      <View style={[styles.container, { backgroundColor: theme.surfaceContainerHigh }]}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={theme.onSurfaceVariant}
          style={styles.searchIcon}
        />
        <TextInput
          style={[
            styles.input, 
            { 
              color: theme.onSurface,
              fontSize: Typography.bodyMedium.fontSize,
              lineHeight: Typography.bodyMedium.lineHeight,
            }
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.onSurfaceVariant}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={placeholder}
          accessibilityRole="search"
        />
        {value.length > 0 ? (
          <Pressable
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={theme.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: Layout.horizontalPadding,
    paddingVertical: Spacing.s,
    borderBottomWidth: 1,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: Layout.inputFieldHeight,
    borderRadius: M3Shape.cornerFull,
    paddingHorizontal: Spacing.l,
  },
  searchIcon: {
    marginRight: Spacing.s,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: Spacing.s,
    width: Layout.touchTargetMin,
    height: Layout.touchTargetMin,
    alignItems: "center",
    justifyContent: "center",
  },
});
