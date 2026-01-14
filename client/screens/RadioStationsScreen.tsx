import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { FluentScreenLayout, FluentText, FluentButton, FluentIconButton, FluentChip } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext, useThemeTokens } from "@/contexts/ThemeContext";
import { useRadio, RadioStation } from "@/contexts/RadioContext";
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors, FluentTouchTarget, FluentRadius, FluentIconSize } from "@/constants/fluent2";

type BandFilter = "all" | "fm" | "am";

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

export default function RadioStationsScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const tokens = useThemeTokens();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  
  const { 
    stations, 
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
  
  const [bandFilter, setBandFilter] = useState<BandFilter>("all");

  const favoriteStations = useMemo(() => {
    return stations
      .filter(s => s.isFavorite)
      .filter(s => bandFilter === "all" || s.bandType === bandFilter);
  }, [stations, bandFilter]);

  const scannedStations = useMemo(() => {
    return scanResults
      .filter(s => bandFilter === "all" || s.bandType === bandFilter);
  }, [scanResults, bandFilter]);

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

  return (
    <FluentScreenLayout edges={[]} hasBottomNavigation={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.s, paddingBottom: tabBarHeight + FluentSpacing.l },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
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
                Try internet radio services like TuneIn, iHeartRadio, or your local station's app.
              </FluentText>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: FluentSpacing.m,
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
    borderRadius: 2,
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
});
