import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { Button } from "@/components/Button";
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

interface AudioTipNotificationProps {
  visible: boolean;
  onDismiss: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DIALOG_WIDTH = Math.min(SCREEN_WIDTH * 0.9, FluentLayoutSize.dialogMaxWidth);

export function AudioTipNotification({ visible, onDismiss }: AudioTipNotificationProps) {
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
          <View style={[styles.iconContainer, { backgroundColor: colors.colorPaletteYellowBackground2 }]}>
            <MaterialCommunityIcons
              name="lightbulb-on-outline"
              size={28}
              color={colors.colorPaletteYellowForeground1}
            />
          </View>

          <FluentText variant="subtitle1" style={styles.title}>
            Audio Enhancement Tip
          </FluentText>

          <FluentText variant="body1" color="secondary" style={styles.message}>
            For the best experience, please disable{'\n'}your device's built-in audio effects{'\n'}to enjoy our world-class sound engine.
          </FluentText>

          <View style={styles.listContainer}>
            <View style={styles.listItem}>
              <MaterialCommunityIcons
                name="circle-small"
                size={20}
                color={colors.colorNeutralForeground2}
              />
              <FluentText variant="body2" color="secondary" style={styles.listText}>
                Dolby Atmos / Dolby Audio
              </FluentText>
            </View>
            <View style={styles.listItem}>
              <MaterialCommunityIcons
                name="circle-small"
                size={20}
                color={colors.colorNeutralForeground2}
              />
              <FluentText variant="body2" color="secondary" style={styles.listText}>
                System Equalizer
              </FluentText>
            </View>
            <View style={styles.listItem}>
              <MaterialCommunityIcons
                name="circle-small"
                size={20}
                color={colors.colorNeutralForeground2}
              />
              <FluentText variant="body2" color="secondary" style={styles.listText}>
                Adapt Sound / Audio Enhancement
              </FluentText>
            </View>
          </View>

          <FluentText variant="caption1" color="tertiary" style={styles.hint}>
            Settings → Sound → Sound Quality and Effects
          </FluentText>

          <View style={styles.actions}>
            <Button
              onPress={handleDismiss}
              variant="default"
              size="default"
              style={styles.actionButton}
            >
              Got it
            </Button>
          </View>
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
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: FluentSpacing.l,
  },
  title: {
    textAlign: "center",
    marginBottom: FluentSpacing.m,
  },
  message: {
    textAlign: "center",
    marginBottom: FluentSpacing.l,
    lineHeight: 22,
  },
  listContainer: {
    marginBottom: FluentSpacing.m,
    paddingLeft: FluentSpacing.s,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xs,
  },
  listText: {
    flex: 1,
  },
  hint: {
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: FluentSpacing.l,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: FluentSpacing.s,
  },
  actionButton: {
    minWidth: 120,
  },
});

export default AudioTipNotification;
