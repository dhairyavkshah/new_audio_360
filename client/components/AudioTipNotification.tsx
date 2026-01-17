import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Animated, Platform, PanResponder } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";

interface AudioTipNotificationProps {
  visible: boolean;
  onDismiss: () => void;
}

const useNativeDriver = Platform.OS !== "web";

export function AudioTipNotification({ visible, onDismiss }: AudioTipNotificationProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30 || gestureState.vy < -0.5) {
          dismissNotification();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver,
        }),
      ]).start();

      const autoDismissTimer = setTimeout(() => {
        dismissNotification();
      }, 5000);

      return () => clearTimeout(autoDismissTimer);
    }
  }, [visible]);

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver,
      }),
    ]).start(() => {
      setIsVisible(false);
      onDismiss();
    });
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + FluentSpacing.m,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.card, { backgroundColor: colors.colorNeutralBackground3 }]}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={20}
            color={colors.colorBrandForeground1}
          />
        </View>
        <View style={styles.content}>
          <FluentText variant="caption1" style={{ color: colors.colorNeutralForeground1 }}>
            For the best audio experience, disable your phone's native EQ or Dolby effects in system settings.
          </FluentText>
        </View>
        <Pressable onPress={dismissNotification} style={styles.closeButton} hitSlop={8}>
          <MaterialCommunityIcons
            name="close"
            size={18}
            color={colors.colorNeutralForeground3}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: FluentSpacing.m,
    right: FluentSpacing.m,
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginRight: FluentSpacing.s,
  },
  content: {
    flex: 1,
  },
  closeButton: {
    marginLeft: FluentSpacing.s,
    padding: FluentSpacing.xxs,
  },
});

export default AudioTipNotification;
