import React, { memo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { useThemeTokens } from "@/contexts/ThemeContext";
import { getCardEffectStyle } from "@/lib/themeUtils";
import { FluentSpacing, FluentRadius, FluentIconSize, FluentFontWeight } from "@/constants/fluent2";

export type EnhancementLevel = 'low' | 'medium' | 'high';

export interface SmartEnhancementCardProps {
  isLicensed: boolean;
  bassEnhancementEnabled: boolean;
  bassEnhancementLevel: EnhancementLevel;
  hfRestorationEnabled: boolean;
  hfRestorationLevel: EnhancementLevel;
  onBassEnhancementToggle: (enabled: boolean) => void;
  onBassEnhancementLevelChange: (level: EnhancementLevel) => void;
  onHfRestorationToggle: (enabled: boolean) => void;
  onHfRestorationLevelChange: (level: EnhancementLevel) => void;
}

function SmartEnhancementCardComponent({
  isLicensed,
  bassEnhancementEnabled,
  bassEnhancementLevel,
  hfRestorationEnabled,
  hfRestorationLevel,
  onBassEnhancementToggle,
  onBassEnhancementLevelChange,
  onHfRestorationToggle,
  onHfRestorationLevelChange,
}: SmartEnhancementCardProps) {
  const tokens = useThemeTokens();
  const cardStyle = getCardEffectStyle(tokens);

  const isAnyEnhancementActive = bassEnhancementEnabled || hfRestorationEnabled;

  return (
    <View style={[styles.sectionCard, cardStyle]}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="auto-fix" size={FluentIconSize.regular} color={tokens.colors.primary} />
        <FluentText variant="subtitle1" style={styles.sectionTitle}>
          Smart Enhancements
        </FluentText>
        {!isLicensed ? (
          <View style={[styles.premiumBadge, { backgroundColor: tokens.colors.warning }]}>
            <MaterialCommunityIcons name="crown" size={12} color={tokens.colors.onPrimary} />
            <FluentText variant="caption1" style={{ color: tokens.colors.onPrimary, fontWeight: FluentFontWeight.semibold, marginLeft: 4 }}>License Required</FluentText>
          </View>
        ) : isAnyEnhancementActive ? (
          <View style={[styles.activeIndicator, { backgroundColor: tokens.colors.primary }]}>
            <FluentText variant="caption1" color="onBrand" style={{ fontWeight: FluentFontWeight.semibold }}>Active</FluentText>
          </View>
        ) : null}
      </View>
      
      <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.m }}>
        AI-powered audio enhancements for richer, fuller sound
      </FluentText>

      <View style={{ marginBottom: FluentSpacing.l }}>
        <Pressable 
          onPress={() => isLicensed && onBassEnhancementToggle(!bassEnhancementEnabled)}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: FluentSpacing.xs }}
          android_ripple={null}
        >
          <View style={{ flex: 1 }}>
            <FluentText variant="body2" style={{ fontWeight: FluentFontWeight.medium }}>
              Bass Enhancement
            </FluentText>
            <FluentText variant="caption1" color="secondary">
              Adds rich harmonics to low frequencies
            </FluentText>
          </View>
          <View style={[
            styles.toggle,
            { 
              backgroundColor: bassEnhancementEnabled ? tokens.colors.primary : tokens.colors.surfaceVariant,
              opacity: isLicensed ? 1 : 0.5
            }
          ]}>
            <View style={[
              styles.toggleThumb,
              { 
                backgroundColor: tokens.colors.onPrimary,
                transform: [{ translateX: bassEnhancementEnabled ? 20 : 2 }]
              }
            ]} />
          </View>
        </Pressable>
        
        {bassEnhancementEnabled && (
          <View style={[styles.threeStepSelector, { marginTop: FluentSpacing.s }]}>
            {(['low', 'medium', 'high'] as const).map((level) => (
              <Pressable
                key={level}
                onPress={() => isLicensed && onBassEnhancementLevelChange(level)}
                android_ripple={null}
                style={[
                  styles.threeStepOption,
                  {
                    backgroundColor: bassEnhancementLevel === level ? tokens.colors.primary : tokens.colors.surfaceVariant,
                    borderRadius: FluentRadius.medium,
                    opacity: isLicensed ? 1 : 0.5
                  }
                ]}
              >
                <FluentText 
                  variant="caption1" 
                  style={{ 
                    fontWeight: bassEnhancementLevel === level ? FluentFontWeight.semibold : FluentFontWeight.regular,
                    color: bassEnhancementLevel === level ? tokens.colors.onPrimary : tokens.colors.text
                  }}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </FluentText>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View>
        <Pressable 
          onPress={() => isLicensed && onHfRestorationToggle(!hfRestorationEnabled)}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          android_ripple={null}
        >
          <View style={{ flex: 1 }}>
            <FluentText variant="body2" style={{ fontWeight: FluentFontWeight.medium }}>
              AI Upscaling
            </FluentText>
            <FluentText variant="caption1" color="secondary">
              Lightweight AI-based audio-restoration and upscaling
            </FluentText>
          </View>
          <View style={[
            styles.toggle,
            { 
              backgroundColor: hfRestorationEnabled ? tokens.colors.primary : tokens.colors.surfaceVariant,
              opacity: isLicensed ? 1 : 0.5
            }
          ]}>
            <View style={[
              styles.toggleThumb,
              { 
                backgroundColor: tokens.colors.onPrimary,
                transform: [{ translateX: hfRestorationEnabled ? 20 : 2 }]
              }
            ]} />
          </View>
        </Pressable>

        {hfRestorationEnabled && (
          <View style={[styles.threeStepSelector, { marginTop: FluentSpacing.s }]}>
            {(['low', 'medium', 'high'] as const).map((level) => (
              <Pressable
                key={level}
                onPress={() => isLicensed && onHfRestorationLevelChange(level)}
                android_ripple={null}
                style={[
                  styles.threeStepOption,
                  {
                    backgroundColor: hfRestorationLevel === level ? tokens.colors.primary : tokens.colors.surfaceVariant,
                    borderRadius: FluentRadius.medium,
                    opacity: isLicensed ? 1 : 0.5
                  }
                ]}
              >
                <FluentText 
                  variant="caption1" 
                  style={{ 
                    fontWeight: hfRestorationLevel === level ? FluentFontWeight.semibold : FluentFontWeight.regular,
                    color: hfRestorationLevel === level ? tokens.colors.onPrimary : tokens.colors.text
                  }}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </FluentText>
              </Pressable>
            ))}
          </View>
        )}
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
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  threeStepSelector: {
    flexDirection: 'row',
    gap: FluentSpacing.s,
  },
  threeStepOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
  },
});

export const SmartEnhancementCard = memo(SmartEnhancementCardComponent);
