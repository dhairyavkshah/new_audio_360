import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, M3Motion, M3Shape } from "@/constants/theme";

interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost";
}

interface DialogProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message?: string;
  actions?: DialogAction[];
  children?: React.ReactNode;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DIALOG_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 400);

export function Dialog({
  visible,
  onDismiss,
  title,
  message,
  actions = [],
  children,
}: DialogProps) {
  const { theme } = useThemeContext();
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
        duration: M3Motion.durationShort4,
        easing: Easing.bezier(
          M3Motion.easingEmphasized.x1,
          M3Motion.easingEmphasized.y1,
          M3Motion.easingEmphasized.x2,
          M3Motion.easingEmphasized.y2
        ),
      });
      opacity.value = withTiming(1, {
        duration: M3Motion.durationShort4,
      });
      scrimOpacity.value = withTiming(0.5, {
        duration: M3Motion.durationMedium2,
      });
    } else if (isRendered) {
      scale.value = withTiming(0.9, {
        duration: M3Motion.durationShort3,
      });
      opacity.value = withTiming(0, {
        duration: M3Motion.durationShort3,
      }, () => {
        runOnJS(handleAnimationComplete)(false);
      });
      scrimOpacity.value = withTiming(0, {
        duration: M3Motion.durationShort3,
      });
    }
  }, [visible]);

  const handleDismiss = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDismiss();
  };

  const dialogStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

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
            styles.dialog,
            {
              backgroundColor: theme.surfaceContainerHigh,
              width: DIALOG_WIDTH,
            },
            dialogStyle,
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <ThemedText type="titleMedium" style={styles.title}>
            {title}
          </ThemedText>

          {message ? (
            <ThemedText
              type="bodyMedium"
              style={[styles.message, { color: theme.onSurfaceVariant }]}
            >
              {message}
            </ThemedText>
          ) : null}

          {children ? <View style={styles.content}>{children}</View> : null}

          {actions.length > 0 ? (
            <View style={styles.actions}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onPress={action.onPress}
                  variant={action.variant || "ghost"}
                  size="default"
                  style={styles.actionButton}
                >
                  {action.label}
                </Button>
              ))}
            </View>
          ) : null}
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
  dialog: {
    borderRadius: M3Shape.cornerExtraLarge,
    padding: Spacing.xxl,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 24,
      },
      default: {},
    }),
  },
  title: {
    marginBottom: Spacing.contentBlock,
  },
  message: {
    marginBottom: Spacing.contentBlock,
  },
  content: {
    marginBottom: Spacing.xxl,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.m,
    marginTop: Spacing.l,
  },
  actionButton: {
    minWidth: 64,
  },
});
