import React, { memo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CrossPlatformSlider } from "@/components/CrossPlatformSlider";
import { FluentText } from "@/components/fluent";
import { EffectChip } from "@/components/EffectChip";
import { EQBandSlider } from "./EQBandSlider";
import { useThemeContext, useThemeTokens, useThemedColors } from "@/contexts/ThemeContext";
import { getCardEffectStyle } from "@/lib/themeUtils";
import { 
  FluentSpacing, 
  FluentRadius, 
  FluentIconSize, 
  FluentControlHeight, 
  FluentFontWeight, 
  FluentSliderSize, 
} from "@/constants/fluent2";
import { CustomEQPreset } from "@/lib/storage";

export interface EQPreset {
  name: string;
  description: string;
  bands: number[];
  bassControl: number;
  trebleControl: number;
}

export interface EQPresetCardProps {
  isActive: boolean;
  selectedPreset: string;
  isCustomEQ: boolean;
  presets: EQPreset[];
  customBands: number[];
  customPresets: CustomEQPreset[];
  maxCustomPresets: number;
  bassControl: number;
  trebleControl: number;
  spatialEnhancement: number;
  onPresetChange: (preset: string) => void;
  onBandChange: (index: number, value: number) => void;
  onResetBands: () => void;
  onSavePreset: () => void;
  onLoadPreset: (preset: CustomEQPreset) => void;
  onEditPreset: (preset: CustomEQPreset) => void;
  onDeletePreset: (preset: CustomEQPreset) => void;
  onBassChange: (value: number) => void;
  onTrebleChange: (value: number) => void;
  onSpatialChange: (value: number) => void;
  bandLabels: string[];
}

function EQPresetCardComponent({
  isActive,
  selectedPreset,
  isCustomEQ,
  presets,
  customBands,
  customPresets,
  maxCustomPresets,
  bassControl,
  trebleControl,
  spatialEnhancement,
  onPresetChange,
  onBandChange,
  onResetBands,
  onSavePreset,
  onLoadPreset,
  onEditPreset,
  onDeletePreset,
  onBassChange,
  onTrebleChange,
  onSpatialChange,
  bandLabels,
}: EQPresetCardProps) {
  const tokens = useThemeTokens();
  const { isDark } = useThemeContext();
  const colors = useThemedColors();
  const cardStyle = getCardEffectStyle(tokens);

  const spatialLabels = ["Off", "Subtle", "Mild", "Moderate", "Enhanced", "Maximum"];

  return (
    <View style={[styles.sectionCard, cardStyle]}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="tune-vertical" size={FluentIconSize.regular} color={tokens.colors.primary} />
        <FluentText variant="subtitle1" style={styles.sectionTitle}>
          Equalizer Mode
        </FluentText>
        {isActive && (
          <View style={[styles.activeIndicator, { backgroundColor: tokens.colors.primary }]}>
            <FluentText variant="caption1" color="onBrand" style={{ fontWeight: FluentFontWeight.semibold }}>Active</FluentText>
          </View>
        )}
      </View>
      
      <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.m }}>
        Premium world-class EQ presets
      </FluentText>

      <View style={styles.chipsContainer}>
        {presets.map((preset) => (
          <EffectChip
            key={preset.name}
            label={preset.name}
            isSelected={isActive && selectedPreset === preset.name && !isCustomEQ}
            onPress={() => onPresetChange(preset.name)}
          />
        ))}
        <EffectChip
          label="Custom"
          isSelected={isActive && isCustomEQ}
          onPress={() => onPresetChange("Custom")}
          isPremium={false}
        />
      </View>

      {isActive && selectedPreset && !isCustomEQ && (
        <View style={styles.presetInfo}>
          <FluentText variant="body1Strong">{selectedPreset}</FluentText>
          <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
            {presets.find(p => p.name === selectedPreset)?.description}
          </FluentText>
        </View>
      )}

      {isActive && (
        <View style={[styles.effectControlsSection, { backgroundColor: tokens.colors.surfaceVariant, borderRadius: FluentRadius.large }]}>
          <FluentText variant="body2Strong" style={{ marginBottom: FluentSpacing.s }}>Audio Effects</FluentText>
          
          <View style={styles.effectSliderRow}>
            <View style={styles.effectSliderHeader}>
              <MaterialCommunityIcons name="speaker-wireless" size={FluentIconSize.regular} color={tokens.colors.primary} />
              <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs, flex: 1 }}>Bass</FluentText>
              <FluentText variant="body2Strong" style={{ color: tokens.colors.primary, minWidth: 40, textAlign: 'right' }}>
                {bassControl === 0 ? "Off" : bassControl > 0 ? `+${bassControl}` : `${bassControl}`}
              </FluentText>
            </View>
            <View style={styles.effectSliderContainer}>
              <FluentText variant="caption1" color="secondary">-5</FluentText>
              <CrossPlatformSlider
                style={styles.effectSlider}
                minimumValue={-5}
                maximumValue={5}
                step={1}
                value={bassControl}
                onValueChange={onBassChange}
                minimumTrackTintColor={colors.colorBrandForeground1}
                maximumTrackTintColor={colors.colorNeutralStroke1}
                thumbTintColor={colors.colorBrandForeground1}
                trackHeight={FluentSliderSize.trackMedium}
              />
              <FluentText variant="caption1" color="secondary">+5</FluentText>
            </View>
          </View>

          <View style={styles.effectSliderRow}>
            <View style={styles.effectSliderHeader}>
              <MaterialCommunityIcons name="tune-vertical" size={FluentIconSize.regular} color={tokens.colors.primary} />
              <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs, flex: 1 }}>Treble</FluentText>
              <FluentText variant="body2Strong" style={{ color: tokens.colors.primary, minWidth: 40, textAlign: 'right' }}>
                {trebleControl === 0 ? "Off" : trebleControl > 0 ? `+${trebleControl}` : `${trebleControl}`}
              </FluentText>
            </View>
            <View style={styles.effectSliderContainer}>
              <FluentText variant="caption1" color="secondary">-5</FluentText>
              <CrossPlatformSlider
                style={styles.effectSlider}
                minimumValue={-5}
                maximumValue={5}
                step={1}
                value={trebleControl}
                onValueChange={onTrebleChange}
                minimumTrackTintColor={colors.colorBrandForeground1}
                maximumTrackTintColor={colors.colorNeutralStroke1}
                thumbTintColor={colors.colorBrandForeground1}
                trackHeight={FluentSliderSize.trackMedium}
              />
              <FluentText variant="caption1" color="secondary">+5</FluentText>
            </View>
          </View>

          <View style={styles.effectSliderRow}>
            <View style={styles.effectSliderHeader}>
              <MaterialCommunityIcons name="axis-x-rotate-counterclockwise" size={FluentIconSize.regular} color={tokens.colors.primary} />
              <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs, flex: 1 }}>Spatial Enhancement</FluentText>
              <FluentText variant="body2Strong" style={{ color: tokens.colors.primary, minWidth: 70, textAlign: 'right' }}>
                {spatialLabels[spatialEnhancement] || "Off"}
              </FluentText>
            </View>
            <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.xs }}>
              Adjusts soundstage depth and width. Safe for all content.
            </FluentText>
            <View style={styles.effectSliderContainer}>
              <FluentText variant="caption1" color="secondary">Off</FluentText>
              <CrossPlatformSlider
                style={styles.effectSlider}
                minimumValue={0}
                maximumValue={5}
                step={1}
                value={spatialEnhancement}
                onValueChange={onSpatialChange}
                minimumTrackTintColor={colors.colorBrandForeground1}
                maximumTrackTintColor={colors.colorNeutralStroke1}
                thumbTintColor={colors.colorBrandForeground1}
                trackHeight={FluentSliderSize.trackMedium}
              />
              <FluentText variant="caption1" color="secondary">Max</FluentText>
            </View>
          </View>
        </View>
      )}

      {isActive && isCustomEQ && (
        <View style={styles.customEQContainer}>
          <FluentText variant="body1Strong" style={{ marginBottom: FluentSpacing.m }}>
            Custom Equalizer
          </FluentText>
          
          {bandLabels.map((label, index) => (
            <EQBandSlider
              key={label}
              label={label}
              value={customBands[index]}
              onValueChange={(value) => onBandChange(index, value)}
            />
          ))}
          
          <View style={styles.customEQButtons}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: tokens.colors.surfaceVariant, borderRadius: tokens.shapes.buttonBorderRadius }]}
              onPress={onResetBands}
            >
              <MaterialCommunityIcons name="refresh" size={16} color={tokens.colors.text} />
              <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs }}>Reset</FluentText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: tokens.colors.primary, borderRadius: tokens.shapes.buttonBorderRadius }]}
              onPress={onSavePreset}
            >
              <MaterialCommunityIcons name="content-save" size={16} color={tokens.colors.onPrimary} />
              <FluentText variant="body2" style={{ marginLeft: FluentSpacing.xs, color: tokens.colors.onPrimary }}>Save Preset</FluentText>
            </Pressable>
          </View>

          {customPresets.length > 0 && (
            <View style={styles.savedPresetsSection}>
              <FluentText variant="body2" color="secondary" style={{ marginBottom: FluentSpacing.s }}>
                My Presets ({customPresets.length}/{maxCustomPresets})
              </FluentText>
              {customPresets.map((preset) => (
                <View key={preset.id} style={[styles.savedPresetRow, { backgroundColor: tokens.colors.surfaceVariant, borderRadius: tokens.shapes.cardBorderRadius }]}>
                  <Pressable style={styles.savedPresetInfo} onPress={() => onLoadPreset(preset)}>
                    <FluentText variant="body2">{preset.name}</FluentText>
                    <FluentText variant="caption1" color="secondary">
                      {preset.bands.map(b => b > 0 ? `+${b}` : b).join(", ")}
                    </FluentText>
                  </Pressable>
                  <View style={styles.presetActions}>
                    <Pressable onPress={() => onEditPreset(preset)} style={styles.actionIconButton}>
                      <MaterialCommunityIcons name="pencil-outline" size={FluentIconSize.regular} color={tokens.colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => onDeletePreset(preset)} style={styles.actionIconButton}>
                      <MaterialCommunityIcons name="delete-outline" size={FluentIconSize.regular} color={tokens.colors.error} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    padding: FluentSpacing.l,
    marginBottom: FluentSpacing.m,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  sectionTitle: {
    marginLeft: FluentSpacing.xs,
    flex: 1,
  },
  activeIndicator: {
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: FluentSpacing.s,
  },
  presetInfo: {
    marginTop: FluentSpacing.m,
  },
  effectControlsSection: {
    marginTop: FluentSpacing.m,
    padding: FluentSpacing.m,
    gap: FluentSpacing.s,
  },
  effectSliderRow: {
    gap: FluentSpacing.xs,
  },
  effectSliderHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  effectSliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.xs,
  },
  effectSlider: {
    flex: 1,
    height: FluentControlHeight.medium,
  },
  customEQContainer: {
    marginTop: FluentSpacing.m,
  },
  customEQButtons: {
    flexDirection: "row",
    gap: FluentSpacing.s,
    marginTop: FluentSpacing.m,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: FluentSpacing.m,
  },
  savedPresetsSection: {
    marginTop: FluentSpacing.l,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
    paddingTop: FluentSpacing.m,
  },
  savedPresetRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    marginBottom: FluentSpacing.xs,
  },
  savedPresetInfo: {
    flex: 1,
  },
  presetActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.xs,
  },
  actionIconButton: {
    padding: FluentSpacing.xs,
  },
});

export const EQPresetCard = memo(EQPresetCardComponent);
