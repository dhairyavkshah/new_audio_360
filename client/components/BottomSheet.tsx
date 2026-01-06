import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, M3Motion, M3Shape, Layout } from "@/constants/theme";

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  title?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HANDLE_HEIGHT = 24;

export function BottomSheet({
  visible,
  onDismiss,
  children,
  snapPoints = [0.5],
  title,
}: BottomSheetProps) {
  const { theme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const scrimOpacity = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const maxHeight = SCREEN_HEIGHT * Math.max(...snapPoints);
  const minY = SCREEN_HEIGHT - maxHeight;

  const handleAnimationComplete = useCallback((toVisible: boolean) => {
    if (!toVisible) {
      setIsRendered(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      translateY.value = withSpring(minY, {
        damping: 20,
        stiffness: 150,
      });
      scrimOpacity.value = withTiming(0.5, {
        duration: M3Motion.durationMedium2,
      });
    } else if (isRendered) {
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: M3Motion.durationShort4,
        easing: Easing.bezier(
          M3Motion.easingStandard.x1,
          M3Motion.easingStandard.y1,
          M3Motion.easingStandard.x2,
          M3Motion.easingStandard.y2
        ),
      }, () => {
        runOnJS(handleAnimationComplete)(false);
      });
      scrimOpacity.value = withTiming(0, {
        duration: M3Motion.durationShort4,
      });
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDismiss();
  }, [onDismiss]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      const newY = context.value.y + event.translationY;
      translateY.value = Math.max(minY, newY);
    })
    .onEnd((event) => {
      if (event.velocityY > 500 || translateY.value > SCREEN_HEIGHT * 0.7) {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: M3Motion.durationShort4,
        }, () => {
          runOnJS(handleAnimationComplete)(false);
        });
        scrimOpacity.value = withTiming(0, {
          duration: M3Motion.durationShort4,
        });
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(minY, {
          damping: 20,
          stiffness: 150,
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
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
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.scrim,
              { backgroundColor: theme.scrim },
              scrimStyle,
            ]}
          >
            <Pressable style={styles.scrimPressable} onPress={dismiss} />
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.surfaceContainerLow,
                  paddingBottom: insets.bottom + Spacing.xxl,
                  maxHeight: maxHeight,
                },
                sheetStyle,
              ]}
            >
              <View style={styles.handleContainer}>
                <View
                  style={[styles.handle, { backgroundColor: theme.outline }]}
                />
              </View>
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  scrimPressable: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: M3Shape.cornerExtraLarge,
    borderTopRightRadius: M3Shape.cornerExtraLarge,
    minHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
      default: {},
    }),
  },
  handleContainer: {
    height: HANDLE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.s,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Layout.horizontalPadding,
    paddingTop: Spacing.s,
  },
});
