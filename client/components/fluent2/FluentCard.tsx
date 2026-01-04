import React from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  ViewStyle 
} from 'react-native';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';

type CardVariant = 'elevated' | 'outlined' | 'filled';

interface FluentCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export function FluentCard({
  children,
  variant = 'elevated',
  onPress,
  padding = 'medium',
  style,
}: FluentCardProps) {
  const { colors, spacing, radius, elevation, isDark } = useFluent2Theme();

  const paddingMap = {
    none: 0,
    small: spacing.sm,
    medium: spacing.lg,
    large: spacing.xl,
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surfacePrimary,
          ...elevation.level2,
          borderWidth: 0,
        };
      case 'outlined':
        return {
          backgroundColor: colors.surfacePrimary,
          borderWidth: 1,
          borderColor: colors.strokePrimary,
          ...elevation.none,
        };
      case 'filled':
        return {
          backgroundColor: colors.backgroundTertiary,
          borderWidth: 0,
          ...elevation.none,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const cardStyle: ViewStyle = {
    padding: paddingMap[padding],
    borderRadius: radius.lg,
    ...variantStyles,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({});
