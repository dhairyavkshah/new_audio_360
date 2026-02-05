import React, { memo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { useThemeTokens } from "@/contexts/ThemeContext";
import { getCardEffectStyle } from "@/lib/themeUtils";
import { FluentSpacing, FluentRadius, FluentIconSize, FluentFontWeight } from "@/constants/fluent2";
import { ImmersiveMode } from "../../../modules/audio-effects";

export interface ImmersiveModeInfo {
  id: ImmersiveMode;
  name: string;
  description: string;
  icon: string;
}

export interface ImmersiveModeCardProps {
  isActive: boolean;
  selectedMode: ImmersiveMode;
  isLicensed: boolean;
  modes: ImmersiveModeInfo[];
  onModeChange: (mode: ImmersiveMode) => void;
}

const ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'volume-off': 'volume-off',
  'music': 'music',
  'surround-sound': 'surround-sound',
  'music-circle': 'music-circle',
  'gamepad-variant': 'gamepad-variant',
  'podcast': 'podcast',
  'movie-open': 'movie-open',
  'stadium': 'stadium',
  'tune': 'tune',
};

function getModeIcon(iconName: string): keyof typeof MaterialCommunityIcons.glyphMap {
  return ICON_MAP[iconName] || 'music';
}

function ImmersiveModeCardComponent({
  isActive,
  selectedMode,
  isLicensed,
  modes,
  onModeChange,
}: ImmersiveModeCardProps) {
  const tokens = useThemeTokens();
  const cardStyle = getCardEffectStyle(tokens);

  return (
    <View style={[styles.sectionCard, cardStyle]}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="headphones" size={FluentIconSize.regular} color={tokens.colors.primary} />
        <FluentText variant="subtitle1" style={styles.sectionTitle}>
          Immersive Modes
        </FluentText>
        {!isLicensed ? (
          <View style={[styles.premiumBadge, { backgroundColor: tokens.colors.warning }]}>
            <MaterialCommunityIcons name="crown" size={12} color={tokens.colors.onPrimary} />
            <FluentText variant="caption1" style={{ color: tokens.colors.onPrimary, fontWeight: FluentFontWeight.semibold, marginLeft: 4 }}>License Required</FluentText>
          </View>
        ) : isActive && selectedMode !== 'off' ? (
          <View style={[styles.activeIndicator, { backgroundColor: tokens.colors.primary }]}>
            <FluentText variant="caption1" color="onBrand" style={{ fontWeight: FluentFontWeight.semibold }}>Active</FluentText>
          </View>
        ) : null}
      </View>
      
      <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.m }}>
        Premium world-class sound modes for an immersive experience
      </FluentText>
      
      <View style={styles.modesContainer}>
        {modes.filter(mode => mode.id !== 'off').map((mode) => (
          <Pressable
            key={mode.id}
            onPress={() => onModeChange(mode.id)}
            android_ripple={null}
            style={[
              styles.modeCard,
              {
                backgroundColor: isActive && selectedMode === mode.id 
                  ? tokens.colors.primary 
                  : tokens.colors.surface,
                borderRadius: tokens.shapes.cardBorderRadius,
              },
            ]}
          >
            <View style={styles.modeCardContent}>
              <MaterialCommunityIcons
                name={getModeIcon(mode.icon)}
                size={20}
                color={isActive && selectedMode === mode.id ? tokens.colors.onPrimary : tokens.colors.text}
              />
              <View style={styles.modeCardText}>
                <FluentText
                  variant="body1"
                  style={{
                    fontWeight: FluentFontWeight.semibold,
                    color: isActive && selectedMode === mode.id ? tokens.colors.onPrimary : tokens.colors.text,
                  }}
                >
                  {mode.name}
                </FluentText>
                <FluentText
                  variant="caption1"
                  style={{
                    color: isActive && selectedMode === mode.id 
                      ? "rgba(255,255,255,0.8)" 
                      : tokens.colors.textSecondary,
                  }}
                >
                  {mode.description}
                </FluentText>
              </View>
              {isActive && selectedMode === mode.id && (
                <MaterialCommunityIcons name="check-circle" size={20} color={tokens.colors.onPrimary} />
              )}
            </View>
          </Pressable>
        ))}
      </View>
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
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentRadius.circular,
  },
  modesContainer: {
    gap: FluentSpacing.s,
  },
  modeCard: {
    padding: FluentSpacing.m,
  },
  modeCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  modeCardText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
});

export const ImmersiveModeCard = memo(ImmersiveModeCardComponent);
