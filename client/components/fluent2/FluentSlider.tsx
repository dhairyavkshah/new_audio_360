import React, { useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  PanResponder,
  Animated,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';

interface FluentSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

export function FluentSlider({
  value,
  onValueChange,
  onSlidingComplete,
  minimumValue = 0,
  maximumValue = 1,
  step = 0,
  disabled = false,
  style,
}: FluentSliderProps) {
  const { colors, radius } = useFluent2Theme();
  const trackWidth = useRef(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const normalizedValue = (value - minimumValue) / (maximumValue - minimumValue);

  const handleLayout = (event: LayoutChangeEvent) => {
    trackWidth.current = event.nativeEvent.layout.width;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (_, gestureState) => {
        const touchX = gestureState.x0;
      },
      onPanResponderMove: (_, gestureState) => {
        const newPosition = Math.max(0, Math.min(gestureState.moveX, trackWidth.current));
        const newValue = (newPosition / trackWidth.current) * (maximumValue - minimumValue) + minimumValue;
        
        let finalValue = newValue;
        if (step > 0) {
          finalValue = Math.round(newValue / step) * step;
        }
        
        onValueChange(Math.max(minimumValue, Math.min(maximumValue, finalValue)));
      },
      onPanResponderRelease: (_, gestureState) => {
        const newPosition = Math.max(0, Math.min(gestureState.moveX, trackWidth.current));
        const newValue = (newPosition / trackWidth.current) * (maximumValue - minimumValue) + minimumValue;
        
        let finalValue = newValue;
        if (step > 0) {
          finalValue = Math.round(newValue / step) * step;
        }
        
        onSlidingComplete?.(Math.max(minimumValue, Math.min(maximumValue, finalValue)));
      },
    })
  ).current;

  return (
    <View
      style={[styles.container, style]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.track,
          {
            backgroundColor: colors.stroke.secondary,
            borderRadius: radius.full,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: disabled ? colors.foreground.disabled : colors.brand.primary,
              borderRadius: radius.full,
              width: `${normalizedValue * 100}%`,
            },
          ]}
        />
      </View>
      
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: disabled ? colors.foreground.disabled : colors.brand.primary,
            borderRadius: radius.full,
            left: `${normalizedValue * 100}%`,
            marginLeft: -12,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    width: '100%',
  },
  fill: {
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
