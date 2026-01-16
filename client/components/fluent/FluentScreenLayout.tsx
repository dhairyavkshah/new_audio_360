import React, { ReactNode, useEffect, useState } from 'react';
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
  const [isReady, setIsReady] = useState(Platform.OS !== 'android');

  const bgColor = getBackgroundColor(backgroundColor, isDark);
  const paddingValue = FluentPadding[contentPadding];

  useEffect(() => {
    if (Platform.OS === 'android') {
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    }
  }, []);

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
      style={[
        styles.container, 
        { backgroundColor: bgColor, opacity: isReady ? 1 : 0 }, 
        style
      ]} 
      edges={edges}
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
