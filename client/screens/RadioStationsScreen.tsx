import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl, FlatList } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText, FluentButton, FluentIconButton, FluentChip } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { EffectChip } from "@/components/EffectChip";
import { useThemeContext, useThemeTokens } from "@/contexts/ThemeContext";
import { useRadio, RadioStation } from "@/contexts/RadioContext";
import { useOnlineRadio } from "@/contexts/OnlineRadioContext";
import { OnlineRadioStation, OnlineRadioService } from "@/services/OnlineRadioService";
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors, FluentTouchTarget, FluentRadius, FluentIconSize, FluentTypography } from "@/constants/fluent2";
import { RadioStackParamList } from "@/navigation/RadioStackNavigator";

type BandFilter = "all" | "fm" | "am";
type RadioMode = "fmam" | "online";

const COUNTRY_FLAG_MAP: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", ES: "🇪🇸", IT: "🇮🇹", CA: "🇨🇦",
  AU: "🇦🇺", JP: "🇯🇵", BR: "🇧🇷", IN: "🇮🇳", MX: "🇲🇽", RU: "🇷🇺", CN: "🇨🇳",
  KR: "🇰🇷", NL: "🇳🇱", SE: "🇸🇪", NO: "🇳🇴", DK: "🇩🇰", FI: "🇫🇮", PL: "🇵🇱",
  AT: "🇦🇹", CH: "🇨🇭", BE: "🇧🇪", PT: "🇵🇹", IE: "🇮🇪", NZ: "🇳🇿", ZA: "🇿🇦",
  AR: "🇦🇷", CL: "🇨🇱", CO: "🇨🇴", PE: "🇵🇪", VE: "🇻🇪", UA: "🇺🇦", TR: "🇹🇷",
  GR: "🇬🇷", CZ: "🇨🇿", HU: "🇭🇺", RO: "🇷🇴", IL: "🇮🇱", SA: "🇸🇦", AE: "🇦🇪",
  TH: "🇹🇭", VN: "🇻🇳", PH: "🇵🇭", ID: "🇮🇩", MY: "🇲🇾", SG: "🇸🇬", HK: "🇭🇰",
  TW: "🇹🇼", EG: "🇪🇬", NG: "🇳🇬", KE: "🇰🇪", PK: "🇵🇰", BD: "🇧🇩",
};

const STATIONS_PER_PAGE = 20;

interface StationListItemProps {
  station: RadioStation;
  onPress: () => void;
  onToggleFavorite: () => void;
  colors: typeof FluentLightColors;
}

function SignalStrengthIndicator({ strength, color }: { strength: number; color: string }) {
  const bars = 4;
  const filledBars = Math.ceil((strength / 100) * bars);
  
  return (
    <View style={styles.signalContainer}>
      {Array.from({ length: bars }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.signalBar,
            {
              height: 4 + index * 3,
              backgroundColor: index < filledBars ? color : color + "30",
            },
          ]}
        />
      ))}
    </View>
  );
}

function StationListItem({ station, onPress, onToggleFavorite, colors }: StationListItemProps) {
  const frequencyText = station.bandType === "fm" 
    ? `${station.frequencyMHz.toFixed(1)} FM` 
    : `${Math.round(station.frequencyMHz * 1000)} AM`;
  
  const stationName = station.name || "Unknown Station";
  
  return (
    <Pressable
      style={[styles.stationItem, { backgroundColor: colors.colorNeutralBackground2, minHeight: FluentTouchTarget.minimum }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityLabel={`${frequencyText}, ${stationName}`}
      accessibilityRole="button"
    >
      <View style={[styles.frequencyBadge, { backgroundColor: colors.colorBrandBackground + "20" }]}>
        <MaterialCommunityIcons 
          name={station.bandType === "fm" ? "radio" : "antenna"} 
          size={20} 
          color={colors.colorBrandForeground1} 
        />
      </View>
      
      <View style={styles.stationInfo}>
        <FluentText variant="body1Strong" numberOfLines={1}>
          {frequencyText}
        </FluentText>
        <FluentText variant="caption1" color="secondary" numberOfLines={1}>
          {stationName}
        </FluentText>
      </View>
      
      <SignalStrengthIndicator 
        strength={station.signalStrength || 0} 
        color={colors.colorBrandForeground1} 
      />
      
      <FluentIconButton
        icon={<MaterialCommunityIcons name={station.isFavorite ? "star" : "star-outline"} />}
        variant="transparent"
        size="large"
        selected={station.isFavorite}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onToggleFavorite();
        }}
        accessibilityLabel={station.isFavorite ? "Remove from favorites" : "Add to favorites"}
      />
    </Pressable>
  );
}

interface OnlineStationCardProps {
  station: OnlineRadioStation;
  onPlay: () => void;
  isPlaying: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  colors: typeof FluentLightColors;
}

function OnlineStationCard({ station, onPlay, isPlaying, isFavorite, onToggleFavorite, colors }: OnlineStationCardProps) {
  const tags = station.tags ? station.tags.split(",").slice(0, 3).map(t => t.trim()).filter(Boolean) : [];
  
  return (
    <Pressable
      style={[styles.onlineStationItem, { backgroundColor: colors.colorNeutralBackground2, minHeight: FluentTouchTarget.minimum }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPlay();
      }}
      accessibilityLabel={`Play ${station.name}`}
      accessibilityRole="button"
    >
      <View style={[styles.stationFaviconContainer, { backgroundColor: colors.colorNeutralBackground3 }]}>
        {station.favicon ? (
          <Image
            source={{ uri: station.favicon }}
            style={styles.stationFavicon}
            contentFit="cover"
            placeholder={require("@/assets/sounds/keypress.ogg")}
          />
        ) : (
          <MaterialCommunityIcons 
            name="radio" 
            size={24} 
            color={colors.colorBrandForeground1} 
          />
        )}
      </View>
      
      <View style={styles.onlineStationInfo}>
        <FluentText variant="body1Strong" numberOfLines={1}>
          {station.name}
        </FluentText>
        <View style={styles.onlineStationMeta}>
          {tags.length > 0 && (
            <FluentText variant="caption1" color="secondary" numberOfLines={1} style={styles.tagsText}>
              {tags.join(" • ")}
            </FluentText>
          )}
          {station.bitrate > 0 && (
            <FluentText variant="caption1" color="secondary">
              {station.bitrate} kbps
            </FluentText>
          )}
        </View>
      </View>
      
      <FluentIconButton
        icon={<MaterialCommunityIcons name={isFavorite ? "heart" : "heart-outline"} />}
        variant="subtle"
        size="large"
        iconColor={isFavorite ? colors.colorPaletteRedForeground1 : colors.colorNeutralForeground3}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleFavorite();
        }}
        accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
        style={{ marginRight: FluentSpacing.xs }}
      />
      
      <FluentIconButton
        icon={<MaterialCommunityIcons name={isPlaying ? "pause" : "play"} />}
        variant={isPlaying ? "primary" : "outline"}
        size="large"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPlay();
        }}
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
      />
    </Pressable>
  );
}

function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons 
        name={icon as any} 
        size={48} 
        color={colors.colorNeutralForeground2} 
      />
      <FluentText variant="body1Strong" color="secondary" style={styles.emptyTitle}>
        {title}
      </FluentText>
      <FluentText variant="caption1" color="secondary" style={styles.emptyMessage}>
        {message}
      </FluentText>
    </View>
  );
}

function LoadingState({ message }: { message: string }) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
      <FluentText variant="body1" color="secondary" style={styles.loadingText}>
        {message}
      </FluentText>
    </View>
  );
}

export default function RadioStationsScreen() {
  const route = useRoute<RouteProp<RadioStackParamList, 'RadioStations'>>();
  const initialMode = route.params?.mode || 'fmam';
  
  const tabBarHeight = useSafeTabBarHeight();
  const tokens = useThemeTokens();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  
  const { 
    stations: rawStations, 
    scanResults, 
    isScanning, 
    scan, 
    tune, 
    addFavorite, 
    removeFavorite,
    isAvailable,
    isInitialized,
    initialize,
  } = useRadio();

  const stations = Array.isArray(rawStations) ? rawStations : [];

  const {
    isLoading: isOnlineLoading,
    error: onlineError,
    detectedCountry,
    detectedCountryCode,
    stations: onlineStations,
    currentStation,
    isPlaying: isOnlinePlaying,
    isBuffering,
    detectLocation,
    loadStations,
    searchStations,
    playStation,
    stopPlayback,
    clearError,
    addStationToFavorites,
    removeStationFromFavorites,
    isStationFavorite,
    getFavoriteCount,
    forceRefreshStations,
    isRefreshingStations,
  } = useOnlineRadio();
  
  const handleToggleOnlineFavorite = useCallback(async (station: OnlineRadioStation) => {
    const isFav = isStationFavorite(station.stationuuid);
    if (isFav) {
      await removeStationFromFavorites(station.stationuuid);
    } else {
      await addStationToFavorites(station);
    }
  }, [isStationFavorite, addStationToFavorites, removeStationFromFavorites]);
  
  const [radioMode, setRadioMode] = useState<RadioMode>(initialMode);
  const [bandFilter, setBandFilter] = useState<BandFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayedStationsCount, setDisplayedStationsCount] = useState(50);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filteredOnlineStations, setFilteredOnlineStations] = useState<OnlineRadioStation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<OnlineRadioStation[]>([]);

  useEffect(() => {
    if (radioMode === "online") {
      if (detectedCountryCode) {
        loadStationsForCountry();
      } else {
        initOnlineMode();
      }
    }
  }, [radioMode, detectedCountryCode]);

  useEffect(() => {
    if (radioMode === "online" && detectedCountryCode && !searchQuery) {
      setFilteredOnlineStations(onlineStations.slice(0, 250));
    }
  }, [onlineStations, radioMode, searchQuery, detectedCountryCode]);

  const loadStationsForCountry = async () => {
    if (detectedCountryCode) {
      await loadStations(detectedCountryCode);
    }
  };

  const initOnlineMode = async () => {
    const result = await detectLocation();
    if (result.countryCode) {
      await loadStations(result.countryCode);
    }
  };

  const favoriteStations = useMemo(() => {
    return stations
      .filter(s => s.isFavorite)
      .filter(s => bandFilter === "all" || s.bandType === bandFilter);
  }, [stations, bandFilter]);

  const scannedStations = useMemo(() => {
    return scanResults
      .filter(s => bandFilter === "all" || s.bandType === bandFilter);
  }, [scanResults, bandFilter]);

  const displayedOnlineStations = useMemo(() => {
    return filteredOnlineStations.slice(0, displayedStationsCount);
  }, [filteredOnlineStations, displayedStationsCount]);

  const hasMoreStations = displayedStationsCount < filteredOnlineStations.length;

  const handleScan = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!isInitialized) {
      await initialize();
    }
    
    const band = bandFilter === "all" ? undefined : bandFilter;
    await scan(band);
  }, [isInitialized, initialize, scan, bandFilter]);

  const handleTuneStation = useCallback(async (station: RadioStation) => {
    await tune(station.frequencyMHz, station.bandType);
  }, [tune]);

  const handleToggleFavorite = useCallback(async (station: RadioStation) => {
    if (station.isFavorite) {
      await removeFavorite(station.id);
    } else {
      await addFavorite(station);
    }
  }, [addFavorite, removeFavorite]);

  const handleFilterChange = useCallback((filter: BandFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBandFilter(filter);
  }, []);

  const handleModeChange = useCallback((mode: RadioMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRadioMode(mode);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      setDisplayedStationsCount(50);
      setIsSearching(true);
      try {
        const results = await OnlineRadioService.searchStations(query, 250, detectedCountryCode || undefined);
        setSearchResults(results);
        setFilteredOnlineStations(results);
      } catch (err) {
        console.error("Search error:", err);
        setFilteredOnlineStations([]);
      } finally {
        setIsSearching(false);
      }
    } else if (query.trim().length === 0 && detectedCountryCode) {
      setSearchResults([]);
      setFilteredOnlineStations(onlineStations.slice(0, 250));
    }
  }, [onlineStations, detectedCountryCode]);

  const handlePlayOnlineStation = useCallback(async (station: OnlineRadioStation) => {
    if (currentStation?.stationuuid === station.stationuuid && isOnlinePlaying) {
      await stopPlayback();
    } else {
      await playStation(station);
    }
  }, [currentStation, isOnlinePlaying, playStation, stopPlayback]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (detectedCountryCode) {
      await loadStations(detectedCountryCode);
      setFilteredOnlineStations(onlineStations);
    }
    setIsRefreshing(false);
  }, [detectedCountryCode, loadStations, onlineStations]);

  const handleForceRefresh = useCallback(async () => {
    if (!detectedCountryCode || isRefreshingStations) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await forceRefreshStations(detectedCountryCode);
    setSearchQuery("");
    setDisplayedStationsCount(50);
  }, [detectedCountryCode, forceRefreshStations, isRefreshingStations]);

  const handleLoadMore = useCallback(() => {
    if (hasMoreStations) {
      setDisplayedStationsCount(prev => prev + STATIONS_PER_PAGE);
    }
  }, [hasMoreStations]);

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return "🌍";
    return COUNTRY_FLAG_MAP[countryCode.toUpperCase()] || "🌍";
  };

  const renderOnlineContent = () => {
    if (isOnlineLoading && !isRefreshing) {
      return <LoadingState message="Loading stations..." />;
    }

    if (onlineError) {
      return (
        <GlassCard style={styles.sectionCard}>
          <EmptyState
            icon="alert-circle-outline"
            title="Error loading stations"
            message={onlineError}
          />
          <FluentButton
            iconBefore={<MaterialCommunityIcons name="refresh" size={20} />}
            onPress={() => {
              clearError();
              if (detectedCountryCode) {
                loadStations(detectedCountryCode);
              }
            }}
            style={styles.retryButton}
          >
            Try Again
          </FluentButton>
        </GlassCard>
      );
    }

    return (
      <>
        <View style={[styles.countryHeader, { backgroundColor: colors.colorNeutralBackground2 }]}>
          <FluentText variant="title2" style={styles.countryHeaderText}>
            {getCountryFlag(detectedCountryCode)} {detectedCountry || "Detecting location..."}
          </FluentText>
          <FluentIconButton
            icon={<MaterialCommunityIcons name="refresh" />}
            variant="subtle"
            size="large"
            onPress={handleForceRefresh}
            disabled={isRefreshingStations || !detectedCountryCode}
            accessibilityLabel="Re-scan for radio stations"
          />
        </View>
        
        {isRefreshingStations && (
          <View style={styles.refreshingBanner}>
            <ActivityIndicator size="small" color={colors.colorBrandForeground1} />
            <FluentText variant="caption1" color="secondary" style={styles.refreshingText}>
              Scanning for radio stations...
            </FluentText>
          </View>
        )}

        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.colorNeutralBackground3, borderColor: colors.colorNeutralStroke1 }]}>
            <MaterialCommunityIcons
              name="magnify"
              size={FluentIconSize.regular}
              color={colors.colorNeutralForeground3}
              style={styles.searchIcon}
            />
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.colorNeutralBackground2,
                  color: colors.colorNeutralForeground1,
                  borderColor: colors.colorNeutralStroke1,
                  fontSize: FluentTypography.body1.fontSize,
                  paddingVertical: FluentSpacing.xs,
                },
              ]}
              placeholder="Search stations..."
              placeholderTextColor={colors.colorNeutralForeground3}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => handleSearch("")}
                style={styles.clearButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialCommunityIcons 
                  name="close-circle" 
                  size={FluentIconSize.small} 
                  color={colors.colorNeutralForeground3} 
                />
              </Pressable>
            )}
          </View>
        </View>

        {isSearching ? (
          <LoadingState message="Searching stations..." />
        ) : displayedOnlineStations.length === 0 ? (
          <GlassCard style={styles.sectionCard}>
            <EmptyState
              icon="radio-off"
              title="No stations found"
              message={searchQuery ? "Try a different search term" : "No stations available for this selection"}
            />
          </GlassCard>
        ) : (
          <View style={styles.onlineStationsList}>
            {displayedOnlineStations.map((station) => (
              <OnlineStationCard
                key={station.stationuuid}
                station={station}
                onPlay={() => handlePlayOnlineStation(station)}
                isPlaying={currentStation?.stationuuid === station.stationuuid && isOnlinePlaying}
                isFavorite={isStationFavorite(station.stationuuid)}
                onToggleFavorite={() => handleToggleOnlineFavorite(station)}
                colors={colors}
              />
            ))}
            
            {hasMoreStations && (
              <FluentButton
                variant="outline"
                onPress={handleLoadMore}
                style={styles.loadMoreButton}
              >
                Load More Stations
              </FluentButton>
            )}
          </View>
        )}
      </>
    );
  };

  const renderFmAmContent = () => {
    return (
      <>
        <View style={styles.filterRow}>
          <FluentChip
            label="All"
            selected={bandFilter === "all"}
            onPress={() => handleFilterChange("all")}
          />
          <FluentChip
            label="FM"
            selected={bandFilter === "fm"}
            onPress={() => handleFilterChange("fm")}
          />
          <FluentChip
            label="AM"
            selected={bandFilter === "am"}
            onPress={() => handleFilterChange("am")}
          />
        </View>

        <FluentButton
          iconBefore={<MaterialCommunityIcons name="radar" size={20} />}
          onPress={handleScan}
          disabled={isScanning || !isAvailable}
          style={styles.scanButton}
        >
          {isScanning ? "Scanning..." : "Scan for Stations"}
        </FluentButton>

        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons 
              name="star" 
              size={20} 
              color={colors.colorBrandForeground1} 
            />
            <FluentText variant="title3" style={styles.sectionTitle}>
              Favorite Stations
            </FluentText>
          </View>
          
          {favoriteStations.length === 0 ? (
            <EmptyState
              icon="star-outline"
              title="No favorite stations yet"
              message="Tap the star to save your favorite stations."
            />
          ) : (
            <View style={styles.stationsList}>
              {favoriteStations.map((station) => (
                <StationListItem
                  key={station.id}
                  station={station}
                  onPress={() => handleTuneStation(station)}
                  onToggleFavorite={() => handleToggleFavorite(station)}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons 
              name="radio-tower" 
              size={20} 
              color={colors.colorBrandForeground1} 
            />
            <FluentText variant="title3" style={styles.sectionTitle}>
              Scanned Stations
            </FluentText>
          </View>
          
          {scannedStations.length === 0 ? (
            <EmptyState
              icon="radio-off"
              title="No stations found"
              message="Try scanning for stations using the button above."
            />
          ) : (
            <View style={styles.stationsList}>
              {scannedStations.map((station) => (
                <StationListItem
                  key={station.id}
                  station={station}
                  onPress={() => handleTuneStation(station)}
                  onToggleFavorite={() => handleToggleFavorite(station)}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </GlassCard>

        {!isAvailable && (
          <GlassCard style={styles.infoCard}>
            <View style={styles.unavailableHeader}>
              <View style={[styles.unavailableIconContainer, { backgroundColor: colors.colorPaletteRedBackground2 }]}>
                <MaterialCommunityIcons
                  name="radio-off"
                  size={FluentIconSize.medium}
                  color={colors.colorPaletteRedForeground1}
                />
              </View>
              <FluentText variant="title3" style={styles.unavailableTitle}>
                FM Hardware Unavailable
              </FluentText>
            </View>
            <FluentText variant="body1" color="secondary" style={styles.infoText}>
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
                Try switching to Online mode to stream internet radio stations.
              </FluentText>
            </View>
          </GlassCard>
        )}
      </>
    );
  };

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.s, paddingBottom: tabBarHeight + FluentSpacing.l },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
        refreshControl={
          radioMode === "online" ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.colorBrandForeground1}
              colors={[colors.colorBrandForeground1]}
            />
          ) : undefined
        }
      >
        <View style={styles.modeToggleRow}>
          <EffectChip
            label="FM/AM"
            isSelected={radioMode === "fmam"}
            onPress={() => handleModeChange("fmam")}
          />
          <EffectChip
            label="Online"
            isSelected={radioMode === "online"}
            onPress={() => handleModeChange("online")}
          />
        </View>

        {radioMode === "fmam" ? renderFmAmContent() : renderOnlineContent()}
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: FluentSpacing.m,
  },
  modeToggleRow: {
    flexDirection: "row",
    gap: FluentSpacing.s,
    marginBottom: FluentSpacing.m,
  },
  filterRow: {
    flexDirection: "row",
    gap: FluentSpacing.xs,
    marginBottom: FluentSpacing.m,
  },
  scanButton: {
    marginBottom: FluentSpacing.m,
  },
  sectionCard: {
    marginBottom: FluentSpacing.m,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  sectionTitle: {
    marginLeft: FluentSpacing.xs,
  },
  stationsList: {
    gap: FluentSpacing.xs,
  },
  stationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.s,
    borderRadius: FluentControlRadius.button,
    minHeight: 56,
  },
  frequencyBadge: {
    width: 40,
    height: 40,
    borderRadius: FluentControlRadius.button,
    justifyContent: "center",
    alignItems: "center",
  },
  stationInfo: {
    flex: 1,
    marginLeft: FluentSpacing.s,
    marginRight: FluentSpacing.s,
  },
  signalContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    marginRight: FluentSpacing.xs,
    height: 16,
  },
  signalBar: {
    width: 4,
    borderRadius: FluentControlRadius.checkbox,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xl,
  },
  emptyTitle: {
    marginTop: FluentSpacing.s,
    textAlign: "center",
  },
  emptyMessage: {
    marginTop: FluentSpacing.xxs,
    textAlign: "center",
  },
  infoCard: {
    marginBottom: FluentSpacing.m,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: FluentSpacing.s,
  },
  infoText: {
    flex: 1,
    marginTop: FluentSpacing.s,
    lineHeight: 22,
  },
  unavailableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.m,
  },
  unavailableIconContainer: {
    width: 40,
    height: 40,
    borderRadius: FluentRadius.circular,
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableTitle: {
    flex: 1,
  },
  fallbackCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: FluentSpacing.m,
    marginTop: FluentSpacing.m,
    gap: FluentSpacing.s,
  },
  fallbackText: {
    flex: 1,
    lineHeight: 20,
  },
  countryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
    marginBottom: FluentSpacing.m,
  },
  countryHeaderText: {
    flex: 1,
  },
  refreshingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    marginBottom: FluentSpacing.m,
  },
  refreshingText: {
    marginLeft: FluentSpacing.s,
  },
  searchContainer: {
    marginBottom: FluentSpacing.m,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.input,
    paddingHorizontal: FluentSpacing.m,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: FluentSpacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: FluentTypography.body1.fontSize,
    paddingVertical: 0,
  },
  clearButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineStationsList: {
    gap: FluentSpacing.xs,
  },
  onlineStationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.s,
    borderRadius: FluentControlRadius.button,
    minHeight: 72,
  },
  stationFaviconContainer: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.medium,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  stationFavicon: {
    width: 48,
    height: 48,
  },
  onlineStationInfo: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    marginRight: FluentSpacing.s,
  },
  onlineStationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.s,
    marginTop: FluentSpacing.xxs,
  },
  tagsText: {
    flex: 1,
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xxl,
  },
  loadingText: {
    marginTop: FluentSpacing.m,
  },
  retryButton: {
    marginTop: FluentSpacing.m,
  },
  loadMoreButton: {
    marginTop: FluentSpacing.m,
  },
});
