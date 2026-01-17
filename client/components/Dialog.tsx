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
} from "react-native-reanimated";
import { Button } from "@/components/Button";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import {
  FluentControlRadius,
  FluentSpacing,
  FluentDuration,
  FluentCurve,
  getShadowStyle,
  FluentLightColors,
  FluentDarkColors,
  FluentLayoutSize,
} from "@/constants/fluent2";

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
const DIALOG_WIDTH = Math.min(SCREEN_WIDTH * 0.9, FluentLayoutSize.dialogMaxWidth);

export function Dialog({
  visible,
  onDismiss,
  title,
  message,
  actions = [],
  children,
}: DialogProps) {
  const { isDark } = useThemeContext();
  const [isRendered, setIsRendered] = useState(visible);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const scrimOpacity = useSharedValue(0);

  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const handleAnimationComplete = useCallback((toVisible: boolean) => {
    if (!toVisible) {
      setIsRendered(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      scale.value = withTiming(1, {
        duration: FluentDuration.normal,
        easing: FluentCurve.decelerateMid,
      });
      opacity.value = withTiming(1, {
        duration: FluentDuration.normal,
      });
      scrimOpacity.value = withTiming(0.5, {
        duration: FluentDuration.normal,
      });
    } else if (isRendered) {
      scale.value = withTiming(0.9, {
        duration: FluentDuration.fast,
        easing: FluentCurve.accelerateMid,
      });
      opacity.value = withTiming(0, {
        duration: FluentDuration.fast,
      }, () => {
        runOnJS(handleAnimationComplete)(false);
      });
      scrimOpacity.value = withTiming(0, {
        duration: FluentDuration.fast,
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
          style={[styles.scrim, { backgroundColor: colors.colorNeutralBackgroundInverted }, scrimStyle]}
        >
          <Pressable style={styles.scrimPressable} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.colorNeutralBackground1,
              width: DIALOG_WIDTH,
            },
            getShadowStyle('shadow64', isDark),
            dialogStyle,
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <FluentText
            variant="subtitle1"
            style={styles.title}
          >
            {title}
          </FluentText>

          {message ? (
            <FluentText
              variant="body1"
              color="secondary"
              style={styles.message}
            >
              {message}
            </FluentText>
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
    borderRadius: FluentControlRadius.dialog,
    padding: FluentSpacing.xxl,
  },
  title: {
    marginBottom: FluentSpacing.m,
  },
  message: {
    marginBottom: FluentSpacing.m,
  },
  content: {
    marginBottom: FluentSpacing.xxl,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: FluentSpacing.m,
    marginTop: FluentSpacing.l,
  },
  actionButton: {
    minWidth: 64,
  },
});
