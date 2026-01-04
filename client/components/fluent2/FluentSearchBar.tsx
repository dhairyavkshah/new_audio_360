import React, { useState } from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFluent2Theme } from "@/contexts/Fluent2ThemeContext";
import { Fluent2 } from "@/constants/fluent2";

interface FluentSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function FluentSearchBar({
  value,
  onChangeText,
  placeholder = "Search",
  onClear,
}: FluentSearchBarProps) {
  const { colors } = useFluent2Theme();
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText("");
    onClear?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: isFocused ? colors.brandPrimary : colors.strokeSubtle,
        },
      ]}
    >
      <MaterialCommunityIcons
        name="magnify"
        size={Fluent2.iconSize.md}
        color={colors.textSecondary}
        style={styles.searchIcon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            ...Fluent2.typography.body1,
          },
        ]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {value.length > 0 && (
        <Pressable onPress={handleClear} style={styles.clearButton}>
          <MaterialCommunityIcons
            name="close-circle"
            size={Fluent2.iconSize.sm}
            color={colors.textSecondary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Fluent2.radius.medium,
    borderWidth: 1,
    paddingHorizontal: Fluent2.spacing.sNudge,
    height: 40,
  },
  searchIcon: {
    marginRight: Fluent2.spacing.xxs,
  },
  input: {
    flex: 1,
    height: "100%",
    padding: 0,
  },
  clearButton: {
    padding: Fluent2.spacing.xxs,
  },
});
