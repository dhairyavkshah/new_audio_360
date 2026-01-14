import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText, FluentButton, FluentIconButton } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { EffectChip } from "@/components/EffectChip";
import { useThemeContext, useThemeTokens } from "@/contexts/ThemeContext";
import { useRadio, RadioStation, RDSData } from "@/contexts/RadioContext";
import { useSoundLab } from "@/contexts/SoundLabContext";
import { getCardEffectStyle } from "@/lib/themeUtils";
import {
  FluentSpacing,
  FluentRadius,
  FluentLightColors,
  FluentDarkColors,
  FluentIconSize,
  FluentTouchTarget,
  FluentControlRadius,
} from "@/constants/fluent2";
import { FMBandType } from "../../modules/audio-effects";

const FM_MIN = 87.5;
const FM_MAX = 108.0;
const FM_STEP = 0.1;

const AM_MIN = 530;
const AM_MAX = 1710;
const AM_STEP = 10;

const SIGNAL_STRENGTH_BARS = 5;

export default function RadioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const tabBarHeight = useSafeTabBarHeight();
  const tokens = useThemeTokens();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const cardStyle = getCardEffectStyle(tokens);

  const {
    isAvailable,
    isInitialized,
    currentFrequency,
    bandType,
    isPlaying,
    signalStrength,
    rdsData,
    stations,
    scanResults,
    isScanning,
    needsHeadphoneAntenna,
    hasHeadphoneConnected,
    hasEffectsSupport,
    isEffectsAttached,
    error,
    initialize,
    tune,
    play,
    stop,
    seekUp,
    seekDown,
    scan,
    addFavorite,
    removeFavorite,
  } = useRadio();

  const { mode: soundLabMode, eqPresetName, immersiveModeName, getImmersiveModeInfo } = useSoundLab();

  const [localFrequency, setLocalFrequency] = useState(currentFrequency);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    setLocalFrequency(currentFrequency);
  }, [currentFrequency]);

  useEffect(() => {
    if (isAvailable && !isInitialized && !isInitializing) {
      handleInitialize();
    }
  }, [isAvailable, isInitialized]);

  const handleInitialize = async () => {
    setIsInitializing(true);
    await initialize();
    setIsInitializing(false);
  };

  const handleBandChange = useCallback(async (band: FMBandType) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const defaultFreq = band === "fm" ? 98.3 : 1000;
    setLocalFrequency(defaultFreq);
    await tune(defaultFreq, band);
  }, [tune]);

  const handleFrequencyChange = useCallback((value: number) => {
    setLocalFrequency(value);
  }, []);

  const handleFrequencyChangeComplete = useCallback(async (value: number) => {
    const roundedValue = bandType === "fm"
      ? Math.round(value * 10) / 10
      : Math.round(value / AM_STEP) * AM_STEP;
    setLocalFrequency(roundedValue);
    await tune(roundedValue);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [bandType, tune]);

  const handlePlayStop = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isPlaying) {
      await stop();
    } else {
      await play();
    }
  }, [isPlaying, play, stop]);

  const handleSeekUp = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await seekUp();
  }, [seekUp]);

  const handleSeekDown = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await seekDown();
  }, [seekDown]);

  const handleScan = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await scan();
  }, [scan]);

  const handleNavigateToSoundLab = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate("SoundLab");
  }, [navigation]);

  const isFavorite = useMemo(() => {
    return stations.some(
      (s) => s.frequency === currentFrequency && s.bandType === bandType
    );
  }, [stations, currentFrequency, bandType]);

  const handleToggleFavorite = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isFavorite) {
      const station = stations.find(
        (s) => s.frequency === currentFrequency && s.bandType === bandType
      );
      if (station) {
        await removeFavorite(station.id);
      }
    } else {
      await addFavorite({
        id: "",
        frequency: currentFrequency * (bandType === "fm" ? 1000000 : 1000),
        frequencyMHz: currentFrequency,
        bandType,
        signalStrength,
        isFavorite: true,
      });
    }
  }, [isFavorite, currentFrequency, bandType, signalStrength, stations, addFavorite, removeFavorite]);

  const handleStationPress = useCallback(async (station: RadioStation) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await tune(station.frequencyMHz, station.bandType);
    if (!isPlaying) {
      await play();
    }
  }, [tune, play, isPlaying]);

  const formatFrequency = (freq: number, band: FMBandType): string => {
    if (band === "fm") {
      return freq.toFixed(1);
    }
    return Math.round(freq).toString();
  };

  const renderSignalStrength = () => {
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
  };

  if (!isAvailable) {
    return (
      <FluentScreenLayout contentPadding="l">
        <View style={styles.unavailableContainer}>
          <View style={[styles.unavailableIconContainer, { backgroundColor: colors.colorPaletteRedBackground2 }]}>
            <MaterialCommunityIcons
              name="radio-off"
              size={64}
              color={colors.colorPaletteRedForeground1}
            />
          </View>
          <FluentText variant="title2" style={styles.unavailableTitle}>
            FM Hardware Unavailable
          </FluentText>
          <FluentText variant="body1" color="secondary" style={styles.unavailableText}>
            FM Radio requires specialized hardware that is not available on this device.
            This feature requires Android devices with built-in FM radio chips.
          </FluentText>
          <View style={[styles.fallbackCard, { backgroundColor: colors.colorNeutralBackground3, borderRadius: FluentRadius.large }]}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={FluentIconSize.regular}
              color={colors.colorBrandForeground1}
            />
            <FluentText variant="body2" color="secondary" style={styles.fallbackText}>
              Try internet radio services like TuneIn, iHeartRadio, or your local station's app for streaming radio.
            </FluentText>
          </View>
        </View>
      </FluentScreenLayout>
    );
  }

  if (needsHeadphoneAntenna && !hasHeadphoneConnected) {
    return (
      <FluentScreenLayout contentPadding="l">
        <View style={styles.unavailableContainer}>
          <View style={[styles.unavailableIconContainer, { backgroundColor: colors.colorPaletteYellowBackground2 }]}>
            <MaterialCommunityIcons
              name="headphones"
              size={64}
              color={colors.colorPaletteYellowForeground1}
            />
          </View>
          <FluentText variant="title2" style={styles.unavailableTitle}>
            Headphone Antenna Required
          </FluentText>
          <FluentText variant="body1" color="secondary" style={styles.unavailableText}>
            FM radio uses your wired headphones as an antenna to receive radio signals.
          </FluentText>
          <View style={[styles.instructionsList, { backgroundColor: colors.colorNeutralBackground3, borderRadius: FluentRadius.large }]}>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons name="numeric-1-circle" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
              <FluentText variant="body2" color="secondary" style={styles.instructionText}>
                Connect wired headphones (3.5mm jack)
              </FluentText>
            </View>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons name="numeric-2-circle" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
              <FluentText variant="body2" color="secondary" style={styles.instructionText}>
                Ensure headphones are fully inserted
              </FluentText>
            </View>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons name="numeric-3-circle" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
              <FluentText variant="body2" color="secondary" style={styles.instructionText}>
                Bluetooth headphones will not work
              </FluentText>
            </View>
          </View>
          <FluentButton
            onPress={handleInitialize}
            style={{ marginTop: FluentSpacing.l }}
          >
            Try Again
          </FluentButton>
          <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.m, textAlign: 'center' }}>
            Alternatively, try internet radio services for streaming audio.
          </FluentText>
        </View>
      </FluentScreenLayout>
    );
  }

  if (isInitializing) {
    return (
      <FluentScreenLayout contentPadding="l">
        <View style={styles.unavailableContainer}>
          <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
          <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.l }}>
            Initializing radio...
          </FluentText>
        </View>
      </FluentScreenLayout>
    );
  }

  return (
    <FluentScreenLayout contentPadding="l">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + FluentSpacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bandToggle}>
          <EffectChip
            label="FM"
            isSelected={bandType === "fm"}
            onPress={() => handleBandChange("fm")}
          />
          <View style={{ width: FluentSpacing.m }} />
          <EffectChip
            label="AM"
            isSelected={bandType === "am"}
            onPress={() => handleBandChange("am")}
          />
        </View>

        <GlassCard style={{ ...cardStyle, ...styles.frequencyCard }}>
          <View style={styles.frequencyDisplay}>
            <FluentText variant="display" style={styles.frequencyNumber}>
              {formatFrequency(localFrequency, bandType)}
            </FluentText>
            <FluentText variant="title2" color="secondary" style={styles.bandLabel}>
              {bandType === "fm" ? "MHz" : "kHz"}
            </FluentText>
          </View>
          {renderSignalStrength()}
        </GlassCard>

        <View style={styles.sliderContainer}>
          <FluentText variant="caption1" color="secondary">
            {bandType === "fm" ? `${FM_MIN} MHz` : `${AM_MIN} kHz`}
          </FluentText>
          <View style={styles.sliderWrapper}>
            <Slider
              style={styles.slider}
              minimumValue={bandType === "fm" ? FM_MIN : AM_MIN}
              maximumValue={bandType === "fm" ? FM_MAX : AM_MAX}
              step={bandType === "fm" ? FM_STEP : AM_STEP}
              value={localFrequency}
              onValueChange={handleFrequencyChange}
              onSlidingComplete={handleFrequencyChangeComplete}
              minimumTrackTintColor={colors.colorBrandForeground1}
              maximumTrackTintColor={colors.colorNeutralBackground3}
              thumbTintColor={colors.colorBrandForeground1}
              hitSlop={{ top: 12, bottom: 12, left: 0, right: 0 }}
              accessibilityLabel="Frequency tuner"
              accessibilityHint={`Tune to a ${bandType === "fm" ? "FM" : "AM"} frequency`}
            />
          </View>
          <FluentText variant="caption1" color="secondary">
            {bandType === "fm" ? `${FM_MAX} MHz` : `${AM_MAX} kHz`}
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
            onPress={handleSeekDown}
            accessibilityLabel="Seek to previous station"
          />
          <Pressable
            style={[
              styles.playButton,
              { backgroundColor: colors.colorBrandBackground },
            ]}
            onPress={handlePlayStop}
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
            onPress={handleSeekUp}
            accessibilityLabel="Seek to next station"
          />
        </View>

        <View style={styles.actionsRow}>
          <FluentIconButton
            icon={<MaterialCommunityIcons name={isFavorite ? "heart" : "heart-outline"} />}
            size="large"
            variant={isFavorite ? "primary" : "subtle"}
            onPress={handleToggleFavorite}
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
            onPress={handleScan}
            disabled={isScanning}
            accessibilityLabel="Scan for stations"
          />
          <FluentIconButton
            icon={<MaterialCommunityIcons name="tune-vertical" />}
            size="large"
            variant="subtle"
            onPress={handleNavigateToSoundLab}
            accessibilityLabel="Open Sound Lab"
          />
        </View>

        {isPlaying && (
          <Pressable
            style={[
              styles.soundLabCard,
              {
                backgroundColor: isEffectsAttached 
                  ? colors.colorBrandBackgroundSelected 
                  : colors.colorNeutralBackground3,
                borderColor: isEffectsAttached
                  ? colors.colorBrandStroke1
                  : colors.colorNeutralStroke2,
                minHeight: FluentTouchTarget.minimum,
              },
            ]}
            onPress={handleNavigateToSoundLab}
            hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
            accessibilityLabel="Sound Lab settings"
            accessibilityRole="button"
          >
            <View style={styles.soundLabCardContent}>
              <MaterialCommunityIcons
                name={isEffectsAttached ? "equalizer" : "equalizer-outline"}
                size={FluentIconSize.regular}
                color={isEffectsAttached ? colors.colorBrandForeground1 : colors.colorNeutralForeground2}
              />
              <View style={styles.soundLabCardText}>
                <FluentText
                  variant="body1Strong"
                  style={{
                    color: isEffectsAttached
                      ? colors.colorBrandForeground1
                      : colors.colorNeutralForeground1,
                  }}
                >
                  Sound Lab
                </FluentText>
                <FluentText variant="caption1" color="secondary">
                  {!hasEffectsSupport ? (
                    "Effects not supported on this device"
                  ) : isEffectsAttached ? (
                    soundLabMode === 'equalizer' 
                      ? `EQ: ${eqPresetName}` 
                      : soundLabMode === 'immersive'
                        ? `Immersive: ${getImmersiveModeInfo(immersiveModeName).name}`
                        : "Effects active"
                  ) : (
                    "Tap to configure audio effects"
                  )}
                </FluentText>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={FluentIconSize.regular}
                color={colors.colorNeutralForeground2}
              />
            </View>
          </Pressable>
        )}

        {error && (
          <View style={[styles.errorCard, { backgroundColor: colors.colorPaletteRedBackground2, borderRadius: FluentRadius.large }]}>
            <View style={styles.errorCardHeader}>
              <MaterialCommunityIcons
                name={error.toLowerCase().includes('permission') ? 'shield-alert' : 'alert-circle'}
                size={FluentIconSize.regular}
                color={colors.colorPaletteRedForeground1}
              />
              <FluentText variant="body2" style={{ color: colors.colorPaletteRedForeground1, flex: 1, marginLeft: FluentSpacing.s }}>
                {error}
              </FluentText>
            </View>
            {error.toLowerCase().includes('permission') && (
              <FluentButton
                variant="outline"
                size="small"
                onPress={() => {
                  if (Platform.OS === 'android') {
                    import('react-native').then(({ Linking }) => {
                      Linking.openSettings();
                    });
                  }
                }}
                style={styles.permissionButton}
              >
                Grant Permission
              </FluentButton>
            )}
          </View>
        )}

        {stations.length > 0 && (
          <View style={styles.favoritesSection}>
            <FluentText variant="title3" style={styles.sectionTitle}>
              Saved Stations
            </FluentText>
            <View style={styles.stationsGrid}>
              {stations.map((station) => (
                <Pressable
                  key={station.id}
                  style={[
                    styles.stationChip,
                    {
                      backgroundColor:
                        station.frequency === currentFrequency && station.bandType === bandType
                          ? colors.colorBrandBackground
                          : colors.colorNeutralBackground3,
                      borderColor:
                        station.frequency === currentFrequency && station.bandType === bandType
                          ? colors.colorBrandStroke1
                          : colors.colorNeutralStroke2,
                      minHeight: FluentTouchTarget.minimum,
                    },
                  ]}
                  onPress={() => handleStationPress(station)}
                  hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
                  accessibilityLabel={`Tune to ${station.frequencyMHz} ${station.bandType === "fm" ? "FM" : "AM"}`}
                  accessibilityRole="button"
                >
                  <FluentText
                    variant="body1Strong"
                    style={{
                      color:
                        station.frequency === currentFrequency && station.bandType === bandType
                          ? colors.colorNeutralForegroundOnBrand
                          : colors.colorNeutralForeground1,
                    }}
                  >
                    {formatFrequency(station.frequencyMHz, station.bandType)}
                  </FluentText>
                  <FluentText
                    variant="caption1"
                    style={{
                      color:
                        station.frequency === currentFrequency && station.bandType === bandType
                          ? colors.colorNeutralForegroundOnBrand
                          : colors.colorNeutralForeground2,
                    }}
                  >
                    {station.bandType === "fm" ? "FM" : "AM"}
                  </FluentText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {scanResults.length > 0 && (
          <View style={styles.favoritesSection}>
            <FluentText variant="title3" style={styles.sectionTitle}>
              Scanned Stations
            </FluentText>
            <View style={styles.stationsGrid}>
              {scanResults.map((station) => (
                <Pressable
                  key={station.id}
                  style={[
                    styles.stationChip,
                    {
                      backgroundColor: colors.colorNeutralBackground3,
                      borderColor: colors.colorNeutralStroke2,
                      minHeight: FluentTouchTarget.minimum,
                    },
                  ]}
                  onPress={() => handleStationPress(station)}
                  hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
                  accessibilityLabel={`Tune to ${station.frequencyMHz} ${station.bandType === "fm" ? "FM" : "AM"}`}
                  accessibilityRole="button"
                >
                  <FluentText variant="body1Strong">
                    {formatFrequency(station.frequencyMHz, station.bandType)}
                  </FluentText>
                  <FluentText variant="caption1" color="secondary">
                    {station.bandType === "fm" ? "FM" : "AM"}
                  </FluentText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: FluentSpacing.m,
  },
  bandToggle: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: FluentSpacing.xl,
  },
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
    fontWeight: "200",
    letterSpacing: -2,
  },
  bandLabel: {
    marginLeft: FluentSpacing.s,
  },
  signalContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 28,
    marginTop: FluentSpacing.m,
  },
  signalIcon: {
    marginRight: FluentSpacing.xs,
  },
  signalBar: {
    width: 6,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xl,
    paddingHorizontal: FluentSpacing.s,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: FluentSpacing.xxl,
    marginBottom: FluentSpacing.xl,
  },
  errorCard: {
    padding: FluentSpacing.m,
    marginBottom: FluentSpacing.l,
  },
  errorCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  permissionButton: {
    marginTop: FluentSpacing.m,
    alignSelf: "flex-start",
  },
  favoritesSection: {
    marginTop: FluentSpacing.l,
  },
  sectionTitle: {
    marginBottom: FluentSpacing.m,
  },
  stationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: FluentSpacing.m,
  },
  stationChip: {
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 80,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.xxl,
  },
  unavailableIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.xl,
  },
  unavailableTitle: {
    textAlign: "center",
    marginBottom: FluentSpacing.m,
  },
  unavailableText: {
    textAlign: "center",
    lineHeight: 22,
  },
  soundLabCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    borderWidth: 1,
    marginBottom: FluentSpacing.l,
  },
  soundLabCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  soundLabCardText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  sliderWrapper: {
    flex: 1,
    marginHorizontal: FluentSpacing.m,
    minHeight: FluentTouchTarget.minimum,
    justifyContent: "center",
  },
  fallbackCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: FluentSpacing.m,
    marginTop: FluentSpacing.xl,
    gap: FluentSpacing.s,
  },
  fallbackText: {
    flex: 1,
    lineHeight: 20,
  },
  instructionsList: {
    padding: FluentSpacing.m,
    marginTop: FluentSpacing.l,
    gap: FluentSpacing.m,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.s,
  },
  instructionText: {
    flex: 1,
  },
});
