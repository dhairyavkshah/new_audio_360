import React, { useState } from 'react';
import { Pressable, PressableProps, View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '@/contexts/ThemeContext';
import { FluentSurface } from './FluentSurface';
import {
  FluentLightColors,
  FluentDarkColors,
  FluentSpacing,
  FluentControlRadius,
  FluentRadius,
  getShadowStyle,
  ShadowLevel,
  FluentBorderWidth,
  FluentDuration,
  FluentCurve,
} from '@/constants/fluent2';

type ElevationLevel = 'none' | 'subtle' | 'medium' | 'strong';

export interface FluentCardProps extends Omit<PressableProps, 'children'> {
  elevation?: ElevationLevel;
  interactive?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  noPadding?: boolean;
  featured?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const elevationToShadow: Record<ElevationLevel, ShadowLevel | null> = {
  none: null,
  subtle: 'shadow4',
  medium: 'shadow8',
  strong: 'shadow16',
};

const timingConfig = {
  duration: FluentDuration.normal,
  easing: FluentCurve.decelerateMid,
};

export function FluentCard({
  elevation = 'subtle',
  interactive = false,
  header,
  footer,
  children,
  noPadding = false,
  featured = false,
  onPress,
  style,
  ...props
}: FluentCardProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!interactive && !onPress) return;
    setIsPressed(true);
    scale.value = withTiming(0.98, timingConfig);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withTiming(1, timingConfig);
  };

  const borderRadius = featured ? FluentRadius.xLarge : FluentControlRadius.card;

  const getBackgroundColor = () => {
    if (isPressed) return colors.colorNeutralBackground1Pressed;
    if (isHovered) return colors.colorNeutralBackground1Hover;
    return colors.colorNeutralBackground1;
  };

  const shadowLevel = elevationToShadow[elevation];
  const shadowStyle = shadowLevel ? getShadowStyle(shadowLevel, isDark) : {};

  const isInteractive = interactive || !!onPress;

  const cardContent = (
    <>
      {header && (
        <View style={[styles.header, !noPadding && styles.headerPadding]}>
          {header}
        </View>
      )}
      <View style={[styles.content, !noPadding && styles.contentPadding]}>
        {children}
      </View>
      {footer && (
        <View style={[styles.footer, !noPadding && styles.footerPadding]}>
          {footer}
        </View>
      )}
    </>
  );

  if (isInteractive) {
    return (
      <AnimatedPressable
        style={[
          styles.card,
          {
            backgroundColor: getBackgroundColor(),
            borderRadius,
          },
          shadowStyle,
          animatedStyle,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        accessibilityRole="button"
        {...props}
      >
        {cardContent}
      </AnimatedPressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.colorNeutralBackground1,
          borderRadius,
        },
        shadowStyle,
        style,
      ]}
      {...props}
    >
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  header: {
    borderBottomWidth: FluentBorderWidth.thin,
  },
  headerPadding: {
    padding: FluentSpacing.l,
    paddingBottom: FluentSpacing.m,
  },
  content: {},
  contentPadding: {
    padding: FluentSpacing.l,
  },
  footer: {
    borderTopWidth: FluentBorderWidth.thin,
  },
  footerPadding: {
    padding: FluentSpacing.l,
    paddingTop: FluentSpacing.m,
  },
});

export default FluentCard;
