import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface CrossPlatformSliderProps {
  style?: any;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  disabled?: boolean;
  vertical?: boolean;
}

export function CrossPlatformSlider({
  style,
  value,
  minimumValue,
  maximumValue,
  step = 1,
  minimumTrackTintColor = '#007AFF',
  maximumTrackTintColor = '#B0B0B0',
  thumbTintColor = '#FFFFFF',
  onValueChange,
  onSlidingComplete,
  disabled = false,
  vertical = false,
}: CrossPlatformSliderProps) {
  if (Platform.OS === 'web') {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onValueChange?.(newValue);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
      const newValue = parseFloat((e.target as HTMLInputElement).value);
      onSlidingComplete?.(newValue);
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLInputElement>) => {
      const newValue = parseFloat((e.target as HTMLInputElement).value);
      onSlidingComplete?.(newValue);
    };

    const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;

    const sliderStyle: React.CSSProperties = {
      width: vertical ? 8 : '100%',
      height: vertical ? '100%' : 8,
      appearance: 'none' as const,
      WebkitAppearance: 'none',
      background: `linear-gradient(${vertical ? 'to top' : 'to right'}, ${minimumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} ${percentage}%)`,
      borderRadius: 4,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transform: vertical ? 'rotate(-90deg)' : undefined,
      transformOrigin: vertical ? 'center center' : undefined,
    };

    const containerStyle: React.CSSProperties = vertical
      ? {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: 40,
        }
      : {
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        };

    return (
      <View style={[style, { overflow: 'visible' }]}>
        <div style={containerStyle}>
          <input
            type="range"
            min={minimumValue}
            max={maximumValue}
            step={step}
            value={value}
            onChange={handleChange}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleTouchEnd}
            disabled={disabled}
            style={sliderStyle}
          />
        </div>
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            background: ${thumbTintColor};
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            border: 2px solid ${minimumTrackTintColor};
          }
          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            background: ${thumbTintColor};
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            border: 2px solid ${minimumTrackTintColor};
          }
          input[type="range"]:focus {
            outline: none;
          }
        `}</style>
      </View>
    );
  }

  return (
    <Slider
      style={style}
      value={value}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      minimumTrackTintColor={minimumTrackTintColor}
      maximumTrackTintColor={maximumTrackTintColor}
      thumbTintColor={thumbTintColor}
      onValueChange={onValueChange}
      onSlidingComplete={onSlidingComplete}
      disabled={disabled}
    />
  );
}

export default CrossPlatformSlider;
