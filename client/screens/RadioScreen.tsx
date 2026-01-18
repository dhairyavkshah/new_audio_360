import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, TextInput, Modal, FlatList } from "react-native";
import { CrossPlatformSlider } from "@/components/CrossPlatformSlider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText, FluentButton, FluentIconButton } from "@/components/fluent";
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
  FluentTypography,
  FluentBorderWidth,
  FluentFontWeight,
  FluentLayoutSize,
} from "@/constants/fluent2";

const FM_MIN = 87.5;
const FM_MAX = 108.0;
const FM_STEP = 0.1;

const AM_MIN = 530;
const AM_MAX = 1710;
const AM_STEP = 10;

const SIGNAL_STRENGTH_BARS = 5;

const STORAGE_KEY_RADIO_MODE = '@new_audio_360_radio_mode';

const RADIO_MODE_CARD_HEIGHT = 120;
const NOW_PLAYING_HEIGHT = 64;
const STATION_CARD_WIDTH = 100;
const COUNTRY_ITEM_HEIGHT = 56;

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
    }
  };

  const loadOnlineData = async () => {
    setHasLoadedOnline(true);
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

  const renderRadioModeCards = () => (
    <View style={styles.modeCardsContainer}>
      <Pressable
        style={[
          styles.modeCard,
          {
            backgroundColor: colors.colorNeutralBackground2,
            borderColor: radioMode === 'fmam' ? colors.colorBrandStroke1 : colors.colorNeutralStroke2,
            borderWidth: radioMode === 'fmam' ? 2 : 1,
            opacity: !isFmAvailable ? 0.5 : 1,
          },
        ]}
        onPress={() => handleModeChange('fmam')}
        disabled={!isFmAvailable}
        accessibilityLabel="FM/AM Radio mode"
        accessibilityRole="button"
        accessibilityState={{ selected: radioMode === 'fmam' }}
      >
        <View style={styles.modeCardContent}>
          <View style={[styles.modeCardIconContainer, { backgroundColor: colors.colorNeutralBackground4 }]}>
            <MaterialCommunityIcons
              name="radio"
              size={40}
              color={colors.colorNeutralForeground2}
            />
          </View>
          <View style={styles.modeCardTextContainer}>
            <FluentText variant="subtitle2" style={{ color: colors.colorNeutralForeground1 }}>
              FM/AM Radio
            </FluentText>
            <FluentText variant="caption2" color="secondary">
              {isFmAvailable ? 'Local broadcast radio' : 'Not available on this device'}
            </FluentText>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={FluentIconSize.small}
            color={colors.colorNeutralForeground2}
          />
        </View>
      </Pressable>

      <Pressable
        style={[
          styles.modeCard,
          {
            backgroundColor: colors.colorNeutralBackground2,
            borderColor: radioMode === 'online' ? colors.colorBrandStroke1 : colors.colorNeutralStroke2,
            borderWidth: radioMode === 'online' ? 2 : 1,
          },
        ]}
        onPress={() => handleModeChange('online')}
        accessibilityLabel="Online Radio mode"
        accessibilityRole="button"
        accessibilityState={{ selected: radioMode === 'online' }}
      >
        <View style={styles.modeCardContent}>
          <View style={[styles.modeCardIconContainer, { backgroundColor: colors.colorBrandBackground + '20' }]}>
            <MaterialCommunityIcons
              name="web"
              size={40}
              color={colors.colorBrandForeground1}
            />
          </View>
          <View style={styles.modeCardTextContainer}>
            <FluentText variant="subtitle2" style={{ color: colors.colorNeutralForeground1 }}>
              Online Radio
            </FluentText>
            <FluentText variant="caption2" color="secondary">
              Stream stations worldwide
            </FluentText>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={FluentIconSize.small}
            color={colors.colorNeutralForeground2}
          />
        </View>
      </Pressable>
    </View>
  );

  const renderNowPlayingCompact = () => {
    if (radioMode === 'fmam' && isFmPlaying) {
      return (
        <View
          style={[
            styles.nowPlayingCompact,
            { backgroundColor: colors.colorNeutralBackground2 },
          ]}
          accessibilityLabel={`Now playing: ${rdsData?.stationName || formatFrequency(currentFrequency, bandType)} ${bandType.toUpperCase()}`}
        >
          <View style={[styles.nowPlayingLogo, { backgroundColor: colors.colorBrandBackground + '20' }]}>
            <MaterialCommunityIcons
              name="radio"
              size={FluentIconSize.medium}
              color={colors.colorBrandForeground1}
            />
          </View>
          <View style={styles.nowPlayingInfo}>
            <FluentText variant="body2Strong" numberOfLines={1}>
              {rdsData?.stationName || `${formatFrequency(currentFrequency, bandType)} ${bandType.toUpperCase()}`}
            </FluentText>
            <FluentText variant="caption2" color="secondary" numberOfLines={1}>
              {rdsData?.radioText || 'FM Radio'}
            </FluentText>
          </View>
          <Pressable
            style={[styles.nowPlayingButton, { backgroundColor: colors.colorBrandBackground }]}
            onPress={handleFmPlayStop}
            accessibilityLabel="Stop playing"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="stop"
              size={FluentIconSize.regular}
              color={colors.colorNeutralForegroundOnBrand}
            />
          </Pressable>
        </View>
      );
    }

    if (radioMode === 'online' && currentStation && isOnlinePlaying) {
      return (
        <View
          style={[
            styles.nowPlayingCompact,
            { backgroundColor: colors.colorNeutralBackground2 },
          ]}
          accessibilityLabel={`Now playing: ${currentStation.name}`}
        >
          <View style={[styles.nowPlayingLogo, { backgroundColor: colors.colorBrandBackground + '20' }]}>
            <MaterialCommunityIcons
              name="radio"
              size={FluentIconSize.medium}
              color={colors.colorBrandForeground1}
            />
          </View>
          <View style={styles.nowPlayingInfo}>
            <FluentText variant="body2Strong" numberOfLines={1}>
              {currentStation.name}
            </FluentText>
            <FluentText variant="caption2" color="secondary" numberOfLines={1}>
              {isBuffering ? 'Buffering...' : 'Streaming'}
            </FluentText>
          </View>
          <Pressable
            style={[styles.nowPlayingButton, { backgroundColor: colors.colorBrandBackground }]}
            onPress={handleOnlinePlayStop}
            accessibilityLabel={isOnlinePlaying ? "Stop playing" : "Resume playing"}
            accessibilityRole="button"
          >
            {isBuffering ? (
              <ActivityIndicator size="small" color={colors.colorNeutralForegroundOnBrand} />
            ) : (
              <MaterialCommunityIcons
                name="stop"
                size={FluentIconSize.regular}
                color={colors.colorNeutralForegroundOnBrand}
              />
            )}
          </Pressable>
        </View>
      );
    }

    return null;
  };

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

        <View style={[styles.searchContainer, { backgroundColor: colors.colorNeutralBackground3, borderColor: colors.colorNeutralStroke2 }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={FluentIconSize.regular}
            color={colors.colorNeutralForeground3}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: 'transparent',
                color: colors.colorNeutralForeground1,
                fontSize: FluentTypography.body1.fontSize,
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

        {error && (
          <View style={[styles.errorCard, { backgroundColor: colors.colorPaletteRedBackground2, borderRadius: FluentRadius.large }]}>
            <View style={styles.errorCardHeader}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={FluentIconSize.regular}
                color={colors.colorPaletteRedForeground1}
              />
              <FluentText variant="body2" style={{ color: colors.colorPaletteRedForeground1, flex: 1, marginLeft: FluentSpacing.s }}>
                {error}
              </FluentText>
              <Pressable onPress={clearOnlineError} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <MaterialCommunityIcons name="close" size={FluentIconSize.small} color={colors.colorPaletteRedForeground1} />
              </Pressable>
            </View>
          </View>
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
            <FluentText variant="subtitle2" style={styles.sectionTitle}>
              Popular Stations
            </FluentText>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalStationsContainer}
            >
              {popularStations.slice(0, 10).map((station) => (
                <Pressable
                  key={station.stationuuid}
                  style={[
                    styles.stationCard,
                    {
                      backgroundColor: currentStation?.stationuuid === station.stationuuid
                        ? colors.colorBrandBackgroundSelected
                        : colors.colorNeutralBackground3,
                      borderColor: currentStation?.stationuuid === station.stationuuid
                        ? colors.colorBrandStroke1
                        : 'transparent',
                    },
                  ]}
                  onPress={() => handleOnlineStationPress(station)}
                  accessibilityLabel={`Play ${station.name}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.stationCardIcon, { backgroundColor: colors.colorBrandBackground + '20' }]}>
                    <MaterialCommunityIcons
                      name="radio"
                      size={FluentIconSize.medium}
                      color={colors.colorBrandForeground1}
                    />
                    {currentStation?.stationuuid === station.stationuuid && isOnlinePlaying && (
                      <View style={[styles.playingIndicator, { backgroundColor: colors.colorBrandBackground }]}>
                        <MaterialCommunityIcons
                          name="volume-high"
                          size={12}
                          color={colors.colorNeutralForegroundOnBrand}
                        />
                      </View>
                    )}
                  </View>
                  <FluentText
                    variant="caption1"
                    numberOfLines={2}
                    style={[
                      styles.stationCardName,
                      {
                        color: currentStation?.stationuuid === station.stationuuid
                          ? colors.colorBrandForeground1
                          : colors.colorNeutralForeground1,
                      },
                    ]}
                  >
                    {station.name}
                  </FluentText>
                </Pressable>
              ))}
            </ScrollView>
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
            <FluentText
              style={[styles.frequencyNumber, { color: colors.colorNeutralForeground1 }]}
            >
              {formatFrequency(localFrequency, bandType)}
            </FluentText>
            <FluentText variant="title3" color="secondary" style={styles.bandLabel}>
              {bandType === "fm" ? "MHz" : "kHz"}
            </FluentText>
          </View>

          {rdsData?.stationName && (
            <FluentText variant="body1Strong" style={{ marginBottom: FluentSpacing.s }}>
              {rdsData.stationName}
            </FluentText>
          )}

          {renderSignalStrength()}
        </GlassCard>

        <View style={styles.sliderContainer}>
          <FluentText variant="caption1" color="secondary">
            {bandType === "fm" ? FM_MIN : AM_MIN}
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
              minimumTrackTintColor={colors.colorBrandBackground}
              maximumTrackTintColor={colors.colorNeutralBackground3}
              thumbTintColor={colors.colorBrandBackground}
            />
          </View>
          <FluentText variant="caption1" color="secondary">
            {bandType === "fm" ? FM_MAX : AM_MAX}
          </FluentText>
        </View>

        <View style={styles.playbackControls}>
          <FluentIconButton
            icon="skip-previous"
            size="large"
            variant="subtle"
            onPress={handleSeekDown}
            accessibilityLabel="Seek down"
          />
          <Pressable
            style={[styles.playButton, { backgroundColor: colors.colorBrandBackground }]}
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
            icon="skip-next"
            size="large"
            variant="subtle"
            onPress={handleSeekUp}
            accessibilityLabel="Seek up"
          />
        </View>

        <View style={styles.actionsRow}>
          <FluentIconButton
            icon={isFavorite ? "heart" : "heart-outline"}
            variant="subtle"
            onPress={handleToggleFavorite}
            accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
          />
          <FluentIconButton
            icon={isScanning ? "loading" : "magnify-scan"}
            variant="subtle"
            onPress={handleScan}
            disabled={isScanning}
            accessibilityLabel="Scan for stations"
          />
        </View>

        {rdsData && (rdsData.radioText || rdsData.programType) && (
          <GlassCard style={{ ...cardStyle, ...styles.rdsCard }}>
            <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.xs }}>
              RDS Information
            </FluentText>
            {rdsData.radioText && (
              <FluentText variant="body2" numberOfLines={2}>
                {rdsData.radioText}
              </FluentText>
            )}
            {rdsData.programType && (
              <View style={styles.nowPlayingRow}>
                <MaterialCommunityIcons
                  name="music-note"
                  size={FluentIconSize.small}
                  color={colors.colorBrandForeground1}
                />
                <FluentText variant="caption1" color="secondary" style={styles.nowPlayingText}>
                  {rdsData.programType}
                </FluentText>
              </View>
            )}
          </GlassCard>
        )}

        {hasEffectsSupport && (
          <Pressable
            style={[
              styles.soundLabCard,
              {
                backgroundColor: isEffectsAttached
                  ? colors.colorBrandBackground + '10'
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
            <FluentText variant="subtitle2" style={styles.sectionTitle}>
              Favorites
            </FluentText>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalStationsContainer}
            >
              {stations.map((station) => (
                <Pressable
                  key={station.id}
                  style={[
                    styles.stationCard,
                    {
                      backgroundColor:
                        station.frequency === currentFrequency && station.bandType === bandType
                          ? colors.colorBrandBackgroundSelected
                          : colors.colorNeutralBackground3,
                      borderColor:
                        station.frequency === currentFrequency && station.bandType === bandType
                          ? colors.colorBrandStroke1
                          : 'transparent',
                    },
                  ]}
                  onPress={() => handleStationPress(station)}
                  accessibilityLabel={`Tune to ${station.frequencyMHz} ${station.bandType === "fm" ? "FM" : "AM"}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.stationCardIcon, { backgroundColor: colors.colorBrandBackground + '20' }]}>
                    <FluentText variant="body1Strong" style={{ color: colors.colorBrandForeground1 }}>
                      {station.bandType.toUpperCase()}
                    </FluentText>
                  </View>
                  <FluentText
                    variant="caption1Strong"
                    numberOfLines={1}
                    style={[
                      styles.stationCardName,
                      {
                        color: station.frequency === currentFrequency && station.bandType === bandType
                          ? colors.colorBrandForeground1
                          : colors.colorNeutralForeground1,
                      },
                    ]}
                  >
                    {formatFrequency(station.frequencyMHz, station.bandType)}
                  </FluentText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {scanResults.length > 0 && (
          <View style={styles.favoritesSection}>
            <FluentText variant="subtitle2" style={styles.sectionTitle}>
              Scanned Stations
            </FluentText>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalStationsContainer}
            >
              {scanResults.map((station) => (
                <Pressable
                  key={station.id}
                  style={[
                    styles.stationCard,
                    { backgroundColor: colors.colorNeutralBackground3 },
                  ]}
                  onPress={() => handleStationPress(station)}
                  accessibilityLabel={`Tune to ${station.frequencyMHz} ${station.bandType === "fm" ? "FM" : "AM"}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.stationCardIcon, { backgroundColor: colors.colorNeutralBackground4 }]}>
                    <FluentText variant="body1Strong" style={{ color: colors.colorNeutralForeground2 }}>
                      {station.bandType.toUpperCase()}
                    </FluentText>
                  </View>
                  <FluentText variant="caption1" numberOfLines={1} style={styles.stationCardName}>
                    {formatFrequency(station.frequencyMHz, station.bandType)}
                  </FluentText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </>
    );
  };

  return (
    <FluentScreenLayout 
      header={<FluentTopBar title="Radio" />}
      contentPadding="xl"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + FluentSpacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {renderRadioModeCards()}
        {renderNowPlayingCompact()}
        {renderFmUnavailableNotice()}
        
        {radioMode === 'fmam' ? renderFmContent() : renderOnlineContent()}
      </ScrollView>

      <Modal
        visible={isCountryPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsCountryPickerVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.colorNeutralBackground1, borderTopLeftRadius: FluentSpacing.l, borderTopRightRadius: FluentSpacing.l }]}>
          <View style={styles.modalHeader}>
            <FluentText variant="title2">Select Country</FluentText>
            <Pressable
              onPress={() => setIsCountryPickerVisible(false)}
              style={styles.modalCloseButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={FluentIconSize.medium} color={colors.colorNeutralForeground1} />
            </Pressable>
          </View>

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
                      height: COUNTRY_ITEM_HEIGHT,
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
                      {item.stationcount.toLocaleString()} stations
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
        </View>
      </Modal>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: FluentSpacing.xxl,
  },
  modeCardsContainer: {
    flexDirection: 'row',
    gap: FluentSpacing.m,
  },
  modeCard: {
    flex: 1,
    height: RADIO_MODE_CARD_HEIGHT,
    borderRadius: FluentRadius.xLarge,
    padding: FluentSpacing.l,
    justifyContent: 'center',
  },
  modeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeCardTextContainer: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    marginRight: FluentSpacing.s,
  },
  nowPlayingCompact: {
    height: NOW_PLAYING_HEIGHT,
    borderRadius: FluentRadius.large,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.m,
  },
  nowPlayingLogo: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowPlayingInfo: {
    flex: 1,
    marginHorizontal: FluentSpacing.m,
  },
  nowPlayingButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.s,
    borderRadius: FluentRadius.medium,
    gap: FluentSpacing.xs,
  },
  noticeText: {
    flex: 1,
  },
  bandToggle: {
    flexDirection: "row",
    justifyContent: "center",
  },
  frequencyCard: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xxl,
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
    paddingHorizontal: FluentSpacing.s,
  },
  slider: {
    flex: 1,
    height: FluentTouchTarget.minimum,
  },
  sliderWrapper: {
    flex: 1,
    marginHorizontal: FluentSpacing.m,
    minHeight: FluentTouchTarget.minimum,
    justifyContent: "center",
  },
  rdsCard: {
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
  },
  errorCard: {
    padding: FluentSpacing.m,
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
  },
  sectionTitle: {
    marginBottom: FluentSpacing.m,
  },
  horizontalStationsContainer: {
    gap: FluentSpacing.m,
    paddingRight: FluentSpacing.xl,
  },
  stationCard: {
    width: STATION_CARD_WIDTH,
    padding: FluentSpacing.s,
    borderRadius: FluentRadius.large,
    alignItems: 'center',
    borderWidth: 1,
  },
  stationCardIcon: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: FluentSpacing.xs,
  },
  stationCardName: {
    textAlign: 'center',
  },
  playingIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentControlRadius.input,
    borderWidth: FluentBorderWidth.thin,
    minHeight: FluentTouchTarget.minimum,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
  },
  clearButton: {
    padding: FluentSpacing.xs,
  },
  searchButton: {
    marginLeft: FluentSpacing.s,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xxl,
  },
  stationsSection: {
  },
  browseButton: {
  },
  countryDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentControlRadius.input,
    borderWidth: FluentBorderWidth.thin,
    minHeight: FluentTouchTarget.minimum,
  },
  countryDropdownText: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    paddingTop: FluentSpacing.l,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: FluentSpacing.xl,
    paddingBottom: FluentSpacing.m,
  },
  modalCloseButton: {
    padding: FluentSpacing.xs,
  },
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    borderRadius: FluentControlRadius.input,
    borderWidth: FluentBorderWidth.thin,
    marginHorizontal: FluentSpacing.xl,
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
    paddingHorizontal: FluentSpacing.xl,
    paddingBottom: FluentSpacing.xxl,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    marginBottom: FluentSpacing.xs,
  },
  countryFlag: {
    marginRight: FluentSpacing.m,
  },
  countryInfo: {
    flex: 1,
  },
});

export default memo(RadioScreen);
