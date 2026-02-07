import React, { useState } from 'react';
import { Pressable, PressableProps, View, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeContext, useThemedColors } from '@/contexts/ThemeContext';
import { FluentSurface } from './FluentSurface';
import {
  FluentSpacing,
  FluentControlRadius,
  getShadowStyle,
  ShadowLevel,
  FluentBorderWidth,
  FluentSpring,
} from '@/constants/fluent2';

type ElevationLevel = 'none' | 'subtle' | 'medium' | 'strong';

export interface FluentCardProps extends Omit<PressableProps, 'children'> {
  elevation?: ElevationLevel;
  interactive?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  noPadding?: boolean;
}

const elevationToShadow: Record<ElevationLevel, ShadowLevel | null> = {
  none: null,
  subtle: 'shadow2',
  medium: 'shadow8',
  strong: 'shadow16',
};

const elevationPressedShadow: Record<ElevationLevel, ShadowLevel | null> = {
  none: 'shadow2',
  subtle: 'shadow4',
  medium: 'shadow16',
  strong: 'shadow28',
};

export function FluentCard({
  elevation = 'subtle',
  interactive = false,
  header,
  footer,
  children,
  noPadding = false,
  onPress,
  style,
  ...props
}: FluentCardProps) {
  const { isDark } = useThemeContext();
  const colors = useThemedColors();

  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!interactive && !onPress) return;
    setIsPressed(true);
    scale.value = withSpring(0.98, FluentSpring.standard);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withSpring(1, FluentSpring.standard);
  };

  const getBackgroundColor = () => {
    if (isPressed) return colors.colorNeutralBackground1Pressed;
    if (isHovered) return colors.colorNeutralBackground1Hover;
    return colors.colorNeutralBackground1;
  };

  const shadowLevel = isPressed
    ? elevationPressedShadow[elevation]
    : elevationToShadow[elevation];
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
      <Animated.View style={animatedStyle}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: getBackgroundColor(),
              borderRadius: FluentControlRadius.card,
            },
            shadowStyle,
            style,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onHoverIn={() => setIsHovered(true)}
          onHoverOut={() => setIsHovered(false)}
          accessibilityRole="button"
          android_ripple={null}
          {...props}
        >
          {cardContent}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.colorNeutralBackground1,
          borderRadius: FluentControlRadius.card,
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
