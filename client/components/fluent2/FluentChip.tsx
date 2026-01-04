import React from 'react';
import { 
  TouchableOpacity, 
  View, 
  StyleSheet, 
  ViewStyle 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';
import { FluentText } from './FluentText';

type ChipVariant = 'filled' | 'outlined' | 'subtle';

interface FluentChipProps {
  label: string;
  variant?: ChipVariant;
  selected?: boolean;
  onPress?: () => void;
  onClose?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}

export function FluentChip({
  label,
  variant = 'filled',
  selected = false,
  onPress,
  onClose,
  icon,
  disabled = false,
  style,
}: FluentChipProps) {
  const { colors, spacing, radius } = useFluent2Theme();

  const getVariantStyles = () => {
    if (disabled) {
      return {
        backgroundColor: colors.backgroundTertiary,
        borderColor: colors.strokeDisabled,
        textColor: colors.textDisabled,
      };
    }

    switch (variant) {
      case 'filled':
        return {
          backgroundColor: selected ? colors.brandPrimary : colors.backgroundTertiary,
          borderColor: 'transparent',
          textColor: selected ? colors.textOnAccent : colors.textPrimary,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderColor: selected ? colors.brandPrimary : colors.strokePrimary,
          textColor: selected ? colors.brandForeground : colors.textPrimary,
        };
      case 'subtle':
        return {
          backgroundColor: selected ? colors.brandBackground : colors.backgroundSecondary,
          borderColor: 'transparent',
          textColor: selected ? colors.brandForeground : colors.textPrimary,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const chipContent = (
    <View 
      style={[
        styles.container,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: variant === 'outlined' ? 1 : 0,
          borderRadius: radius.full,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        },
        style,
      ]}
    >
      {icon && (
        <View style={{ marginRight: spacing.xs }}>
          {icon}
        </View>
      )}
      
      <FluentText 
        variant="body2" 
        style={{ color: variantStyles.textColor }}
      >
        {label}
      </FluentText>

      {onClose && (
        <TouchableOpacity 
          onPress={onClose}
          style={{ marginLeft: spacing.xs }}
        >
          <Ionicons 
            name="close-circle" 
            size={16} 
            color={variantStyles.textColor} 
          />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {chipContent}
      </TouchableOpacity>
    );
  }

  return chipContent;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});
