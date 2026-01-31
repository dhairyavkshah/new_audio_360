import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { EffectChip } from "@/components/EffectChip";
import { FluentSpacing } from "@/constants/fluent2";

export type RadioMode = 'fmam' | 'online';

export interface RadioTabSelectorProps {
  selectedMode: RadioMode;
  onModeChange: (mode: RadioMode) => void;
  isFmAvailable: boolean;
}

function RadioTabSelectorComponent({
  selectedMode,
  onModeChange,
  isFmAvailable,
}: RadioTabSelectorProps) {
  return (
    <View style={styles.modeToggle}>
      <EffectChip
        label="FM/AM"
        isSelected={selectedMode === "fmam"}
        onPress={() => onModeChange("fmam")}
        disabled={!isFmAvailable}
      />
      <View style={{ width: FluentSpacing.m }} />
      <EffectChip
        label="Online"
        isSelected={selectedMode === "online"}
        onPress={() => onModeChange("online")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modeToggle: {
    flexDirection: "row",
    justifyContent: "center",
  },
});

export const RadioTabSelector = memo(RadioTabSelectorComponent);
