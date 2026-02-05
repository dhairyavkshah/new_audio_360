import React, { memo } from "react";
import { StyleSheet, Pressable } from "react-native";
import { FluentText } from "@/components/fluent";
import { useThemedColors } from "@/contexts/ThemeContext";
import { RadioStation, FMBandType } from "@/contexts/RadioContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentTouchTarget,
} from "@/constants/fluent2";

export interface FavoriteStationCardProps {
  station: RadioStation;
  isSelected: boolean;
  currentFrequency: number;
  currentBandType: FMBandType;
  onPress: (station: RadioStation) => void;
}

function FavoriteStationCardComponent({
  station,
  isSelected,
  currentFrequency,
  currentBandType,
  onPress,
}: FavoriteStationCardProps) {
  const colors = useThemedColors();

  const formatFrequency = (freq: number, band: FMBandType): string => {
    if (band === "fm") {
      return freq.toFixed(1);
    }
    return Math.round(freq).toString();
  };

  const isCurrentStation = station.frequency === currentFrequency && station.bandType === currentBandType;

  return (
    <Pressable
      style={[
        styles.stationChip,
        {
          backgroundColor: isCurrentStation
            ? colors.colorBrandBackground
            : colors.colorNeutralBackground3,
          borderColor: isCurrentStation
            ? colors.colorBrandStroke1
            : colors.colorNeutralStroke2,
          minHeight: FluentTouchTarget.minimum,
        },
      ]}
      onPress={() => onPress(station)}
      hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
      accessibilityLabel={`Tune to ${station.frequencyMHz} ${station.bandType === "fm" ? "FM" : "AM"}`}
      accessibilityRole="button"
    >
      <FluentText
        variant="body1Strong"
        style={{
          color: isCurrentStation
            ? colors.colorNeutralForegroundOnBrand
            : colors.colorNeutralForeground1,
        }}
      >
        {formatFrequency(station.frequencyMHz, station.bandType)}
      </FluentText>
      <FluentText
        variant="caption1"
        style={{
          color: isCurrentStation
            ? colors.colorNeutralForegroundOnBrand
            : colors.colorNeutralForeground2,
        }}
      >
        {station.bandType === "fm" ? "FM" : "AM"}
      </FluentText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stationChip: {
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 80,
  },
});

export const FavoriteStationCard = memo(FavoriteStationCardComponent);
