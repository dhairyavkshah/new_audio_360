import React, { ReactNode } from 'react';
import { View, StyleSheet, StatusBar, Platform, KeyboardAvoidingView, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '@/contexts/ThemeContext';
import { FluentLightColors, FluentDarkColors, FluentSpacing, FluentPadding } from '@/constants/fluent2';
import { useSafeTabBarHeight } from '@/hooks/useSafeTabBarHeight';

type BackgroundVariant = 'neutral1' | 'neutral2' | 'neutral3';

export interface FluentScreenLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  backgroundColor?: BackgroundVariant;
  hasBottomNavigation?: boolean;
  contentPadding?: keyof typeof FluentPadding;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  avoidKeyboard?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

const getBackgroundColor = (variant: BackgroundVariant, isDark: boolean): string => {
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  switch (variant) {
    case 'neutral1':
      return colors.colorNeutralBackground1;
    case 'neutral2':
      return colors.colorNeutralBackground2;
    case 'neutral3':
      return colors.colorNeutralBackground3;
    default:
      return colors.colorNeutralBackground1;
  }
};

export function FluentScreenLayout({
  children,
  header,
  backgroundColor = 'neutral1',
  hasBottomNavigation = true,
  contentPadding = 'none',
  style,
  contentStyle,
  avoidKeyboard = true,
  edges = ['top'],
}: FluentScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();

  const bgColor = getBackgroundColor(backgroundColor, isDark);
  const paddingValue = FluentPadding[contentPadding];

  // On Android with non-translucent status bar, we don't need top safe area edge
  // as the StatusBar component already reserves that space
  // For screens with native stack headers (edges=[]), no top padding is needed
  const safeAreaEdges = Platform.OS === 'android' 
    ? edges.filter(e => e !== 'top') 
    : edges;

  const bottomPadding = hasBottomNavigation ? tabBarHeight + FluentSpacing.l : insets.bottom + FluentSpacing.l;

  const content = (
    <View
      style={[
        styles.content,
        {
          paddingHorizontal: paddingValue,
          paddingBottom: bottomPadding,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: bgColor }, style]} 
      edges={safeAreaEdges}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={false}
      />
      {header}
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default FluentScreenLayout;
