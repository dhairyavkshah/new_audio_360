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
import { Spacing, M3Motion, M3Shape, Layout } from "@/constants/theme";

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

const MENU_WIDTH = 240;
const ITEM_HEIGHT = Layout.listItemCompact;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MENU_MARGIN = 16;

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
  const scale = useSharedValue(0.9);
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
        duration: M3Motion.durationShort3,
        easing: Easing.bezier(
          M3Motion.easingEmphasized.x1,
          M3Motion.easingEmphasized.y1,
          M3Motion.easingEmphasized.x2,
          M3Motion.easingEmphasized.y2
        ),
      });
      opacity.value = withTiming(1, {
        duration: M3Motion.durationShort3,
      });
      scrimOpacity.value = withTiming(0.3, {
        duration: M3Motion.durationShort4,
      });
    } else if (isRendered) {
      scale.value = withTiming(0.9, {
        duration: M3Motion.durationShort2,
      });
      opacity.value = withTiming(0, {
        duration: M3Motion.durationShort2,
      }, () => {
        runOnJS(handleAnimationComplete)(false);
      });
      scrimOpacity.value = withTiming(0, {
        duration: M3Motion.durationShort2,
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
              backgroundColor: theme.surfaceContainer,
              width: MENU_WIDTH,
            },
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
              <Pressable
                key={item.id}
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
                  index === 0 && styles.firstItem,
                  index === items.length - 1 && styles.lastItem,
                ]}
              >
                {item.icon ? (
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={20}
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
    borderRadius: M3Shape.cornerMedium,
    overflow: "hidden",
    maxHeight: ITEM_HEIGHT * 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
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
    paddingHorizontal: Spacing.l,
  },
  firstItem: {
    borderTopLeftRadius: M3Shape.cornerMedium,
    borderTopRightRadius: M3Shape.cornerMedium,
  },
  lastItem: {
    borderBottomLeftRadius: M3Shape.cornerMedium,
    borderBottomRightRadius: M3Shape.cornerMedium,
  },
  menuIcon: {
    marginRight: Spacing.contentBlock,
  },
  menuLabel: {
    flex: 1,
  },
});
