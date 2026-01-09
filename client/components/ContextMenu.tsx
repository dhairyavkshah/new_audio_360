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
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Spacing, BorderRadius, FluentMotion, FluentShadow } from "@/constants/theme";

interface MenuItem {
  id: string;
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  destructive?: boolean;
  disabled?: boolean;
  dividerAfter?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  onDismiss: () => void;
  items: MenuItem[];
  onSelect: (id: string) => void;
  anchorPosition?: { x: number; y: number };
}

const MENU_WIDTH = 240;
const ITEM_HEIGHT = 44;
const ICON_SIZE = 20;
const ICON_GAP = 12;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MENU_MARGIN = 16;

const getFluentShadowStyle = (shadow: typeof FluentShadow.shadow8) => {
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: shadow.key.x, height: shadow.key.y },
      shadowOpacity: 0.14,
      shadowRadius: shadow.key.blur,
    },
    android: {
      elevation: shadow.elevation,
    },
    default: {
      boxShadow: shadow.combined,
    },
  }) || {};
};

export function ContextMenu({
  visible,
  onDismiss,
  items,
  onSelect,
  anchorPosition,
}: ContextMenuProps) {
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const [isRendered, setIsRendered] = useState(visible);
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);
  const scrimOpacity = useSharedValue(0);

  const handleAnimationComplete = useCallback((toVisible: boolean) => {
    if (!toVisible) {
      setIsRendered(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      scale.value = withTiming(1, {
        duration: FluentMotion.duration.fast,
        easing: Easing.bezier(
          FluentMotion.easing.decelerateMax.x1,
          FluentMotion.easing.decelerateMax.y1,
          FluentMotion.easing.decelerateMax.x2,
          FluentMotion.easing.decelerateMax.y2
        ),
      });
      opacity.value = withTiming(1, {
        duration: FluentMotion.duration.fast,
      });
      scrimOpacity.value = withTiming(1, {
        duration: FluentMotion.duration.normal,
      });
    } else if (isRendered) {
      scale.value = withTiming(0.95, {
        duration: FluentMotion.duration.faster,
        easing: Easing.bezier(
          FluentMotion.easing.accelerate.x1,
          FluentMotion.easing.accelerate.y1,
          FluentMotion.easing.accelerate.x2,
          FluentMotion.easing.accelerate.y2
        ),
      });
      opacity.value = withTiming(0, {
        duration: FluentMotion.duration.faster,
      }, () => {
        runOnJS(handleAnimationComplete)(false);
      });
      scrimOpacity.value = withTiming(0, {
        duration: FluentMotion.duration.faster,
      });
    }
  }, [visible]);

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

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  const getMenuPosition = () => {
    if (!anchorPosition) {
      return { alignSelf: "center" as const };
    }

    const menuHeight = Math.min(items.length * ITEM_HEIGHT + Spacing.s * 2, ITEM_HEIGHT * 8);
    
    let left = anchorPosition.x;
    let top = anchorPosition.y;

    if (left + MENU_WIDTH > SCREEN_WIDTH - MENU_MARGIN) {
      left = SCREEN_WIDTH - MENU_WIDTH - MENU_MARGIN;
    }
    if (left < MENU_MARGIN) {
      left = MENU_MARGIN;
    }

    if (top + menuHeight > SCREEN_HEIGHT - MENU_MARGIN) {
      top = anchorPosition.y - menuHeight;
    }
    if (top < MENU_MARGIN) {
      top = MENU_MARGIN;
    }

    return {
      position: "absolute" as const,
      left,
      top,
    };
  };

  if (!isRendered) return null;

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.scrim, { backgroundColor: theme.scrim }, scrimStyle]}
        >
          <Pressable style={styles.scrimPressable} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.menu,
            {
              backgroundColor: theme.surface,
              width: MENU_WIDTH,
            },
            getFluentShadowStyle(FluentShadow.shadow8),
            getMenuPosition(),
            menuStyle,
          ]}
          accessibilityRole="menu"
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                <Pressable
                  onPress={() => !item.disabled && handleSelect(item.id)}
                  disabled={item.disabled}
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.label}
                  accessibilityState={{ disabled: item.disabled }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    {
                      backgroundColor: pressed
                        ? theme.surfaceContainerHighest
                        : "transparent",
                    },
                  ]}
                >
                  {item.icon ? (
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={ICON_SIZE}
                      color={
                        item.disabled
                          ? theme.onSurfaceVariant
                          : item.destructive
                            ? theme.error
                            : theme.onSurface
                      }
                      style={styles.menuIcon}
                    />
                  ) : null}
                  <ThemedText
                    type="bodyMedium"
                    style={[
                      styles.menuLabel,
                      {
                        color: item.disabled
                          ? theme.onSurfaceVariant
                          : item.destructive
                            ? theme.error
                            : theme.onSurface,
                      },
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
                {item.dividerAfter && index < items.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                )}
              </React.Fragment>
            ))}
          </ScrollView>
        </Animated.View>
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
    borderRadius: BorderRadius.large,
    overflow: "hidden",
    maxHeight: ITEM_HEIGHT * 8 + Spacing.s * 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.s,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    height: ITEM_HEIGHT,
    paddingHorizontal: Spacing.m,
  },
  menuIcon: {
    marginRight: ICON_GAP,
  },
  menuLabel: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
    marginHorizontal: Spacing.m,
  },
});
