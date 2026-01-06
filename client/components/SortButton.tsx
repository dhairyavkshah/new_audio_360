import React from "react";
import { View, StyleSheet, Pressable, Modal } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Spacing, M3Shape, Layout, M3Elevation } from "@/constants/theme";

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
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();

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

  return (
    <>
      <Pressable
        style={[styles.button, { backgroundColor: theme.surfaceContainerHigh }]}
        onPress={handleToggle}
        accessibilityLabel={`Sort by ${selectedOption?.label || "default"}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <MaterialCommunityIcons
          name={selectedOption?.icon || "sort"}
          size={18}
          color={theme.onSurface}
        />
        <MaterialCommunityIcons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.onSurfaceVariant}
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
          <View style={[styles.menu, { backgroundColor: theme.surfaceContainerHigh }]}>
            {options.map((option) => (
              <Pressable
                key={option.key}
                style={[
                  styles.menuItem,
                  selectedKey === option.key && { backgroundColor: theme.secondaryContainer },
                ]}
                onPress={() => handleSelect(option.key)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: selectedKey === option.key }}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={20}
                  color={selectedKey === option.key ? theme.onSecondaryContainer : theme.onSurface}
                />
                <ThemedText
                  type="bodyMedium"
                  style={[
                    styles.menuItemLabel,
                    { color: selectedKey === option.key ? theme.onSecondaryContainer : theme.onSurface },
                  ]}
                >
                  {option.label}
                </ThemedText>
                {selectedKey === option.key ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={18}
                    color={theme.onSecondaryContainer}
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
    paddingHorizontal: Spacing.m,
    borderRadius: M3Shape.cornerFull,
    gap: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xxxl,
  },
  menu: {
    width: "100%",
    maxWidth: 280,
    borderRadius: M3Shape.cornerMedium,
    paddingVertical: Spacing.s,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: M3Elevation.level3.elevation,
      },
      default: {},
    }),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.l,
    minHeight: Layout.touchTargetMin,
  },
  menuItemLabel: {
    flex: 1,
    marginLeft: Spacing.m,
  },
});
