import React, { memo, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CrossPlatformSlider } from "@/components/CrossPlatformSlider";
import { FluentText, FluentIconButton } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemedColors } from "@/contexts/ThemeContext";
import { RDSData } from "@/contexts/RadioContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentIconSize,
  FluentTouchTarget,
  FluentControlRadius,
  FluentSliderSize,
} from "@/constants/fluent2";

const FM_MIN = 87.5;
const FM_MAX = 108.0;
const FM_STEP = 0.1;
const SIGNAL_STRENGTH_BARS = 5;

export interface FMDialProps {
  frequency: number;
  signalStrength: number;
  isPlaying: boolean;
  isFavorite: boolean;
  isScanning: boolean;
  rdsData: RDSData;
  cardStyle: object;
  onFrequencyChange: (value: number) => void;
  onFrequencyChangeComplete: (value: number) => void;
  onPlayStop: () => void;
  onSeekUp: () => void;
  onSeekDown: () => void;
  onToggleFavorite: () => void;
  onScan: () => void;
  onNavigateToSoundLab: () => void;
}

function FMDialComponent({
  frequency,
  signalStrength,
  isPlaying,
  isFavorite,
  isScanning,
  rdsData,
  cardStyle,
  onFrequencyChange,
  onFrequencyChangeComplete,
  onPlayStop,
  onSeekUp,
  onSeekDown,
  onToggleFavorite,
  onScan,
  onNavigateToSoundLab,
}: FMDialProps) {
  const colors = useThemedColors();

  const formatFrequency = (freq: number): string => {
    return freq.toFixed(1);
  };

  const renderSignalStrength = useCallback(() => {
    const normalizedStrength = Math.min(Math.max(signalStrength / 100, 0), 1);
    const activeBars = Math.round(normalizedStrength * SIGNAL_STRENGTH_BARS);

    return (
      <View style={styles.signalContainer} accessibilityLabel={`Signal strength: ${Math.round(normalizedStrength * 100)}%`}>
        <MaterialCommunityIcons
          name="signal-cellular-1"
          size={FluentIconSize.small}
          color={colors.colorNeutralForeground2}
          style={styles.signalIcon}
        />
        {Array.from({ length: SIGNAL_STRENGTH_BARS }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.signalBar,
              {
                height: 8 + index * 4,
                backgroundColor:
                  index < activeBars
                    ? colors.colorBrandForeground1
                    : colors.colorNeutralBackground3,
              },
            ]}
          />
        ))}
      </View>
    );
  }, [signalStrength, colors]);

  return (
    <>
      <GlassCard style={{ ...cardStyle, ...styles.frequencyCard }}>
        <View style={styles.frequencyDisplay}>
          <FluentText variant="display" style={styles.frequencyNumber}>
            {formatFrequency(frequency)}
          </FluentText>
          <FluentText variant="title2" color="secondary" style={styles.bandLabel}>
            MHz
          </FluentText>
        </View>
        {renderSignalStrength()}
      </GlassCard>

      <View style={styles.sliderContainer}>
        <FluentText variant="caption1" color="secondary">
          {FM_MIN} MHz
        </FluentText>
        <View style={styles.sliderWrapper}>
          <CrossPlatformSlider
            style={styles.slider}
            minimumValue={FM_MIN}
            maximumValue={FM_MAX}
            step={FM_STEP}
            value={frequency}
            onValueChange={onFrequencyChange}
            onSlidingComplete={onFrequencyChangeComplete}
            minimumTrackTintColor={colors.colorBrandForeground1}
            maximumTrackTintColor={colors.colorNeutralStroke1}
            thumbTintColor={colors.colorBrandForeground1}
            trackHeight={FluentSliderSize.trackMedium}
            accessibilityLabel="FM Frequency tuner"
            accessibilityHint="Tune to a FM frequency"
          />
        </View>
        <FluentText variant="caption1" color="secondary">
          {FM_MAX} MHz
        </FluentText>
      </View>

      {(rdsData.stationName || rdsData.radioText || rdsData.title) && (
        <GlassCard style={{ ...cardStyle, ...styles.rdsCard }}>
          {rdsData.stationName && (
            <FluentText variant="title3" style={styles.stationName}>
              {rdsData.stationName}
            </FluentText>
          )}
          {rdsData.title && rdsData.artist && (
            <View style={styles.nowPlayingRow}>
              <MaterialCommunityIcons
                name="music"
                size={FluentIconSize.small}
                color={colors.colorBrandForeground1}
              />
              <FluentText variant="body1" style={styles.nowPlayingText}>
                {rdsData.artist} - {rdsData.title}
              </FluentText>
            </View>
          )}
          {rdsData.radioText && !rdsData.title && (
            <FluentText variant="body2" color="secondary" numberOfLines={2}>
              {rdsData.radioText}
            </FluentText>
          )}
        </GlassCard>
      )}

      <View style={styles.playbackControls}>
        <FluentIconButton
          icon={<MaterialCommunityIcons name="skip-previous" />}
          size="large"
          variant="subtle"
          onPress={onSeekDown}
          accessibilityLabel="Seek to previous station"
        />
        <Pressable
          style={[
            styles.playButton,
            { backgroundColor: colors.colorBrandBackground },
          ]}
          onPress={onPlayStop}
          accessibilityLabel={isPlaying ? "Stop radio" : "Play radio"}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name={isPlaying ? "stop" : "play"}
            size={40}
            color={colors.colorNeutralForegroundOnBrand}
          />
        </Pressable>
        <FluentIconButton
          icon={<MaterialCommunityIcons name="skip-next" />}
          size="large"
          variant="subtle"
          onPress={onSeekUp}
          accessibilityLabel="Seek to next station"
        />
      </View>

      <View style={styles.actionsRow}>
        <FluentIconButton
          icon={<MaterialCommunityIcons name={isFavorite ? "heart" : "heart-outline"} />}
          size="large"
          variant={isFavorite ? "primary" : "subtle"}
          iconColor={isFavorite ? colors.colorPaletteRedForeground1 : colors.colorNeutralForeground3}
          onPress={onToggleFavorite}
          accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
        />
        <FluentIconButton
          icon={
            isScanning ? (
              <ActivityIndicator size="small" color={colors.colorBrandForeground1} />
            ) : (
              <MaterialCommunityIcons name="radio-tower" />
            )
          }
          size="large"
          variant="subtle"
          onPress={onScan}
          disabled={isScanning}
          accessibilityLabel="Scan for stations"
        />
        <FluentIconButton
          icon={<MaterialCommunityIcons name="tune-vertical" />}
          size="large"
          variant="subtle"
          onPress={onNavigateToSoundLab}
          accessibilityLabel="Open Sound Lab"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  frequencyCard: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xxl,
    marginBottom: FluentSpacing.l,
  },
  frequencyDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: FluentSpacing.m,
  },
  frequencyNumber: {
    fontSize: 72,
    letterSpacing: -2,
  },
  bandLabel: {
    marginLeft: FluentSpacing.s,
  },
  signalContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: FluentIconSize.large,
    marginTop: FluentSpacing.m,
  },
  signalIcon: {
    marginRight: FluentSpacing.xs,
  },
  signalBar: {
    width: FluentSpacing.s,
    marginHorizontal: FluentSpacing.xxs,
    borderRadius: FluentControlRadius.checkbox,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xl,
    paddingHorizontal: FluentSpacing.s,
  },
  sliderWrapper: {
    flex: 1,
    marginHorizontal: FluentSpacing.m,
    minHeight: FluentTouchTarget.minimum,
    justifyContent: "center",
  },
  slider: {
    flex: 1,
    height: FluentTouchTarget.minimum,
  },
  rdsCard: {
    marginBottom: FluentSpacing.xl,
  },
  stationName: {
    marginBottom: FluentSpacing.s,
  },
  nowPlayingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: FluentSpacing.s,
  },
  nowPlayingText: {
    marginLeft: FluentSpacing.s,
    flex: 1,
  },
  playbackControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.xl,
    gap: FluentSpacing.xxl,
  },
  playButton: {
    width: FluentTouchTarget.minimum * 2,
    height: FluentTouchTarget.minimum * 2,
    borderRadius: FluentControlRadius.avatar,
    justifyContent: "center",
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: FluentSpacing.xxl,
    marginBottom: FluentSpacing.xl,
  },
});

export const FMDial = memo(FMDialComponent);
