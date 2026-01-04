import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';
import { FluentText } from './FluentText';

interface FluentTextFieldProps extends TextInputProps {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function FluentTextField({
  label,
  helperText,
  error,
  leadingIcon,
  trailingIcon,
  containerStyle,
  ...textInputProps
}: FluentTextFieldProps) {
  const { colors, spacing, radius, typography } = useFluent2Theme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? colors.status.error
    : isFocused
    ? colors.stroke.focus
    : colors.stroke.primary;

  return (
    <View style={containerStyle}>
      {label && (
        <FluentText 
          variant="body2" 
          color="secondary"
          style={{ marginBottom: spacing.xs }}
        >
          {label}
        </FluentText>
      )}
      
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background.secondary,
            borderColor,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {leadingIcon && (
          <View style={{ marginRight: spacing.sm }}>
            {leadingIcon}
          </View>
        )}
        
        <TextInput
          {...textInputProps}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: colors.foreground.primary,
              fontSize: typography.fontSize.body1,
            },
            textInputProps.style,
          ]}
          placeholderTextColor={colors.foreground.tertiary}
        />

        {trailingIcon && (
          <View style={{ marginLeft: spacing.sm }}>
            {trailingIcon}
          </View>
        )}
      </View>

      {(helperText || error) && (
        <FluentText 
          variant="caption1" 
          color={error ? 'error' : 'secondary'}
          style={{ marginTop: spacing.xs }}
        >
          {error || helperText}
        </FluentText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
});
