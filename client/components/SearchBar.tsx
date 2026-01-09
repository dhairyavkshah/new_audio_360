import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentSpacing,
  FluentControlRadius,
  FluentTypography,
  FluentIconSize,
  FluentLightColors,
  FluentDarkColors,
} from "@/constants/fluent2";
import { Layout } from "@/constants/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = "Search..." }: SearchBarProps) {
  const { theme, isDark } = useThemeContext();
  const { playTapSound } = useUiSound();
  const [isFocused, setIsFocused] = useState(false);
  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;

  const handleClear = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onChangeText("");
  };

  return (
    <View style={[
      styles.wrapper, 
      { 
        backgroundColor: fluentColors.colorNeutralBackground3,
        borderBottomColor: fluentColors.colorNeutralStroke1,
      }
    ]}>
      <View style={[
        styles.container, 
        { 
          backgroundColor: fluentColors.colorNeutralBackground3,
          borderColor: isFocused ? fluentColors.colorStrokeFocus2 : fluentColors.colorNeutralStroke1,
          borderWidth: isFocused ? 2 : 1,
        }
      ]}>
        <MaterialCommunityIcons
          name="magnify"
          size={FluentIconSize.regular}
          color={fluentColors.colorNeutralForeground3}
          style={styles.searchIcon}
        />
        <TextInput
          style={[
            styles.input, 
            { 
              color: fluentColors.colorNeutralForeground1,
              fontSize: FluentTypography.body1.fontSize,
              lineHeight: FluentTypography.body1.lineHeight,
              fontWeight: FluentTypography.body1.fontWeight,
            }
          ]}
          placeholder={placeholder}
          placeholderTextColor={fluentColors.colorNeutralForeground3}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
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
            <MaterialCommunityIcons 
              name="close-circle" 
              size={FluentIconSize.small} 
              color={fluentColors.colorNeutralForeground3} 
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.s,
    borderBottomWidth: 1,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: Layout.inputFieldHeight,
    borderRadius: FluentControlRadius.input,
    paddingHorizontal: FluentSpacing.m,
  },
  searchIcon: {
    marginRight: FluentSpacing.s,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: FluentSpacing.s,
    width: Layout.touchTargetMin,
    height: Layout.touchTargetMin,
    alignItems: "center",
    justifyContent: "center",
  },
});
