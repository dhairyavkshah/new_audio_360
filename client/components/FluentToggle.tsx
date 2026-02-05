import React, { useState } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentSpacing,
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
  const fluentColors = useThemedColors();
  const { playTickSound } = useUiSound();
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);
  
  const trackWidth = size === 'large' ? 52 : 40;
  const trackHeight = size === 'large' ? 32 : 20;
  const thumbSize = size === 'large' ? 24 : 14;
  const thumbTravel = trackWidth - thumbSize - 6;
  const trackBorderRadius = trackHeight / 2;

  const handlePressIn = () => {
    setIsPressed(true);
  };

  const handlePressOut = () => {
    setIsPressed(false);
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
    return fluentColors.colorNeutralBackground4;
  };

  const getTrackOnColor = () => {
    if (isPressed) return fluentColors.colorBrandBackgroundPressed;
    if (hoverActive) return fluentColors.colorBrandBackgroundHover;
    return fluentColors.colorCompoundBrandBackground;
  };

  const trackBackgroundColor = value ? getTrackOnColor() : getTrackOffColor();

  const getBorderColor = () => {
    if (value) return 'transparent';
    if (isPressed) return fluentColors.colorNeutralStroke1;
    if (hoverActive) return fluentColors.colorNeutralStroke2;
    return fluentColors.colorNeutralStroke1;
  };

  const thumbColor = value 
    ? fluentColors.colorNeutralForegroundOnBrand 
    : fluentColors.colorNeutralForeground3;

  const focusRingStyle = isFocused ? Platform.select({
    web: {
      outline: `2px solid ${fluentColors.colorBrandForeground1}`,
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
              borderColor: fluentColors.colorBrandForeground1,
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
        android_ripple={null}
      >
        <View
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
          <View
            style={[
              styles.thumb,
              {
                width: thumbSize,
                height: thumbSize,
                borderRadius: thumbSize / 2,
                backgroundColor: thumbColor,
                transform: [{ translateX: value ? thumbTravel : 0 }],
                ...thumbShadow,
              },
            ]}
          />
        </View>
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
    paddingHorizontal: FluentSpacing.xs,
  },
  thumb: {},
});
