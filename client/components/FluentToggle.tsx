import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeContext } from "@/contexts/ThemeContext";

interface FluentToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function FluentToggle({ value, onValueChange, disabled = false }: FluentToggleProps) {
  const { theme } = useThemeContext();
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;
  const trackOpacity = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: value ? 20 : 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }),
      Animated.timing(trackOpacity, {
        toValue: value ? 1 : 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, translateX, trackOpacity]);

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  const trackBackgroundColor = trackOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.backgroundTertiary, theme.primary],
  });

  return (
    <Pressable onPress={handlePress} disabled={disabled} style={styles.pressable}>
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackBackgroundColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: "#FFFFFF",
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 44,
    justifyContent: "center",
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
    justifyContent: "center",
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
