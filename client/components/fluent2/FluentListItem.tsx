import React from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  ViewStyle 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';
import { FluentText } from './FluentText';

interface FluentListItemProps {
  title: string;
  subtitle?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  trailingText?: string;
  showChevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function FluentListItem({
  title,
  subtitle,
  leadingIcon,
  trailingIcon,
  trailingText,
  showChevron = false,
  onPress,
  disabled = false,
  style,
}: FluentListItemProps) {
  const { colors, spacing, radius } = useFluent2Theme();

  const content = (
    <View style={[styles.container, { padding: spacing.lg }, style]}>
      {leadingIcon && (
        <View style={[styles.leadingIcon, { marginRight: spacing.lg }]}>
          {leadingIcon}
        </View>
      )}
      
      <View style={styles.content}>
        <FluentText 
          variant="body1" 
          color={disabled ? 'disabled' : 'primary'}
        >
          {title}
        </FluentText>
        {subtitle && (
          <FluentText 
            variant="body2" 
            color={disabled ? 'disabled' : 'secondary'}
            style={{ marginTop: spacing.xxs }}
          >
            {subtitle}
          </FluentText>
        )}
      </View>

      {trailingText && (
        <FluentText variant="body2" color="secondary">
          {trailingText}
        </FluentText>
      )}
      
      {trailingIcon && (
        <View style={{ marginLeft: spacing.sm }}>
          {trailingIcon}
        </View>
      )}

      {showChevron && (
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={colors.foreground.tertiary} 
          style={{ marginLeft: spacing.sm }}
        />
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.7}
        style={{
          backgroundColor: colors.surface.card,
          borderRadius: radius.md,
        }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View 
      style={{
        backgroundColor: colors.surface.card,
        borderRadius: radius.md,
      }}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadingIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});
