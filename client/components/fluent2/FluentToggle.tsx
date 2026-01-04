import React from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
} from 'react-native';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';

interface FluentToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function FluentToggle({
  value,
  onValueChange,
  disabled = false,
}: FluentToggleProps) {
  const { colors, radius } = useFluent2Theme();
  const translateX = React.useRef(new Animated.Value(value ? 22 : 2)).current;

  React.useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 22 : 2,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [value]);

  const trackColor = disabled
    ? colors.strokeDisabled
    : value
    ? colors.brandPrimary
    : colors.strokePrimary;

  const thumbColor = disabled
    ? colors.textDisabled
    : colors.textOnAccent;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => !disabled && onValueChange(!value)}
      style={[
        styles.track,
        {
          backgroundColor: trackColor,
          borderRadius: radius.full,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbColor,
            borderRadius: radius.full,
            transform: [{ translateX }],
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    justifyContent: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
