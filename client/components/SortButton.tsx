import React from "react";
import { View, StyleSheet, Pressable, Modal, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Layout } from "@/constants/theme";
import {
  FluentSpacing,
  FluentControlRadius,
  FluentTypography,
  FluentIconSize,
  FluentLightColors,
  FluentDarkColors,
  getShadowStyle,
} from "@/constants/fluent2";

export interface SortOption {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

interface SortButtonProps {
  options: SortOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function SortButton({ options, selectedKey, onSelect, isOpen, onToggle }: SortButtonProps) {
  const { theme, isDark } = useThemeContext();
  const { playTapSound } = useUiSound();
  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;

  const selectedOption = options.find((o) => o.key === selectedKey);

  const handleSelect = (key: string) => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(key);
  };

  const handleToggle = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle();
  };

  const shadowStyle = getShadowStyle('shadow8', isDark);

  return (
    <>
      <Pressable
        style={[styles.button, { backgroundColor: fluentColors.colorNeutralBackground3 }]}
        onPress={handleToggle}
        accessibilityLabel={`Sort by ${selectedOption?.label || "default"}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <MaterialCommunityIcons
          name={selectedOption?.icon || "sort"}
          size={FluentIconSize.small}
          color={fluentColors.colorNeutralForeground1}
        />
        <MaterialCommunityIcons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={FluentIconSize.small}
          color={fluentColors.colorNeutralForeground2}
          style={{ marginLeft: 2 }}
        />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={onToggle}
      >
        <Pressable style={styles.backdrop} onPress={onToggle}>
          <View style={[
            styles.menu, 
            { backgroundColor: fluentColors.colorNeutralBackground1 },
            shadowStyle,
          ]}>
            {options.map((option) => (
              <Pressable
                key={option.key}
                style={[
                  styles.menuItem,
                  selectedKey === option.key && { backgroundColor: fluentColors.colorSubtleBackgroundHover },
                ]}
                onPress={() => handleSelect(option.key)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: selectedKey === option.key }}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={FluentIconSize.regular}
                  color={selectedKey === option.key ? fluentColors.colorBrandForeground1 : fluentColors.colorNeutralForeground1}
                />
                <ThemedText
                  style={[
                    styles.menuItemLabel,
                    { 
                      color: selectedKey === option.key ? fluentColors.colorBrandForeground1 : fluentColors.colorNeutralForeground1,
                      fontSize: FluentTypography.body1.fontSize,
                      fontWeight: FluentTypography.body1.fontWeight,
                      lineHeight: FluentTypography.body1.lineHeight,
                    },
                  ]}
                >
                  {option.label}
                </ThemedText>
                {selectedKey === option.key ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={FluentIconSize.small}
                    color={fluentColors.colorBrandForeground1}
                  />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    height: Layout.touchTargetMin,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
    gap: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: FluentSpacing.xxxl,
  },
  menu: {
    width: "100%",
    maxWidth: 280,
    borderRadius: FluentControlRadius.dialog,
    paddingVertical: FluentSpacing.s,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.l,
    minHeight: Layout.touchTargetMin,
  },
  menuItemLabel: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
});
