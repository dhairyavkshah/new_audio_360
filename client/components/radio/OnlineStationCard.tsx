import React, { memo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { useThemedColors } from "@/contexts/ThemeContext";
import { OnlineRadioStation } from "@/contexts/OnlineRadioContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentIconSize,
  FluentTouchTarget,
} from "@/constants/fluent2";

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

export interface OnlineStationCardProps {
  station: OnlineRadioStation;
  isSelected: boolean;
  isPlaying: boolean;
  isFavorite?: boolean;
  showFavoriteButton?: boolean;
  onPress: (station: OnlineRadioStation) => void;
  onFavoritePress?: (stationuuid: string) => void;
}

function OnlineStationCardComponent({
  station,
  isSelected,
  isPlaying,
  isFavorite = false,
  showFavoriteButton = false,
  onPress,
  onFavoritePress,
}: OnlineStationCardProps) {
  const colors = useThemedColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.onlineStationCard,
        {
          backgroundColor: isSelected
            ? colors.colorBrandBackground
            : colors.colorNeutralBackground2,
          borderColor: isSelected
            ? colors.colorBrandStroke1
            : colors.colorNeutralStroke2,
          minHeight: FluentTouchTarget.minimum,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={() => onPress(station)}
      accessibilityLabel={`Play ${station.name}`}
      accessibilityRole="button"
      android_ripple={null}
    >
      <View style={styles.onlineStationContent}>
        <View style={[styles.stationIcon, { backgroundColor: colors.colorBrandBackground + '20' }]}>
          <MaterialCommunityIcons
            name="radio"
            size={FluentIconSize.regular}
            color={colors.colorBrandForeground1}
          />
        </View>
        <View style={styles.stationDetails}>
          <FluentText
            variant="body2Strong"
            numberOfLines={1}
            style={{
              color: isSelected
                ? colors.colorBrandForeground1
                : colors.colorNeutralForeground1,
            }}
          >
            {station.name}
          </FluentText>
          <FluentText variant="caption1" color="secondary" numberOfLines={1}>
            {station.tags?.split(',')[0] || `${getCountryFlag(station.countrycode)} ${station.country}`}
          </FluentText>
        </View>
        {showFavoriteButton && onFavoritePress && (
          <Pressable
            onPress={() => onFavoritePress(station.stationuuid)}
            style={{ padding: FluentSpacing.xs }}
            accessibilityLabel={isFavorite ? `Remove ${station.name} from favorites` : `Add ${station.name} to favorites`}
            android_ripple={null}
          >
            <MaterialCommunityIcons
              name={isFavorite ? "heart" : "heart-outline"}
              size={FluentIconSize.small}
              color={isFavorite ? (colors.colorPaletteRedForeground1 || '#e74c3c') : colors.colorNeutralForeground3}
            />
          </Pressable>
        )}
        {isSelected && isPlaying && (
          <MaterialCommunityIcons
            name="volume-high"
            size={FluentIconSize.small}
            color={colors.colorBrandForeground1}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentRadius.medium,
    justifyContent: "center",
    alignItems: "center",
  },
  stationDetails: {
    flex: 1,
    marginLeft: FluentSpacing.s,
    marginRight: FluentSpacing.xs,
  },
});

export const OnlineStationCard = memo(OnlineStationCardComponent);
