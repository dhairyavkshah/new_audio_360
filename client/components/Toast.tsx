import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Pressable, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FluentText } from '@/components/fluent';
import { useThemeTokens } from '@/contexts/ThemeContext';
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentLayoutSize, FluentLightColors, FluentDarkColors, getShadowStyle } from '@/constants/fluent2';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const toastShadow = getShadowStyle('shadow8', isDark);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      translateY.stopAnimation();
      opacity.stopAnimation();
    };
  }, [translateY, opacity]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    
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

      timer = setTimeout(() => {
        if (isMountedRef.current) {
          hideToast();
        }
      }, duration);
    } else {
      translateY.stopAnimation();
      opacity.stopAnimation();
      translateY.setValue(-100);
      opacity.setValue(0);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, duration, translateY, opacity]);

  const hideToast = () => {
    if (!isMountedRef.current) return;
    
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
      if (isMountedRef.current) {
        onDismiss();
      }
    });
  };

  if (!visible) return null;

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: fluentColors.colorPaletteGreenBorderActive, icon: fluentColors.colorNeutralForegroundOnBrand };
      case 'error':
        return { bg: fluentColors.colorPaletteRedBorderActive, icon: fluentColors.colorNeutralForegroundOnBrand };
      case 'warning':
        return { bg: fluentColors.colorPaletteYellowBorderActive, icon: fluentColors.colorNeutralForeground1 };
      case 'info':
      default:
        return { bg: fluentColors.colorBrandBackground, icon: fluentColors.colorNeutralForegroundOnBrand };
    }
  };

  const colors = getColors();
  const topPosition = insets.top + FluentSpacing.m;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topPosition,
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
              ...toastShadow,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={ICONS[type]}
            size={FluentIconSize.regular}
            color={colors.icon}
            style={styles.icon}
          />
          <FluentText variant="body2" style={[styles.message, { color: colors.icon }]}>
            {message}
          </FluentText>
          <MaterialCommunityIcons
            name="close"
            size={FluentIconSize.small}
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
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
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
