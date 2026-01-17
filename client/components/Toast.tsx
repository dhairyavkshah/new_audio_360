import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Pressable, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FluentText } from '@/components/fluent';
import { useThemeTokens } from '@/contexts/ThemeContext';
import { FluentSpacing, FluentRadius } from '@/constants/fluent2';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
}

const ICONS: Record<ToastType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'information',
  warning: 'alert',
};

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const tokens = useThemeTokens();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: Platform.OS !== 'web',
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#10B981', icon: '#FFFFFF' };
      case 'error':
        return { bg: '#EF4444', icon: '#FFFFFF' };
      case 'warning':
        return { bg: '#F59E0B', icon: '#FFFFFF' };
      case 'info':
      default:
        return { bg: tokens.colors.primary, icon: '#FFFFFF' };
    }
  };

  const colors = getColors();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable onPress={hideToast}>
        <View
          style={[
            styles.toast,
            {
              backgroundColor: colors.bg,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={ICONS[type]}
            size={20}
            color={colors.icon}
            style={styles.icon}
          />
          <FluentText variant="body1" style={[styles.message, { color: colors.icon }]}>
            {message}
          </FluentText>
          <MaterialCommunityIcons
            name="close"
            size={18}
            color={colors.icon}
            style={styles.closeIcon}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.l,
    borderRadius: FluentRadius.large,
    minWidth: 200,
    maxWidth: '100%',
  },
  icon: {
    marginRight: FluentSpacing.s,
  },
  message: {
    flex: 1,
    fontWeight: '500',
  },
  closeIcon: {
    marginLeft: FluentSpacing.s,
    opacity: 0.8,
  },
});

export default Toast;
