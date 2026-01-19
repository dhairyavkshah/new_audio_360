import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, TextInput, FlatList } from "react-native";
import { CrossPlatformSlider } from "@/components/CrossPlatformSlider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText, FluentButton, FluentIconButton, FluentModal } from "@/components/fluent";
import { FluentTopBar } from "@/components/FluentTopBar";
import { GlassCard } from "@/components/GlassCard";
import { EffectChip } from "@/components/EffectChip";
import { useThemeContext, useThemeTokens } from "@/contexts/ThemeContext";
import { useRadio, RadioStation, RDSData, FMBandType } from "@/contexts/RadioContext";
import { useOnlineRadio, OnlineRadioStation } from "@/contexts/OnlineRadioContext";
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
  FluentControlHeight,
  FluentTypography,
  FluentBorderWidth,
  FluentFontWeight,
  FluentSliderSize,
} from "@/constants/fluent2";
import { useToast } from "@/contexts/ToastContext";

const FM_MIN = 87.5;
const FM_MAX = 108.0;
const FM_STEP = 0.1;

const AM_MIN = 530;
const AM_MAX = 1710;
const AM_STEP = 10;

const SIGNAL_STRENGTH_BARS = 5;

const STORAGE_KEY_RADIO_MODE = '@new_audio_360_radio_mode';

type RadioMode = 'fmam' | 'online';

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹', JP: '🇯🇵',
  CN: '🇨🇳', IN: '🇮🇳', BR: '🇧🇷', CA: '🇨🇦', AU: '🇦🇺', RU: '🇷🇺', MX: '🇲🇽',
  KR: '🇰🇷', NL: '🇳🇱', SE: '🇸🇪', CH: '🇨🇭', AT: '🇦🇹', BE: '🇧🇪', PL: '🇵🇱',
  PT: '🇵🇹', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', IE: '🇮🇪', NZ: '🇳🇿', ZA: '🇿🇦',
  AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴', PH: '🇵🇭', TH: '🇹🇭', VN: '🇻🇳', ID: '🇮🇩',
  MY: '🇲🇾', SG: '🇸🇬', AE: '🇦🇪', SA: '🇸🇦', EG: '🇪🇬', NG: '🇳🇬', KE: '🇰🇪',
  UA: '🇺🇦', CZ: '🇨🇿', RO: '🇷🇴', HU: '🇭🇺', GR: '🇬🇷', TR: '🇹🇷', IL: '🇮🇱',
  PK: '🇵🇰', BD: '🇧🇩', LK: '🇱🇰', NP: '🇳🇵', TW: '🇹🇼', HK: '🇭🇰',
};

const getCountryFlag = (countryCode: string | null): string => {
  if (!countryCode) return '🌍';
  return COUNTRY_FLAGS[countryCode.toUpperCase()] || '🌍';
};

function RadioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const tabBarHeight = useSafeTabBarHeight();
  const tokens = useThemeTokens();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const cardStyle = getCardEffectStyle(tokens);

  const {
    isAvailable: isFmAvailable,
    isInitialized,
    currentFrequency,
    bandType,
    isPlaying: isFmPlaying,
    signalStrength,
    rdsData,
    stations,
    scanResults,
    isScanning,
    needsHeadphoneAntenna,
    hasHeadphoneConnected,
    hasEffectsSupport,
    isEffectsAttached,
    error: fmError,
    initialize,
    tune,
    play: fmPlay,
    stop: fmStop,
    seekUp,
    seekDown,
    scan,
    addFavorite,
    removeFavorite,
  } = useRadio();

  const {
    isLoading: isOnlineLoading,
    error: onlineError,
    detectedCountry,
    detectedCountryCode,
    availableCountries,
    popularStations,
    currentStation,
    isPlaying: isOnlinePlaying,
    isBuffering,
    detectLocation,
    loadCountries,
    setCountryManual,
    loadPopularStations,
    searchStations,
    playStation,
    stopPlayback: onlineStop,
    clearError: clearOnlineError,
  } = useOnlineRadio();

  const { mode: soundLabMode, eqPresetName, immersiveModeName, getImmersiveModeInfo } = useSoundLab();
  const { showError: showToastError } = useToast();

  const [radioMode, setRadioMode] = useState<RadioMode>('fmam');
  const [localFrequency, setLocalFrequency] = useState(currentFrequency);
  const [isInitializing, setIsInitializing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasLoadedOnline, setHasLoadedOnline] = useState(false);
  const [modeLoaded, setModeLoaded] = useState(false);
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  useEffect(() => {
    loadSavedMode();
  }, []);

  useEffect(() => {
    setLocalFrequency(currentFrequency);
  }, [currentFrequency]);

  useEffect(() => {
    if (isFmAvailable && !isInitialized && !isInitializing && radioMode === 'fmam') {
      handleInitialize();
    }
  }, [isFmAvailable, isInitialized, radioMode]);

  useEffect(() => {
    if (radioMode === 'online' && !hasLoadedOnline && modeLoaded) {
      loadOnlineData();
    }
  }, [radioMode, hasLoadedOnline, modeLoaded]);

  useEffect(() => {
    if (onlineError && radioMode === 'online') {
      const isStreamError = onlineError.toLowerCase().includes('stream') || 
                           onlineError.toLowerCase().includes('playback') ||
                           onlineError.toLowerCase().includes('failed') ||
                           onlineError.toLowerCase().includes('unavailable');
      if (isStreamError) {
        showToastError('Streaming source unavailable. Please try another station.');
      }
    }
  }, [onlineError, radioMode, showToastError]);

  const loadSavedMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(STORAGE_KEY_RADIO_MODE);
      if (savedMode === 'fmam' || savedMode === 'online') {
        if (savedMode === 'fmam' && !isFmAvailable) {
          setRadioMode('online');
        } else {
          setRadioMode(savedMode);
        }
      } else if (!isFmAvailable) {
        setRadioMode('online');
      }
    } catch (err) {
      if (!isFmAvailable) {
        setRadioMode('online');
      }
    }
    setModeLoaded(true);
  };

  const saveMode = async (mode: RadioMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_RADIO_MODE, mode);
    } catch (err) {
      // Silently handle error in production
    }
  };

  const loadOnlineData = async () => {
    setHasLoadedOnline(true);
    // If there's already a cached country from context, use it directly
    // Only detect location if no country is cached
    if (detectedCountryCode) {
      await loadPopularStations(detectedCountryCode);
    } else {
      const result = await detectLocation();
      if (result.countryCode) {
        await loadPopularStations(result.countryCode);
      }
    }
  };

  const handleModeChange = useCallback(async (mode: RadioMode) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (mode === radioMode) return;

    if (mode === 'online' && isFmPlaying) {
      await fmStop();
    } else if (mode === 'fmam' && isOnlinePlaying) {
      await onlineStop();
    }

    setRadioMode(mode);
    saveMode(mode);

    if (mode === 'online' && !hasLoadedOnline) {
      loadOnlineData();
    }
  }, [radioMode, isFmPlaying, isOnlinePlaying, fmStop, onlineStop, hasLoadedOnline]);

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

  const handleFmPlayStop = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isFmPlaying) {
      await fmStop();
    } else {
      await fmPlay();
    }
  }, [isFmPlaying, fmPlay, fmStop]);

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
    if (!isFmPlaying) {
      await fmPlay();
    }
  }, [tune, fmPlay, isFmPlaying]);

  const handleOnlineStationPress = useCallback(async (station: OnlineRadioStation) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await playStation(station);
  }, [playStation]);

  const handleOnlinePlayStop = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isOnlinePlaying) {
      await onlineStop();
    } else if (currentStation) {
      await playStation(currentStation);
    }
  }, [isOnlinePlaying, currentStation, onlineStop, playStation]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsSearching(true);
    await searchStations(searchQuery);
    setIsSearching(false);
  }, [searchQuery, searchStations]);

  const handleRetryLocation = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const result = await detectLocation();
    if (result.countryCode) {
      await loadPopularStations(result.countryCode);
    }
  }, [detectLocation, loadPopularStations]);

  const handleOpenCountryPicker = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCountrySearchQuery('');
    setIsCountryPickerVisible(true);
    await loadCountries();
  }, [loadCountries]);

  const handleSelectCountry = useCallback(async (countryCode: string, countryName: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsCountryPickerVisible(false);
    await setCountryManual(countryCode, countryName);
  }, [setCountryManual]);

  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery.trim()) {
      return availableCountries;
    }
    const query = countrySearchQuery.toLowerCase();
    return availableCountries.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.iso_3166_1.toLowerCase().includes(query)
    );
  }, [availableCountries, countrySearchQuery]);

  const handleNavigateToStations = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate("RadioStations", { mode: radioMode });
  }, [navigation, radioMode]);

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

  const renderModeToggle = () => (
    <View style={styles.modeToggle}>
      <EffectChip
        label="FM/AM"
        isSelected={radioMode === "fmam"}
        onPress={() => handleModeChange("fmam")}
        disabled={!isFmAvailable}
      />
      <View style={{ width: FluentSpacing.m }} />
      <EffectChip
        label="Online"
        isSelected={radioMode === "online"}
        onPress={() => handleModeChange("online")}
      />
    </View>
  );

  const renderFmUnavailableNotice = () => {
    if (isFmAvailable || radioMode !== 'online') return null;
    return (
      <View style={[styles.noticeCard, { backgroundColor: colors.colorNeutralBackground3 }]}>
        <MaterialCommunityIcons
          name="information-outline"
          size={FluentIconSize.small}
          color={colors.colorNeutralForeground2}
        />
        <FluentText variant="caption1" color="secondary" style={styles.noticeText}>
          FM hardware not available on this device. Using online radio.
        </FluentText>
      </View>
    );
  };

  const renderPersistentNowPlaying = () => {
    if (!currentStation || !isOnlinePlaying || radioMode === 'online') return null;
    
    return (
      <Pressable
        style={[
          styles.persistentNowPlaying,
          {
            backgroundColor: colors.colorBrandBackground,
            borderRadius: FluentRadius.large,
          },
        ]}
        onPress={() => handleModeChange('online')}
        accessibilityLabel={`Now playing: ${currentStation.name}. Tap to view.`}
        accessibilityRole="button"
      >
        <View style={styles.persistentNowPlayingContent}>
          <View style={styles.persistentNowPlayingInfo}>
            <View style={styles.persistentNowPlayingIcon}>
              <MaterialCommunityIcons
                name="radio"
                size={FluentIconSize.regular}
                color={colors.colorNeutralForegroundOnBrand}
              />
            </View>
            <View style={styles.persistentNowPlayingText}>
              <FluentText
                variant="caption1"
                style={{ color: colors.colorNeutralForegroundOnBrand + 'CC' }}
              >
                NOW PLAYING
              </FluentText>
              <FluentText
                variant="body2Strong"
                numberOfLines={1}
                style={{ color: colors.colorNeutralForegroundOnBrand }}
              >
                {currentStation.name}
              </FluentText>
            </View>
          </View>
          <Pressable
            style={[
              styles.persistentStopButton,
              { backgroundColor: colors.colorNeutralForegroundOnBrand + '20' },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onlineStop();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            accessibilityLabel="Stop playing"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="stop"
              size={FluentIconSize.medium}
              color={colors.colorNeutralForegroundOnBrand}
            />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderOnlineContent = () => {
    const error = onlineError;

    return (
      <>
        <Pressable 
          style={[styles.countryDropdown, { backgroundColor: colors.colorNeutralBackground3, borderColor: colors.colorNeutralStroke2 }]}
          onPress={handleOpenCountryPicker}
          accessibilityLabel="Select country"
          accessibilityRole="button"
        >
          <FluentText variant="body1Strong" style={styles.countryDropdownText}>
            {getCountryFlag(detectedCountryCode)} {detectedCountry || 'Select Country'}
          </FluentText>
          <MaterialCommunityIcons
            name="chevron-down"
            size={FluentIconSize.regular}
            color={colors.colorNeutralForeground2}
          />
        </Pressable>

        <View style={[styles.searchContainer, { backgroundColor: colors.colorNeutralBackground3 }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={FluentIconSize.regular}
            color={colors.colorNeutralForeground3}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: colors.colorNeutralForeground1,
                fontSize: FluentTypography.body1.fontSize,
                paddingVertical: FluentSpacing.xs,
              },
            ]}
            placeholder="Search stations..."
            placeholderTextColor={colors.colorNeutralForeground3}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel="Search stations"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Clear search"
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={FluentIconSize.small}
                color={colors.colorNeutralForeground3}
              />
            </Pressable>
          )}
          <FluentButton
            size="small"
            onPress={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            style={styles.searchButton}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </FluentButton>
        </View>

        {currentStation && (
          <GlassCard style={{ ...cardStyle, ...styles.nowPlayingCard }}>
            <View style={styles.nowPlayingHeader}>
              <MaterialCommunityIcons
                name="radio"
                size={FluentIconSize.medium}
                color={colors.colorBrandForeground1}
              />
              <FluentText variant="caption1" color="secondary" style={styles.nowPlayingLabel}>
                NOW PLAYING
              </FluentText>
            </View>
            <FluentText variant="title2" numberOfLines={2} style={styles.stationName}>
              {currentStation.name}
            </FluentText>
            <View style={styles.stationMeta}>
              {currentStation.tags && (
                <FluentText variant="caption1" color="secondary" numberOfLines={1}>
                  {currentStation.tags.split(',').slice(0, 2).join(' • ')}
                </FluentText>
              )}
              <FluentText variant="caption1" color="secondary">
                {getCountryFlag(currentStation.countrycode)} {currentStation.country}
              </FluentText>
            </View>
            <View style={styles.nowPlayingControls}>
              <Pressable
                style={[
                  styles.playButton,
                  { backgroundColor: colors.colorBrandBackground },
                ]}
                onPress={handleOnlinePlayStop}
                accessibilityLabel={isOnlinePlaying ? "Stop streaming" : "Resume streaming"}
                accessibilityRole="button"
              >
                {isBuffering ? (
                  <ActivityIndicator size="small" color={colors.colorNeutralForegroundOnBrand} />
                ) : (
                  <MaterialCommunityIcons
                    name={isOnlinePlaying ? "stop" : "play"}
                    size={32}
                    color={colors.colorNeutralForegroundOnBrand}
                  />
                )}
              </Pressable>
            </View>
          </GlassCard>
        )}

        {isOnlineLoading && !currentStation && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
            <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.m }}>
              Loading stations...
            </FluentText>
          </View>
        )}

        {!isOnlineLoading && popularStations.length > 0 && (
          <View style={styles.stationsSection}>
            <FluentText variant="title3" style={styles.sectionTitle}>
              Popular Stations
            </FluentText>
            <View style={styles.stationsGrid}>
              {popularStations.slice(0, 8).map((station) => (
                <Pressable
                  key={station.stationuuid}
                  style={[
                    styles.onlineStationCard,
                    {
                      backgroundColor: currentStation?.stationuuid === station.stationuuid
                        ? colors.colorBrandBackgroundSelected
                        : colors.colorNeutralBackground3,
                      borderColor: currentStation?.stationuuid === station.stationuuid
                        ? colors.colorBrandStroke1
                        : colors.colorNeutralStroke2,
                      minHeight: FluentTouchTarget.minimum,
                    },
                  ]}
                  onPress={() => handleOnlineStationPress(station)}
                  accessibilityLabel={`Play ${station.name}`}
                  accessibilityRole="button"
                >
                  <View style={styles.onlineStationContent}>
                    {station.favicon ? (
                      <View style={[styles.stationIcon, { backgroundColor: colors.colorNeutralBackground2 }]}>
                        <MaterialCommunityIcons
                          name="radio"
                          size={FluentIconSize.regular}
                          color={colors.colorBrandForeground1}
                        />
                      </View>
                    ) : (
                      <View style={[styles.stationIcon, { backgroundColor: colors.colorBrandBackground + '20' }]}>
                        <MaterialCommunityIcons
                          name="radio"
                          size={FluentIconSize.regular}
                          color={colors.colorBrandForeground1}
                        />
                      </View>
                    )}
                    <View style={styles.stationDetails}>
                      <FluentText
                        variant="body2Strong"
                        numberOfLines={1}
                        style={{
                          color: currentStation?.stationuuid === station.stationuuid
                            ? colors.colorBrandForeground1
                            : colors.colorNeutralForeground1,
                        }}
                      >
                        {station.name}
                      </FluentText>
                      <FluentText variant="caption1" color="secondary" numberOfLines={1}>
                        {station.tags?.split(',')[0] || station.country}
                      </FluentText>
                    </View>
                    {currentStation?.stationuuid === station.stationuuid && isOnlinePlaying && (
                      <MaterialCommunityIcons
                        name="volume-high"
                        size={FluentIconSize.small}
                        color={colors.colorBrandForeground1}
                      />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <FluentButton
          iconBefore={<MaterialCommunityIcons name="radio-tower" size={20} />}
          onPress={handleNavigateToStations}
          variant="outline"
          style={styles.browseButton}
        >
          Browse All Stations
        </FluentButton>
      </>
    );
  };

  const renderFmContent = () => {
    if (needsHeadphoneAntenna && !hasHeadphoneConnected) {
      return (
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
            Or switch to Online mode for internet streaming.
          </FluentText>
        </View>
      );
    }

    if (isInitializing) {
      return (
        <View style={styles.unavailableContainer}>
          <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
          <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.l }}>
            Initializing radio...
          </FluentText>
        </View>
      );
    }

    return (
      <>
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
            <CrossPlatformSlider
              style={styles.slider}
              minimumValue={bandType === "fm" ? FM_MIN : AM_MIN}
              maximumValue={bandType === "fm" ? FM_MAX : AM_MAX}
              step={bandType === "fm" ? FM_STEP : AM_STEP}
              value={localFrequency}
              onValueChange={handleFrequencyChange}
              onSlidingComplete={handleFrequencyChangeComplete}
              minimumTrackTintColor={colors.colorBrandForeground1}
              maximumTrackTintColor={colors.colorNeutralStroke1}
              thumbTintColor={colors.colorBrandForeground1}
              trackHeight={FluentSliderSize.trackMedium}
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
            onPress={handleFmPlayStop}
            accessibilityLabel={isFmPlaying ? "Stop radio" : "Play radio"}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name={isFmPlaying ? "stop" : "play"}
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

        {isFmPlaying && (
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

        {fmError && (
          <View style={[styles.errorCard, { backgroundColor: colors.colorPaletteRedBackground2, borderRadius: FluentRadius.large }]}>
            <View style={styles.errorCardHeader}>
              <MaterialCommunityIcons
                name={fmError.toLowerCase().includes('permission') ? 'shield-alert' : 'alert-circle'}
                size={FluentIconSize.regular}
                color={colors.colorPaletteRedForeground1}
              />
              <FluentText variant="body2" style={{ color: colors.colorPaletteRedForeground1, flex: 1, marginLeft: FluentSpacing.s }}>
                {fmError}
              </FluentText>
            </View>
            {fmError.toLowerCase().includes('permission') && (
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
      </>
    );
  };

  return (
    <FluentScreenLayout 
      header={<FluentTopBar title="Radio" />}
      contentPadding="l"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + FluentSpacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {renderModeToggle()}
        {renderPersistentNowPlaying()}
        {renderFmUnavailableNotice()}
        
        {radioMode === 'fmam' ? renderFmContent() : renderOnlineContent()}
      </ScrollView>

      <FluentModal
        visible={isCountryPickerVisible}
        onClose={() => setIsCountryPickerVisible(false)}
        title="Select Country"
        showHandle={true}
        showCloseButton={true}
      >
        <View style={[styles.modalSearchContainer, { backgroundColor: colors.colorNeutralBackground3, borderColor: colors.colorNeutralStroke2 }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={FluentIconSize.regular}
            color={colors.colorNeutralForeground3}
          />
          <TextInput
            style={[
              styles.modalSearchInput,
              { color: colors.colorNeutralForeground1, fontSize: FluentTypography.body1.fontSize }
            ]}
            placeholder="Search countries..."
            placeholderTextColor={colors.colorNeutralForeground3}
            value={countrySearchQuery}
            onChangeText={setCountrySearchQuery}
            autoFocus={true}
          />
          {countrySearchQuery.length > 0 && (
            <Pressable
              onPress={() => setCountrySearchQuery('')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close-circle" size={FluentIconSize.small} color={colors.colorNeutralForeground3} />
            </Pressable>
          )}
        </View>

        {availableCountries.length === 0 ? (
          <View style={styles.modalLoadingContainer}>
            <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
            <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.m }}>
              Loading countries...
            </FluentText>
          </View>
        ) : (
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.iso_3166_1}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.countryItem,
                  {
                    backgroundColor: item.iso_3166_1 === detectedCountryCode
                      ? colors.colorBrandBackgroundSelected
                      : 'transparent',
                  }
                ]}
                onPress={() => handleSelectCountry(item.iso_3166_1, item.name)}
              >
                <FluentText variant="title3" style={styles.countryFlag}>
                  {getCountryFlag(item.iso_3166_1)}
                </FluentText>
                <View style={styles.countryInfo}>
                  <FluentText 
                    variant="body1Strong"
                    style={{
                      color: item.iso_3166_1 === detectedCountryCode
                        ? colors.colorBrandForeground1
                        : colors.colorNeutralForeground1
                    }}
                  >
                    {item.name}
                  </FluentText>
                  <FluentText variant="caption1" color="secondary">
                    {Math.min(item.stationcount, 250).toLocaleString()}+ popular stations
                  </FluentText>
                </View>
                {item.iso_3166_1 === detectedCountryCode && (
                  <MaterialCommunityIcons
                    name="check"
                    size={FluentIconSize.regular}
                    color={colors.colorBrandForeground1}
                  />
                )}
              </Pressable>
            )}
            contentContainerStyle={styles.countryList}
            showsVerticalScrollIndicator={true}
          />
        )}
      </FluentModal>
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
  modeToggle: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: FluentSpacing.l,
  },
  persistentNowPlaying: {
    padding: FluentSpacing.m,
    marginBottom: FluentSpacing.l,
  },
  persistentNowPlayingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  persistentNowPlayingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: FluentSpacing.m,
  },
  persistentNowPlayingIcon: {
    width: 40,
    height: 40,
    borderRadius: FluentControlRadius.fab,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: FluentSpacing.m,
  },
  persistentNowPlayingText: {
    flex: 1,
  },
  persistentStopButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.s,
    borderRadius: FluentRadius.medium,
    marginBottom: FluentSpacing.l,
    gap: FluentSpacing.xs,
  },
  noticeText: {
    flex: 1,
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
    width: 8,
    marginHorizontal: 2,
    borderRadius: FluentControlRadius.checkbox,
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
    paddingVertical: FluentSpacing.xxl,
  },
  unavailableIconContainer: {
    width: 120,
    height: 120,
    borderRadius: FluentControlRadius.avatar,
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
    lineHeight: FluentTypography.body1.lineHeight,
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
    lineHeight: FluentTypography.body2.lineHeight,
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
  countryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: FluentSpacing.l,
  },
  countryTitle: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.input,
    height: FluentControlHeight.xlarge,
    marginBottom: FluentSpacing.l,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: FluentSpacing.s,
    fontSize: FluentTypography.body1.fontSize,
    paddingVertical: FluentSpacing.xs,
  },
  clearButton: {
    padding: FluentSpacing.xs,
  },
  searchButton: {
    marginLeft: FluentSpacing.s,
  },
  nowPlayingCard: {
    marginBottom: FluentSpacing.l,
  },
  nowPlayingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.s,
  },
  nowPlayingLabel: {
    marginLeft: FluentSpacing.xs,
    letterSpacing: 1,
    fontWeight: FluentFontWeight.semibold,
  },
  stationMeta: {
    marginTop: FluentSpacing.xs,
    gap: FluentSpacing.xxs,
  },
  nowPlayingControls: {
    alignItems: "center",
    marginTop: FluentSpacing.l,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xxl,
  },
  stationsSection: {
    marginBottom: FluentSpacing.l,
  },
  onlineStationCard: {
    flex: 1,
    minWidth: '45%',
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    borderWidth: 1,
  },
  onlineStationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: FluentRadius.medium,
    justifyContent: "center",
    alignItems: "center",
  },
  stationDetails: {
    flex: 1,
    marginLeft: FluentSpacing.s,
    marginRight: FluentSpacing.xs,
  },
  browseButton: {
    marginTop: FluentSpacing.m,
    marginBottom: FluentSpacing.l,
  },
  countryDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentControlRadius.input,
    borderWidth: FluentBorderWidth.thin,
    marginBottom: FluentSpacing.m,
    minHeight: FluentTouchTarget.minimum,
  },
  countryDropdownText: {
    flex: 1,
  },
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentControlRadius.input,
    borderWidth: FluentBorderWidth.thin,
    marginHorizontal: FluentSpacing.l,
    marginBottom: FluentSpacing.m,
    minHeight: FluentTouchTarget.minimum,
  },
  modalSearchInput: {
    flex: 1,
    marginHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  countryList: {
    paddingHorizontal: FluentSpacing.l,
    paddingBottom: FluentSpacing.xxl,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    marginBottom: FluentSpacing.xs,
    minHeight: FluentTouchTarget.minimum,
  },
  countryFlag: {
    marginRight: FluentSpacing.m,
  },
  countryInfo: {
    flex: 1,
  },
});

export default memo(RadioScreen);
