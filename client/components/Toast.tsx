import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
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
  const isMountedRef = useRef(true);
  const toastShadow = getShadowStyle('shadow8', isDark);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    
    if (visible) {
      timer = setTimeout(() => {
        if (isMountedRef.current) {
          onDismiss();
        }
      }, duration);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, duration, onDismiss]);

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
    <View
      style={[
        styles.container,
        {
          top: topPosition,
        },
      ]}
    >
      <Pressable onPress={onDismiss} android_ripple={null}>
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
    </View>
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
