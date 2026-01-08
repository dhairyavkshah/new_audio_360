import React, { useRef, useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Animated, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { M3Motion } from "@/constants/theme";

interface FluentToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'default' | 'large';
}

const adjustBrightness = (color: string, amount: number): string => {
  if (!color || color === 'transparent') return color;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return color;
  
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export function FluentToggle({ 
  value, 
  onValueChange, 
  disabled = false,
  size = 'default',
}: FluentToggleProps) {
  const { theme, isDark } = useThemeContext();
  const { playTickSound } = useUiSound();
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);
  
  const trackWidth = size === 'large' ? 52 : 40;
  const trackHeight = size === 'large' ? 32 : 20;
  const thumbSize = size === 'large' ? 24 : 14;
  const thumbTravel = trackWidth - thumbSize - 6;
  
  const translateX = useRef(new Animated.Value(value ? thumbTravel : 0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const trackOpacity = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: value ? thumbTravel : 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 300,
        mass: 0.6,
      }),
      Animated.timing(trackOpacity, {
        toValue: value ? 1 : 0,
        duration: M3Motion.durationShort3,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, translateX, trackOpacity, thumbTravel]);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(thumbScale, {
      toValue: 0.85,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(thumbScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const handleHoverIn = () => {
    if (!disabled) {
      setHoverActive(true);
    }
  };

  const handleHoverOut = () => {
    if (!disabled) {
      setHoverActive(false);
    }
  };

  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    playTickSound();
    onValueChange(!value);
  };

  const hoverAdjust = isDark ? 15 : -10;
  const pressedAdjust = isDark ? 25 : -20;

  const getTrackOffColor = () => {
    const baseOff = theme.surfaceContainerHigh || '#3A3A3A';
    if (isPressed) return adjustBrightness(baseOff, pressedAdjust);
    if (hoverActive) return adjustBrightness(baseOff, hoverAdjust);
    return baseOff;
  };

  const getTrackOnColor = () => {
    const baseOn = theme.primary || '#0078D4';
    if (isPressed) return theme.primaryPressed || adjustBrightness(baseOn, pressedAdjust);
    if (hoverActive) return theme.primaryHover || adjustBrightness(baseOn, hoverAdjust);
    return baseOn;
  };

  const trackBackgroundColor = trackOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [getTrackOffColor(), getTrackOnColor()],
  });

  const getBorderColor = () => {
    if (value) return 'transparent';
    if (isPressed) return theme.primary;
    if (hoverActive) return theme.outline;
    return theme.outlineVariant;
  };

  const thumbColor = value ? "#FFFFFF" : theme.onSurfaceVariant;

  const focusRingStyle = isFocused ? Platform.select({
    web: {
      outline: `2px solid ${theme.primary}`,
      outlineOffset: 2,
    },
    default: {},
  }) : {};

  return (
    <View style={styles.wrapper}>
      {isFocused && Platform.OS !== 'web' ? (
        <View 
          style={[
            styles.focusRing, 
            { 
              borderColor: theme.primary,
              width: trackWidth + 8,
              height: trackHeight + 8,
              borderRadius: (trackHeight + 8) / 2,
            }
          ]} 
        />
      ) : null}
      <Pressable 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled} 
        style={[styles.pressable, focusRingStyle]}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
      >
        <Animated.View
          style={[
            styles.track,
            {
              width: trackWidth,
              height: trackHeight,
              borderRadius: trackHeight / 2,
              backgroundColor: trackBackgroundColor,
              opacity: disabled ? 0.38 : 1,
              borderWidth: value ? 0 : 1,
              borderColor: getBorderColor(),
            },
          ]}
        >
          <Animated.View
            style={[
              styles.thumb,
              {
                width: thumbSize,
                height: thumbSize,
                borderRadius: thumbSize / 2,
                backgroundColor: thumbColor,
                transform: [
                  { translateX },
                  { scale: thumbScale },
                ],
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                  },
                  android: {
                    elevation: 2,
                  },
                  default: {},
                }),
              },
            ]}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  pressable: {
    minHeight: 44,
    justifyContent: "center",
    padding: 4,
  },
  track: {
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  thumb: {},
});
