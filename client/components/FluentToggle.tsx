import React, { useRef, useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Animated, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentDuration,
  FluentSpring,
  FluentLightColors,
  FluentDarkColors,
  getShadowStyle,
} from "@/constants/fluent2";

interface FluentToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'default' | 'large';
}

export function FluentToggle({ 
  value, 
  onValueChange, 
  disabled = false,
  size = 'default',
}: FluentToggleProps) {
  const { isDark } = useThemeContext();
  const { playTickSound } = useUiSound();
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);

  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;
  
  const trackWidth = size === 'large' ? 52 : 40;
  const trackHeight = size === 'large' ? 32 : 20;
  const thumbSize = size === 'large' ? 24 : 14;
  const thumbTravel = trackWidth - thumbSize - 6;
  const trackBorderRadius = trackHeight / 2;
  
  const translateX = useRef(new Animated.Value(value ? thumbTravel : 0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const trackOpacity = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: value ? thumbTravel : 0,
        useNativeDriver: true,
        damping: FluentSpring.standard.damping,
        stiffness: FluentSpring.standard.stiffness,
        mass: FluentSpring.standard.mass,
      }),
      Animated.timing(trackOpacity, {
        toValue: value ? 1 : 0,
        duration: FluentDuration.fast,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, translateX, trackOpacity, thumbTravel]);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(thumbScale, {
      toValue: 0.85,
      useNativeDriver: true,
      damping: FluentSpring.gentle.damping,
      stiffness: FluentSpring.gentle.stiffness,
      mass: FluentSpring.gentle.mass,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(thumbScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: FluentSpring.gentle.damping,
      stiffness: FluentSpring.gentle.stiffness,
      mass: FluentSpring.gentle.mass,
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

  const getTrackOffColor = () => {
    if (isPressed) return fluentColors.colorNeutralBackground1Pressed;
    if (hoverActive) return fluentColors.colorNeutralBackground1Hover;
    return fluentColors.colorNeutralBackground5;
  };

  const getTrackOnColor = () => {
    if (isPressed) return fluentColors.colorCompoundBrandBackgroundPressed;
    if (hoverActive) return fluentColors.colorCompoundBrandBackgroundHover;
    return fluentColors.colorCompoundBrandBackground;
  };

  const trackBackgroundColor = trackOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [getTrackOffColor(), getTrackOnColor()],
  });

  const getBorderColor = () => {
    if (value) return 'transparent';
    if (isPressed) return fluentColors.colorNeutralStrokeAccessiblePressed;
    if (hoverActive) return fluentColors.colorNeutralStrokeAccessibleHover;
    return fluentColors.colorNeutralStrokeAccessible;
  };

  const thumbColor = value 
    ? fluentColors.colorNeutralForegroundOnBrand 
    : fluentColors.colorNeutralForeground3;

  const focusRingStyle = isFocused ? Platform.select({
    web: {
      outline: `2px solid ${fluentColors.colorStrokeFocus2}`,
      outlineOffset: 2,
    },
    default: {},
  }) : {};

  const thumbShadow = getShadowStyle('shadow2', isDark);

  return (
    <View style={styles.wrapper}>
      {isFocused && Platform.OS !== 'web' ? (
        <View 
          style={[
            styles.focusRing, 
            { 
              borderColor: fluentColors.colorStrokeFocus2,
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
              borderRadius: trackBorderRadius,
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
                ...thumbShadow,
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
