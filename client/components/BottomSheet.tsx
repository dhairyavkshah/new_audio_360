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
import { Spacing, BorderRadius, FluentMotion, FluentShadow, Layout, SafeAreaSpacing } from "@/constants/theme";

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  title?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HANDLE_HEIGHT = 24;
const HANDLE_WIDTH = 32;
const HANDLE_PILL_HEIGHT = 4;

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

  const safeBottomPadding = Math.max(insets.bottom, SafeAreaSpacing.bottom);

  const handleAnimationComplete = useCallback((toVisible: boolean) => {
    if (!toVisible) {
      setIsRendered(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      translateY.value = withSpring(minY, {
        damping: 25,
        stiffness: 200,
      });
      scrimOpacity.value = withTiming(0.5, {
        duration: FluentMotion.duration.slow,
      });
    } else if (isRendered) {
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: FluentMotion.duration.slow,
        easing: Easing.bezier(
          FluentMotion.easing.decelerate.x1,
          FluentMotion.easing.decelerate.y1,
          FluentMotion.easing.decelerate.x2,
          FluentMotion.easing.decelerate.y2
        ),
      }, () => {
        runOnJS(handleAnimationComplete)(false);
      });
      scrimOpacity.value = withTiming(0, {
        duration: FluentMotion.duration.slow,
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
          duration: FluentMotion.duration.slow,
          easing: Easing.bezier(
            FluentMotion.easing.decelerate.x1,
            FluentMotion.easing.decelerate.y1,
            FluentMotion.easing.decelerate.x2,
            FluentMotion.easing.decelerate.y2
          ),
        }, () => {
          runOnJS(handleAnimationComplete)(false);
        });
        scrimOpacity.value = withTiming(0, {
          duration: FluentMotion.duration.slow,
        });
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(minY, {
          damping: 25,
          stiffness: 200,
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  const getShadowStyle = () => {
    const shadow = FluentShadow.shadow28;
    return Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: shadow.key.x, height: -shadow.key.y },
        shadowOpacity: 0.24,
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
                  backgroundColor: theme.surface,
                  paddingBottom: safeBottomPadding + Spacing.l,
                  maxHeight: maxHeight,
                  borderTopLeftRadius: BorderRadius.xLarge,
                  borderTopRightRadius: BorderRadius.xLarge,
                },
                getShadowStyle(),
                sheetStyle,
              ]}
            >
              <View style={styles.handleContainer}>
                <View
                  style={[
                    styles.handle, 
                    { 
                      backgroundColor: theme.outline,
                      width: HANDLE_WIDTH,
                      height: HANDLE_PILL_HEIGHT,
                    }
                  ]}
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
    minHeight: 200,
  },
  handleContainer: {
    height: HANDLE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.s,
  },
  handle: {
    borderRadius: BorderRadius.circular,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Layout.horizontalPadding,
    paddingTop: Spacing.s,
  },
});
