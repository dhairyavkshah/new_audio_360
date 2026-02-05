import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { CrossPlatformSlider } from "@/components/CrossPlatformSlider";
import { FluentText } from "@/components/fluent";
import { useThemedColors } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlHeight, FluentSliderSize } from "@/constants/fluent2";

export interface EQBandSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
}

function EQBandSliderComponent({
  label,
  value,
  onValueChange,
  minValue = -8,
  maxValue = 8,
}: EQBandSliderProps) {
  const colors = useThemedColors();

  return (
    <View style={styles.bandRow}>
      <FluentText variant="caption1" style={styles.bandLabel}>{label}</FluentText>
      <CrossPlatformSlider
        style={styles.slider}
        minimumValue={minValue}
        maximumValue={maxValue}
        step={1}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={colors.colorBrandForeground1}
        maximumTrackTintColor={colors.colorNeutralStroke1}
        thumbTintColor={colors.colorBrandForeground1}
        trackHeight={FluentSliderSize.trackMedium}
      />
      <FluentText variant="caption1" style={styles.bandValue}>
        {value > 0 ? `+${value}` : value}
      </FluentText>
    </View>
  );
}

const styles = StyleSheet.create({
  bandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.s,
  },
  bandLabel: {
    width: 50,
  },
  slider: {
    flex: 1,
    height: FluentControlHeight.large,
  },
  bandValue: {
    width: 30,
    textAlign: "right",
  },
});

export const EQBandSlider = memo(EQBandSliderComponent);
