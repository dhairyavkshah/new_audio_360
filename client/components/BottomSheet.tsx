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
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
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

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  title?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function BottomSheet({
  visible,
  onDismiss,
  children,
  snapPoints = [0.5],
  title,
}: BottomSheetProps) {
  const { isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const scrimOpacity = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const colors = isDark ? FluentDarkColors : FluentLightColors;
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
      translateY.value = withTiming(minY, {
        duration: FluentDuration.normal,
        easing: FluentCurve.decelerateMid,
      });
      scrimOpacity.value = withTiming(0.5, {
        duration: FluentDuration.normal,
      });
    } else if (isRendered) {
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: FluentDuration.fast,
        easing: FluentCurve.accelerateMid,
      }, () => {
        runOnJS(handleAnimationComplete)(false);
      });
      scrimOpacity.value = withTiming(0, {
        duration: FluentDuration.fast,
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
          duration: FluentDuration.fast,
          easing: FluentCurve.accelerateMid,
        }, () => {
          runOnJS(handleAnimationComplete)(false);
        });
        scrimOpacity.value = withTiming(0, {
          duration: FluentDuration.fast,
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
              { backgroundColor: colors.colorNeutralBackgroundInverted },
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
                  backgroundColor: colors.colorNeutralBackground1,
                  maxHeight: maxHeight,
                },
                getShadowStyle('shadow28', isDark),
                sheetStyle,
              ]}
            >
              <View style={styles.handleContainer}>
                <View
                  style={[styles.handle, { backgroundColor: colors.colorNeutralStroke1 }]}
                />
              </View>
              {title && (
                <FluentText
                  variant="subtitle1"
                  style={styles.title}
                >
                  {title}
                </FluentText>
              )}
              <ScrollView
                style={styles.content}
                contentContainerStyle={[
                  styles.contentContainer,
                  { paddingBottom: insets.bottom + FluentSpacing.xxl },
                ]}
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
    borderTopLeftRadius: FluentControlRadius.bottomSheet,
    borderTopRightRadius: FluentControlRadius.bottomSheet,
    minHeight: 200,
  },
  handleContainer: {
    height: FluentLayoutSize.bottomSheetHandleHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: FluentSpacing.s,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: {
    paddingHorizontal: FluentSpacing.l,
    paddingBottom: FluentSpacing.s,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: FluentSpacing.l,
    paddingTop: FluentSpacing.s,
  },
});
