import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'subtle' | 'transparent';
type ButtonSize = 'small' | 'medium' | 'large';

interface FluentButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function FluentButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: FluentButtonProps) {
  const { colors, spacing, radius, typography } = useFluent2Theme();

  const sizeStyles = {
    small: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize: typography.fontSize.body2,
      iconSize: 16,
    },
    medium: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      fontSize: typography.fontSize.body1,
      iconSize: 20,
    },
    large: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      fontSize: typography.fontSize.subtitle2,
      iconSize: 24,
    },
  };

  const getVariantStyles = () => {
    const baseOpacity = disabled ? 0.5 : 1;
    
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: colors.brandPrimary,
            opacity: baseOpacity,
          },
          text: {
            color: colors.textOnAccent,
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: colors.backgroundTertiary,
            opacity: baseOpacity,
          },
          text: {
            color: colors.textPrimary,
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.strokePrimary,
            opacity: baseOpacity,
          },
          text: {
            color: colors.textPrimary,
          },
        };
      case 'subtle':
        return {
          container: {
            backgroundColor: colors.brandBackground,
            opacity: baseOpacity,
          },
          text: {
            color: colors.brandForeground,
          },
        };
      case 'transparent':
        return {
          container: {
            backgroundColor: 'transparent',
            opacity: baseOpacity,
          },
          text: {
            color: colors.brandForeground,
          },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const currentSize = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          borderRadius: radius.md,
        },
        variantStyles.container,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variantStyles.text.color} 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Text style={{ marginRight: spacing.sm }}>{icon}</Text>
          )}
          <Text
            style={[
              styles.text,
              {
                fontSize: currentSize.fontSize,
                fontWeight: typography.fontWeight.semibold,
              },
              variantStyles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Text style={{ marginLeft: spacing.sm }}>{icon}</Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    textAlign: 'center',
  },
});
