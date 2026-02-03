import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentControlRadius,
  FluentSpacing,
  FluentIconSize,
  getShadowStyle,
  FluentLightColors,
  FluentDarkColors,
  FluentLayoutSize,
} from "@/constants/fluent2";

interface MenuItem {
  id: string;
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  destructive?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  onDismiss: () => void;
  items: MenuItem[];
  onSelect: (id: string) => void;
  anchorPosition?: { x: number; y: number };
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MENU_MARGIN = FluentSpacing.l;

export function ContextMenu({
  visible,
  onDismiss,
  items,
  onSelect,
  anchorPosition,
}: ContextMenuProps) {
  const { isDark } = useThemeContext();
  const { playTapSound } = useUiSound();
  const insets = useSafeAreaInsets();

  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const handleDismiss = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDismiss();
  };

  const handleSelect = (id: string) => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    onSelect(id);
    onDismiss();
  };

  const getMenuPosition = () => {
    if (!anchorPosition) {
      return { alignSelf: "center" as const };
    }

    const menuHeight = Math.min(items.length * FluentLayoutSize.menuItemHeight + FluentSpacing.s * 2, FluentLayoutSize.menuItemHeight * 8);
    const safeTop = insets.top + MENU_MARGIN;
    const safeBottom = SCREEN_HEIGHT - insets.bottom - MENU_MARGIN;
    
    let left = anchorPosition.x;
    let top = anchorPosition.y;

    if (left + FluentLayoutSize.menuWidth > SCREEN_WIDTH - MENU_MARGIN) {
      left = SCREEN_WIDTH - FluentLayoutSize.menuWidth - MENU_MARGIN;
    }
    if (left < MENU_MARGIN) {
      left = MENU_MARGIN;
    }

    if (top + menuHeight > safeBottom) {
      top = anchorPosition.y - menuHeight;
    }
    if (top < safeTop) {
      top = safeTop;
    }

    return {
      position: "absolute" as const,
      left,
      top,
    };
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[styles.scrim, { backgroundColor: colors.colorNeutralBackgroundInverted, opacity: 0.5 }]}
        >
          <Pressable style={styles.scrimPressable} onPress={handleDismiss} android_ripple={null} />
        </View>

        <View
          style={[
            styles.menu,
            {
              backgroundColor: colors.colorNeutralBackground1,
              width: FluentLayoutSize.menuWidth,
            },
            getShadowStyle('shadow16', isDark),
            getMenuPosition(),
          ]}
          accessibilityRole="menu"
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => !item.disabled && handleSelect(item.id)}
                disabled={item.disabled}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
                accessibilityState={{ disabled: item.disabled }}
                android_ripple={null}
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    backgroundColor: pressed
                      ? colors.colorNeutralBackground1Hover
                      : "transparent",
                  },
                  index === 0 && styles.firstItem,
                  index === items.length - 1 && styles.lastItem,
                ]}
              >
                {item.icon ? (
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={FluentIconSize.regular}
                    color={
                      item.disabled
                        ? colors.colorNeutralForegroundDisabled
                        : item.destructive
                          ? colors.colorPaletteRedForeground1
                          : colors.colorNeutralForeground1
                    }
                    style={styles.menuIcon}
                  />
                ) : null}
                <FluentText
                  variant="body1"
                  style={[
                    styles.menuLabel,
                    {
                      color: item.disabled
                        ? colors.colorNeutralForegroundDisabled
                        : item.destructive
                          ? colors.colorPaletteRedForeground1
                          : colors.colorNeutralForeground1,
                    },
                  ]}
                >
                  {item.label}
                </FluentText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  scrimPressable: {
    flex: 1,
  },
  menu: {
    borderRadius: FluentControlRadius.dialog,
    overflow: "hidden",
    maxHeight: FluentLayoutSize.menuItemHeight * 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: FluentSpacing.s,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    height: FluentLayoutSize.menuItemHeight,
    paddingHorizontal: FluentSpacing.l,
  },
  firstItem: {
    borderTopLeftRadius: FluentControlRadius.dialog,
    borderTopRightRadius: FluentControlRadius.dialog,
  },
  lastItem: {
    borderBottomLeftRadius: FluentControlRadius.dialog,
    borderBottomRightRadius: FluentControlRadius.dialog,
  },
  menuIcon: {
    marginRight: FluentSpacing.m,
  },
  menuLabel: {
    flex: 1,
  },
});
